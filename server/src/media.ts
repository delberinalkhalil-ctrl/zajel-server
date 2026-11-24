// Photos, voice messages and files sent in chats.
// Files are stored under MEDIA_DIR/chat/<chatId>/ with random names, so a link cannot be guessed,
// and only an allow-list of harmless file types is ever written to the public folder.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from './runtime';

export type MediaKind = 'image' | 'audio' | 'file';
export const MEDIA_KINDS: MediaKind[] = ['image', 'audio', 'file'];

/** Photos, voice messages and files unlock once the chat has this many messages. */
export const MEDIA_AFTER_MESSAGES = 6;
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_MS = 5 * 60 * 1000;

const AUDIO_EXT = ['m4a', 'aac', 'mp3', 'ogg', 'opus', 'wav'];
const FILE_EXT = [
  'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf',
  'zip', 'rar', '7z', 'mp3', 'm4a', 'aac', 'ogg', 'wav', 'mp4', 'mov', '3gp', 'webm',
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic',
];

const dir = () => env('MEDIA_DIR', '/tmp/zajel-media');
const url = () => env('MEDIA_URL');

/** Recognises the image format from the file's first bytes (never trusts the name or the declared type). */
export function imageExt(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (b.subarray(0, 4).toString() === 'GIF8') return 'gif';
  return null;
}

/** Returns the extension to store a file under, or null when the type is not allowed. */
export function mediaExt(kind: MediaKind, body: Buffer, name: string, mime: string): string | null {
  if (kind === 'image') return imageExt(body);
  const fromName = (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] ?? '').toLowerCase();
  if (kind === 'audio') {
    const fromMime: Record<string, string> = { 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'opus', 'audio/wav': 'wav', 'audio/x-wav': 'wav' };
    const e = AUDIO_EXT.includes(fromName) ? fromName : fromMime[mime.split(';')[0].trim().toLowerCase()];
    return e ?? null;
  }
  if (!FILE_EXT.includes(fromName)) return null;
  return fromName === 'jpeg' ? 'jpg' : fromName;
}

/** File name shown in the chat: no path, no control characters, at most 120 characters. */
export function cleanName(name: unknown): string {
  const s = String(name ?? '').split(/[\\/]/).pop()!.replace(/[\u0000-\u001F\u007F<>"]/g, '').trim();
  return [...s].slice(0, 120).join('') || 'file';
}

/** Keeps the chat folder from executing anything and makes browsers download files rather than open them. */
function guard(chatRoot: string) {
  const ht = join(chatRoot, '.htaccess');
  if (existsSync(ht)) return;
  writeFileSync(ht, [
    'Options -Indexes -ExecCGI',
    'RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .shtml .htm .html',
    'RemoveType .php .phtml .phar',
    '<IfModule mod_headers.c>',
    '  Header set X-Content-Type-Options nosniff',
    '  <FilesMatch "\\.(?!(jpg|png|webp|gif|m4a|aac|mp3|ogg|opus|wav)$)[^.]+$">',
    '    Header set Content-Disposition attachment',
    '  </FilesMatch>',
    '</IfModule>',
    '',
  ].join('\n'));
}

export function saveMedia(chatId: string, ext: string, body: Buffer): string {
  const root = join(dir(), 'chat');
  mkdirSync(root, { recursive: true });
  guard(root);
  const folder = join(root, chatId);
  mkdirSync(folder, { recursive: true });
  const file = `${randomBytes(12).toString('hex')}.${ext}`;
  writeFileSync(join(folder, file), body);
  return `${url()}/chat/${chatId}/${file}`;
}

/** Only links to files stored for this chat are accepted in messages. */
export function isChatMediaUrl(chatId: string, u: unknown): boolean {
  if (typeof u !== 'string') return false;
  const prefix = `${url()}/chat/${chatId}/`;
  return u.startsWith(prefix) && /^[a-f0-9]{24}\.[a-z0-9]{2,5}$/.test(u.slice(prefix.length));
}

export function removeChatMedia(chatId: string) {
  try { rmSync(join(dir(), 'chat', chatId), { recursive: true, force: true }); } catch { /* nothing stored */ }
}

/** The short text used for the chat list and notifications. */
export function mediaLabel(kind: MediaKind, name: string): string {
  return kind === 'image' ? '📷' : kind === 'audio' ? '🎤' : `📎 ${name}`;
}
