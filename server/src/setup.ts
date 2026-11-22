// One-time setup, run on the server: `node dist/setup.js`
// Publishes firestore.rules and creates the composite indexes from firestore.indexes.json,
// using the same service account as the API (no Firebase CLI or billing needed).
import './loadenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applicationDefault } from 'firebase-admin/app';

const root = join(__dirname, '..');
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '', 'utf8')) as { project_id: string };
const project = sa.project_id;

async function api(url: string, method: string, body?: unknown) {
  const { access_token } = await applicationDefault().getAccessToken();
  const r = await fetch(url, {
    method, headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return { status: r.status, text };
}

async function rules() {
  const content = readFileSync(join(root, 'firestore.rules'), 'utf8');
  const rs = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, 'POST', {
    source: { files: [{ name: 'firestore.rules', content }] },
  });
  if (rs.status !== 200) throw new Error('ruleset ' + rs.text);
  const name = JSON.parse(rs.text).name as string;
  const rel = `projects/${project}/releases/cloud.firestore`;
  let r = await api(`https://firebaserules.googleapis.com/v1/${rel}`, 'PATCH', { release: { name: rel, rulesetName: name } });
  if (r.status === 404) r = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, 'POST', { name: rel, rulesetName: name });
  console.log('rules', r.status === 200 ? 'published' : r.text);
}

async function indexes() {
  const spec = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8')) as {
    indexes: { collectionGroup: string; queryScope: string; fields: Record<string, string>[] }[];
  };
  for (const ix of spec.indexes) {
    const r = await api(
      `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${ix.collectionGroup}/indexes`,
      'POST', { queryScope: ix.queryScope, fields: ix.fields },
    );
    const label = `${ix.collectionGroup}(${ix.fields.map(f => f.fieldPath).join(',')})`;
    console.log('index', label, r.status === 200 ? 'creating' : r.status === 409 ? 'exists' : r.text.slice(0, 200));
  }
}

(async () => {
  await rules();
  await indexes();
  console.log('done. Indexes take a few minutes to build.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
