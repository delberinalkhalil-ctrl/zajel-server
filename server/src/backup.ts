// Daily backup of the database to a folder outside the public web root. Keeps the last 7 files.
// Restoring is done by hand after checking the file: it is gzipped JSON, one entry per document.
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createGzip } from 'node:zlib';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';
import { db } from './common';
import { env, logger } from './runtime';

const COLLECTIONS = ['users', 'profiles', 'pigeons', 'chats', 'reports', 'calls', 'config', 'admins', 'adminLog'];
const KEEP = 7;
/** Free Firebase plan: 50,000 reads a day. The backup never uses more than this many. */
const MAX_DOCS = 25_000;

export const backupDir = () => env('BACKUP_DIR', join(homedir(), 'zajel-backups'));

/** Turns Firestore values into plain JSON; timestamps become {"_ts": millis}. */
export function plain(v: unknown): unknown {
  if (v instanceof Timestamp) return { _ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') {
    if (typeof (v as any).path === 'string' && typeof (v as any).id === 'string' && (v as any).firestore) return { _ref: (v as any).path };
    return Object.fromEntries(Object.entries(v as DocumentData).map(([k, x]) => [k, plain(x)]));
  }
  return v;
}

const fileFor = (d: Date) => join(backupDir(), `zajel-${d.toISOString().slice(0, 10)}.json.gz`);
export const backupExists = (d = new Date()) => existsSync(fileFor(d));

export async function runBackup(): Promise<{ file: string; docs: number; truncated: boolean }> {
  const dir = backupDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = fileFor(new Date());
  const gz = createGzip();
  const out = gz.pipe(createWriteStream(file, { mode: 0o600 }));
  const write = (s: string) => new Promise<void>(res => { if (!gz.write(s)) gz.once('drain', () => res()); else res(); });
  let docs = 0, truncated = false;
  await write(`{"at":${Date.now()},"collections":{`);
  for (const [ci, name] of COLLECTIONS.entries()) {
    await write(`${ci ? ',' : ''}${JSON.stringify(name)}:[`);
    const snap = await db().collection(name).limit(Math.max(0, MAX_DOCS - docs)).get();
    let first = true;
    for (const d of snap.docs) {
      const row: Record<string, unknown> = { id: d.id, data: plain(d.data()) };
      docs++;
      if (name === 'chats' && docs < MAX_DOCS) {
        const m = await d.ref.collection('messages').orderBy('at').limit(Math.min(2000, MAX_DOCS - docs)).get();
        docs += m.size;
        row.messages = m.docs.map(x => ({ id: x.id, data: plain(x.data()) }));
      }
      await write((first ? '' : ',') + JSON.stringify(row));
      first = false;
    }
    if (docs >= MAX_DOCS) truncated = true;
    await write(']');
  }
  await write(`},"docs":${docs},"truncated":${truncated}}`);
  gz.end();
  await new Promise<void>((res, rej) => { out.on('finish', () => res()); out.on('error', rej); });
  const files = readdirSync(dir).filter(f => /^zajel-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) rmSync(join(dir, f), { force: true });
  logger.info('backup written', { file, docs, truncated });
  return { file, docs, truncated };
}

/** Lists backups for the admin page: name, size and date only. */
export function listBackups() {
  const dir = backupDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json.gz')).sort().reverse()
    .map(f => { const s = statSync(join(dir, f)); return { name: f, bytes: s.size, at: s.mtimeMs }; });
}
