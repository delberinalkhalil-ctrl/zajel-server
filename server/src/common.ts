import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp, DocumentData } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from './runtime';

export const db = () => getFirestore();
export { FieldValue, Timestamp };

export function requireUid(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'login_required');
  return req.auth.uid;
}

export const fail = (code: string, detail?: string): never => {
  throw new HttpsError('failed-precondition', code, detail ? { detail } : undefined);
};
export const bad = (code: string): never => {
  throw new HttpsError('invalid-argument', code);
};

export interface UserDoc extends DocumentData {
  name: string;
  lang: string;
  country: string;      // ISO 3166 alpha-2
  countryName: string;
  city: string;
  loc: { lat: number; lon: number };
  points: number;
  /** Extra pigeons given by a moderator, used after the daily free ones. */
  giftPigeons?: number;
  vipUntil?: Timestamp | null;
  vipActive?: boolean;
  freeDate?: string;
  freeLeft?: number;
  receiving: boolean;
  banned: boolean;
  blocked: string[];
  fcm: string[];
  rand: number;
  lastActive: Timestamp;
  settings: {
    notif?: boolean; sound?: boolean; showCity?: boolean;
    calls?: 'all' | 'ten' | 'none'; ghost?: boolean; hideRead?: boolean; badge?: boolean; priority?: boolean;
  };
}

/** Accounts a moderator restricted cannot send pigeons, messages or calls until the date passes. */
export function checkRestricted(u: Partial<UserDoc>) {
  const until = (u as any).restrictedUntil as Timestamp | undefined;
  if (until && until.toMillis() > Date.now()) fail('restricted', new Date(until.toMillis()).toISOString());
}

export const isVip = (u: Partial<UserDoc>) => !!u.vipUntil && u.vipUntil.toMillis() > Date.now();
export const todayUtc = () => new Date().toISOString().slice(0, 10);
export const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Stable 31-bit numeric id for Agora, and the obfuscated account id sent to Google Play. */
export const numericUid = (uid: string) => (parseInt(sha(uid).slice(0, 8), 16) % 2147483646) + 1;
export const playAccountId = (uid: string) => sha('zajel:' + uid).slice(0, 64);

export async function getUser(uid: string): Promise<UserDoc> {
  const s = await db().doc(`users/${uid}`).get();
  if (!s.exists) fail('no_profile');
  const u = s.data() as UserDoc;
  if (u.banned) fail('banned');
  return u;
}

/** City shown to others, honouring the user's "show my city" setting. */
export const publicCity = (u: Partial<UserDoc>) => (u.settings?.showCity === false ? '' : u.city ?? '');
