import { request } from 'node:https';

// Small stand-in for the Firebase Functions API, so the same handlers run in a plain Node.js server.
export class HttpsError extends Error {
  constructor(public code: string, message: string, public details?: unknown) { super(message); }
}
export interface CallableRequest { auth?: { uid: string }; data: any }
export type Handler = (req: CallableRequest) => Promise<unknown>;
export function onCall(h: Handler): Handler;
export function onCall(opts: object, h: Handler): Handler;
export function onCall(a: object | Handler, b?: Handler): Handler { return (b ?? a) as Handler; }
export const logger = {
  info: (...a: unknown[]) => console.log(new Date().toISOString(), ...a),
  warn: (...a: unknown[]) => console.warn(new Date().toISOString(), ...a),
  error: (...a: unknown[]) => console.error(new Date().toISOString(), ...a),
};
export const env = (name: string, def = '') => process.env[name] ?? def;

/**
 * Minimal HTTPS request returning parsed JSON. Uses node:https instead of the global fetch, because fetch (undici)
 * needs WebAssembly memory that shared hosting (CloudLinux) often refuses.
 */
export function httpJson<T = unknown>(url: string | URL, opts: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}): Promise<{ status: number; json: T; text: string }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: opts.method ?? 'GET', headers: opts.headers, timeout: opts.timeoutMs ?? 10000 }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c as Buffer));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json: unknown = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
        resolve({ status: res.statusCode ?? 0, json: json as T, text });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
