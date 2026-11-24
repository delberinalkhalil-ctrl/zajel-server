// Error monitoring: the app reports crashes and failed calls here, the server records its own unexpected errors,
// and the admin page lists them. Kept for 30 days.
import { db, requireUid, Timestamp } from './common';
import { logger, onCall } from './runtime';
import { normalize } from './moderation';

const KEEP_DAYS = 30;
const clip = (v: unknown, n: number) => normalize(v).slice(0, n);

/** Writes one error record; never throws, so reporting an error can never cause another. */
export async function recordError(e: { source: 'app' | 'server'; where: string; msg: string; stack?: string; uid?: string; ver?: string; os?: string }) {
  try {
    await db().collection('errors').add({ ...e, msg: e.msg.slice(0, 500), stack: (e.stack ?? '').slice(0, 3000), at: Timestamp.now() });
  } catch (x) {
    logger.warn('could not record error', String(x));
  }
}

export function serverError(where: string, e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  return recordError({ source: 'server', where, msg: err.message, stack: err.stack });
}

/** Called by the app's FlutterError / PlatformDispatcher handlers and when a call or upload fails. */
export const logError = onCall(async req => {
  const uid = requireUid(req);
  const d = req.data ?? {};
  const msg = clip(d.msg, 500);
  if (!msg) return { ok: true };
  await recordError({
    source: 'app', where: clip(d.where, 80) || 'app', msg, stack: String(d.stack ?? '').slice(0, 3000),
    uid, ver: clip(d.ver, 20), os: clip(d.os, 40),
  });
  return { ok: true };
});

/** Daily: removes records older than KEEP_DAYS. */
export async function purgeErrors() {
  const old = await db().collection('errors').where('at', '<', Timestamp.fromMillis(Date.now() - KEEP_DAYS * 864e5)).limit(400).get();
  const b = db().batch();
  old.docs.forEach(d => b.delete(d.ref));
  if (!old.empty) await b.commit();
  return old.size;
}
