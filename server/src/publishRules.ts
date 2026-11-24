// Publishes firestore.rules with the API's own service account (no Firebase CLI needed).
// The server calls publishRulesIfChanged() when it starts, so a deploy that changes the rules applies them.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applicationDefault } from 'firebase-admin/app';
import { httpJson } from './runtime';

const root = join(__dirname, '..');

function projectId() {
  const f = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '';
  return (JSON.parse(readFileSync(f, 'utf8')) as { project_id: string }).project_id;
}

export async function googleApi(url: string, method: string, body?: unknown) {
  const { access_token } = await applicationDefault().getAccessToken();
  const r = await httpJson(url, {
    method, headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, timeoutMs: 30000,
  });
  return { status: r.status, text: r.text };
}

export async function publishRules(): Promise<string> {
  const project = projectId();
  const content = readFileSync(join(root, 'firestore.rules'), 'utf8');
  const rs = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, 'POST', {
    source: { files: [{ name: 'firestore.rules', content }] },
  });
  if (rs.status !== 200) throw new Error('ruleset ' + rs.text.slice(0, 300));
  const name = JSON.parse(rs.text).name as string;
  const rel = `projects/${project}/releases/cloud.firestore`;
  let r = await googleApi(`https://firebaserules.googleapis.com/v1/${rel}`, 'PATCH', { release: { name: rel, rulesetName: name } });
  if (r.status === 404) r = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, 'POST', { name: rel, rulesetName: name });
  if (r.status !== 200) throw new Error('release ' + r.text.slice(0, 300));
  return 'published';
}

/** Publishes the rules only when the file differs from what this server last published. */
export async function publishRulesIfChanged(): Promise<string> {
  const file = join(root, 'firestore.rules');
  if (!existsSync(file) || !process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'skipped';
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  const mark = join(root, 'tmp', 'rules.sha256');
  if (existsSync(mark) && readFileSync(mark, 'utf8').trim() === hash) return 'unchanged';
  const res = await publishRules();
  try { writeFileSync(mark, hash); } catch { /* no tmp folder */ }
  return res;
}
