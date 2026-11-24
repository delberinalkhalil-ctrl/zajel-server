// Per-person limits that keep one account (or a script) from flooding others or filling the host's disk.
// Kept in memory: a restart forgets them, which is fine for abuse protection.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Calls allowed per person: [how many, per how many seconds]. Anything not listed falls under `default`. */
export const CALL_LIMITS: Record<string, [number, number]> = {
  default: [120, 60],
  sendMessage: [40, 60],
  sendPigeon: [10, 60],
  startCall: [6, 60],
  reportUser: [10, 3600],
  blockUser: [30, 3600],
  initUser: [20, 3600],
  deleteAccount: [5, 3600],
  media: [30, 600],
  avatar: [10, 3600],
  logError: [30, 3600],
  deleteMessage: [60, 600],
  setChatTtl: [20, 3600],
  countryFact: [60, 3600],
  adminChat: [60, 3600],
};
/** Bytes of photos, voice messages and files one person may upload per day. */
export const MEDIA_BYTES_PER_DAY = 300 * 1024 * 1024;

export class Limiter {
  private hits = new Map<string, number[]>();
  private bytes = new Map<string, { day: string; n: number }>();
  constructor(private now: () => number = Date.now) {}

  /** Records one call and says whether it is within the limit. */
  allow(uid: string, name: string): boolean {
    const [max, sec] = CALL_LIMITS[name] ?? CALL_LIMITS.default;
    const key = `${uid}:${name in CALL_LIMITS ? name : 'default'}`;
    const t = this.now();
    const list = (this.hits.get(key) ?? []).filter(x => t - x < sec * 1000);
    if (list.length >= max) { this.hits.set(key, list); return false; }
    list.push(t);
    this.hits.set(key, list);
    if (this.hits.size > 50_000) this.sweep();
    return true;
  }

  /** Adds an upload to today's total; false when it would go over the daily allowance. */
  addBytes(uid: string, n: number): boolean {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    const cur = this.bytes.get(uid);
    const used = cur?.day === day ? cur.n : 0;
    if (used + n > MEDIA_BYTES_PER_DAY) return false;
    this.bytes.set(uid, { day, n: used + n });
    return true;
  }

  private sweep() {
    const t = this.now();
    for (const [k, v] of this.hits) if (!v.some(x => t - x < 3600_000)) this.hits.delete(k);
  }
}

/** The public media folder must never list its contents or run scripts. */
export function guardMediaRoot(root: string) {
  try {
    mkdirSync(root, { recursive: true });
    const rules = 'Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .shtml\nRemoveType .php .phtml .phar\n';
    writeFileSync(join(root, '.htaccess'), rules);
    const av = join(root, 'avatars');
    mkdirSync(av, { recursive: true });
    if (!existsSync(join(av, '.htaccess'))) writeFileSync(join(av, '.htaccess'), rules);
  } catch { /* not a writable folder (local tests) */ }
}
