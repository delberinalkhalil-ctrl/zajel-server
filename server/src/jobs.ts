import { logger } from './runtime';
import { LANDED_AUTO_RELEASE_H, WAITING_EXPIRE_DAYS } from './config';
import { db, Timestamp, UserDoc } from './common';
import { fmt, pushTo } from './notify';
import { assign, moveOn, Pigeon } from './pigeons';
import { translateAll } from './translate';

/** Every minute: land arrived pigeons, retry waiting ones, move on uncaught ones. */
export async function pigeonClock() {
  const now = Timestamp.now();
  const pigeons = db().collection('pigeons');

  const due = await pigeons.where('status', '==', 'flying').where('arriveAt', '<=', now).limit(200).get();
  for (const d of due.docs) {
    const p = d.data() as Pigeon;
    try {
      const r = (await db().doc(`users/${p.toUid}`).get()).data() as UserDoc | undefined;
      if (!r || r.banned || !r.receiving || (r.blocked ?? []).includes(p.from)) { await moveOn(d.ref, p); continue; }
      const { src, tr } = await translateAll(p.text, [r.lang], p.fromLang);
      await d.ref.update({ status: 'landed', landedAt: Timestamp.now(), src, tr });
      await pushTo(p.toUid!, {
        title: fmt(r.lang, 'landed_t'), body: fmt(r.lang, 'landed_b', { city: p.fromCity, country: p.fromCountryName }),
        data: { type: 'pigeon', id: d.id },
      });
    } catch (e) { logger.error('land failed', { id: d.id, e: String(e) }); }
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
