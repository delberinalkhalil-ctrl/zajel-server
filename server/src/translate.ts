import { env, httpJson, logger } from './runtime';

// Translation provider, chosen by environment:
//   GOOGLE_TRANSLATE_KEY set -> Google Cloud Translation (needs a billing account)
//   DEEPL_KEY set            -> DeepL
//   otherwise                -> MyMemory (free; set MYMEMORY_EMAIL for 50,000 characters a day)
// A failure never blocks a conversation: the original text is used instead.

const MM: Record<string, string> = { zh: 'zh-CN', he: 'he', ku: 'ku', fa: 'fa', hi: 'hi' };

function chunks(text: string, max = 450): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = '';
  for (const part of text.split(/(?<=[.!?؟。\n])\s*/)) {
    if ((cur + ' ' + part).length > max && cur) { out.push(cur); cur = part; } else cur = cur ? cur + ' ' + part : part;
    while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur) out.push(cur);
  return out;
}

async function myMemory(text: string, from: string, to: string): Promise<string> {
  const parts: string[] = [];
  for (const c of chunks(text)) {
    const u = new URL('https://api.mymemory.translated.net/get');
    u.searchParams.set('q', c);
    u.searchParams.set('langpair', `${MM[from] ?? from}|${MM[to] ?? to}`);
    const email = env('MYMEMORY_EMAIL');
    if (email) u.searchParams.set('de', email);
    const { json: j } = await httpJson<{ responseStatus?: number | string; responseData?: { translatedText?: string } }>(u, { timeoutMs: 8000 });
    const t = j?.responseData?.translatedText;
    if (Number(j?.responseStatus) !== 200 || !t || /MYMEMORY WARNING/i.test(t)) throw new Error('mymemory ' + j.responseStatus);
    parts.push(t);
  }
  return parts.join(' ');
}

async function deepl(text: string, from: string, to: string): Promise<string> {
  const key = env('DEEPL_KEY');
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const { status, json: j } = await httpJson<{ translations?: { text: string }[] }>(`https://${host}/v2/translate`, {
    method: 'POST', timeoutMs: 8000,
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [text], target_lang: to === 'pt' ? 'PT-BR' : to === 'zh' ? 'ZH-HANS' : to.toUpperCase(), source_lang: from.toUpperCase() }),
  });
  if (!j?.translations?.[0]) throw new Error('deepl ' + status);
  return j.translations[0].text;
}

async function google(text: string, from: string, to: string): Promise<string> {
  const { status, json: j } = await httpJson<{ data?: { translations?: { translatedText: string }[] } }>(`https://translation.googleapis.com/language/translate/v2?key=${env('GOOGLE_TRANSLATE_KEY')}`, {
    method: 'POST', timeoutMs: 8000, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: from === 'zh' ? 'zh-CN' : from, target: to === 'zh' ? 'zh-CN' : to, format: 'text' }),
  });
  const t = j?.data?.translations?.[0]?.translatedText;
  if (!t) throw new Error('google ' + status);
  return t;
}

const engine = () => (env('GOOGLE_TRANSLATE_KEY') ? google : env('DEEPL_KEY') ? deepl : myMemory);

/** Translate `text`, written in `from` (the sender's language), into every language in `targets`. */
export async function translateAll(text: string, targets: string[], from?: string): Promise<{ src: string; tr: Record<string, string> }> {
  const src = from || 'und';
  const out: Record<string, string> = {};
  for (const t of [...new Set(targets)]) {
    if (t === src || src === 'und') { out[t] = text; continue; }
    try {
      out[t] = await engine()(text, src, t);
    } catch (e) {
      logger.warn('translate failed', t, String(e));
      out[t] = text;
    }
  }
  return { src, tr: out };
}
