import { onCall } from './runtime';
import { bad, db, fail, FieldValue, getUser, isVip, requireUid, Timestamp, UserDoc } from './common';
import { checkText, MAX_MESSAGE_LEN, normalize } from './moderation';
import { pushTo } from './notify';
import { translateAll } from './translate';

const STRICT_FIRST_MESSAGES = 6;

export async function memberChat(uid: string, chatId: string) {
  const ref = db().doc(`chats/${chatId}`);
  const s = await ref.get();
  const c = s.data();
  if (!c || !(c.members as string[]).includes(uid)) fail('not_member');
  return { ref, c: c!, other: (c!.members as string[]).find(m => m !== uid)! };
}

export const sendMessage = onCall(async req => {
  const uid = requireUid(req);
  const { ref, c, other } = await memberChat(uid, String(req.data?.chatId ?? ''));
  if (c.blocked) fail('blocked');
  const text = normalize(req.data?.text);
  const problem = checkText(text, MAX_MESSAGE_LEN, (c.messageCount ?? 0) < STRICT_FIRST_MESSAGES);
  if (problem) bad(problem);
  const [me, them] = await Promise.all([getUser(uid), db().doc(`users/${other}`).get().then(s => s.data() as UserDoc | undefined)]);
  if (!them) fail('user_gone');
  if ((them!.blocked ?? []).includes(uid) || (me.blocked ?? []).includes(other)) fail('blocked');

  const { src, tr } = await translateAll(text, [me.lang, them!.lang], me.lang);
  const now = Timestamp.now();
  await ref.collection('messages').add({ from: uid, text, src, tr, at: now });
  await ref.update({
    updatedAt: now, last: { from: uid, text, tr, at: now }, messageCount: FieldValue.increment(1),
    [`unread.${other}`]: FieldValue.increment(1), [`unread.${uid}`]: 0,
  });
  await db().doc(`users/${uid}`).update({ lastActive: now });
  await pushTo(other, { title: me.name, body: tr[them!.lang] ?? text, data: { type: 'chat', chatId: ref.id } });
  return { ok: true, src };
});

/** Clears the unread counter. VIP members who hide read receipts do not publish a read time. */
export const markRead = onCall(async req => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ''));
  const u = await getUser(uid);
  const hide = isVip(u) && u.settings?.hideRead;
  await ref.update({ [`unread.${uid}`]: 0, ...(hide ? {} : { [`readAt.${uid}`]: Timestamp.now() }) });
  return { ok: true };
});
