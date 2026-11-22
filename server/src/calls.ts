import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { env, onCall } from './runtime';
import { CALLS_AFTER_MESSAGES, COST, RING_SECONDS } from './config';
import { bad, db, fail, FieldValue, getUser, isVip, numericUid, requireUid, Timestamp, UserDoc } from './common';
import { memberChat } from './chats';
import { fmt, pushTo } from './notify';

const secrets = {};

function token(channel: string, uid: string) {
  const appId = env('AGORA_APP_ID'), cert = env('AGORA_CERT');
  if (!appId || !cert) fail('calls_unavailable');
  const n = numericUid(uid);
  return { appId, uid: n, token: RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, n, RtcRole.PUBLISHER, 3600, 3600) };
}

/** Rings the other person. The caller pays when the call is answered. */
export const startCall = onCall(secrets, async req => {
  const uid = requireUid(req);
  const type = req.data?.type === 'video' ? 'video' : 'voice';
  const { c, other } = await memberChat(uid, String(req.data?.chatId ?? ''));
  if (c.blocked) fail('blocked');
  const [me, themSnap] = await Promise.all([getUser(uid), db().doc(`users/${other}`).get()]);
  const them = themSnap.data() as UserDoc | undefined;
  if (!them || (them.blocked ?? []).includes(uid)) fail('blocked');
  const rule = them!.settings?.calls ?? 'all';
  if (rule === 'none') fail('calls_off');
  if (rule === 'ten' && (c.messageCount ?? 0) < CALLS_AFTER_MESSAGES) fail('calls_need_messages');
  if (!isVip(me) && me.points < COST[type]) fail('no_points');

  if (!env('AGORA_APP_ID')) fail('calls_unavailable');
  const ref = db().collection('calls').doc();
  await ref.set({
    chatId: c.pigeonId ?? req.data.chatId, from: uid, to: other, members: [uid, other], type, status: 'ringing',
    createdAt: Timestamp.now(), cost: isVip(me) ? 0 : COST[type],
  });
  await pushTo(other, {
    title: fmt(them!.lang, 'call_t', { name: me.name }), body: fmt(them!.lang, type), call: true,
    data: { type: 'call', callId: ref.id, kind: type, name: me.name },
  });
  return { callId: ref.id, channel: ref.id, ...token(ref.id, uid) };
});

export const answerCall = onCall(secrets, async req => {
  const uid = requireUid(req);
  const ref = db().doc(`calls/${String(req.data?.callId ?? '')}`);
  const accept = !!req.data?.accept;
  let result: Record<string, unknown> = {};
  await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    const call = s.data();
    if (!call || call.to !== uid) fail('not_found');
    if (call!.status !== 'ringing' || Date.now() - call!.createdAt.toMillis() > RING_SECONDS * 1000) fail('call_over');
    if (!accept) { tx.update(ref, { status: 'declined', endedAt: Timestamp.now() }); return; }
    const callerRef = db().doc(`users/${call!.from}`);
    const caller = (await tx.get(callerRef)).data() as UserDoc;
    if (call!.cost > 0) {
      if (caller.points < call!.cost) { tx.update(ref, { status: 'failed', reason: 'no_points' }); fail('caller_no_points'); }
      tx.update(callerRef, { points: FieldValue.increment(-call!.cost) });
    }
    tx.update(ref, { status: 'active', startedAt: Timestamp.now() });
    result = { channel: s.id, type: call!.type };
  });
  return accept ? { ...result, ...token(String(result.channel), uid) } : { ok: true };
});

export const endCall = onCall(async req => {
  const uid = requireUid(req);
  const ref = db().doc(`calls/${String(req.data?.callId ?? '')}`);
  const s = await ref.get();
  const call = s.data();
  if (!call || !(call.members as string[]).includes(uid)) bad('not_found');
  if (['ringing', 'active'].includes(call!.status)) {
    await ref.update({ status: call!.status === 'ringing' ? 'missed' : 'ended', endedAt: Timestamp.now() });
  }
  return { ok: true };
});
