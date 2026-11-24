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
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// src/publishRules.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_app = require("firebase-admin/app");

// src/runtime.ts
var import_node_https = require("node:https");
function httpJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = (0, import_node_https.request)(url, { method: opts.method ?? "GET", headers: opts.headers, timeout: opts.timeoutMs ?? 1e4 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
        }
        resolve({ status: res.statusCode ?? 0, json, text });
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// src/publishRules.ts
var root = (0, import_node_path2.join)(__dirname, "..");
function projectId() {
  const f = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
  return JSON.parse((0, import_node_fs2.readFileSync)(f, "utf8")).project_id;
}
async function googleApi(url, method, body) {
  const { access_token } = await (0, import_app.applicationDefault)().getAccessToken();
  const r = await httpJson(url, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : void 0,
    timeoutMs: 3e4
  });
  return { status: r.status, text: r.text };
}
async function publishRules() {
  const project2 = projectId();
  const content = (0, import_node_fs2.readFileSync)((0, import_node_path2.join)(root, "firestore.rules"), "utf8");
  const rs = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project2}/rulesets`, "POST", {
    source: { files: [{ name: "firestore.rules", content }] }
  });
  if (rs.status !== 200) throw new Error("ruleset " + rs.text.slice(0, 300));
  const name = JSON.parse(rs.text).name;
  const rel = `projects/${project2}/releases/cloud.firestore`;
  let r = await googleApi(`https://firebaserules.googleapis.com/v1/${rel}`, "PATCH", { release: { name: rel, rulesetName: name } });
  if (r.status === 404) r = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project2}/releases`, "POST", { name: rel, rulesetName: name });
  if (r.status !== 200) throw new Error("release " + r.text.slice(0, 300));
  return "published";
}

// src/setup.ts
var root2 = (0, import_node_path3.join)(__dirname, "..");
var sa = JSON.parse((0, import_node_fs3.readFileSync)(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "", "utf8"));
var project = sa.project_id;
async function rules() {
  console.log("rules", await publishRules());
}
async function indexes() {
  const spec = JSON.parse((0, import_node_fs3.readFileSync)((0, import_node_path3.join)(root2, "firestore.indexes.json"), "utf8"));
  for (const ix of spec.indexes) {
    const r = await googleApi(
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
