// Moderation and admin tools, used by the web admin page (zajel/admin). Every call checks the caller's role,
// and every action and every chat a moderator opens is written to adminLog.
//
// Roles: reviewer (sees reports and stats), mod (also opens reported chats and acts), admin (also roles,
// announcements, errors and backups). An account is an admin if its verified email is in ADMIN_EMAILS
// (default: the app owner's email), or by a role in admins/{uid} given from the admin page.
import { getAuth } from 'firebase-admin/auth';
import { db, FieldValue, requireUid, Timestamp, UserDoc } from './common';
import { env, HttpsError, onCall } from './runtime';
import { normalize } from './moderation';
import { listBackups } from './backup';
import { LANGS } from './config';
import { translateAll } from './translate';

export type Role = 'reviewer' | 'mod' | 'admin';
const RANK: Record<Role, number> = { reviewer: 1, mod: 2, admin: 3 };
export const ROLES = Object.keys(RANK) as Role[];

export async function roleOf(uid: string): Promise<{ role: Role | null; email: string }> {
  const [user, doc] = await Promise.all([getAuth().getUser(uid).catch(() => null), db().doc(`admins/${uid}`).get()]);
  const email = (user?.email ?? '').toLowerCase();
  const envAdmins = env('ADMIN_EMAILS', 'delberinalkhalil@gmail.com').toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (email && user?.emailVerified === true && envAdmins.includes(email)) return { role: 'admin', email };
  const r = doc.data()?.role as Role | undefined;
  return { role: r && r in RANK ? r : null, email };
}

async function need(req: { auth?: { uid: string } }, min: Role) {
  const uid = requireUid(req as any);
  const { role, email } = await roleOf(uid);
  if (!role || RANK[role] < RANK[min]) throw new HttpsError('permission-denied', 'not_admin');
  return { uid, role: role!, email };
}

async function log(by: { uid: string; email: string }, action: string, extra: Record<string, unknown>) {
  await db().collection('adminLog').add({ by: by.uid, email: by.email, action, ...extra, at: Timestamp.now() });
}

const ms = (t: any) => (t?.toMillis ? t.toMillis() : null);
const ago = (h: number) => Timestamp.fromMillis(Date.now() - h * 3600e3);

export const adminMe = onCall(async req => {
  const uid = requireUid(req);
  const { role, email } = await roleOf(uid);
  return { role, email };
});

/** Headline numbers. Uses count queries, which cost one read per 1,000 documents. */
export const adminStats = onCall(async req => {
  await need(req, 'reviewer');
  const c = (q: FirebaseFirestore.Query) => q.count().get().then(s => s.data().count);
  const users = db().collection('users'), pigeons = db().collection('pigeons');
  const [total, day, week, pigeonsDay, pigeonsWeek, caughtWeek, chats, openReports, review, banned, errorsDay] = await Promise.all([
    c(users), c(users.where('lastActive', '>=', ago(24))), c(users.where('lastActive', '>=', ago(24 * 7))),
    c(pigeons.where('createdAt', '>=', ago(24))), c(pigeons.where('createdAt', '>=', ago(24 * 7))),
    c(pigeons.where('caughtAt', '>=', ago(24 * 7))),
    c(db().collection('chats')), c(db().collection('reports').where('status', '==', 'open')),
    c(users.where('review', '==', true)), c(users.where('banned', '==', true)),
    c(db().collection('errors').where('at', '>=', ago(24))),
  ]);
  return {
    users: total, active24h: day, active7d: week, pigeons24h: pigeonsDay, pigeons7d: pigeonsWeek,
    catchRate7d: pigeonsWeek ? Math.round((caughtWeek / pigeonsWeek) * 100) : 0,
    chats, openReports, review, banned, errors24h: errorsDay,
  };
});

async function nameOf(uid: string) {
  const p = (await db().doc(`profiles/${uid}`).get()).data();
  return { uid, name: p?.name ?? '?', country: p?.countryName ?? '', photoUrl: p?.photoUrl ?? '' };
}

/** Open (or all) reports, newest first, with names and how often each person was reported this week. */
export const adminReports = onCall(async req => {
  await need(req, 'reviewer');
  const status = ['open', 'actioned', 'dismissed', 'all'].includes(req.data?.status) ? req.data.status : 'open';
  const q = await db().collection('reports').orderBy('at', 'desc').limit(300).get();
  const rows = q.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(r => status === 'all' || (r.status ?? 'open') === status).slice(0, 100);
  const week = Date.now() - 7 * 864e5;
  const counts: Record<string, number> = {};
  for (const d of q.docs) { const r = d.data(); if (ms(r.at)! >= week) counts[r.target] = (counts[r.target] ?? 0) + 1; }
  const ids = [...new Set(rows.flatMap(r => [r.by, r.target]))];
  const names = Object.fromEntries(await Promise.all(ids.map(async id => [id, await nameOf(id)])));
  const flagged = await db().collection('users').where('review', '==', true).limit(50).get();
  return {
    reports: rows.map(r => ({
      id: r.id, reason: r.reason, note: r.note ?? '', chatId: r.chatId ?? '', status: r.status ?? 'open', at: ms(r.at),
      by: names[r.by], target: names[r.target], weekCount: counts[r.target] ?? 0,
    })),
    review: await Promise.all(flagged.docs.map(async d => ({ ...(await nameOf(d.id)), reason: d.data().reviewReason ?? '', at: ms(d.data().reviewAt) }))),
  };
});

/** Account details a moderator needs to decide: status, warnings, restriction, report history. */
export const adminUser = onCall(async req => {
  await need(req, 'reviewer');
  const uid = String(req.data?.uid ?? '');
  const u = (await db().doc(`users/${uid}`).get()).data() as UserDoc | undefined;
  if (!u) throw new HttpsError('not-found', 'not_found');
  const reports = await db().collection('reports').where('target', '==', uid).limit(50).get();
  return {
    ...(await nameOf(uid)), lang: u.lang, createdAt: ms(u.createdAt), lastActive: ms(u.lastActive),
    banned: !!u.banned, review: !!u.review, restrictedUntil: ms(u.restrictedUntil), warnings: (u.warnings ?? []).length,
    reports: reports.docs.map(d => ({ id: d.id, reason: d.data().reason, at: ms(d.data().at), status: d.data().status ?? 'open' })),
  };
});

/** Opens a reported conversation. Only for a report that names this chat; always logged with the report id. */
export const adminChat = onCall(async req => {
  const me = await need(req, 'mod');
  const reportId = String(req.data?.reportId ?? '');
  const rep = (await db().doc(`reports/${reportId}`).get()).data();
  if (!rep?.chatId) throw new HttpsError('failed-precondition', 'no_chat_in_report');
  const chat = (await db().doc(`chats/${rep.chatId}`).get()).data();
  if (!chat) throw new HttpsError('not-found', 'chat_gone');
  const m = await db().collection(`chats/${rep.chatId}/messages`).orderBy('at', 'desc').limit(100).get();
  await log(me, 'view_chat', { reportId, chatId: rep.chatId, target: rep.target });
  return {
    members: await Promise.all((chat.members as string[]).map(nameOf)),
    messages: m.docs.reverse().map(d => {
      const x = d.data();
      return { id: d.id, from: x.from, text: x.deleted ? '' : x.text ?? '', deleted: !!x.deleted, media: x.media?.kind ?? null, at: ms(x.at), system: x.system ?? null };
    }),
  };
});

const ACTIONS = ['warn', 'restrict', 'unrestrict', 'suspend', 'unsuspend', 'dismiss', 'clear_review'] as const;

/** Moderator actions. The person is told about warnings and restrictions in the app. */
export const adminAction = onCall(async req => {
  const me = await need(req, 'mod');
  const action = String(req.data?.action ?? '') as (typeof ACTIONS)[number];
  if (!ACTIONS.includes(action)) throw new HttpsError('invalid-argument', 'bad_action');
  const uid = String(req.data?.uid ?? '');
  const reportId = req.data?.reportId ? String(req.data.reportId) : '';
  const note = normalize(req.data?.note).slice(0, 300);
  const ref = db().doc(`users/${uid}`);
  if (action !== 'dismiss' && !(await ref.get()).exists) throw new HttpsError('not-found', 'not_found');
  const now = Timestamp.now();
  let extra: Record<string, unknown> = {};
  switch (action) {
    case 'warn':
      await ref.update({ warnings: FieldValue.arrayUnion({ at: now, note }), notice: { kind: 'warn', note, at: now } });
      break;
    case 'restrict': {
      const days = Math.max(1, Math.min(30, Math.round(Number(req.data?.days) || 1)));
      const until = Timestamp.fromMillis(Date.now() + days * 864e5);
      await ref.update({ restrictedUntil: until, notice: { kind: 'restrict', note, at: now, until } });
      extra = { days };
      break;
    }
    case 'unrestrict': await ref.update({ restrictedUntil: FieldValue.delete(), notice: FieldValue.delete() }); break;
    case 'suspend': await ref.update({ banned: true, receiving: false, bannedAt: now, banReason: 'moderator', review: false }); break;
    case 'unsuspend': await ref.update({ banned: false, receiving: true, banReason: FieldValue.delete(), review: false }); break;
    case 'clear_review': await ref.update({ review: false }); break;
    case 'dismiss': break;
  }
  if (reportId) await db().doc(`reports/${reportId}`).update({ status: action === 'dismiss' ? 'dismissed' : 'actioned', handledBy: me.uid, handledAt: now });
  await log(me, action, { target: uid, reportId, note, ...extra });
  return { ok: true };
});

export const adminLog = onCall(async req => {
  await need(req, 'mod');
  const q = await db().collection('adminLog').orderBy('at', 'desc').limit(200).get();
  return { rows: q.docs.map(d => ({ id: d.id, ...d.data(), at: ms(d.data().at) })) };
});

export const adminErrors = onCall(async req => {
  await need(req, 'admin');
  const q = await db().collection('errors').orderBy('at', 'desc').limit(200).get();
  return { rows: q.docs.map(d => ({ id: d.id, ...d.data(), at: ms(d.data().at) })), backups: listBackups() };
});

/** Gives or removes a role, by the person's sign-in email. */
export const adminSetRole = onCall(async req => {
  const me = await need(req, 'admin');
  const email = String(req.data?.email ?? '').trim().toLowerCase();
  const role = req.data?.role == null || req.data.role === '' ? null : String(req.data.role) as Role;
  if (role && !ROLES.includes(role)) throw new HttpsError('invalid-argument', 'bad_role');
  const user = await getAuth().getUserByEmail(email).catch(() => null);
  if (!user) throw new HttpsError('not-found', 'no_such_account');
  if (user.uid === me.uid) throw new HttpsError('failed-precondition', 'not_yourself');
  if (role) await db().doc(`admins/${user.uid}`).set({ role, email, at: Timestamp.now(), by: me.uid });
  else await db().doc(`admins/${user.uid}`).delete();
  await log(me, 'set_role', { target: user.uid, email, role });
  return { ok: true };
});

export const adminRoles = onCall(async req => {
  await need(req, 'admin');
  const q = await db().collection('admins').get();
  return { rows: q.docs.map(d => ({ uid: d.id, email: d.data().email, role: d.data().role })) };
});

/** Banner shown at the top of the app until `days` have passed, or until cleared with empty text. */
export const adminAnnounce = onCall(async req => {
  const me = await need(req, 'admin');
  const text = normalize(req.data?.text).slice(0, 200);
  const days = Math.max(1, Math.min(30, Math.round(Number(req.data?.days) || 3)));
  const ref = db().doc('config/announcement');
  if (!text) await ref.set({ active: false, at: Timestamp.now() });
  else {
    const { src, tr } = await translateAll(text, [...LANGS]);
    await ref.set({ active: true, text, src, tr, at: Timestamp.now(), until: Timestamp.fromMillis(Date.now() + days * 864e5) });
  }
  await log(me, 'announce', { text, days });
  return { ok: true };
});
