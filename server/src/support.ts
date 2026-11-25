// "Zajel team" conversation: every account has one, pinned in its chat list and impossible to delete.
// The person writes from the app; moderators answer from the admin page. Messages are translated both ways:
// into Arabic and English for the team, into the person's language for them.
//
// support/{uid}: { name, lang, last: {text, from, at}, unreadUser, unreadTeam, updatedAt }
// support/{uid}/messages/{id}: { from: 'user'|'team', by?, text, src, tr, at }
import { bad, db, FieldValue, getUser, requireUid, Timestamp } from './common';
import { HttpsError, onCall } from './runtime';
import { checkText, normalize } from './moderation';
import { translateAll } from './translate';
import { fmt, pushTo } from './notify';
import { needRole, logAdmin, nameOf } from './admin';

const TEAM_LANGS = ['ar', 'en'];
const MAX = 2000;

export const supportSend = onCall(async req => {
  const uid = requireUid(req);
  const text = normalize(req.data?.text).slice(0, MAX);
  if (!text) bad('empty');
  const u = await getUser(uid);
  const problem = checkText(text, MAX, false);
  if (problem) bad(problem);
  const { src, tr } = await translateAll(text, [...TEAM_LANGS, u.lang]);
  const ref = db().doc(`support/${uid}`);
  const now = Timestamp.now();
  await ref.collection('messages').add({ from: 'user', text, src, tr, at: now });
  await ref.set({
    name: u.name, lang: u.lang, country: u.countryName ?? '', updatedAt: now,
    last: { text: text.slice(0, 140), from: 'user', at: now }, unreadTeam: FieldValue.increment(1), unreadUser: 0,
  }, { merge: true });
  return { ok: true };
});

export const supportRead = onCall(async req => {
  const uid = requireUid(req);
  const ref = db().doc(`support/${uid}`);
  if ((await ref.get()).exists) await ref.update({ unreadUser: 0 });
  return { ok: true };
});

/** Conversations with the team, the newest first, for the admin page. */
export const adminSupportList = onCall(async req => {
  await needRole(req, 'mod');
  const q = await db().collection('support').orderBy('updatedAt', 'desc').limit(100).get();
  return {
    rows: q.docs.map(d => {
      const x = d.data();
      return { uid: d.id, name: x.name ?? '', country: x.country ?? '', lang: x.lang ?? '', last: x.last?.text ?? '', lastFrom: x.last?.from ?? '', unread: x.unreadTeam ?? 0, at: x.updatedAt?.toMillis?.() ?? null };
    }),
  };
});

export const adminSupportThread = onCall(async req => {
  await needRole(req, 'mod');
  const uid = String(req.data?.uid ?? '');
  const ref = db().doc(`support/${uid}`);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError('not-found', 'not_found');
  const m = await ref.collection('messages').orderBy('at', 'desc').limit(200).get();
  await ref.update({ unreadTeam: 0 });
  return {
    who: await nameOf(uid), lang: doc.data()!.lang ?? '',
    messages: m.docs.reverse().map(d => {
      const x = d.data();
      return { id: d.id, from: x.from, text: x.text, ar: x.tr?.ar ?? '', en: x.tr?.en ?? '', byEmail: x.byEmail ?? '', at: x.at?.toMillis?.() ?? null };
    }),
  };
});

/** The team answers; the person gets it in their language with a notification. */
export const adminSupportReply = onCall(async req => {
  const me = await needRole(req, 'mod');
  const uid = String(req.data?.uid ?? '');
  const text = normalize(req.data?.text).slice(0, MAX);
  if (!text) bad('empty');
  const u = await getUser(uid);
  const { src, tr } = await translateAll(text, [u.lang, ...TEAM_LANGS]);
  const ref = db().doc(`support/${uid}`);
  const now = Timestamp.now();
  await ref.collection('messages').add({ from: 'team', by: me.uid, byEmail: me.email, text, src, tr, at: now });
  await ref.set({ name: u.name, lang: u.lang, updatedAt: now, last: { text: (tr[u.lang] ?? text).slice(0, 140), from: 'team', at: now }, unreadUser: FieldValue.increment(1), unreadTeam: 0 }, { merge: true });
  await logAdmin(me, 'support_reply', { target: uid });
  await pushTo(uid, { title: fmt(u.lang, 'support_t'), body: (tr[u.lang] ?? text).slice(0, 120), data: { type: 'support' } }, 'message').catch(() => undefined);
  return { ok: true };
});
