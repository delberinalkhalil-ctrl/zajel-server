"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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

// src/server.ts
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var import_express = __toESM(require("express"));
var import_app = require("firebase-admin/app");
var import_auth2 = require("firebase-admin/auth");
var import_firestore3 = require("firebase-admin/firestore");

// src/config.ts
var FREE_MODE = (process.env.FREE_MODE ?? "1") !== "0";
var FREE_MODE_DAILY_PIGEONS = 20;
var COST = FREE_MODE ? { extra: 0, dest: 0, fast: 0, voice: 0, video: 0 } : { extra: 10, dest: 20, fast: 15, voice: 30, video: 50 };
var FREE_PIGEONS_PER_DAY = FREE_MODE ? FREE_MODE_DAILY_PIGEONS : 3;
var START_POINTS = 120;
var MAX_FLYING_PER_USER = 3;
var FLIGHT_MIN_MS = 3e3;
var FLIGHT_MAX_MS = 15e3;
var HALF_EARTH_KM = 20015;
var MAX_HOPS = 5;
var LANDED_AUTO_RELEASE_H = 24;
var WAITING_EXPIRE_DAYS = 7;
var ACTIVE_WITHIN_DAYS = 30;
var CALLS_AFTER_MESSAGES = 10;
var RING_SECONDS = 45;
var AUTO_BAN_REPORTS = 5;
var POINT_PRODUCTS = {
  points_100: 100,
  points_550: 550,
  points_1200: 1200,
  points_3000: 3e3
};
var VIP_PRODUCTS = ["vip_monthly", "vip_quarterly", "vip_yearly"];
var LANGS = ["ar", "en", "fr", "tr", "he", "es", "pt", "fa", "ru", "zh", "hi", "ku", "de", "it", "uk"];
var isLang = (x) => typeof x === "string" && LANGS.includes(x);

// src/media.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

// src/runtime.ts
var import_node_https = require("node:https");
var HttpsError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
};
function onCall(a, b) {
  return b ?? a;
}
var logger = {
  info: (...a) => console.log((/* @__PURE__ */ new Date()).toISOString(), ...a),
  warn: (...a) => console.warn((/* @__PURE__ */ new Date()).toISOString(), ...a),
  error: (...a) => console.error((/* @__PURE__ */ new Date()).toISOString(), ...a)
};
var env = (name, def = "") => process.env[name] ?? def;
function httpJson(url2, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = (0, import_node_https.request)(url2, { method: opts.method ?? "GET", headers: opts.headers, timeout: opts.timeoutMs ?? 1e4 }, (res) => {
      const chunks2 = [];
      res.on("data", (c) => chunks2.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks2).toString("utf8");
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

// src/media.ts
var MEDIA_KINDS = ["image", "audio", "file"];
var MEDIA_AFTER_MESSAGES = 6;
var MAX_MEDIA_BYTES = 20 * 1024 * 1024;
var MAX_AUDIO_MS = 5 * 60 * 1e3;
var AUDIO_EXT = ["m4a", "aac", "mp3", "ogg", "opus", "wav"];
var FILE_EXT = [
  "pdf",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "zip",
  "rar",
  "7z",
  "mp3",
  "m4a",
  "aac",
  "ogg",
  "wav",
  "mp4",
  "mov",
  "3gp",
  "webm",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic"
];
var dir = () => env("MEDIA_DIR", "/tmp/zajel-media");
var url = () => env("MEDIA_URL");
function imageExt(b) {
  if (b.length < 12) return null;
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "jpg";
  if (b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  if (b.subarray(0, 4).toString() === "GIF8") return "gif";
  return null;
}
function mediaExt(kind, body, name, mime) {
  if (kind === "image") return imageExt(body);
  const fromName = (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] ?? "").toLowerCase();
  if (kind === "audio") {
    const fromMime = { "audio/mp4": "m4a", "audio/m4a": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/opus": "opus", "audio/wav": "wav", "audio/x-wav": "wav" };
    const e = AUDIO_EXT.includes(fromName) ? fromName : fromMime[mime.split(";")[0].trim().toLowerCase()];
    return e ?? null;
  }
  if (!FILE_EXT.includes(fromName)) return null;
  return fromName === "jpeg" ? "jpg" : fromName;
}
function cleanName(name) {
  const s = String(name ?? "").split(/[\\/]/).pop().replace(/[\u0000-\u001F\u007F<>"]/g, "").trim();
  return [...s].slice(0, 120).join("") || "file";
}
function guard(chatRoot) {
  const ht = (0, import_node_path2.join)(chatRoot, ".htaccess");
  if ((0, import_node_fs2.existsSync)(ht)) return;
  (0, import_node_fs2.writeFileSync)(ht, [
    "Options -Indexes -ExecCGI",
    "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .shtml .htm .html",
    "RemoveType .php .phtml .phar",
    "<IfModule mod_headers.c>",
    "  Header set X-Content-Type-Options nosniff",
    '  <FilesMatch "\\.(?!(jpg|png|webp|gif|m4a|aac|mp3|ogg|opus|wav)$)[^.]+$">',
    "    Header set Content-Disposition attachment",
    "  </FilesMatch>",
    "</IfModule>",
    ""
  ].join("\n"));
}
function saveMedia(chatId, ext, body) {
  const root = (0, import_node_path2.join)(dir(), "chat");
  (0, import_node_fs2.mkdirSync)(root, { recursive: true });
  guard(root);
  const folder = (0, import_node_path2.join)(root, chatId);
  (0, import_node_fs2.mkdirSync)(folder, { recursive: true });
  const file2 = `${(0, import_node_crypto.randomBytes)(12).toString("hex")}.${ext}`;
  (0, import_node_fs2.writeFileSync)((0, import_node_path2.join)(folder, file2), body);
  return `${url()}/chat/${chatId}/${file2}`;
}
function isChatMediaUrl(chatId, u) {
  if (typeof u !== "string") return false;
  const prefix = `${url()}/chat/${chatId}/`;
  return u.startsWith(prefix) && /^[a-f0-9]{24}\.[a-z0-9]{2,5}$/.test(u.slice(prefix.length));
}
function removeChatMedia(chatId) {
  try {
    (0, import_node_fs2.rmSync)((0, import_node_path2.join)(dir(), "chat", chatId), { recursive: true, force: true });
  } catch {
  }
}
function mediaLabel(kind, name) {
  return kind === "image" ? "\u{1F4F7}" : kind === "audio" ? "\u{1F3A4}" : `\u{1F4CE} ${name}`;
}

// src/users.ts
var import_auth = require("firebase-admin/auth");
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// src/common.ts
var import_node_crypto2 = require("node:crypto");
var import_firestore = require("firebase-admin/firestore");
var db = () => (0, import_firestore.getFirestore)();
function requireUid(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "login_required");
  return req.auth.uid;
}
var fail = (code, detail) => {
  throw new HttpsError("failed-precondition", code, detail ? { detail } : void 0);
};
var bad = (code) => {
  throw new HttpsError("invalid-argument", code);
};
var isVip = (u) => !!u.vipUntil && u.vipUntil.toMillis() > Date.now();
var todayUtc = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var sha = (s) => (0, import_node_crypto2.createHash)("sha256").update(s).digest("hex");
var numericUid = (uid) => parseInt(sha(uid).slice(0, 8), 16) % 2147483646 + 1;
var playAccountId = (uid) => sha("zajel:" + uid).slice(0, 64);
async function getUser(uid) {
  const s = await db().doc(`users/${uid}`).get();
  if (!s.exists) fail("no_profile");
  const u = s.data();
  if (u.banned) fail("banned");
  return u;
}
var publicCity = (u) => u.settings?.showCity === false ? "" : u.city ?? "";

// src/geo.ts
function distanceKm(a, b) {
  const R = 6371, d = Math.PI / 180;
  const dLat = (b.lat - a.lat) * d, dLon = (b.lon - a.lon) * d;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}
function flightMs(km, fast) {
  if (fast) return FLIGHT_MIN_MS;
  const f = Math.max(0, Math.min(1, km / HALF_EARTH_KM));
  return Math.round(FLIGHT_MIN_MS + (FLIGHT_MAX_MS - FLIGHT_MIN_MS) * f);
}
var coarse = (x) => Math.round(x * 10) / 10;
function validLatLon(v) {
  const o = v;
  return !!o && typeof o.lat === "number" && typeof o.lon === "number" && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180 && Number.isFinite(o.lat) && Number.isFinite(o.lon);
}

// src/moderation.ts
var MAX_PIGEON_LEN = 400;
var MAX_MESSAGE_LEN = 1e3;
var BANNED = ["onlyfans", "porn", "xxx", "\u0633\u0643\u0633", "escort", "sugar daddy", "crypto signal", "investment profit"];
var LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|me|io|ly|gg|xyz|site|link)\b|t\.me\/|wa\.me\/)/i;
var PHONE = /(\+?\d[\d\s\-()]{7,}\d)/;
function normalize(s) {
  return String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function checkText(text, max, strict) {
  if (!text) return "empty";
  if ([...text].length > max) return "too_long";
  const low = text.toLowerCase();
  if (BANNED.some((w) => low.includes(w))) return "banned";
  if (strict && LINK.test(text)) return "link";
  if (strict && PHONE.test(text)) return "phone";
  return null;
}

// src/users.ts
var SETTING_KEYS = ["notif", "sound", "showCity", "calls", "ghost", "hideRead", "badge", "priority"];
var VIP_ONLY = /* @__PURE__ */ new Set(["ghost", "hideRead", "priority"]);
function cleanName2(v) {
  const n = normalize(v).replace(/\n/g, " ");
  if ([...n].length < 2 || [...n].length > 30) bad("bad_name");
  return n;
}
var initUser = onCall(async (req) => {
  const uid = requireUid(req);
  const d = req.data ?? {};
  const name = cleanName2(d.name);
  const year = Number(d.birthYear);
  const now = (/* @__PURE__ */ new Date()).getUTCFullYear();
  if (!Number.isInteger(year) || year < now - 100 || now - year < 18) bad("under_18");
  if (!isLang(d.lang)) bad("bad_lang");
  if (typeof d.country !== "string" || !/^[A-Z]{2}$/.test(d.country)) bad("bad_country");
  if (!validLatLon(d.loc)) bad("bad_location");
  const loc = { lat: coarse(d.loc.lat), lon: coarse(d.loc.lon) };
  const city = normalize(d.city).slice(0, 60);
  const countryName = normalize(d.countryName).slice(0, 60);
  const ref = db().doc(`users/${uid}`);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const base2 = { name, lang: d.lang, country: d.country, countryName, city, loc, birthYear: year, lastActive: import_firestore.Timestamp.now() };
    if (!s.exists) {
      tx.set(ref, {
        ...base2,
        points: START_POINTS,
        vipUntil: null,
        vipActive: false,
        freeDate: todayUtc(),
        freeLeft: FREE_PIGEONS_PER_DAY,
        receiving: true,
        banned: false,
        blocked: [],
        fcm: [],
        rand: Math.random(),
        createdAt: import_firestore.Timestamp.now(),
        settings: { notif: true, sound: true, showCity: true, calls: "all", ghost: false, hideRead: false, badge: true, priority: false }
      });
    } else tx.update(ref, base2);
    tx.set(db().doc(`profiles/${uid}`), {
      name,
      country: d.country,
      countryName,
      city: s.data()?.settings?.showCity === false ? "" : city,
      lang: d.lang,
      ...s.exists ? {} : { bio: "", photoUrl: "", vip: false, badge: true }
    }, { merge: true });
  });
  return { ok: true };
});
var updateProfile = onCall(async (req) => {
  const uid = requireUid(req);
  const u = await getUser(uid);
  const d = req.data ?? {};
  const priv = { lastActive: import_firestore.Timestamp.now() };
  const pub = {};
  if (d.name !== void 0) {
    priv.name = pub.name = cleanName2(d.name);
  }
  if (d.bio !== void 0) pub.bio = normalize(d.bio).slice(0, 120);
  if (d.photoUrl !== void 0) {
    const p = String(d.photoUrl);
    if (p && !p.startsWith(env("MEDIA_URL", "https://invalid/"))) bad("bad_photo");
    pub.photoUrl = p;
  }
  if (d.lang !== void 0) {
    if (!isLang(d.lang)) bad("bad_lang");
    priv.lang = pub.lang = d.lang;
  }
  if (d.receiving !== void 0) priv.receiving = !!d.receiving;
  if (d.tz !== void 0) {
    const tz = Number(d.tz);
    if (!Number.isInteger(tz) || tz < -720 || tz > 840) bad("bad_setting");
    pub.tz = tz;
  }
  if (d.settings && typeof d.settings === "object") {
    for (const k of SETTING_KEYS) {
      if (!(k in d.settings)) continue;
      const v = d.settings[k];
      if (k === "calls") {
        if (!["all", "ten", "none"].includes(v)) bad("bad_setting");
      } else if (typeof v !== "boolean") bad("bad_setting");
      if (VIP_ONLY.has(k) && v === true && !isVip(u)) bad("vip_only");
      priv[`settings.${k}`] = v;
    }
    if ("showCity" in d.settings) pub.city = d.settings.showCity === false ? "" : u.city;
    if ("badge" in d.settings) pub.badge = !!d.settings.badge;
  }
  await db().doc(`users/${uid}`).update(priv);
  if (Object.keys(pub).length) await db().doc(`profiles/${uid}`).set(pub, { merge: true });
  return { ok: true };
});
var registerToken = onCall(async (req) => {
  const uid = requireUid(req);
  const t = String(req.data?.token ?? "");
  if (t.length < 20 || t.length > 4096) bad("bad_token");
  const ref = db().doc(`users/${uid}`);
  await ref.update({ fcm: import_firestore.FieldValue.arrayUnion(t), lastActive: import_firestore.Timestamp.now() });
  const u = (await ref.get()).data();
  if ((u.fcm ?? []).length > 10) await ref.update({ fcm: u.fcm.slice(-10) });
  return { ok: true, city: publicCity(u) };
});
var deleteAccount = onCall(async (req) => {
  const uid = requireUid(req);
  const store = db();
  const chats = await store.collection("chats").where("members", "array-contains", uid).get();
  for (const c of chats.docs) {
    await store.recursiveDelete(c.ref);
    removeChatMedia(c.id);
  }
  const pigeons = await store.collection("pigeons").where("from", "==", uid).get();
  const calls = await store.collection("calls").where("members", "array-contains", uid).get();
  const batch = store.batch();
  pigeons.docs.forEach((p) => batch.delete(p.ref));
  calls.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(store.doc(`profiles/${uid}`));
  batch.delete(store.doc(`users/${uid}`));
  await batch.commit();
  try {
    (0, import_node_fs3.rmSync)((0, import_node_path3.join)(env("MEDIA_DIR", "/tmp"), "avatars", uid), { recursive: true, force: true });
  } catch {
  }
  await (0, import_auth.getAuth)().deleteUser(uid);
  return { ok: true };
});

// src/notify.ts
var import_messaging = require("firebase-admin/messaging");
var import_firestore2 = require("firebase-admin/firestore");
var T = {
  ar: { landed_t: "\u062D\u0637\u0651 \u0639\u0646\u062F\u0643 \u0632\u0627\u062C\u0644!", landed_b: "\u0631\u0633\u0627\u0644\u0629 \u0645\u0646 {city}\u060C {country}", caught_t: "{name} \u0627\u0644\u062A\u0642\u0637 \u0632\u0627\u062C\u0644\u0643", caught_b: "\u0641\u064A {city}. \u0642\u0644 \u0645\u0631\u062D\u0628\u0627\u064B!", call_t: "{name} \u064A\u062A\u0635\u0644 \u0628\u0643", voice: "\u0645\u0643\u0627\u0644\u0645\u0629 \u0635\u0648\u062A\u064A\u0629 \u0645\u062A\u0631\u062C\u0645\u0629", video: "\u0645\u0643\u0627\u0644\u0645\u0629 \u0641\u064A\u062F\u064A\u0648 \u0645\u062A\u0631\u062C\u0645\u0629", expired_t: "\u0639\u0627\u062F \u0632\u0627\u062C\u0644\u0643", expired_b: "\u0644\u0645 \u064A\u0644\u062A\u0642\u0637\u0647 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u0629. \u062C\u0631\u0651\u0628 \u0625\u0637\u0644\u0627\u0642 \u0632\u0627\u062C\u0644 \u0622\u062E\u0631." },
  en: { landed_t: "A pigeon landed with you!", landed_b: "A letter from {city}, {country}", caught_t: "{name} caught your pigeon", caught_b: "In {city}. Say hello!", call_t: "{name} is calling", voice: "Translated voice call", video: "Translated video call", expired_t: "Your pigeon came back", expired_b: "Nobody caught it this time. Try sending another." },
  fr: { landed_t: "Un pigeon s\u2019est pos\xE9 chez vous !", landed_b: "Une lettre de {city}, {country}", caught_t: "{name} a attrap\xE9 votre pigeon", caught_b: "\xC0 {city}. Dites bonjour !", call_t: "{name} vous appelle", voice: "Appel vocal traduit", video: "Appel vid\xE9o traduit", expired_t: "Votre pigeon est revenu", expired_b: "Personne ne l\u2019a attrap\xE9 cette fois. Envoyez-en un autre." },
  tr: { landed_t: "Sana bir g\xFCvercin kondu!", landed_b: "{city}, {country} \u015Fehrinden bir mektup", caught_t: "{name} g\xFCvercinini yakalad\u0131", caught_b: "{city} \u015Fehrinde. Merhaba de!", call_t: "{name} seni ar\u0131yor", voice: "\xC7evirili sesli arama", video: "\xC7evirili g\xF6r\xFCnt\xFCl\xFC arama", expired_t: "G\xFCvercinin geri d\xF6nd\xFC", expired_b: "Bu sefer kimse yakalamad\u0131. Bir tane daha g\xF6nder." },
  he: { landed_t: "\u05D9\u05D5\u05E0\u05D4 \u05E0\u05D7\u05EA\u05D4 \u05D0\u05E6\u05DC\u05DA!", landed_b: "\u05DE\u05DB\u05EA\u05D1 \u05DE{city}, {country}", caught_t: "{name} \u05EA\u05E4\u05E1/\u05D4 \u05D0\u05EA \u05D4\u05D9\u05D5\u05E0\u05D4 \u05E9\u05DC\u05DA", caught_b: "\u05D1{city}. \u05EA\u05D2\u05D9\u05D3/\u05D9 \u05E9\u05DC\u05D5\u05DD!", call_t: "{name} \u05DE\u05EA\u05E7\u05E9\u05E8/\u05EA", voice: "\u05E9\u05D9\u05D7\u05D4 \u05E7\u05D5\u05DC\u05D9\u05EA \u05DE\u05EA\u05D5\u05E8\u05D2\u05DE\u05EA", video: "\u05E9\u05D9\u05D7\u05EA \u05D5\u05D9\u05D3\u05D0\u05D5 \u05DE\u05EA\u05D5\u05E8\u05D2\u05DE\u05EA", expired_t: "\u05D4\u05D9\u05D5\u05E0\u05D4 \u05E9\u05DC\u05DA \u05D7\u05D6\u05E8\u05D4", expired_b: "\u05D0\u05E3 \u05D0\u05D7\u05D3 \u05DC\u05D0 \u05EA\u05E4\u05E1 \u05D0\u05D5\u05EA\u05D4 \u05D4\u05E4\u05E2\u05DD. \u05E0\u05E1\u05D4/\u05D9 \u05DC\u05E9\u05DC\u05D5\u05D7 \u05E2\u05D5\u05D3 \u05D0\u05D7\u05EA." },
  es: { landed_t: "\xA1Una paloma aterriz\xF3 contigo!", landed_b: "Una carta desde {city}, {country}", caught_t: "{name} atrap\xF3 tu paloma", caught_b: "En {city}. \xA1Saluda!", call_t: "{name} te est\xE1 llamando", voice: "Llamada de voz traducida", video: "Videollamada traducida", expired_t: "Tu paloma volvi\xF3", expired_b: "Nadie la atrap\xF3 esta vez. Prueba a enviar otra." },
  pt: { landed_t: "Um pombo pousou com voc\xEA!", landed_b: "Uma carta de {city}, {country}", caught_t: "{name} pegou o seu pombo", caught_b: "Em {city}. Diga ol\xE1!", call_t: "{name} est\xE1 ligando", voice: "Chamada de voz traduzida", video: "Videochamada traduzida", expired_t: "Seu pombo voltou", expired_b: "Ningu\xE9m o pegou desta vez. Tente enviar outro." },
  fa: { landed_t: "\u06CC\u06A9 \u06A9\u0628\u0648\u062A\u0631 \u067E\u06CC\u0634 \u062A\u0648 \u0646\u0634\u0633\u062A!", landed_b: "\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0627\u0632 {city}\u060C {country}", caught_t: "{name} \u06A9\u0628\u0648\u062A\u0631\u062A \u0631\u0627 \u06AF\u0631\u0641\u062A", caught_b: "\u062F\u0631 {city}. \u0633\u0644\u0627\u0645 \u06A9\u0646!", call_t: "{name} \u062F\u0631 \u062D\u0627\u0644 \u062A\u0645\u0627\u0633 \u0627\u0633\u062A", voice: "\u062A\u0645\u0627\u0633 \u0635\u0648\u062A\u06CC \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647", video: "\u062A\u0645\u0627\u0633 \u062A\u0635\u0648\u06CC\u0631\u06CC \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647", expired_t: "\u06A9\u0628\u0648\u062A\u0631\u062A \u0628\u0631\u06AF\u0634\u062A", expired_b: "\u0627\u06CC\u0646 \u0628\u0627\u0631 \u06A9\u0633\u06CC \u0622\u0646 \u0631\u0627 \u0646\u06AF\u0631\u0641\u062A. \u06CC\u06A9\u06CC \u062F\u06CC\u06AF\u0631 \u0628\u0641\u0631\u0633\u062A." },
  ru: { landed_t: "\u041A \u0432\u0430\u043C \u043F\u0440\u0438\u043B\u0435\u0442\u0435\u043B \u0433\u043E\u043B\u0443\u0431\u044C!", landed_b: "\u041F\u0438\u0441\u044C\u043C\u043E \u0438\u0437 {city}, {country}", caught_t: "{name} \u043F\u043E\u0439\u043C\u0430\u043B(\u0430) \u0432\u0430\u0448\u0435\u0433\u043E \u0433\u043E\u043B\u0443\u0431\u044F", caught_b: "\u0412 {city}. \u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0442\u0435\u0441\u044C!", call_t: "{name} \u0437\u0432\u043E\u043D\u0438\u0442 \u0432\u0430\u043C", voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0437\u0432\u043E\u043D\u043E\u043A \u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C", video: "\u0412\u0438\u0434\u0435\u043E\u0437\u0432\u043E\u043D\u043E\u043A \u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C", expired_t: "\u0412\u0430\u0448 \u0433\u043E\u043B\u0443\u0431\u044C \u0432\u0435\u0440\u043D\u0443\u043B\u0441\u044F", expired_b: "\u0412 \u044D\u0442\u043E\u0442 \u0440\u0430\u0437 \u0435\u0433\u043E \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043F\u043E\u0439\u043C\u0430\u043B. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0435\u0449\u0451 \u043E\u0434\u043D\u043E\u0433\u043E." },
  de: { landed_t: "Eine Taube ist bei dir gelandet!", landed_b: "Ein Brief aus {city}, {country}", caught_t: "{name} hat deine Taube gefangen", caught_b: "In {city}. Sag hallo!", call_t: "{name} ruft dich an", voice: "\xDCbersetzter Sprachanruf", video: "\xDCbersetzter Videoanruf", expired_t: "Deine Taube ist zur\xFCck", expired_b: "Diesmal hat sie niemand gefangen. Schick eine neue." },
  it: { landed_t: "Un piccione \xE8 atterrato da te!", landed_b: "Una lettera da {city}, {country}", caught_t: "{name} ha preso il tuo piccione", caught_b: "A {city}. Saluta!", call_t: "{name} ti sta chiamando", voice: "Chiamata vocale tradotta", video: "Videochiamata tradotta", expired_t: "Il tuo piccione \xE8 tornato", expired_b: "Questa volta nessuno l'ha preso. Prova a mandarne un altro." },
  uk: { landed_t: "\u0414\u043E \u0442\u0435\u0431\u0435 \u043F\u0440\u0438\u043B\u0435\u0442\u0456\u0432 \u0433\u043E\u043B\u0443\u0431!", landed_b: "\u041B\u0438\u0441\u0442 \u0456\u0437 {city}, {country}", caught_t: "{name} \u0441\u043F\u0456\u0439\u043C\u0430\u0432(\u043B\u0430) \u0442\u0432\u043E\u0433\u043E \u0433\u043E\u043B\u0443\u0431\u0430", caught_b: "\u0423 {city}. \u041F\u0440\u0438\u0432\u0456\u0442\u0430\u0439\u0441\u044F!", call_t: "{name} \u0434\u0437\u0432\u043E\u043D\u0438\u0442\u044C \u0442\u043E\u0431\u0456", voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0438\u0439 \u0434\u0437\u0432\u0456\u043D\u043E\u043A \u0456\u0437 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434\u043E\u043C", video: "\u0412\u0456\u0434\u0435\u043E\u0434\u0437\u0432\u0456\u043D\u043E\u043A \u0456\u0437 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434\u043E\u043C", expired_t: "\u0422\u0432\u0456\u0439 \u0433\u043E\u043B\u0443\u0431 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0432\u0441\u044F", expired_b: "\u0426\u044C\u043E\u0433\u043E \u0440\u0430\u0437\u0443 \u0439\u043E\u0433\u043E \u043D\u0456\u0445\u0442\u043E \u043D\u0435 \u0441\u043F\u0456\u0439\u043C\u0430\u0432. \u041D\u0430\u0434\u0456\u0448\u043B\u0438 \u0449\u0435 \u043E\u0434\u043D\u043E\u0433\u043E." },
  zh: { landed_t: "\u4E00\u53EA\u4FE1\u9E3D\u843D\u5728\u4F60\u8FD9\u91CC\uFF01", landed_b: "\u6765\u81EA{country}{city}\u7684\u4FE1", caught_t: "{name} \u63A5\u4F4F\u4E86\u4F60\u7684\u4FE1\u9E3D", caught_b: "\u5728{city}\u3002\u6253\u4E2A\u62DB\u547C\u5427\uFF01", call_t: "{name} \u6B63\u5728\u547C\u53EB\u4F60", voice: "\u7FFB\u8BD1\u8BED\u97F3\u901A\u8BDD", video: "\u7FFB\u8BD1\u89C6\u9891\u901A\u8BDD", expired_t: "\u4F60\u7684\u4FE1\u9E3D\u98DE\u56DE\u6765\u4E86", expired_b: "\u8FD9\u6B21\u6CA1\u6709\u4EBA\u63A5\u4F4F\u5B83\u3002\u518D\u653E\u98DE\u4E00\u53EA\u5427\u3002" },
  hi: { landed_t: "\u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u090F\u0915 \u0915\u092C\u0942\u0924\u0930 \u0909\u0924\u0930\u093E!", landed_b: "{city}, {country} \u0938\u0947 \u090F\u0915 \u091A\u093F\u091F\u094D\u0920\u0940", caught_t: "{name} \u0928\u0947 \u0906\u092A\u0915\u093E \u0915\u092C\u0942\u0924\u0930 \u092A\u0915\u0921\u093C\u093E", caught_b: "{city} \u092E\u0947\u0902\u0964 \u0928\u092E\u0938\u094D\u0924\u0947 \u0915\u0939\u093F\u090F!", call_t: "{name} \u0915\u0949\u0932 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902", voice: "\u0905\u0928\u0941\u0935\u093E\u0926\u093F\u0924 \u0935\u0949\u0907\u0938 \u0915\u0949\u0932", video: "\u0905\u0928\u0941\u0935\u093E\u0926\u093F\u0924 \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u0949\u0932", expired_t: "\u0906\u092A\u0915\u093E \u0915\u092C\u0942\u0924\u0930 \u0932\u094C\u091F \u0906\u092F\u093E", expired_b: "\u0907\u0938 \u092C\u093E\u0930 \u0915\u093F\u0938\u0940 \u0928\u0947 \u0928\u0939\u0940\u0902 \u092A\u0915\u0921\u093C\u093E\u0964 \u090F\u0915 \u0914\u0930 \u092D\u0947\u091C\u093F\u090F\u0964" },
  ku: { landed_t: "Kevokek li cem te daket!", landed_b: "Nameyek ji {city}, {country}", caught_t: "{name} kevoka te girt", caught_b: "Li {city}. Silav bike!", call_t: "{name} li te digere", voice: "Banga deng\xEE ya wergerand\xEE", video: "Banga v\xEEdyoy\xEE ya wergerand\xEE", expired_t: "Kevoka te vegeriya", expired_b: "V\xEA car\xEA kes\xEE ew negirt. Yeke din bi\u015F\xEEne." }
};
function fmt(lang, key, vars = {}) {
  const s = (T[lang] ?? T.en)[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
async function pushTo(uid, msg) {
  const db2 = (0, import_firestore2.getFirestore)();
  const ref = db2.doc(`users/${uid}`);
  const snap = await ref.get();
  const u = snap.data();
  if (!u || u.settings?.notif === false && !msg.call) return;
  const tokens = (u.fcm ?? []).slice(-10);
  if (!tokens.length) return;
  try {
    const res = await (0, import_messaging.getMessaging)().sendEachForMulticast({
      tokens,
      notification: { title: msg.title, body: msg.body.slice(0, 160) },
      data: msg.data,
      android: {
        priority: "high",
        notification: { sound: u.settings?.sound === false ? void 0 : "default" },
        ttl: msg.call ? 45e3 : void 0
      },
      apns: { payload: { aps: { sound: u.settings?.sound === false ? void 0 : "default" } } }
    });
    const bad2 = res.responses.map((r2, i) => !r2.success && /registration-token-not-registered|invalid-argument/.test(r2.error?.code ?? "") ? tokens[i] : null).filter(Boolean);
    if (bad2.length) await ref.update({ fcm: import_firestore2.FieldValue.arrayRemove(...bad2) });
  } catch (e) {
    logger.warn("push failed", { uid, e: String(e) });
  }
}

// src/pigeons.ts
async function pickRecipient(p, sender) {
  const users = db().collection("users");
  let q = users.where("receiving", "==", true).where("banned", "==", false);
  if (p.wantCountry) q = q.where("country", "==", p.wantCountry);
  const r2 = Math.random();
  const [a, b] = await Promise.all([
    q.where("rand", ">=", r2).orderBy("rand").limit(25).get(),
    q.where("rand", "<", r2).orderBy("rand", "desc").limit(25).get()
  ]);
  const since = Date.now() - ACTIVE_WITHIN_DAYS * 864e5;
  const blocked = new Set(sender.blocked ?? []);
  let list = [...a.docs, ...b.docs].filter((d) => {
    const c = d.data();
    return d.id !== p.from && !p.tried.includes(d.id) && !blocked.has(d.id) && !(c.blocked ?? []).includes(p.from) && (c.lastActive?.toMillis() ?? 0) >= since;
  });
  if (!list.length) return null;
  if (!p.wantCountry) {
    const abroad = list.filter((d) => d.data().country !== p.fromCountry);
    if (abroad.length) list = abroad;
  }
  if (isVip(sender) && sender.settings?.priority) {
    list.sort((x, y) => (y.data().lastActive?.toMillis() ?? 0) - (x.data().lastActive?.toMillis() ?? 0));
    list = list.slice(0, 5);
  }
  return list[Math.floor(Math.random() * list.length)];
}
var flightHooks = { onFlying: (_id, _arriveAt) => {
} };
async function flyTo(ref, p, c, origin) {
  const u = c.data();
  const km = distanceKm(origin, u.loc);
  const now = Date.now();
  const arriveAt = now + flightMs(km, p.fast);
  await ref.update({
    status: "flying",
    toUid: c.id,
    toName: u.name,
    toCity: publicCity(u),
    toCountry: u.country,
    toCountryName: u.countryName ?? "",
    toLoc: u.loc,
    km,
    departAt: import_firestore.Timestamp.fromMillis(now),
    arriveAt: import_firestore.Timestamp.fromMillis(arriveAt),
    tried: import_firestore.FieldValue.arrayUnion(c.id),
    originLoc: origin
  });
  await c.ref.update({ rand: Math.random() });
  flightHooks.onFlying(ref.id, arriveAt);
  return { km, arriveAt, toLoc: u.loc, toCity: publicCity(u), toCountryName: u.countryName ?? "" };
}
async function assign(ref, p, origin, sender) {
  const s = sender ?? (await db().doc(`users/${p.from}`).get()).data() ?? {};
  const c = await pickRecipient(p, s);
  if (!c) {
    await ref.update({ status: "waiting", originLoc: origin });
    return null;
  }
  return flyTo(ref, p, c, origin);
}
async function moveOn(ref, p) {
  const hops = (p.hops ?? 0) + 1;
  if (hops >= MAX_HOPS) {
    await ref.update({ status: "expired", hops });
    const s = (await db().doc(`users/${p.from}`).get()).data();
    if (s) await pushTo(p.from, { title: fmt(s.lang, "expired_t"), body: fmt(s.lang, "expired_b"), data: { type: "pigeon", id: ref.id } });
    return;
  }
  await ref.update({ hops, toUid: import_firestore.FieldValue.delete(), landedAt: import_firestore.FieldValue.delete(), tr: import_firestore.FieldValue.delete() });
  await assign(ref, { ...p, hops }, p.toLoc ?? p.originLoc ?? p.fromLoc);
}
var sendPigeon = onCall(async (req) => {
  const uid = requireUid(req);
  const text = normalize(req.data?.text);
  const problem = checkText(text, MAX_PIGEON_LEN, true);
  if (problem) bad(problem);
  const fast = !!req.data?.fast;
  const want = req.data?.toCountry ? String(req.data.toCountry) : null;
  if (want && !/^[A-Z]{2}$/.test(want)) bad("bad_country");
  const inAir = await db().collection("pigeons").where("from", "==", uid).where("status", "in", ["waiting", "flying"]).count().get();
  if (inAir.data().count >= MAX_FLYING_PER_USER) fail("too_many_in_air");
  const userRef = db().doc(`users/${uid}`);
  const ref = db().collection("pigeons").doc();
  let pigeon;
  let sender;
  let charged = 0;
  await db().runTransaction(async (tx) => {
    const s = await tx.get(userRef);
    if (!s.exists) fail("no_profile");
    const u = s.data();
    if (u.banned) fail("banned");
    const vip = isVip(u);
    const freeLeft = u.freeDate === todayUtc() ? u.freeLeft ?? 0 : FREE_PIGEONS_PER_DAY;
    const useFree = !vip && freeLeft > 0;
    charged = (vip || useFree ? 0 : COST.extra) + (want && !vip ? COST.dest : 0) + (fast ? COST.fast : 0);
    if (FREE_MODE && !useFree && !vip) fail("daily_limit");
    if (u.points < charged) fail("no_points");
    tx.update(userRef, {
      points: import_firestore.FieldValue.increment(-charged),
      freeDate: todayUtc(),
      freeLeft: useFree ? freeLeft - 1 : freeLeft,
      lastActive: import_firestore.Timestamp.now()
    });
    pigeon = {
      from: uid,
      fromLang: u.lang,
      fromName: u.name,
      fromCity: publicCity(u),
      fromCountry: u.country,
      fromCountryName: u.countryName ?? "",
      fromLoc: u.loc,
      text,
      fast,
      wantCountry: want,
      status: "waiting",
      hops: 0,
      tried: [uid],
      createdAt: import_firestore.Timestamp.now()
    };
    tx.set(ref, { ...pigeon, cost: charged });
    sender = u;
  });
  const flight = await assign(ref, pigeon, pigeon.fromLoc, sender);
  logger.info("pigeon sent", { id: ref.id, charged, assigned: !!flight });
  return {
    id: ref.id,
    status: flight ? "flying" : "waiting",
    charged,
    ...flight ? { km: flight.km, arriveAt: flight.arriveAt, to: { ...flight.toLoc, city: flight.toCity, countryName: flight.toCountryName } } : {}
  };
});
var catchPigeon = onCall(async (req) => {
  const uid = requireUid(req);
  const id = String(req.data?.id ?? "");
  const ref = db().doc(`pigeons/${id}`);
  const chatRef = db().doc(`chats/${id}`);
  let p;
  await db().runTransaction(async (tx) => {
    const s2 = await tx.get(ref);
    if (!s2.exists) fail("not_found");
    p = s2.data();
    if (p.toUid !== uid || p.status !== "landed") fail("not_yours");
    const now = import_firestore.Timestamp.now();
    tx.update(ref, { status: "caught", chatId: id, caughtAt: now });
    tx.set(chatRef, {
      members: [p.from, uid],
      pigeonId: id,
      createdAt: now,
      updatedAt: now,
      messageCount: 1,
      blocked: false,
      unread: { [p.from]: 0, [uid]: 0 },
      readAt: {},
      last: { from: p.from, text: p.text, tr: p.tr ?? {}, at: now },
      route: { from: { loc: p.fromLoc, city: p.fromCity, countryName: p.fromCountryName }, to: { loc: p.toLoc, city: p.toCity, countryName: p.toCountryName }, km: p.km ?? 0 }
    });
    tx.set(chatRef.collection("messages").doc(), { from: p.from, text: p.text, src: p.src ?? "und", tr: p.tr ?? {}, at: p.createdAt, pigeon: true });
  });
  const me = await getUser(uid);
  const s = (await db().doc(`users/${p.from}`).get()).data();
  if (s) await pushTo(p.from, { title: fmt(s.lang, "caught_t", { name: me.name }), body: fmt(s.lang, "caught_b", { city: publicCity(me) || me.countryName }), data: { type: "chat", chatId: id } });
  return { chatId: id };
});
var myStats = onCall(async (req) => {
  const uid = requireUid(req);
  const q = await db().collection("pigeons").where("from", "==", uid).select("status", "toCountry", "km").limit(5e3).get();
  const countries = /* @__PURE__ */ new Set();
  let km = 0;
  for (const d of q.docs) {
    const p = d.data();
    if (p.status === "landed" || p.status === "caught") {
      if (p.toCountry) countries.add(String(p.toCountry));
      km += Number(p.km) || 0;
    }
  }
  return { sent: q.size, countries: countries.size, km: Math.round(km) };
});
var releasePigeon = onCall(async (req) => {
  const uid = requireUid(req);
  const ref = db().doc(`pigeons/${String(req.data?.id ?? "")}`);
  const s = await ref.get();
  const p = s.data();
  if (!p || p.toUid !== uid || p.status !== "landed") fail("not_yours");
  await moveOn(ref, p);
  return { ok: true };
});

// src/translate.ts
var MM = { zh: "zh-CN", he: "he", ku: "ku", fa: "fa", hi: "hi" };
function chunks(text, max = 450) {
  if (text.length <= max) return [text];
  const out = [];
  let cur = "";
  for (const part of text.split(/(?<=[.!?؟。\n])\s*/)) {
    if ((cur + " " + part).length > max && cur) {
      out.push(cur);
      cur = part;
    } else cur = cur ? cur + " " + part : part;
    while (cur.length > max) {
      out.push(cur.slice(0, max));
      cur = cur.slice(max);
    }
  }
  if (cur) out.push(cur);
  return out;
}
async function myMemory(text, from, to) {
  const parts = [];
  for (const c of chunks(text)) {
    const u = new URL("https://api.mymemory.translated.net/get");
    u.searchParams.set("q", c);
    u.searchParams.set("langpair", `${MM[from] ?? from}|${MM[to] ?? to}`);
    const email = env("MYMEMORY_EMAIL");
    if (email) u.searchParams.set("de", email);
    const { json: j } = await httpJson(u, { timeoutMs: 8e3 });
    const t = j?.responseData?.translatedText;
    if (Number(j?.responseStatus) !== 200 || !t || /MYMEMORY WARNING/i.test(t)) throw new Error("mymemory " + j.responseStatus);
    parts.push(t);
  }
  return parts.join(" ");
}
async function deepl(text, from, to) {
  const key = env("DEEPL_KEY");
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const { status, json: j } = await httpJson(`https://${host}/v2/translate`, {
    method: "POST",
    timeoutMs: 8e3,
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: to === "pt" ? "PT-BR" : to === "zh" ? "ZH-HANS" : to.toUpperCase(), source_lang: from.toUpperCase() })
  });
  if (!j?.translations?.[0]) throw new Error("deepl " + status);
  return j.translations[0].text;
}
async function google(text, from, to) {
  const { status, json: j } = await httpJson(`https://translation.googleapis.com/language/translate/v2?key=${env("GOOGLE_TRANSLATE_KEY")}`, {
    method: "POST",
    timeoutMs: 8e3,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: from === "zh" ? "zh-CN" : from, target: to === "zh" ? "zh-CN" : to, format: "text" })
  });
  const t = j?.data?.translations?.[0]?.translatedText;
  if (!t) throw new Error("google " + status);
  return t;
}
var engine = () => env("GOOGLE_TRANSLATE_KEY") ? google : env("DEEPL_KEY") ? deepl : myMemory;
async function translateAll(text, targets, from) {
  const src = from || "und";
  const out = {};
  for (const t of [...new Set(targets)]) {
    if (t === src || src === "und") {
      out[t] = text;
      continue;
    }
    try {
      out[t] = await engine()(text, src, t);
    } catch (e) {
      logger.warn("translate failed", t, String(e));
      out[t] = text;
    }
  }
  return { src, tr: out };
}

// src/chats.ts
var STRICT_FIRST_MESSAGES = 6;
async function memberChat(uid, chatId) {
  const ref = db().doc(`chats/${chatId}`);
  const s = await ref.get();
  const c = s.data();
  if (!c || !c.members.includes(uid)) fail("not_member");
  return { ref, c, other: c.members.find((m) => m !== uid) };
}
function readMedia(chatId, m) {
  if (m == null) return null;
  const kind = String(m.kind);
  if (!MEDIA_KINDS.includes(kind) || !isChatMediaUrl(chatId, m.url)) bad("bad_media");
  const size = Math.max(0, Math.min(MAX_MEDIA_BYTES, Number(m.size) || 0));
  const out = { kind, url: m.url, size };
  if (kind === "file") out.name = cleanName(m.name);
  if (kind === "audio") out.dur = Math.max(0, Math.min(MAX_AUDIO_MS, Math.round(Number(m.dur) || 0)));
  if (kind === "image") {
    const w = Number(m.w) || 0, h = Number(m.h) || 0;
    if (w > 0 && h > 0) {
      out.w = Math.round(w);
      out.h = Math.round(h);
    }
  }
  return out;
}
var sendMessage = onCall(async (req) => {
  const uid = requireUid(req);
  const chatId = String(req.data?.chatId ?? "");
  const { ref, c, other } = await memberChat(uid, chatId);
  if (c.blocked) fail("blocked");
  const media = readMedia(chatId, req.data?.media);
  if (media && (c.messageCount ?? 0) < MEDIA_AFTER_MESSAGES) fail("media_need_messages");
  const text = normalize(req.data?.text);
  if (!media || text) {
    const problem = checkText(text, MAX_MESSAGE_LEN, (c.messageCount ?? 0) < STRICT_FIRST_MESSAGES);
    if (problem) bad(problem);
  }
  const [me, them] = await Promise.all([getUser(uid), db().doc(`users/${other}`).get().then((s) => s.data())]);
  if (!them) fail("user_gone");
  if ((them.blocked ?? []).includes(uid) || (me.blocked ?? []).includes(other)) fail("blocked");
  const { src, tr } = text ? await translateAll(text, [me.lang, them.lang], me.lang) : { src: me.lang, tr: {} };
  const now = import_firestore.Timestamp.now();
  const label = media ? mediaLabel(media.kind, String(media.name ?? "")) : "";
  await ref.collection("messages").add({ from: uid, text, src, tr, at: now, ...media ? { media } : {} });
  const lastText = media ? text ? `${label} ${text}` : label : text;
  const lastTr = media && text ? Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, `${label} ${v}`])) : tr;
  await ref.update({
    updatedAt: now,
    last: { from: uid, text: lastText, tr: lastTr, at: now },
    messageCount: import_firestore.FieldValue.increment(1),
    [`unread.${other}`]: import_firestore.FieldValue.increment(1),
    [`unread.${uid}`]: 0
  });
  await db().doc(`users/${uid}`).update({ lastActive: now });
  await pushTo(other, { title: me.name, body: lastTr[them.lang] ?? lastText, data: { type: "chat", chatId: ref.id } });
  return { ok: true, src };
});
var markDelivered = onCall(async (req) => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ""));
  await ref.update({ [`deliveredAt.${uid}`]: import_firestore.Timestamp.now() });
  return { ok: true };
});
var markRead = onCall(async (req) => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ""));
  const u = await getUser(uid);
  const hide = isVip(u) && u.settings?.hideRead;
  const now = import_firestore.Timestamp.now();
  await ref.update({ [`unread.${uid}`]: 0, [`deliveredAt.${uid}`]: now, ...hide ? {} : { [`readAt.${uid}`]: now } });
  return { ok: true };
});

// src/calls.ts
var import_agora_token = require("agora-token");
var secrets = {};
function token(channel, uid) {
  const appId = env("AGORA_APP_ID"), cert = env("AGORA_CERT");
  if (!appId || !cert) fail("calls_unavailable");
  const n = numericUid(uid);
  return { appId, uid: n, token: import_agora_token.RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, n, import_agora_token.RtcRole.PUBLISHER, 3600, 3600) };
}
var startCall = onCall(secrets, async (req) => {
  const uid = requireUid(req);
  const type = req.data?.type === "video" ? "video" : "voice";
  const { c, other } = await memberChat(uid, String(req.data?.chatId ?? ""));
  if (c.blocked) fail("blocked");
  const [me, themSnap] = await Promise.all([getUser(uid), db().doc(`users/${other}`).get()]);
  const them = themSnap.data();
  if (!them || (them.blocked ?? []).includes(uid)) fail("blocked");
  const rule = them.settings?.calls ?? "all";
  if (rule === "none") fail("calls_off");
  if (rule === "ten" && (c.messageCount ?? 0) < CALLS_AFTER_MESSAGES) fail("calls_need_messages");
  if (!isVip(me) && me.points < COST[type]) fail("no_points");
  if (!env("AGORA_APP_ID")) fail("calls_unavailable");
  const ref = db().collection("calls").doc();
  await ref.set({
    chatId: c.pigeonId ?? req.data.chatId,
    from: uid,
    to: other,
    members: [uid, other],
    type,
    status: "ringing",
    createdAt: import_firestore.Timestamp.now(),
    cost: isVip(me) ? 0 : COST[type]
  });
  await pushTo(other, {
    title: fmt(them.lang, "call_t", { name: me.name }),
    body: fmt(them.lang, type),
    call: true,
    data: { type: "call", callId: ref.id, kind: type, name: me.name }
  });
  return { callId: ref.id, channel: ref.id, ...token(ref.id, uid) };
});
var answerCall = onCall(secrets, async (req) => {
  const uid = requireUid(req);
  const ref = db().doc(`calls/${String(req.data?.callId ?? "")}`);
  const accept = !!req.data?.accept;
  let result = {};
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const call = s.data();
    if (!call || call.to !== uid) fail("not_found");
    if (call.status !== "ringing" || Date.now() - call.createdAt.toMillis() > RING_SECONDS * 1e3) fail("call_over");
    if (!accept) {
      tx.update(ref, { status: "declined", endedAt: import_firestore.Timestamp.now() });
      return;
    }
    const callerRef = db().doc(`users/${call.from}`);
    const caller = (await tx.get(callerRef)).data();
    if (call.cost > 0) {
      if (caller.points < call.cost) {
        tx.update(ref, { status: "failed", reason: "no_points" });
        fail("caller_no_points");
      }
      tx.update(callerRef, { points: import_firestore.FieldValue.increment(-call.cost) });
    }
    tx.update(ref, { status: "active", startedAt: import_firestore.Timestamp.now() });
    result = { channel: s.id, type: call.type };
  });
  return accept ? { ...result, ...token(String(result.channel), uid) } : { ok: true };
});
var endCall = onCall(async (req) => {
  const uid = requireUid(req);
  const ref = db().doc(`calls/${String(req.data?.callId ?? "")}`);
  const s = await ref.get();
  const call = s.data();
  if (!call || !call.members.includes(uid)) bad("not_found");
  if (["ringing", "active"].includes(call.status)) {
    await ref.update({ status: call.status === "ringing" ? "missed" : "ended", endedAt: import_firestore.Timestamp.now() });
  }
  return { ok: true };
});

// src/billing.ts
var import_androidpublisher = require("@googleapis/androidpublisher");
var client = null;
var play = () => client ??= (0, import_androidpublisher.androidpublisher)({
  version: "v3",
  auth: new import_androidpublisher.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] })
});
var verifyPurchase = onCall(async (req) => {
  const uid = requireUid(req);
  if (FREE_MODE) fail("store_closed");
  const productId = String(req.data?.productId ?? "");
  const token2 = String(req.data?.token ?? "");
  if (!token2 || token2.length > 2e3) bad("bad_token");
  const packageName = env("PLAY_PACKAGE_NAME", "app.zajel");
  const purchaseRef = db().doc(`purchases/${sha(token2)}`);
  const userRef = db().doc(`users/${uid}`);
  if (POINT_PRODUCTS[productId]) {
    const { data } = await play().purchases.products.get({ packageName, productId, token: token2 });
    if (data.purchaseState !== 0) fail("not_purchased");
    if (data.obfuscatedExternalAccountId && data.obfuscatedExternalAccountId !== playAccountId(uid)) fail("other_account");
    let granted = 0;
    await db().runTransaction(async (tx) => {
      const p = await tx.get(purchaseRef);
      if (p.exists) {
        if (p.data().uid !== uid) fail("other_account");
        return;
      }
      granted = POINT_PRODUCTS[productId];
      tx.set(purchaseRef, { uid, productId, kind: "points", points: granted, orderId: data.orderId ?? "", at: import_firestore.Timestamp.now() });
      tx.update(userRef, { points: import_firestore.FieldValue.increment(granted) });
    });
    logger.info("points purchase", { uid, productId, granted });
    return { ok: true, granted };
  }
  if (VIP_PRODUCTS.includes(productId)) {
    const { data } = await play().purchases.subscriptionsv2.get({ packageName, token: token2 });
    const state = data.subscriptionState ?? "";
    if (data.externalAccountIdentifiers?.obfuscatedExternalAccountId && data.externalAccountIdentifiers.obfuscatedExternalAccountId !== playAccountId(uid)) fail("other_account");
    const expiry = Math.max(0, ...(data.lineItems ?? []).map((l) => Date.parse(l.expiryTime ?? "") || 0));
    const active = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"].includes(state) && expiry > Date.now();
    const prev = await purchaseRef.get();
    if (prev.exists && prev.data().uid !== uid) fail("other_account");
    await purchaseRef.set({ uid, productId, kind: "vip", state, expiry: import_firestore.Timestamp.fromMillis(expiry || Date.now()), at: import_firestore.Timestamp.now() }, { merge: true });
    if (active) {
      await userRef.update({ vipUntil: import_firestore.Timestamp.fromMillis(expiry), vipActive: true });
      await db().doc(`profiles/${uid}`).set({ vip: true }, { merge: true });
    }
    return { ok: true, active, expiry };
  }
  bad("unknown_product");
});

// src/jobs.ts
async function landOne(ref) {
  const snap = await ref.get();
  const p0 = snap.data();
  if (!p0 || p0.status !== "flying" || (p0.arriveAt?.toMillis() ?? Infinity) > Date.now() + 1500) return false;
  const r2 = (await db().doc(`users/${p0.toUid}`).get()).data();
  if (!r2 || r2.banned || !r2.receiving || (r2.blocked ?? []).includes(p0.from)) {
    await moveOn(ref, p0);
    return false;
  }
  const claimed = await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.data()?.status !== "flying") return false;
    tx.update(ref, { status: "landed", landedAt: import_firestore.Timestamp.now() });
    return true;
  });
  if (!claimed) return false;
  const { src, tr } = await translateAll(p0.text, [r2.lang], p0.fromLang);
  await ref.update({ src, tr });
  await pushTo(p0.toUid, {
    title: fmt(r2.lang, "landed_t"),
    body: fmt(r2.lang, "landed_b", { city: p0.fromCity, country: p0.fromCountryName }),
    data: { type: "pigeon", id: ref.id }
  });
  return true;
}
function landSoon(id, arriveAt) {
  const ref = db().doc(`pigeons/${id}`);
  setTimeout(() => {
    landOne(ref).catch((e) => logger.error("timed landing failed", { id, e: String(e) }));
  }, Math.max(0, arriveAt - Date.now()) + 200);
}
flightHooks.onFlying = landSoon;
var landPigeon = onCall(async (req) => {
  const uid = requireUid(req);
  const ref = db().doc(`pigeons/${String(req.data?.id ?? "")}`);
  const p = (await ref.get()).data();
  if (!p || p.from !== uid && p.toUid !== uid) fail("not_found");
  const landed = await landOne(ref);
  return { landed };
});
async function pigeonClock() {
  const now = import_firestore.Timestamp.now();
  const pigeons = db().collection("pigeons");
  const due = await pigeons.where("status", "==", "flying").where("arriveAt", "<=", now).limit(200).get();
  for (const d of due.docs) {
    try {
      await landOne(d.ref);
    } catch (e) {
      logger.error("land failed", { id: d.id, e: String(e) });
    }
  }
  const waiting = await pigeons.where("status", "==", "waiting").orderBy("createdAt").limit(50).get();
  const tooOld = Date.now() - WAITING_EXPIRE_DAYS * 864e5;
  for (const d of waiting.docs) {
    const p = d.data();
    try {
      if (p.createdAt.toMillis() < tooOld) {
        await d.ref.update({ status: "expired" });
        const s = (await db().doc(`users/${p.from}`).get()).data();
        if (s) await pushTo(p.from, { title: fmt(s.lang, "expired_t"), body: fmt(s.lang, "expired_b"), data: { type: "pigeon", id: d.id } });
      } else await assign(d.ref, p, p.originLoc ?? p.fromLoc);
    } catch (e) {
      logger.error("retry failed", { id: d.id, e: String(e) });
    }
  }
  const stale = import_firestore.Timestamp.fromMillis(Date.now() - LANDED_AUTO_RELEASE_H * 36e5);
  const uncaught = await pigeons.where("status", "==", "landed").where("landedAt", "<=", stale).limit(100).get();
  for (const d of uncaught.docs) {
    try {
      await moveOn(d.ref, d.data());
    } catch (e) {
      logger.error("auto release failed", { id: d.id, e: String(e) });
    }
  }
  logger.info("pigeon clock", { landed: due.size, waiting: waiting.size, released: uncaught.size });
}
async function vipExpiry() {
  const gone = await db().collection("users").where("vipActive", "==", true).where("vipUntil", "<=", import_firestore.Timestamp.now()).limit(500).get();
  for (const d of gone.docs) {
    await d.ref.update({ vipActive: false, "settings.ghost": false, "settings.hideRead": false, "settings.priority": false });
    await db().doc(`profiles/${d.id}`).set({ vip: false }, { merge: true });
  }
}

// src/safety.ts
var REASONS = ["spam", "scam", "sexual", "harassment", "underage", "fake", "other"];
async function setChatsBlocked(a, b, blocked) {
  const chats = await db().collection("chats").where("members", "array-contains", a).get();
  await Promise.all(chats.docs.filter((c) => c.data().members.includes(b)).map((c) => c.ref.update({ blocked })));
}
var blockUser = onCall(async (req) => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? "");
  if (!target || target === uid) bad("bad_user");
  await db().doc(`users/${uid}`).update({ blocked: import_firestore.FieldValue.arrayUnion(target) });
  await setChatsBlocked(uid, target, true);
  return { ok: true };
});
var unblockUser = onCall(async (req) => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? "");
  await db().doc(`users/${uid}`).update({ blocked: import_firestore.FieldValue.arrayRemove(target) });
  const them = (await db().doc(`users/${target}`).get()).data();
  if (!(them?.blocked ?? []).includes(uid)) await setChatsBlocked(uid, target, false);
  return { ok: true };
});
var reportUser = onCall(async (req) => {
  const uid = requireUid(req);
  const target = String(req.data?.uid ?? "");
  const reason = String(req.data?.reason ?? "");
  if (!target || target === uid) bad("bad_user");
  if (!REASONS.includes(reason)) bad("bad_reason");
  const chatId = String(req.data?.chatId ?? "");
  const chat = chatId ? (await db().doc(`chats/${chatId}`).get()).data() : void 0;
  const members = chat?.members ?? [];
  if (!members.includes(uid) || !members.includes(target)) bad("not_member");
  await db().collection("reports").add({
    by: uid,
    target,
    reason,
    note: normalize(req.data?.note).slice(0, 500),
    chatId,
    at: import_firestore.Timestamp.now(),
    status: "open"
  });
  await db().doc(`users/${uid}`).update({ blocked: import_firestore.FieldValue.arrayUnion(target) });
  await setChatsBlocked(uid, target, true);
  const week = import_firestore.Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const recent = await db().collection("reports").where("target", "==", target).where("at", ">=", week).get();
  const reporters = new Set(recent.docs.map((d) => d.data().by));
  if (reason === "underage") await db().doc(`users/${target}`).update({ review: true, reviewReason: "underage", reviewAt: import_firestore.Timestamp.now() });
  if (reporters.size >= AUTO_BAN_REPORTS) {
    await db().doc(`users/${target}`).update({ banned: true, receiving: false, bannedAt: import_firestore.Timestamp.now(), banReason: "auto_reports" });
  }
  return { ok: true };
});

// src/index.ts
var handlers = {
  initUser,
  updateProfile,
  registerToken,
  deleteAccount,
  sendPigeon,
  catchPigeon,
  releasePigeon,
  landPigeon,
  myStats,
  sendMessage,
  markRead,
  markDelivered,
  startCall,
  answerCall,
  endCall,
  verifyPurchase,
  blockUser,
  unblockUser,
  reportUser
};

// src/limits.ts
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
var CALL_LIMITS = {
  default: [120, 60],
  sendMessage: [40, 60],
  sendPigeon: [10, 60],
  startCall: [6, 60],
  reportUser: [10, 3600],
  blockUser: [30, 3600],
  initUser: [20, 3600],
  deleteAccount: [5, 3600],
  media: [30, 600],
  avatar: [10, 3600]
};
var MEDIA_BYTES_PER_DAY = 300 * 1024 * 1024;
var Limiter = class {
  constructor(now = Date.now) {
    this.now = now;
  }
  hits = /* @__PURE__ */ new Map();
  bytes = /* @__PURE__ */ new Map();
  /** Records one call and says whether it is within the limit. */
  allow(uid, name) {
    const [max, sec] = CALL_LIMITS[name] ?? CALL_LIMITS.default;
    const key = `${uid}:${name in CALL_LIMITS ? name : "default"}`;
    const t = this.now();
    const list = (this.hits.get(key) ?? []).filter((x) => t - x < sec * 1e3);
    if (list.length >= max) {
      this.hits.set(key, list);
      return false;
    }
    list.push(t);
    this.hits.set(key, list);
    if (this.hits.size > 5e4) this.sweep();
    return true;
  }
  /** Adds an upload to today's total; false when it would go over the daily allowance. */
  addBytes(uid, n) {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    const cur = this.bytes.get(uid);
    const used = cur?.day === day ? cur.n : 0;
    if (used + n > MEDIA_BYTES_PER_DAY) return false;
    this.bytes.set(uid, { day, n: used + n });
    return true;
  }
  sweep() {
    const t = this.now();
    for (const [k, v] of this.hits) if (!v.some((x) => t - x < 36e5)) this.hits.delete(k);
  }
};
function guardMediaRoot(root) {
  try {
    (0, import_node_fs4.mkdirSync)(root, { recursive: true });
    const rules = "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .shtml\nRemoveType .php .phtml .phar\n";
    (0, import_node_fs4.writeFileSync)((0, import_node_path4.join)(root, ".htaccess"), rules);
    const av = (0, import_node_path4.join)(root, "avatars");
    (0, import_node_fs4.mkdirSync)(av, { recursive: true });
    if (!(0, import_node_fs4.existsSync)((0, import_node_path4.join)(av, ".htaccess"))) (0, import_node_fs4.writeFileSync)((0, import_node_path4.join)(av, ".htaccess"), rules);
  } catch {
  }
}

// src/server.ts
(0, import_app.initializeApp)();
guardMediaRoot(env("MEDIA_DIR", "/tmp/zajel-media"));
var limiter = new Limiter();
var slowDown = () => new HttpsError("resource-exhausted", "too_fast");
var app = (0, import_express.default)();
app.disable("x-powered-by");
var r = import_express.default.Router();
r.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
async function uidFrom(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  if (!m) return void 0;
  const t = await (0, import_auth2.getAuth)().verifyIdToken(m[1]);
  return t.uid;
}
function sendError(res, e) {
  if (e instanceof HttpsError) {
    const status = e.code === "unauthenticated" ? 401 : e.code === "not-found" ? 404 : e.code === "resource-exhausted" ? 429 : 400;
    res.status(status).json({ error: { code: e.code, message: e.message } });
  } else {
    logger.error("unhandled", e);
    res.status(500).json({ error: { code: "internal", message: "internal" } });
  }
}
r.get("/health", (_req, res) => {
  res.json({ ok: true, freeMode: FREE_MODE, time: (/* @__PURE__ */ new Date()).toISOString() });
});
r.post("/call/:name", import_express.default.json({ limit: "64kb" }), async (req, res) => {
  const h = handlers[req.params.name];
  if (!h) {
    res.status(404).json({ error: { code: "not-found", message: "unknown_call" } });
    return;
  }
  let uid;
  try {
    uid = await uidFrom(req);
  } catch {
    res.status(401).json({ error: { code: "unauthenticated", message: "login_required" } });
    return;
  }
  try {
    if (uid && !limiter.allow(uid, req.params.name)) throw slowDown();
    const result = await h({ auth: uid ? { uid } : void 0, data: req.body?.data ?? {} });
    res.json({ result: result ?? null });
  } catch (e) {
    sendError(res, e);
  }
});
var IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
function looksLikeImage(b) {
  return b[0] === 255 && b[1] === 216 || b.subarray(0, 4).toString("hex") === "89504e47" || b.subarray(8, 12).toString() === "WEBP";
}
r.post("/avatar", import_express.default.raw({ type: Object.keys(IMAGE_TYPES), limit: "5mb" }), async (req, res) => {
  try {
    const uid = await uidFrom(req).catch(() => void 0);
    if (!uid) throw new HttpsError("unauthenticated", "login_required");
    if (!limiter.allow(uid, "avatar")) throw slowDown();
    const ext = IMAGE_TYPES[String(req.headers["content-type"]).split(";")[0]];
    const body = req.body;
    if (!ext || !Buffer.isBuffer(body) || body.length < 100 || !looksLikeImage(body)) throw new HttpsError("invalid-argument", "bad_photo");
    const dir2 = (0, import_node_path5.join)(env("MEDIA_DIR", "/tmp/zajel-media"), "avatars", uid);
    (0, import_node_fs5.mkdirSync)(dir2, { recursive: true });
    for (const f of (0, import_node_fs5.readdirSync)(dir2)) (0, import_node_fs5.rmSync)((0, import_node_path5.join)(dir2, f), { force: true });
    const name = `${Date.now()}.${ext}`;
    (0, import_node_fs5.writeFileSync)((0, import_node_path5.join)(dir2, name), body);
    const url2 = `${env("MEDIA_URL")}/avatars/${uid}/${name}`;
    await (0, import_firestore3.getFirestore)().doc(`profiles/${uid}`).set({ photoUrl: url2 }, { merge: true });
    res.json({ result: { url: url2 } });
  } catch (e) {
    sendError(res, e);
  }
});
r.post("/media", import_express.default.raw({ type: () => true, limit: "20mb" }), async (req, res) => {
  try {
    const uid = await uidFrom(req).catch(() => void 0);
    if (!uid) throw new HttpsError("unauthenticated", "login_required");
    if (!limiter.allow(uid, "media")) throw slowDown();
    const chatId = String(req.query.chatId ?? "");
    const kind = String(req.query.kind ?? "");
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(chatId) || !MEDIA_KINDS.includes(kind)) throw new HttpsError("invalid-argument", "bad_media");
    const { c } = await memberChat(uid, chatId);
    if (c.blocked) throw new HttpsError("failed-precondition", "blocked");
    if ((c.messageCount ?? 0) < MEDIA_AFTER_MESSAGES) throw new HttpsError("failed-precondition", "media_need_messages");
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 16) throw new HttpsError("invalid-argument", "bad_media");
    const ext = mediaExt(kind, body, String(req.query.name ?? ""), String(req.headers["content-type"] ?? ""));
    if (!ext) throw new HttpsError("invalid-argument", kind === "image" ? "bad_photo" : "bad_file_type");
    if (!limiter.addBytes(uid, body.length)) throw new HttpsError("resource-exhausted", "media_daily_limit");
    res.json({ result: { url: saveMedia(chatId, ext, body), size: body.length } });
  } catch (e) {
    sendError(res, e);
  }
});
var running = false;
r.get("/cron", async (req, res) => {
  if (!env("CRON_KEY") || req.query.key !== env("CRON_KEY")) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (running) {
    res.json({ ok: true, skipped: true });
    return;
  }
  running = true;
  try {
    await pigeonClock();
    if ((/* @__PURE__ */ new Date()).getUTCMinutes() === 0) await vipExpiry();
    res.json({ ok: true });
  } catch (e) {
    logger.error("cron failed", e);
    res.status(500).json({ ok: false });
  } finally {
    running = false;
  }
});
var base = env("BASE_PATH", "/zajel-api").replace(/\/$/, "");
app.use(base, r);
app.use("/", r);
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") res.status(413).json({ error: { code: "invalid-argument", message: "file_too_big" } });
  else sendError(res, err);
});
var port = Number(env("PORT", "3000"));
app.listen(port, () => logger.info(`zajel api on ${port}${base} freeMode=${FREE_MODE}`));
