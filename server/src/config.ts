// Business rules. The app shows the same numbers (lib/core/config.dart); the server is the authority.

// FREE_MODE=1 (default): no in-app purchases; every feature is free, with a daily pigeon cap against spam.
// Set FREE_MODE=0 to turn points, VIP and Google Play purchases back on.
export const FREE_MODE = (process.env.FREE_MODE ?? '1') !== '0';
export const FREE_MODE_DAILY_PIGEONS = 20;

export const COST = FREE_MODE
  ? { extra: 0, dest: 0, fast: 0, voice: 0, video: 0 }
  : { extra: 10, dest: 20, fast: 15, voice: 30, video: 50 };
export const FREE_PIGEONS_PER_DAY = FREE_MODE ? FREE_MODE_DAILY_PIGEONS : 3;
export const START_POINTS = 120;
export const MAX_FLYING_PER_USER = 3;

// Flight time: a normal pigeon flies NORMAL_KMH, clamped between MIN and MAX minutes. A fast one takes FAST_MIN.
export const NORMAL_KMH = 1500;
export const MIN_FLIGHT_MIN = 20;
export const MAX_FLIGHT_MIN = 480;
export const FAST_MIN = 30;

export const MAX_HOPS = 5;                 // a released pigeon tries this many people before it gives up
export const LANDED_AUTO_RELEASE_H = 24;   // an uncaught pigeon moves on after this long
export const WAITING_EXPIRE_DAYS = 7;      // a pigeon nobody could receive expires
export const ACTIVE_WITHIN_DAYS = 30;      // only people active recently receive pigeons
export const CALLS_AFTER_MESSAGES = 10;    // for the "after 10 messages" call setting
export const RING_SECONDS = 45;
export const AUTO_BAN_REPORTS = 5;         // distinct reporters within 7 days

export const POINT_PRODUCTS: Record<string, number> = {
  points_100: 100,
  points_550: 550,
  points_1200: 1200,
  points_3000: 3000,
};
export const VIP_PRODUCTS = ['vip_monthly', 'vip_quarterly', 'vip_yearly'];

export const LANGS = ['ar', 'en', 'fr', 'tr', 'he', 'es', 'pt', 'fa', 'ru', 'zh', 'hi', 'ku'] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (x: unknown): x is Lang => typeof x === 'string' && (LANGS as readonly string[]).includes(x);

// Google Cloud Translation codes that differ from ours.
export const toGoogleLang = (l: string) => (l === 'zh' ? 'zh-CN' : l);
export const fromGoogleLang = (l: string) => {
  const b = (l || '').toLowerCase();
  if (b.startsWith('zh')) return 'zh';
  if (b === 'iw') return 'he';
  return b.split('-')[0];
};
