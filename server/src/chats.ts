import { onCall } from './runtime';
import { bad, checkRestricted, db, fail, FieldValue, getUser, isVip, requireUid, Timestamp, UserDoc } from './common';
import { checkText, MAX_MESSAGE_LEN, normalize } from './moderation';
import { pushTo } from './notify';
import { translateAll } from './translate';
import { cleanName, isChatMediaUrl, MAX_AUDIO_MS, MAX_MEDIA_BYTES, MEDIA_AFTER_MESSAGES, MEDIA_KINDS, MediaKind, mediaLabel } from './media';

const STRICT_FIRST_MESSAGES = 6;

export async function memberChat(uid: string, chatId: string) {
  const ref = db().doc(`chats/${chatId}`);
  const s = await ref.get();
  const c = s.data();
  if (!c || !(c.members as string[]).includes(uid)) fail('not_member');
  return { ref, c: c!, other: (c!.members as string[]).find(m => m !== uid)! };
}

/** Checks the optional attachment of a message: a photo, voice message or file uploaded to /media for this chat. */
function readMedia(chatId: string, m: any) {
  if (m == null) return null;
  const kind = String(m.kind) as MediaKind;
  if (!MEDIA_KINDS.includes(kind) || !isChatMediaUrl(chatId, m.url)) bad('bad_media');
  const size = Math.max(0, Math.min(MAX_MEDIA_BYTES, Number(m.size) || 0));
  const out: Record<string, unknown> = { kind, url: m.url as string, size };
  if (kind === 'file') out.name = cleanName(m.name);
  if (kind === 'audio') out.dur = Math.max(0, Math.min(MAX_AUDIO_MS, Math.round(Number(m.dur) || 0)));
  if (kind === 'image') { const w = Number(m.w) || 0, h = Number(m.h) || 0; if (w > 0 && h > 0) { out.w = Math.round(w); out.h = Math.round(h); } }
  return out;
}

export const sendMessage = onCall(async req => {
  const uid = requireUid(req);
  const chatId = String(req.data?.chatId ?? '');
  const { ref, c, other } = await memberChat(uid, chatId);
  if (c.blocked) fail('blocked');
  const media = readMedia(chatId, req.data?.media);
  if (media && (c.messageCount ?? 0) < MEDIA_AFTER_MESSAGES) fail('media_need_messages');
  const text = normalize(req.data?.text);
  if (!media || text) {
    const problem = checkText(text, MAX_MESSAGE_LEN, (c.messageCount ?? 0) < STRICT_FIRST_MESSAGES);
    if (problem) bad(problem);
  }
  const [me, them] = await Promise.all([getUser(uid), db().doc(`users/${other}`).get().then(s => s.data() as UserDoc | undefined)]);
  if (!them) fail('user_gone');
  if ((them!.blocked ?? []).includes(uid) || (me.blocked ?? []).includes(other)) fail('blocked');
  checkRestricted(me);
  const replyTo = await readReply(ref, req.data?.replyTo);

  const { src, tr } = text ? await translateAll(text, [me.lang, them!.lang], me.lang) : { src: me.lang, tr: {} as Record<string, string> };
  const now = Timestamp.now();
  const label = media ? mediaLabel(media.kind as MediaKind, String(media.name ?? '')) : '';
  const ttlH = Number(c.ttlH) || 0;
  await ref.collection('messages').add({
    from: uid, text, src, tr, at: now, ...(media ? { media } : {}), ...(replyTo ? { replyTo } : {}),
    ...(ttlH ? { expireAt: Timestamp.fromMillis(now.toMillis() + ttlH * 3600e3) } : {}),
  });
  const lastText = media ? (text ? `${label} ${text}` : label) : text;
  const lastTr = media && text ? Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, `${label} ${v}`])) : tr;
  await ref.update({
    updatedAt: now, last: { from: uid, text: lastText, tr: lastTr, at: now }, messageCount: FieldValue.increment(1),
    [`unread.${other}`]: FieldValue.increment(1), [`unread.${uid}`]: 0,
  });
  await db().doc(`users/${uid}`).update({ lastActive: now });
  await pushTo(other, { title: me.name, body: lastTr[them!.lang] ?? lastText, data: { type: 'chat', chatId: ref.id } }, 'message');
  return { ok: true, src };
});

/** The quoted message of a reply: must be in the same chat; only a short excerpt is stored. */
async function readReply(chatRef: FirebaseFirestore.DocumentReference, v: unknown) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(v)) return null;
  const m = (await chatRef.collection('messages').doc(v).get()).data();
  if (!m || m.deleted) return null;
  return { id: v, from: m.from as string, text: String(m.text ?? '').slice(0, 140), ...(m.media ? { media: m.media.kind } : {}) };
}

/** Deletes one of your own messages for both people. The attachment link is removed as well. */
export const deleteMessage = onCall(async req => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ''));
  const id = String(req.data?.id ?? '');
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) bad('bad_message');
  const mref = ref.collection('messages').doc(id);
  const m = (await mref.get()).data();
  if (!m || m.from !== uid || m.pigeon || m.system) fail('not_yours');
  await mref.update({ deleted: true, text: '', tr: {}, media: FieldValue.delete(), replyTo: FieldValue.delete() });
  return { ok: true };
});

export const TTL_HOURS = [0, 24, 168];

/** Disappearing messages: new messages in the chat are removed after 24 hours or 7 days. 0 turns it off. */
export const setChatTtl = onCall(async req => {
  const uid = requireUid(req);
  const { ref, c } = await memberChat(uid, String(req.data?.chatId ?? ''));
  if (c.blocked) fail('blocked');
  const hours = Number(req.data?.hours);
  if (!TTL_HOURS.includes(hours)) bad('bad_setting');
  if ((Number(c.ttlH) || 0) === hours) return { ok: true };
  const now = Timestamp.now();
  await ref.update({ ttlH: hours, ttlBy: uid, updatedAt: now, ...(hours ? { ttlEver: true } : {}) });
  await ref.collection('messages').add({ from: uid, text: '', tr: {}, at: now, system: 'ttl', hours });
  return { ok: true };
});

/** Hourly: removes messages whose disappearing time has passed, in chats that use it. */
export async function purgeExpiredMessages() {
  const chats = await db().collection('chats').where('ttlEver', '==', true).limit(500).get();
  let n = 0;
  for (const c of chats.docs) {
    const old = await c.ref.collection('messages').where('expireAt', '<=', Timestamp.now()).limit(400).get();
    if (old.empty) continue;
    const b = db().batch();
    old.docs.forEach(d => b.delete(d.ref));
    await b.commit();
    n += old.size;
  }
  return n;
}

/** Marks that the app has received the chat's latest messages (the double grey tick). */
export const markDelivered = onCall(async req => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ''));
  await ref.update({ [`deliveredAt.${uid}`]: Timestamp.now() });
  return { ok: true };
});

/** Clears the unread counter. VIP members who hide read receipts do not publish a read time. */
export const markRead = onCall(async req => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ''));
  const u = await getUser(uid);
  const hide = isVip(u) && u.settings?.hideRead;
  const now = Timestamp.now();
  await ref.update({ [`unread.${uid}`]: 0, [`deliveredAt.${uid}`]: now, ...(hide ? {} : { [`readAt.${uid}`]: now }) });
  return { ok: true };
});
