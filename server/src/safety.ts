import { onCall } from './runtime';
import { AUTO_BAN_REPORTS } from './config';
import { bad, db, FieldValue, requireUid, Timestamp } from './common';
import { normalize } from './moderation';

const REASONS = ['spam', 'scam', 'sexual', 'harassment', 'underage', 'fake', 'other'];

async function setChatsBlocked(a: string, b: string, blocked: boolean) {
  const chats = await db().collection('chats').where('members', 'array-contains', a).get();
  await Promise.all(chats.docs.filter(c => (c.data().members as string[]).includes(b)).map(c => c.ref.update({ blocked })));
}

export const blockUser = onCall(async req => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? '');
  if (!target || target === uid) bad('bad_user');
  await db().doc(`users/${uid}`).update({ blocked: FieldValue.arrayUnion(target) });
  await setChatsBlocked(uid, target, true);
  return { ok: true };
});

export const unblockUser = onCall(async req => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? '');
  await db().doc(`users/${uid}`).update({ blocked: FieldValue.arrayRemove(target) });
  const them = (await db().doc(`users/${target}`).get()).data();
  if (!(them?.blocked ?? []).includes(uid)) await setChatsBlocked(uid, target, false);
  return { ok: true };
});

/** Reports also block. Several independent reports pause the account until a moderator reviews it. */
export const reportUser = onCall(async req => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? '');
  const reason = String(req.data?.reason ?? '');
  if (!target || target === uid) bad('bad_user');
  if (!REASONS.includes(reason)) bad('bad_reason');
  // Only someone who actually talked with the person can report them, so reports cannot be used to ban strangers.
  const chatId = String(req.data?.chatId ?? '');
  const chat = chatId ? (await db().doc(`chats/${chatId}`).get()).data() : undefined;
  const members = (chat?.members ?? []) as string[];
  if (!members.includes(uid) || !members.includes(target)) bad('not_member');
  await db().collection('reports').add({
    by: uid, target, reason, note: normalize(req.data?.note).slice(0, 500), chatId,
    at: Timestamp.now(), status: 'open',
  });
  await db().doc(`users/${uid}`).update({ blocked: FieldValue.arrayUnion(target) });
  await setChatsBlocked(uid, target, true);
  const week = Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const recent = await db().collection('reports').where('target', '==', target).where('at', '>=', week).get();
  const reporters = new Set(recent.docs.map(d => d.data().by));
  // "Possibly under 18" reports go to the top of the review queue; a single report never bans anyone by itself.
  if (reason === 'underage') await db().doc(`users/${target}`).update({ review: true, reviewReason: 'underage', reviewAt: Timestamp.now() });
  if (reporters.size >= AUTO_BAN_REPORTS) {
    await db().doc(`users/${target}`).update({ banned: true, receiving: false, bannedAt: Timestamp.now(), banReason: 'auto_reports' });
  }
  return { ok: true };
});
