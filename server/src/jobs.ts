import { logger, onCall } from './runtime';
import { LANDED_AUTO_RELEASE_H, WAITING_EXPIRE_DAYS } from './config';
import { db, fail, requireUid, Timestamp, UserDoc } from './common';
import { fmt, pushTo } from './notify';
import { assign, flightHooks, moveOn, Pigeon } from './pigeons';
import type { DocumentReference } from 'firebase-admin/firestore';

/**
 * Lands one arrived pigeon. The status switch happens in a transaction, so the in-process timer,
 * the app's own call when the flight ends and the cron fallback can never land it twice.
 */
async function landOne(ref: DocumentReference) {
  const snap = await ref.get();
  const p0 = snap.data() as Pigeon | undefined;
  if (!p0 || p0.status !== 'flying' || (p0.arriveAt?.toMillis() ?? Infinity) > Date.now() + 1500) return false;
  const r = (await db().doc(`users/${p0.toUid}`).get()).data() as UserDoc | undefined;
  if (!r || r.banned || !r.receiving || (r.blocked ?? []).includes(p0.from)) { await moveOn(ref, p0); return false; }
  const claimed = await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if ((s.data() as Pigeon | undefined)?.status !== 'flying') return false;
    tx.update(ref, { status: 'landed', landedAt: Timestamp.now() });
    return true;
  });
  if (!claimed) return false;
  const { src, tr } = await translateAll(p0.text, [r.lang], p0.fromLang);
  await ref.update({ src, tr });
  await pushTo(p0.toUid!, {
    title: fmt(r.lang, 'landed_t'), body: fmt(r.lang, 'landed_b', { city: p0.fromCity, country: p0.fromCountryName }),
    data: { type: 'pigeon', id: ref.id },
  });
  return true;
}

function landSoon(id: string, arriveAt: number) {
  const ref = db().doc(`pigeons/${id}`);
  setTimeout(() => { landOne(ref).catch(e => logger.error('timed landing failed', { id, e: String(e) })); }, Math.max(0, arriveAt - Date.now()) + 200);
}
flightHooks.onFlying = landSoon;

/** Called by the sender's or the receiver's app when the flight animation ends, in case the server timer was lost. */
export const landPigeon = onCall(async req => {
  const uid = requireUid(req);
  const ref = db().doc(`pigeons/${String(req.data?.id ?? '')}`);
  const p = (await ref.get()).data() as Pigeon | undefined;
  if (!p || (p.from !== uid && p.toUid !== uid)) fail('not_found');
  const landed = await landOne(ref);
  return { landed };
});
import { translateAll } from './translate';

/** Every minute: land arrived pigeons, retry waiting ones, move on uncaught ones. */
export async function pigeonClock() {
  const now = Timestamp.now();
  const pigeons = db().collection('pigeons');

  const due = await pigeons.where('status', '==', 'flying').where('arriveAt', '<=', now).limit(200).get();
  for (const d of due.docs) {
    try { await landOne(d.ref); } catch (e) { logger.error('land failed', { id: d.id, e: String(e) }); }
  }

  const waiting = await pigeons.where('status', '==', 'waiting').orderBy('createdAt').limit(50).get();
  const tooOld = Date.now() - WAITING_EXPIRE_DAYS * 864e5;
  for (const d of waiting.docs) {
    const p = d.data() as Pigeon;
    try {
      if (p.createdAt.toMillis() < tooOld) {
        await d.ref.update({ status: 'expired' });
        const s = (await db().doc(`users/${p.from}`).get()).data() as UserDoc | undefined;
        if (s) await pushTo(p.from, { title: fmt(s.lang, 'expired_t'), body: fmt(s.lang, 'expired_b'), data: { type: 'pigeon', id: d.id } });
      } else await assign(d.ref, p, p.originLoc ?? p.fromLoc);
    } catch (e) { logger.error('retry failed', { id: d.id, e: String(e) }); }
  }

  const stale = Timestamp.fromMillis(Date.now() - LANDED_AUTO_RELEASE_H * 3600e3);
  const uncaught = await pigeons.where('status', '==', 'landed').where('landedAt', '<=', stale).limit(100).get();
  for (const d of uncaught.docs) {
    try { await moveOn(d.ref, d.data() as Pigeon); } catch (e) { logger.error('auto release failed', { id: d.id, e: String(e) }); }
  }
  logger.info('pigeon clock', { landed: due.size, waiting: waiting.size, released: uncaught.size });
}

/** Hourly: switch off VIP badges whose subscription ran out without a renewal being verified. */
export async function vipExpiry() {
  const gone = await db().collection('users').where('vipActive', '==', true).where('vipUntil', '<=', Timestamp.now()).limit(500).get();
  for (const d of gone.docs) {
    await d.ref.update({ vipActive: false, 'settings.ghost': false, 'settings.hideRead': false, 'settings.priority': false });
    await db().doc(`profiles/${d.id}`).set({ vip: false }, { merge: true });
  }
}
