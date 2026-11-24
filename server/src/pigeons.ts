import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { logger } from './runtime';
import { onCall } from './runtime';
import { ACTIVE_WITHIN_DAYS, COST, FREE_MODE, FREE_PIGEONS_PER_DAY, MAX_FLYING_PER_USER, MAX_HOPS } from './config';
import { bad, checkRestricted, db, fail, FieldValue, getUser, isVip, publicCity, requireUid, Timestamp, todayUtc, UserDoc } from './common';
import { distanceKm, flightMs, LatLon } from './geo';
import { checkText, MAX_PIGEON_LEN, normalize } from './moderation';
import { fmt, pushTo } from './notify';
import { isLang } from './config';
import { Candidate, hasWant, matchesWant, readWant, Want } from './regions';

export interface Pigeon {
  from: string; fromLang?: string; fromName: string; fromCity: string; fromCountry: string; fromCountryName: string; fromLoc: LatLon;
  text: string; fast: boolean; wantCountry: string | null;
  status: 'waiting' | 'flying' | 'landed' | 'caught' | 'expired';
  hops: number; tried: string[]; createdAt: Timestamp; originLoc?: LatLon;
  toUid?: string; toName?: string; toCity?: string; toCountry?: string; toCountryName?: string; toLoc?: LatLon;
  km?: number; departAt?: Timestamp; arriveAt?: Timestamp; landedAt?: Timestamp;
  src?: string; tr?: Record<string, string>; chatId?: string;
  /** Optional matching filters chosen by the sender (region, language, age range, gender). */
  want?: Want;
  /** People this sender reached in the last 7 days; tried last, so letters meet new people. */
  avoid?: string[];
  toLang?: string;
}

/** Picks someone to receive the pigeon: random, active, not blocked either way, not tried before, matching the sender's filters. */
export async function pickRecipient(p: Pigeon, sender: Partial<UserDoc>): Promise<DocumentSnapshot | null> {
  const users = db().collection('users');
  let q = users.where('receiving', '==', true).where('banned', '==', false);
  if (p.wantCountry) q = q.where('country', '==', p.wantCountry);
  const want = p.want ?? {};
  const n = hasWant(want) ? 60 : 25;
  const r = Math.random();
  const [a, b] = await Promise.all([
    q.where('rand', '>=', r).orderBy('rand').limit(n).get(),
    q.where('rand', '<', r).orderBy('rand', 'desc').limit(n).get(),
  ]);
  const since = Date.now() - ACTIVE_WITHIN_DAYS * 864e5;
  const blocked = new Set(sender.blocked ?? []);
  let list = [...a.docs, ...b.docs].filter(d => {
    const c = d.data() as UserDoc;
    return d.id !== p.from && !p.tried.includes(d.id) && !blocked.has(d.id) &&
      !(c.blocked ?? []).includes(p.from) && (c.lastActive?.toMillis() ?? 0) >= since &&
      matchesWant(c as unknown as Candidate, want);
  });
  if (!list.length) return null;
  if (!p.wantCountry && !want.region) {
    const abroad = list.filter(d => (d.data() as UserDoc).country !== p.fromCountry);
    if (abroad.length) list = abroad;
  }
  if (p.avoid?.length) {
    const fresh = list.filter(d => !p.avoid!.includes(d.id));
    if (fresh.length) list = fresh;
  }
  if (isVip(sender) && sender.settings?.priority) {
    list.sort((x, y) => ((y.data() as UserDoc).lastActive?.toMillis() ?? 0) - ((x.data() as UserDoc).lastActive?.toMillis() ?? 0));
    list = list.slice(0, 5);
  }
  return list[Math.floor(Math.random() * list.length)];
}

/** Set by the job module: lands the pigeon the moment it arrives instead of waiting for the next cron run. */
export const flightHooks = { onFlying: (_id: string, _arriveAt: number) => { /* replaced in jobs.ts */ } };

/** Sends the pigeon from `origin` to `c`. */
export async function flyTo(ref: DocumentReference, p: Pigeon, c: DocumentSnapshot, origin: LatLon) {
  const u = c.data() as UserDoc;
  const km = distanceKm(origin, u.loc);
  const now = Date.now();
  const arriveAt = now + flightMs(km, p.fast);
  await ref.update({
    status: 'flying', toUid: c.id, toName: u.name, toLang: u.lang, toCity: publicCity(u), toCountry: u.country, toCountryName: u.countryName ?? '',
    toLoc: u.loc, km, departAt: Timestamp.fromMillis(now), arriveAt: Timestamp.fromMillis(arriveAt),
    tried: FieldValue.arrayUnion(c.id), originLoc: origin,
  });
  await c.ref.update({ rand: Math.random() });
  flightHooks.onFlying(ref.id, arriveAt);
  return { km, arriveAt, toLoc: u.loc, toCity: publicCity(u), toCountryName: u.countryName ?? '' };
}

/** Tries to find a recipient. Leaves the pigeon "waiting" if nobody is available yet. */
export async function assign(ref: DocumentReference, p: Pigeon, origin: LatLon, sender?: Partial<UserDoc>) {
  const s = sender ?? ((await db().doc(`users/${p.from}`).get()).data() as UserDoc | undefined) ?? {};
  const c = await pickRecipient(p, s);
  if (!c) { await ref.update({ status: 'waiting', originLoc: origin }); return null; }
  return flyTo(ref, p, c, origin);
}

/** Called when a recipient lets the pigeon go, or does not catch it in time. */
export async function moveOn(ref: DocumentReference, p: Pigeon) {
  const hops = (p.hops ?? 0) + 1;
  if (hops >= MAX_HOPS) {
    await ref.update({ status: 'expired', hops });
    const s = (await db().doc(`users/${p.from}`).get()).data() as UserDoc | undefined;
    if (s) await pushTo(p.from, { title: fmt(s.lang, 'expired_t'), body: fmt(s.lang, 'expired_b'), data: { type: 'pigeon', id: ref.id } }, 'pigeon');
    return;
  }
  await ref.update({ hops, toUid: FieldValue.delete(), landedAt: FieldValue.delete(), tr: FieldValue.delete() });
  await assign(ref, { ...p, hops }, p.toLoc ?? p.originLoc ?? p.fromLoc);
}

export const sendPigeon = onCall(async req => {
  const uid = requireUid(req);
  const text = normalize(req.data?.text);
  const problem = checkText(text, MAX_PIGEON_LEN, true);
  if (problem) bad(problem);
  const fast = !!req.data?.fast;
  const want = req.data?.toCountry ? String(req.data.toCountry) : null;
  if (want && !/^[A-Z]{2}$/.test(want)) bad('bad_country');
  const filters = readWant(req.data?.filters, isLang);
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const recent = await db().collection('pigeons').where('from', '==', uid).where('createdAt', '>=', weekAgo).orderBy('createdAt', 'desc').select('toUid').limit(100).get();
  const avoid = [...new Set(recent.docs.map(d => d.data().toUid as string | undefined).filter((x): x is string => !!x))].slice(0, 60);

  const inAir = await db().collection('pigeons').where('from', '==', uid).where('status', 'in', ['waiting', 'flying']).count().get();
  if (inAir.data().count >= MAX_FLYING_PER_USER) fail('too_many_in_air');

  const userRef = db().doc(`users/${uid}`);
  const ref = db().collection('pigeons').doc();
  let pigeon!: Pigeon;
  let sender!: UserDoc;
  let charged = 0;
  await db().runTransaction(async tx => {
    const s = await tx.get(userRef);
    if (!s.exists) fail('no_profile');
    const u = s.data() as UserDoc;
    if (u.banned) fail('banned');
    checkRestricted(u);
    const vip = isVip(u);
    const freeLeft = u.freeDate === todayUtc() ? (u.freeLeft ?? 0) : FREE_PIGEONS_PER_DAY;
    const useFree = !vip && freeLeft > 0;
    charged = (vip || useFree ? 0 : COST.extra) + (want && !vip ? COST.dest : 0) + (fast ? COST.fast : 0);
    if (FREE_MODE && !useFree && !vip) fail('daily_limit');
    if (u.points < charged) fail('no_points');
    tx.update(userRef, {
      points: FieldValue.increment(-charged), freeDate: todayUtc(), freeLeft: useFree ? freeLeft - 1 : freeLeft, lastActive: Timestamp.now(),
    });
    pigeon = {
      from: uid, fromLang: u.lang, fromName: u.name, fromCity: publicCity(u), fromCountry: u.country, fromCountryName: u.countryName ?? '', fromLoc: u.loc,
      text, fast, wantCountry: want, status: 'waiting', hops: 0, tried: [uid], createdAt: Timestamp.now(),
      ...(hasWant(filters) ? { want: filters } : {}), ...(avoid.length ? { avoid } : {}),
    };
    tx.set(ref, { ...pigeon, cost: charged });
    sender = u;
  });
  const flight = await assign(ref, pigeon, pigeon.fromLoc, sender);
  logger.info('pigeon sent', { id: ref.id, charged, assigned: !!flight });
  return {
    id: ref.id, status: flight ? 'flying' : 'waiting', charged,
    ...(flight ? { km: flight.km, arriveAt: flight.arriveAt, to: { ...flight.toLoc, city: flight.toCity, countryName: flight.toCountryName } } : {}),
  };
});

export const catchPigeon = onCall(async req => {
  const uid = requireUid(req);
  const id = String(req.data?.id ?? '');
  const ref = db().doc(`pigeons/${id}`);
  const chatRef = db().doc(`chats/${id}`);
  let p!: Pigeon;
  await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) fail('not_found');
    p = s.data() as Pigeon;
    if (p.toUid !== uid || p.status !== 'landed') fail('not_yours');
    const now = Timestamp.now();
    tx.update(ref, { status: 'caught', chatId: id, caughtAt: now });
    tx.set(chatRef, {
      members: [p.from, uid], pigeonId: id, createdAt: now, updatedAt: now, messageCount: 1, blocked: false,
      unread: { [p.from]: 0, [uid]: 0 }, readAt: {},
      last: { from: p.from, text: p.text, tr: p.tr ?? {}, at: now },
      route: { from: { loc: p.fromLoc, city: p.fromCity, countryName: p.fromCountryName }, to: { loc: p.toLoc, city: p.toCity, countryName: p.toCountryName }, km: p.km ?? 0 },
    });
    tx.set(chatRef.collection('messages').doc(), { from: p.from, text: p.text, src: p.src ?? 'und', tr: p.tr ?? {}, at: p.createdAt, pigeon: true });
  });
  const me = await getUser(uid);
  const s = (await db().doc(`users/${p.from}`).get()).data() as UserDoc | undefined;
  if (s) await pushTo(p.from, { title: fmt(s.lang, 'caught_t', { name: me.name }), body: fmt(s.lang, 'caught_b', { city: publicCity(me) || me.countryName }), data: { type: 'chat', chatId: id } }, 'accept');
  return { chatId: id };
});

export const ACHIEVEMENTS = ['first_pigeon', 'countries_5', 'langs_5', 'profile_full', 'km_10k', 'chats_10'] as const;

/**
 * Everything the "Zajel passport" shows: totals, a stamp per country with the first date,
 * the latest journeys, earned achievements and this month's countries.
 */
export const myStats = onCall(async req => {
  const uid = requireUid(req);
  const pigeons = db().collection('pigeons');
  const [sentQ, gotQ, chatsQ, prof] = await Promise.all([
    pigeons.where('from', '==', uid).select('status', 'toCountry', 'toCountryName', 'toCity', 'toLang', 'km', 'createdAt', 'landedAt').limit(5000).get(),
    pigeons.where('toUid', '==', uid).select('status', 'fromCountry', 'fromCountryName', 'fromLang', 'createdAt', 'landedAt').limit(5000).get(),
    db().collection('chats').where('members', 'array-contains', uid).select('createdAt').limit(1000).get(),
    db().doc(`profiles/${uid}`).get(),
  ]);
  const stamps = new Map<string, { c: string; name: string; at: number; dir: 'out' | 'in' }>();
  const stamp = (c: unknown, name: unknown, at: number, dir: 'out' | 'in') => {
    if (typeof c !== 'string' || !c) return;
    const old = stamps.get(c);
    if (!old || at < old.at) stamps.set(c, { c, name: String(name ?? ''), at, dir });
  };
  const langs = new Set<string>();
  const sentCountries = new Set<string>();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const month = new Set<string>();
  let km = 0;
  const journeys: Record<string, unknown>[] = [];
  for (const d of sentQ.docs) {
    const p = d.data();
    const at = (p.landedAt ?? p.createdAt)?.toMillis?.() ?? 0;
    const arrived = p.status === 'landed' || p.status === 'caught';
    if (arrived) {
      if (p.toCountry) sentCountries.add(String(p.toCountry));
      km += Number(p.km) || 0;
      stamp(p.toCountry, p.toCountryName, at, 'out');
      if (p.toLang) langs.add(String(p.toLang));
      if (at >= monthStart.getTime() && p.toCountry) month.add(String(p.toCountry));
    }
    journeys.push({ id: d.id, status: p.status, country: p.toCountry ?? '', countryName: p.toCountryName ?? '', city: p.toCity ?? '', km: Math.round(Number(p.km) || 0), at: p.createdAt?.toMillis?.() ?? 0 });
  }
  let received = 0;
  for (const d of gotQ.docs) {
    const p = d.data();
    if (p.status !== 'landed' && p.status !== 'caught') continue;
    received++;
    const at = (p.landedAt ?? p.createdAt)?.toMillis?.() ?? 0;
    stamp(p.fromCountry, p.fromCountryName, at, 'in');
    if (p.fromLang) langs.add(String(p.fromLang));
    if (at >= monthStart.getTime() && p.fromCountry) month.add(String(p.fromCountry));
  }
  journeys.sort((a, b) => (b.at as number) - (a.at as number));
  const pr = prof.data() ?? {};
  const earned: string[] = [];
  if (sentQ.size >= 1) earned.push('first_pigeon');
  if (stamps.size >= 5) earned.push('countries_5');
  if (langs.size >= 5) earned.push('langs_5');
  if (pr.photoUrl && pr.bio) earned.push('profile_full');
  if (km >= 10000) earned.push('km_10k');
  if (chatsQ.size >= 10) earned.push('chats_10');
  return {
    sent: sentQ.size, received, countries: sentCountries.size, km: Math.round(km), chats: chatsQ.size, langs: langs.size,
    stamps: [...stamps.values()].sort((a, b) => a.at - b.at),
    journeys: journeys.slice(0, 20),
    achievements: earned,
    monthCountries: month.size,
  };
});

export const releasePigeon = onCall(async req => {
  const uid = requireUid(req);
  const ref = db().doc(`pigeons/${String(req.data?.id ?? '')}`);
  const s = await ref.get();
  const p = s.data() as Pigeon | undefined;
  if (!p || p.toUid !== uid || p.status !== 'landed') fail('not_yours');
  await moveOn(ref, p!);
  return { ok: true };
});
