import { getAuth } from 'firebase-admin/auth';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { env } from './runtime';
import { onCall } from './runtime';
import { START_POINTS, isLang, FREE_PIGEONS_PER_DAY } from './config';
import { bad, db, FieldValue, getUser, isVip, publicCity, requireUid, Timestamp, todayUtc, UserDoc } from './common';
import { coarse, validLatLon } from './geo';
import { normalize } from './moderation';

const SETTING_KEYS = ['notif', 'sound', 'showCity', 'calls', 'ghost', 'hideRead', 'badge', 'priority'] as const;
const VIP_ONLY = new Set(['ghost', 'hideRead', 'priority']);

function cleanName(v: unknown) {
  const n = normalize(v).replace(/\n/g, ' ');
  if ([...n].length < 2 || [...n].length > 30) bad('bad_name');
  return n;
}

/** Creates the account on first sign-in, or refreshes the location and language later. Never resets points. */
export const initUser = onCall(async req => {
  const uid = requireUid(req);
  const d = req.data ?? {};
  const name = cleanName(d.name);
  const year = Number(d.birthYear);
  const now = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < now - 100 || now - year < 18) bad('under_18');
  if (!isLang(d.lang)) bad('bad_lang');
  if (typeof d.country !== 'string' || !/^[A-Z]{2}$/.test(d.country)) bad('bad_country');
  if (!validLatLon(d.loc)) bad('bad_location');
  const loc = { lat: coarse(d.loc.lat), lon: coarse(d.loc.lon) };
  const city = normalize(d.city).slice(0, 60);
  const countryName = normalize(d.countryName).slice(0, 60);

  const ref = db().doc(`users/${uid}`);
  await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    const base = { name, lang: d.lang, country: d.country, countryName, city, loc, birthYear: year, lastActive: Timestamp.now() };
    if (!s.exists) {
      tx.set(ref, {
        ...base, points: START_POINTS, vipUntil: null, vipActive: false, freeDate: todayUtc(), freeLeft: FREE_PIGEONS_PER_DAY,
        receiving: true, banned: false, blocked: [], fcm: [], rand: Math.random(), createdAt: Timestamp.now(),
        settings: { notif: true, sound: true, showCity: true, calls: 'all', ghost: false, hideRead: false, badge: true, priority: false },
      });
    } else tx.update(ref, base);
    tx.set(db().doc(`profiles/${uid}`), {
      name, country: d.country, countryName, city: (s.data() as UserDoc | undefined)?.settings?.showCity === false ? '' : city,
      lang: d.lang, ...(s.exists ? {} : { bio: '', photoUrl: '', vip: false, badge: true }),
    }, { merge: true });
  });
  return { ok: true };
});

/** Profile and settings edits. Points, VIP and bans can only be changed by the server. */
export const updateProfile = onCall(async req => {
  const uid = requireUid(req);
  const u = await getUser(uid);
  const d = req.data ?? {};
  const priv: Record<string, unknown> = { lastActive: Timestamp.now() };
  const pub: Record<string, unknown> = {};
  if (d.name !== undefined) { priv.name = pub.name = cleanName(d.name); }
  if (d.bio !== undefined) pub.bio = normalize(d.bio).slice(0, 120);
  if (d.photoUrl !== undefined) {
    const p = String(d.photoUrl);
    if (p && !p.startsWith(env('MEDIA_URL', 'https://invalid/'))) bad('bad_photo');
    pub.photoUrl = p;
  }
  if (d.lang !== undefined) { if (!isLang(d.lang)) bad('bad_lang'); priv.lang = pub.lang = d.lang; }
  if (d.receiving !== undefined) priv.receiving = !!d.receiving;
  if (d.settings && typeof d.settings === 'object') {
    for (const k of SETTING_KEYS) {
      if (!(k in d.settings)) continue;
      const v = d.settings[k];
      if (k === 'calls') { if (!['all', 'ten', 'none'].includes(v)) bad('bad_setting'); }
      else if (typeof v !== 'boolean') bad('bad_setting');
      if (VIP_ONLY.has(k) && v === true && !isVip(u)) bad('vip_only');
      priv[`settings.${k}`] = v;
    }
    if ('showCity' in d.settings) pub.city = d.settings.showCity === false ? '' : u.city;
    if ('badge' in d.settings) pub.badge = !!d.settings.badge;
  }
  await db().doc(`users/${uid}`).update(priv);
  if (Object.keys(pub).length) await db().doc(`profiles/${uid}`).set(pub, { merge: true });
  return { ok: true };
});

export const registerToken = onCall(async req => {
  const uid = requireUid(req);
  const t = String(req.data?.token ?? '');
  if (t.length < 20 || t.length > 4096) bad('bad_token');
  const ref = db().doc(`users/${uid}`);
  await ref.update({ fcm: FieldValue.arrayUnion(t), lastActive: Timestamp.now() });
  const u = (await ref.get()).data() as UserDoc;
  if ((u.fcm ?? []).length > 10) await ref.update({ fcm: u.fcm.slice(-10) });
  return { ok: true, city: publicCity(u) };
});

/** Required by Google Play: deletes the account and everything it owns. */
export const deleteAccount = onCall(async req => {
  const uid = requireUid(req);
  const store = db();
  const chats = await store.collection('chats').where('members', 'array-contains', uid).get();
  for (const c of chats.docs) await store.recursiveDelete(c.ref);
  const pigeons = await store.collection('pigeons').where('from', '==', uid).get();
  const calls = await store.collection('calls').where('members', 'array-contains', uid).get();
  const batch = store.batch();
  pigeons.docs.forEach(p => batch.delete(p.ref));
  calls.docs.forEach(c => batch.delete(c.ref));
  batch.delete(store.doc(`profiles/${uid}`));
  batch.delete(store.doc(`users/${uid}`));
  await batch.commit();
  try { rmSync(join(env('MEDIA_DIR', '/tmp'), 'avatars', uid), { recursive: true, force: true }); } catch { /* no files */ }
  await getAuth().deleteUser(uid);
  return { ok: true };
});
