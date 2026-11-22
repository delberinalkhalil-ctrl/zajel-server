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
