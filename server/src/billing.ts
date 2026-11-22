import { androidpublisher, auth } from '@googleapis/androidpublisher';
import { logger } from './runtime';
import { env, onCall } from './runtime';
import { FREE_MODE, POINT_PRODUCTS, VIP_PRODUCTS } from './config';
import { bad, db, fail, FieldValue, playAccountId, requireUid, sha, Timestamp } from './common';


let client: ReturnType<typeof androidpublisher> | null = null;
const play = () => (client ??= androidpublisher({
  version: 'v3',
  auth: new auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }),
}));

/**
 * Verifies a Google Play purchase with Google before granting anything.
 * Points: credited once per purchase token. VIP: vipUntil follows the subscription expiry, so calling this
 * again after a renewal (the app does on start) extends it.
 */
export const verifyPurchase = onCall(async req => {
  const uid = requireUid(req);
  if (FREE_MODE) fail('store_closed');
  const productId = String(req.data?.productId ?? '');
  const token = String(req.data?.token ?? '');
  if (!token || token.length > 2000) bad('bad_token');
  const packageName = env('PLAY_PACKAGE_NAME', 'app.zajel');
  const purchaseRef = db().doc(`purchases/${sha(token)}`);
  const userRef = db().doc(`users/${uid}`);

  if (POINT_PRODUCTS[productId]) {
    const { data } = await play().purchases.products.get({ packageName, productId, token });
    if (data.purchaseState !== 0) fail('not_purchased');
    if (data.obfuscatedExternalAccountId && data.obfuscatedExternalAccountId !== playAccountId(uid)) fail('other_account');
    let granted = 0;
    await db().runTransaction(async tx => {
      const p = await tx.get(purchaseRef);
      if (p.exists) { if (p.data()!.uid !== uid) fail('other_account'); return; }
      granted = POINT_PRODUCTS[productId];
      tx.set(purchaseRef, { uid, productId, kind: 'points', points: granted, orderId: data.orderId ?? '', at: Timestamp.now() });
      tx.update(userRef, { points: FieldValue.increment(granted) });
    });
    logger.info('points purchase', { uid, productId, granted });
    return { ok: true, granted };
  }

  if (VIP_PRODUCTS.includes(productId)) {
    const { data } = await play().purchases.subscriptionsv2.get({ packageName, token });
    const state = data.subscriptionState ?? '';
    if (data.externalAccountIdentifiers?.obfuscatedExternalAccountId &&
      data.externalAccountIdentifiers.obfuscatedExternalAccountId !== playAccountId(uid)) fail('other_account');
    const expiry = Math.max(0, ...(data.lineItems ?? []).map(l => Date.parse(l.expiryTime ?? '') || 0));
    const active = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(state) && expiry > Date.now();
    const prev = await purchaseRef.get();
    if (prev.exists && prev.data()!.uid !== uid) fail('other_account');
    await purchaseRef.set({ uid, productId, kind: 'vip', state, expiry: Timestamp.fromMillis(expiry || Date.now()), at: Timestamp.now() }, { merge: true });
    if (active) {
      await userRef.update({ vipUntil: Timestamp.fromMillis(expiry), vipActive: true });
      await db().doc(`profiles/${uid}`).set({ vip: true }, { merge: true });
    }
    return { ok: true, active, expiry };
  }
  bad('unknown_product');
});
