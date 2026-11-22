// First-line text checks. Add an ML moderation service (for example Perspective API) before a large launch.

export const MAX_PIGEON_LEN = 400;
export const MAX_MESSAGE_LEN = 1000;

// Words and link patterns that scammers and spammers use in first contact. Extend per market.
const BANNED = ['onlyfans', 'porn', 'xxx', 'سكس', 'escort', 'sugar daddy', 'crypto signal', 'investment profit'];
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|me|io|ly|gg|xyz|site|link)\b|t\.me\/|wa\.me\/)/i;
const PHONE = /(\+?\d[\d\s\-()]{7,}\d)/;

export type TextProblem = 'empty' | 'too_long' | 'link' | 'phone' | 'banned';

export function normalize(s: unknown): string {
  return String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** `strict` blocks links and phone numbers: used for pigeons and the first messages of a chat. */
export function checkText(text: string, max: number, strict: boolean): TextProblem | null {
  if (!text) return 'empty';
  if ([...text].length > max) return 'too_long';
  const low = text.toLowerCase();
  if (BANNED.some(w => low.includes(w))) return 'banned';
  if (strict && LINK.test(text)) return 'link';
  if (strict && PHONE.test(text)) return 'phone';
  return null;
}
