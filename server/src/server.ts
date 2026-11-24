// Zajel API server for a plain Node.js host (cPanel "Setup Node.js App", a VPS, etc.).
//
// Environment:
//   GOOGLE_APPLICATION_CREDENTIALS  path to the Firebase service-account JSON (outside the public web folder)
//   BASE_PATH        URL prefix the app is mounted at, e.g. /zajel-api
//   CRON_KEY         secret for the /cron endpoint (called every minute by a cron job)
//   MEDIA_DIR        public folder for profile photos, e.g. /home/USER/bawer-kalash.com/zajel/media
//   MEDIA_URL        public URL of MEDIA_DIR, e.g. https://bawer-kalash.com/zajel/media
//   FREE_MODE        1 (default) = no purchases, everything free; 0 = points, VIP and Google Play billing
//   AGORA_APP_ID, AGORA_CERT        voice and video calls (optional)
//   MYMEMORY_EMAIL | DEEPL_KEY | GOOGLE_TRANSLATE_KEY   translation provider (MyMemory by default)
//   PLAY_PACKAGE_NAME                Android application id (for purchase checks when FREE_MODE=0)
import './loadenv';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FREE_MODE } from './config';
import { handlers, pigeonClock, vipExpiry } from './index';
import { env, HttpsError, logger } from './runtime';
import { memberChat } from './chats';
import { MEDIA_AFTER_MESSAGES, MEDIA_KINDS, MediaKind, mediaExt, saveMedia } from './media';
import { guardMediaRoot, Limiter } from './limits';
import { publishRulesIfChanged } from './publishRules';

initializeApp();
guardMediaRoot(env('MEDIA_DIR', '/tmp/zajel-media'));
publishRulesIfChanged().then(r => console.log('firestore rules', r)).catch(e => console.error('firestore rules', e));
const limiter = new Limiter();
const slowDown = () => new HttpsError('resource-exhausted', 'too_fast');

const app = express();
app.disable('x-powered-by');
const r = express.Router();

r.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

async function uidFrom(req: Request): Promise<string | undefined> {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!m) return undefined;
  const t = await getAuth().verifyIdToken(m[1]);
  return t.uid;
}

function sendError(res: Response, e: unknown) {
  if (e instanceof HttpsError) {
    const status = e.code === 'unauthenticated' ? 401 : e.code === 'not-found' ? 404 : e.code === 'resource-exhausted' ? 429 : 400;
    res.status(status).json({ error: { code: e.code, message: e.message } });
  } else {
    logger.error('unhandled', e);
    res.status(500).json({ error: { code: 'internal', message: 'internal' } });
  }
}

r.get('/health', (_req, res) => {
  res.json({ ok: true, freeMode: FREE_MODE, time: new Date().toISOString() });
});

r.post('/call/:name', express.json({ limit: '64kb' }), async (req, res) => {
  const h = handlers[req.params.name];
  if (!h) {
    res.status(404).json({ error: { code: 'not-found', message: 'unknown_call' } });
    return;
  }
  let uid: string | undefined;
  try {
    uid = await uidFrom(req);
  } catch {
    res.status(401).json({ error: { code: 'unauthenticated', message: 'login_required' } });
    return;
  }
  try {
    if (uid && !limiter.allow(uid, req.params.name)) throw slowDown();
    const result = await h({ auth: uid ? { uid } : undefined, data: req.body?.data ?? {} });
    res.json({ result: result ?? null });
  } catch (e) {
    sendError(res, e);
  }
});

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
function looksLikeImage(b: Buffer) {
  return (b[0] === 0xff && b[1] === 0xd8) || b.subarray(0, 4).toString('hex') === '89504e47' || b.subarray(8, 12).toString() === 'WEBP';
}

/** Profile photo upload: raw image body, at most 5 MB. Replaces the previous photo. */
r.post('/avatar', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '5mb' }), async (req, res) => {
  try {
    const uid = await uidFrom(req).catch(() => undefined);
    if (!uid) throw new HttpsError('unauthenticated', 'login_required');
    if (!limiter.allow(uid, 'avatar')) throw slowDown();
    const ext = IMAGE_TYPES[String(req.headers['content-type']).split(';')[0]];
    const body = req.body as Buffer;
    if (!ext || !Buffer.isBuffer(body) || body.length < 100 || !looksLikeImage(body)) throw new HttpsError('invalid-argument', 'bad_photo');
    const dir = join(env('MEDIA_DIR', '/tmp/zajel-media'), 'avatars', uid);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) rmSync(join(dir, f), { force: true });
    const name = `${Date.now()}.${ext}`;
    writeFileSync(join(dir, name), body);
    const url = `${env('MEDIA_URL')}/avatars/${uid}/${name}`;
    await getFirestore().doc(`profiles/${uid}`).set({ photoUrl: url }, { merge: true });
    res.json({ result: { url } });
  } catch (e) {
    sendError(res, e);
  }
});

/**
 * Chat attachments: raw body, at most 20 MB. Query: chatId, kind (image | audio | file), name (original file name).
 * Returns the public URL to send with sendMessage({chatId, media: {kind, url, ...}}).
 */
r.post('/media', express.raw({ type: () => true, limit: '20mb' }), async (req, res) => {
  try {
    const uid = await uidFrom(req).catch(() => undefined);
    if (!uid) throw new HttpsError('unauthenticated', 'login_required');
    if (!limiter.allow(uid, 'media')) throw slowDown();
    const chatId = String(req.query.chatId ?? '');
    const kind = String(req.query.kind ?? '') as MediaKind;
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(chatId) || !MEDIA_KINDS.includes(kind)) throw new HttpsError('invalid-argument', 'bad_media');
    const { c } = await memberChat(uid, chatId);
    if (c.blocked) throw new HttpsError('failed-precondition', 'blocked');
    if ((c.messageCount ?? 0) < MEDIA_AFTER_MESSAGES) throw new HttpsError('failed-precondition', 'media_need_messages');
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length < 16) throw new HttpsError('invalid-argument', 'bad_media');
    const ext = mediaExt(kind, body, String(req.query.name ?? ''), String(req.headers['content-type'] ?? ''));
    if (!ext) throw new HttpsError('invalid-argument', kind === 'image' ? 'bad_photo' : 'bad_file_type');
    if (!limiter.addBytes(uid, body.length)) throw new HttpsError('resource-exhausted', 'media_daily_limit');
    res.json({ result: { url: saveMedia(chatId, ext, body), size: body.length } });
  } catch (e) {
    sendError(res, e);
  }
});

/** Called every minute by cron: lands pigeons, retries waiting ones, and hourly expires VIP. */
let running = false;
r.get('/cron', async (req, res) => {
  if (!env('CRON_KEY') || req.query.key !== env('CRON_KEY')) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  if (running) {
    res.json({ ok: true, skipped: true });
    return;
  }
  running = true;
  try {
    await pigeonClock();
    if (new Date().getUTCMinutes() === 0) await vipExpiry();
    res.json({ ok: true });
  } catch (e) {
    logger.error('cron failed', e);
    res.status(500).json({ ok: false });
  } finally {
    running = false;
  }
});

const base = env('BASE_PATH', '/zajel-api').replace(/\/$/, '');
app.use(base, r);
app.use('/', r); // some hosts strip the prefix before the request reaches the app
// Body parser errors (for example a file over 20 MB) come back as the usual JSON error.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') res.status(413).json({ error: { code: 'invalid-argument', message: 'file_too_big' } });
  else sendError(res, err);
});

const port = Number(env('PORT', '3000'));
app.listen(port, () => logger.info(`zajel api on ${port}${base} freeMode=${FREE_MODE}`));
