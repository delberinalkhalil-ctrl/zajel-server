"use strict";

// src/loadenv.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var file = (0, import_node_path.join)(__dirname, "..", ".env");
if ((0, import_node_fs.existsSync)(file)) {
  for (const line of (0, import_node_fs.readFileSync)(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === void 0) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// src/setup.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_app = require("firebase-admin/app");
var root = (0, import_node_path2.join)(__dirname, "..");
var sa = JSON.parse((0, import_node_fs2.readFileSync)(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "", "utf8"));
var project = sa.project_id;
async function api(url, method, body) {
  const { access_token } = await (0, import_app.applicationDefault)().getAccessToken();
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await r.text();
  return { status: r.status, text };
}
async function rules() {
  const content = (0, import_node_fs2.readFileSync)((0, import_node_path2.join)(root, "firestore.rules"), "utf8");
  const rs = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, "POST", {
    source: { files: [{ name: "firestore.rules", content }] }
  });
  if (rs.status !== 200) throw new Error("ruleset " + rs.text);
  const name = JSON.parse(rs.text).name;
  const rel = `projects/${project}/releases/cloud.firestore`;
  let r = await api(`https://firebaserules.googleapis.com/v1/${rel}`, "PATCH", { release: { name: rel, rulesetName: name } });
  if (r.status === 404) r = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, "POST", { name: rel, rulesetName: name });
  console.log("rules", r.status === 200 ? "published" : r.text);
}
async function indexes() {
  const spec = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(root, "firestore.indexes.json"), "utf8"));
  for (const ix of spec.indexes) {
    const r = await api(
      `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${ix.collectionGroup}/indexes`,
      "POST",
      { queryScope: ix.queryScope, fields: ix.fields }
    );
    const label = `${ix.collectionGroup}(${ix.fields.map((f) => f.fieldPath).join(",")})`;
    console.log("index", label, r.status === 200 ? "creating" : r.status === 409 ? "exists" : r.text.slice(0, 200));
  }
}
(async () => {
  await rules();
  await indexes();
  console.log("done. Indexes take a few minutes to build.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
