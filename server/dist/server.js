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
var import_node_fs7 = require("node:fs");
var import_node_path7 = require("node:path");
var import_express = __toESM(require("express"));
var import_app2 = require("firebase-admin/app");
var import_auth3 = require("firebase-admin/auth");
var import_firestore4 = require("firebase-admin/firestore");

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
  const root2 = (0, import_node_path2.join)(dir(), "chat");
  (0, import_node_fs2.mkdirSync)(root2, { recursive: true });
  guard(root2);
  const folder = (0, import_node_path2.join)(root2, chatId);
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
function checkRestricted(u) {
  const until = u.restrictedUntil;
  if (until && until.toMillis() > Date.now()) fail("restricted", new Date(until.toMillis()).toISOString());
}
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
var SETTING_KEYS = [
  "notif",
  "sound",
  "showCity",
  "calls",
  "ghost",
  "hideRead",
  "badge",
  "priority",
  "notifPigeon",
  "notifMessage",
  "notifAccept",
  "hidePreview",
  "showAchievements",
  "effects"
];
var EFFECTS = ["full", "light", "off"];
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
  if (d.gender !== void 0) {
    if (!["m", "f", ""].includes(d.gender)) bad("bad_setting");
    priv.gender = d.gender || import_firestore.FieldValue.delete();
    if (!d.gender) priv.genderMatch = false;
  }
  if (d.genderMatch !== void 0) priv.genderMatch = !!d.genderMatch && !!(d.gender ?? u.gender);
  if (d.settings && typeof d.settings === "object") {
    for (const k of SETTING_KEYS) {
      if (!(k in d.settings)) continue;
      const v = d.settings[k];
      if (k === "calls") {
        if (!["all", "ten", "none"].includes(v)) bad("bad_setting");
      } else if (k === "effects") {
        if (!EFFECTS.includes(v)) bad("bad_setting");
      } else if (typeof v !== "boolean") bad("bad_setting");
      if (VIP_ONLY.has(k) && v === true && !isVip(u)) bad("vip_only");
      priv[`settings.${k}`] = v;
    }
    if ("showCity" in d.settings) pub.city = d.settings.showCity === false ? "" : u.city;
    if ("badge" in d.settings) pub.badge = !!d.settings.badge;
    if ("showAchievements" in d.settings) pub.showAchievements = !!d.settings.showAchievements;
  }
  await db().doc(`users/${uid}`).update(priv);
  if (Object.keys(pub).length) await db().doc(`profiles/${uid}`).set(pub, { merge: true });
  return { ok: true };
});
var ackNotice = onCall(async (req) => {
  const uid = requireUid(req);
  const u = await getUser(uid);
  if (u.notice?.kind === "warn") await db().doc(`users/${uid}`).update({ notice: import_firestore.FieldValue.delete() });
  else if (u.notice) await db().doc(`users/${uid}`).update({ "notice.seen": true });
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
  ar: { landed_t: "\u062D\u0637\u0651 \u0639\u0646\u062F\u0643 \u0632\u0627\u062C\u0644!", landed_b: "\u0631\u0633\u0627\u0644\u0629 \u0645\u0646 {city}\u060C {country}", caught_t: "{name} \u0627\u0644\u062A\u0642\u0637 \u0632\u0627\u062C\u0644\u0643", caught_b: "\u0641\u064A {city}. \u0642\u0644 \u0645\u0631\u062D\u0628\u0627\u064B!", call_t: "{name} \u064A\u062A\u0635\u0644 \u0628\u0643", voice: "\u0645\u0643\u0627\u0644\u0645\u0629 \u0635\u0648\u062A\u064A\u0629 \u0645\u062A\u0631\u062C\u0645\u0629", video: "\u0645\u0643\u0627\u0644\u0645\u0629 \u0641\u064A\u062F\u064A\u0648 \u0645\u062A\u0631\u062C\u0645\u0629", expired_t: "\u0639\u0627\u062F \u0632\u0627\u062C\u0644\u0643", expired_b: "\u0644\u0645 \u064A\u0644\u062A\u0642\u0637\u0647 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u0629. \u062C\u0631\u0651\u0628 \u0625\u0637\u0644\u0627\u0642 \u0632\u0627\u062C\u0644 \u0622\u062E\u0631.", app: "\u0632\u0627\u062C\u0644", hidden: "\u0644\u062F\u064A\u0643 \u0625\u0634\u0639\u0627\u0631 \u062C\u062F\u064A\u062F" },
  en: { landed_t: "A pigeon landed with you!", landed_b: "A letter from {city}, {country}", caught_t: "{name} caught your pigeon", caught_b: "In {city}. Say hello!", call_t: "{name} is calling", voice: "Translated voice call", video: "Translated video call", expired_t: "Your pigeon came back", expired_b: "Nobody caught it this time. Try sending another.", app: "Zajel", hidden: "You have a new notification" },
  fr: { landed_t: "Un pigeon s\u2019est pos\xE9 chez vous !", landed_b: "Une lettre de {city}, {country}", caught_t: "{name} a attrap\xE9 votre pigeon", caught_b: "\xC0 {city}. Dites bonjour !", call_t: "{name} vous appelle", voice: "Appel vocal traduit", video: "Appel vid\xE9o traduit", expired_t: "Votre pigeon est revenu", expired_b: "Personne ne l\u2019a attrap\xE9 cette fois. Envoyez-en un autre.", app: "Zajel", hidden: "Vous avez une nouvelle notification" },
  tr: { landed_t: "Sana bir g\xFCvercin kondu!", landed_b: "{city}, {country} \u015Fehrinden bir mektup", caught_t: "{name} g\xFCvercinini yakalad\u0131", caught_b: "{city} \u015Fehrinde. Merhaba de!", call_t: "{name} seni ar\u0131yor", voice: "\xC7evirili sesli arama", video: "\xC7evirili g\xF6r\xFCnt\xFCl\xFC arama", expired_t: "G\xFCvercinin geri d\xF6nd\xFC", expired_b: "Bu sefer kimse yakalamad\u0131. Bir tane daha g\xF6nder.", app: "Zajel", hidden: "Yeni bir bildirimin var" },
  he: { landed_t: "\u05D9\u05D5\u05E0\u05D4 \u05E0\u05D7\u05EA\u05D4 \u05D0\u05E6\u05DC\u05DA!", landed_b: "\u05DE\u05DB\u05EA\u05D1 \u05DE{city}, {country}", caught_t: "{name} \u05EA\u05E4\u05E1/\u05D4 \u05D0\u05EA \u05D4\u05D9\u05D5\u05E0\u05D4 \u05E9\u05DC\u05DA", caught_b: "\u05D1{city}. \u05EA\u05D2\u05D9\u05D3/\u05D9 \u05E9\u05DC\u05D5\u05DD!", call_t: "{name} \u05DE\u05EA\u05E7\u05E9\u05E8/\u05EA", voice: "\u05E9\u05D9\u05D7\u05D4 \u05E7\u05D5\u05DC\u05D9\u05EA \u05DE\u05EA\u05D5\u05E8\u05D2\u05DE\u05EA", video: "\u05E9\u05D9\u05D7\u05EA \u05D5\u05D9\u05D3\u05D0\u05D5 \u05DE\u05EA\u05D5\u05E8\u05D2\u05DE\u05EA", expired_t: "\u05D4\u05D9\u05D5\u05E0\u05D4 \u05E9\u05DC\u05DA \u05D7\u05D6\u05E8\u05D4", expired_b: "\u05D0\u05E3 \u05D0\u05D7\u05D3 \u05DC\u05D0 \u05EA\u05E4\u05E1 \u05D0\u05D5\u05EA\u05D4 \u05D4\u05E4\u05E2\u05DD. \u05E0\u05E1\u05D4/\u05D9 \u05DC\u05E9\u05DC\u05D5\u05D7 \u05E2\u05D5\u05D3 \u05D0\u05D7\u05EA.", app: "Zajel", hidden: "\u05D9\u05E9 \u05DC\u05DA \u05D4\u05EA\u05E8\u05D0\u05D4 \u05D7\u05D3\u05E9\u05D4" },
  es: { landed_t: "\xA1Una paloma aterriz\xF3 contigo!", landed_b: "Una carta desde {city}, {country}", caught_t: "{name} atrap\xF3 tu paloma", caught_b: "En {city}. \xA1Saluda!", call_t: "{name} te est\xE1 llamando", voice: "Llamada de voz traducida", video: "Videollamada traducida", expired_t: "Tu paloma volvi\xF3", expired_b: "Nadie la atrap\xF3 esta vez. Prueba a enviar otra.", app: "Zajel", hidden: "Tienes una notificaci\xF3n nueva" },
  pt: { landed_t: "Um pombo pousou com voc\xEA!", landed_b: "Uma carta de {city}, {country}", caught_t: "{name} pegou o seu pombo", caught_b: "Em {city}. Diga ol\xE1!", call_t: "{name} est\xE1 ligando", voice: "Chamada de voz traduzida", video: "Videochamada traduzida", expired_t: "Seu pombo voltou", expired_b: "Ningu\xE9m o pegou desta vez. Tente enviar outro.", app: "Zajel", hidden: "Voc\xEA tem uma nova notifica\xE7\xE3o" },
  fa: { landed_t: "\u06CC\u06A9 \u06A9\u0628\u0648\u062A\u0631 \u067E\u06CC\u0634 \u062A\u0648 \u0646\u0634\u0633\u062A!", landed_b: "\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0627\u0632 {city}\u060C {country}", caught_t: "{name} \u06A9\u0628\u0648\u062A\u0631\u062A \u0631\u0627 \u06AF\u0631\u0641\u062A", caught_b: "\u062F\u0631 {city}. \u0633\u0644\u0627\u0645 \u06A9\u0646!", call_t: "{name} \u062F\u0631 \u062D\u0627\u0644 \u062A\u0645\u0627\u0633 \u0627\u0633\u062A", voice: "\u062A\u0645\u0627\u0633 \u0635\u0648\u062A\u06CC \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647", video: "\u062A\u0645\u0627\u0633 \u062A\u0635\u0648\u06CC\u0631\u06CC \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647", expired_t: "\u06A9\u0628\u0648\u062A\u0631\u062A \u0628\u0631\u06AF\u0634\u062A", expired_b: "\u0627\u06CC\u0646 \u0628\u0627\u0631 \u06A9\u0633\u06CC \u0622\u0646 \u0631\u0627 \u0646\u06AF\u0631\u0641\u062A. \u06CC\u06A9\u06CC \u062F\u06CC\u06AF\u0631 \u0628\u0641\u0631\u0633\u062A.", app: "\u0632\u0627\u062C\u0644", hidden: "\u06CC\u06A9 \u0627\u0639\u0644\u0627\u0646 \u062C\u062F\u06CC\u062F \u062F\u0627\u0631\u06CC" },
  ru: { landed_t: "\u041A \u0432\u0430\u043C \u043F\u0440\u0438\u043B\u0435\u0442\u0435\u043B \u0433\u043E\u043B\u0443\u0431\u044C!", landed_b: "\u041F\u0438\u0441\u044C\u043C\u043E \u0438\u0437 {city}, {country}", caught_t: "{name} \u043F\u043E\u0439\u043C\u0430\u043B(\u0430) \u0432\u0430\u0448\u0435\u0433\u043E \u0433\u043E\u043B\u0443\u0431\u044F", caught_b: "\u0412 {city}. \u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0442\u0435\u0441\u044C!", call_t: "{name} \u0437\u0432\u043E\u043D\u0438\u0442 \u0432\u0430\u043C", voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0437\u0432\u043E\u043D\u043E\u043A \u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C", video: "\u0412\u0438\u0434\u0435\u043E\u0437\u0432\u043E\u043D\u043E\u043A \u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C", expired_t: "\u0412\u0430\u0448 \u0433\u043E\u043B\u0443\u0431\u044C \u0432\u0435\u0440\u043D\u0443\u043B\u0441\u044F", expired_b: "\u0412 \u044D\u0442\u043E\u0442 \u0440\u0430\u0437 \u0435\u0433\u043E \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043F\u043E\u0439\u043C\u0430\u043B. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0435\u0449\u0451 \u043E\u0434\u043D\u043E\u0433\u043E.", app: "Zajel", hidden: "\u0423 \u0432\u0430\u0441 \u043D\u043E\u0432\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435" },
  de: { landed_t: "Eine Taube ist bei dir gelandet!", landed_b: "Ein Brief aus {city}, {country}", caught_t: "{name} hat deine Taube gefangen", caught_b: "In {city}. Sag hallo!", call_t: "{name} ruft dich an", voice: "\xDCbersetzter Sprachanruf", video: "\xDCbersetzter Videoanruf", expired_t: "Deine Taube ist zur\xFCck", expired_b: "Diesmal hat sie niemand gefangen. Schick eine neue.", app: "Zajel", hidden: "Du hast eine neue Benachrichtigung" },
  it: { landed_t: "Un piccione \xE8 atterrato da te!", landed_b: "Una lettera da {city}, {country}", caught_t: "{name} ha preso il tuo piccione", caught_b: "A {city}. Saluta!", call_t: "{name} ti sta chiamando", voice: "Chiamata vocale tradotta", video: "Videochiamata tradotta", expired_t: "Il tuo piccione \xE8 tornato", expired_b: "Questa volta nessuno l'ha preso. Prova a mandarne un altro.", app: "Zajel", hidden: "Hai una nuova notifica" },
  uk: { landed_t: "\u0414\u043E \u0442\u0435\u0431\u0435 \u043F\u0440\u0438\u043B\u0435\u0442\u0456\u0432 \u0433\u043E\u043B\u0443\u0431!", landed_b: "\u041B\u0438\u0441\u0442 \u0456\u0437 {city}, {country}", caught_t: "{name} \u0441\u043F\u0456\u0439\u043C\u0430\u0432(\u043B\u0430) \u0442\u0432\u043E\u0433\u043E \u0433\u043E\u043B\u0443\u0431\u0430", caught_b: "\u0423 {city}. \u041F\u0440\u0438\u0432\u0456\u0442\u0430\u0439\u0441\u044F!", call_t: "{name} \u0434\u0437\u0432\u043E\u043D\u0438\u0442\u044C \u0442\u043E\u0431\u0456", voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0438\u0439 \u0434\u0437\u0432\u0456\u043D\u043E\u043A \u0456\u0437 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434\u043E\u043C", video: "\u0412\u0456\u0434\u0435\u043E\u0434\u0437\u0432\u0456\u043D\u043E\u043A \u0456\u0437 \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434\u043E\u043C", expired_t: "\u0422\u0432\u0456\u0439 \u0433\u043E\u043B\u0443\u0431 \u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0432\u0441\u044F", expired_b: "\u0426\u044C\u043E\u0433\u043E \u0440\u0430\u0437\u0443 \u0439\u043E\u0433\u043E \u043D\u0456\u0445\u0442\u043E \u043D\u0435 \u0441\u043F\u0456\u0439\u043C\u0430\u0432. \u041D\u0430\u0434\u0456\u0448\u043B\u0438 \u0449\u0435 \u043E\u0434\u043D\u043E\u0433\u043E.", app: "Zajel", hidden: "\u0423 \u0442\u0435\u0431\u0435 \u043D\u043E\u0432\u0435 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F" },
  zh: { landed_t: "\u4E00\u53EA\u4FE1\u9E3D\u843D\u5728\u4F60\u8FD9\u91CC\uFF01", landed_b: "\u6765\u81EA{country}{city}\u7684\u4FE1", caught_t: "{name} \u63A5\u4F4F\u4E86\u4F60\u7684\u4FE1\u9E3D", caught_b: "\u5728{city}\u3002\u6253\u4E2A\u62DB\u547C\u5427\uFF01", call_t: "{name} \u6B63\u5728\u547C\u53EB\u4F60", voice: "\u7FFB\u8BD1\u8BED\u97F3\u901A\u8BDD", video: "\u7FFB\u8BD1\u89C6\u9891\u901A\u8BDD", expired_t: "\u4F60\u7684\u4FE1\u9E3D\u98DE\u56DE\u6765\u4E86", expired_b: "\u8FD9\u6B21\u6CA1\u6709\u4EBA\u63A5\u4F4F\u5B83\u3002\u518D\u653E\u98DE\u4E00\u53EA\u5427\u3002", app: "Zajel", hidden: "\u4F60\u6709\u4E00\u6761\u65B0\u901A\u77E5" },
  hi: { landed_t: "\u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u090F\u0915 \u0915\u092C\u0942\u0924\u0930 \u0909\u0924\u0930\u093E!", landed_b: "{city}, {country} \u0938\u0947 \u090F\u0915 \u091A\u093F\u091F\u094D\u0920\u0940", caught_t: "{name} \u0928\u0947 \u0906\u092A\u0915\u093E \u0915\u092C\u0942\u0924\u0930 \u092A\u0915\u0921\u093C\u093E", caught_b: "{city} \u092E\u0947\u0902\u0964 \u0928\u092E\u0938\u094D\u0924\u0947 \u0915\u0939\u093F\u090F!", call_t: "{name} \u0915\u0949\u0932 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902", voice: "\u0905\u0928\u0941\u0935\u093E\u0926\u093F\u0924 \u0935\u0949\u0907\u0938 \u0915\u0949\u0932", video: "\u0905\u0928\u0941\u0935\u093E\u0926\u093F\u0924 \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u0949\u0932", expired_t: "\u0906\u092A\u0915\u093E \u0915\u092C\u0942\u0924\u0930 \u0932\u094C\u091F \u0906\u092F\u093E", expired_b: "\u0907\u0938 \u092C\u093E\u0930 \u0915\u093F\u0938\u0940 \u0928\u0947 \u0928\u0939\u0940\u0902 \u092A\u0915\u0921\u093C\u093E\u0964 \u090F\u0915 \u0914\u0930 \u092D\u0947\u091C\u093F\u090F\u0964", app: "Zajel", hidden: "\u0906\u092A\u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0928\u0908 \u0938\u0942\u091A\u0928\u093E \u0939\u0948" },
  ku: { landed_t: "Kevokek li cem te daket!", landed_b: "Nameyek ji {city}, {country}", caught_t: "{name} kevoka te girt", caught_b: "Li {city}. Silav bike!", call_t: "{name} li te digere", voice: "Banga deng\xEE ya wergerand\xEE", video: "Banga v\xEEdyoy\xEE ya wergerand\xEE", expired_t: "Kevoka te vegeriya", expired_b: "V\xEA car\xEA kes\xEE ew negirt. Yeke din bi\u015F\xEEne.", app: "Zajel", hidden: "Agahdariyek n\xFB ji te re heye" }
};
function fmt(lang, key, vars = {}) {
  const s = (T[lang] ?? T.en)[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
var KIND_SETTING = { pigeon: "notifPigeon", message: "notifMessage", accept: "notifAccept" };
async function pushTo(uid, msg, kind = msg.call ? "call" : "system") {
  const db2 = (0, import_firestore2.getFirestore)();
  const ref = db2.doc(`users/${uid}`);
  const snap = await ref.get();
  const u = snap.data();
  if (!u) return;
  if (kind !== "call") {
    if (u.settings?.notif === false) return;
    const k = KIND_SETTING[kind];
    if (k && u.settings?.[k] === false) return;
    if (u.settings?.hidePreview && kind !== "system") msg = { ...msg, title: fmt(u.lang, "app"), body: fmt(u.lang, "hidden") };
  }
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

// src/regions.ts
var REGIONS = ["AF", "AS", "EU", "NA", "SA", "OC"];
var BY_REGION = {
  AF: "AO BF BI BJ BW CD CF CG CI CM DJ DZ EG EH ER ET GA GH GM GN GQ GW KE LR LS LY MA MG ML MR MW MZ NA NE NG RW SD SL SN SO SS SZ TD TG TN TZ UG ZA ZM ZW",
  AS: "AE AF AM AZ BD BN BT CN CY GE ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MY NP OM PH PK PS QA SA SY TH TJ TL TM TR TW UZ VN YE",
  EU: "AL AT BA BE BG BY CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LT LU LV MD ME MK NL NO PL PT RO RS RU SE SI SK UA",
  NA: "BS BZ CA CR CU DO GL GT HN HT JM MX NI PA PR SV TT US",
  SA: "AR BO BR CL CO EC FK GY PE PY SR UY VE",
  OC: "AU FJ NC NZ PG SB VU AQ TF"
};
var REGION_OF = {};
for (const r2 of REGIONS) for (const c of BY_REGION[r2].split(" ")) REGION_OF[c] = r2;
var regionOf = (country) => REGION_OF[country] ?? null;
var isRegion = (v) => typeof v === "string" && REGIONS.includes(v);
function matchesWant(c, w, year = (/* @__PURE__ */ new Date()).getUTCFullYear()) {
  if (w.country && c.country !== w.country) return false;
  if (w.region && regionOf(c.country) !== w.region) return false;
  if (w.lang && c.lang !== w.lang) return false;
  if (w.ageMin || w.ageMax) {
    if (!c.birthYear) return false;
    const age = year - c.birthYear;
    if (w.ageMin && age < w.ageMin) return false;
    if (w.ageMax && age > w.ageMax) return false;
  }
  if (w.gender) {
    if (!c.genderMatch || c.gender !== w.gender) return false;
  }
  return true;
}
function readWant(d, isLang2) {
  const w = {};
  if (!d) return w;
  if (typeof d.region === "string" && isRegion(d.region)) w.region = d.region;
  if (isLang2(d.lang)) w.lang = d.lang;
  const min = Math.round(Number(d.ageMin)), max = Math.round(Number(d.ageMax));
  if (Number.isFinite(min) && min >= 18 && min <= 100) w.ageMin = min;
  if (Number.isFinite(max) && max >= 18 && max <= 100) w.ageMax = max;
  if (w.ageMin && w.ageMax && w.ageMin > w.ageMax) [w.ageMin, w.ageMax] = [w.ageMax, w.ageMin];
  if (d.gender === "m" || d.gender === "f") w.gender = d.gender;
  return w;
}
var hasWant = (w) => !!(w.region || w.lang || w.ageMin || w.ageMax || w.gender);

// src/pigeons.ts
async function pickRecipient(p, sender) {
  const users = db().collection("users");
  let q = users.where("receiving", "==", true).where("banned", "==", false);
  if (p.wantCountry) q = q.where("country", "==", p.wantCountry);
  const want = p.want ?? {};
  const n = hasWant(want) ? 60 : 25;
  const r2 = Math.random();
  const [a, b] = await Promise.all([
    q.where("rand", ">=", r2).orderBy("rand").limit(n).get(),
    q.where("rand", "<", r2).orderBy("rand", "desc").limit(n).get()
  ]);
  const since = Date.now() - ACTIVE_WITHIN_DAYS * 864e5;
  const blocked = new Set(sender.blocked ?? []);
  let list = [...a.docs, ...b.docs].filter((d) => {
    const c = d.data();
    return d.id !== p.from && !p.tried.includes(d.id) && !blocked.has(d.id) && !(c.blocked ?? []).includes(p.from) && (c.lastActive?.toMillis() ?? 0) >= since && matchesWant(c, want);
  });
  if (!list.length) return null;
  if (!p.wantCountry && !want.region) {
    const abroad = list.filter((d) => d.data().country !== p.fromCountry);
    if (abroad.length) list = abroad;
  }
  if (p.avoid?.length) {
    const fresh = list.filter((d) => !p.avoid.includes(d.id));
    if (fresh.length) list = fresh;
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
    toLang: u.lang,
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
    if (s) await pushTo(p.from, { title: fmt(s.lang, "expired_t"), body: fmt(s.lang, "expired_b"), data: { type: "pigeon", id: ref.id } }, "pigeon");
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
  const filters = readWant(req.data?.filters, isLang);
  const weekAgo = import_firestore.Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const recent = await db().collection("pigeons").where("from", "==", uid).where("createdAt", ">=", weekAgo).orderBy("createdAt", "desc").select("toUid").limit(100).get();
  const avoid = [...new Set(recent.docs.map((d) => d.data().toUid).filter((x) => !!x))].slice(0, 60);
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
    checkRestricted(u);
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
      createdAt: import_firestore.Timestamp.now(),
      ...hasWant(filters) ? { want: filters } : {},
      ...avoid.length ? { avoid } : {}
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
  if (s) await pushTo(p.from, { title: fmt(s.lang, "caught_t", { name: me.name }), body: fmt(s.lang, "caught_b", { city: publicCity(me) || me.countryName }), data: { type: "chat", chatId: id } }, "accept");
  return { chatId: id };
});
var myStats = onCall(async (req) => {
  const uid = requireUid(req);
  const pigeons = db().collection("pigeons");
  const [sentQ, gotQ, chatsQ, prof] = await Promise.all([
    pigeons.where("from", "==", uid).select("status", "toCountry", "toCountryName", "toCity", "toLang", "km", "createdAt", "landedAt").limit(5e3).get(),
    pigeons.where("toUid", "==", uid).select("status", "fromCountry", "fromCountryName", "fromLang", "createdAt", "landedAt").limit(5e3).get(),
    db().collection("chats").where("members", "array-contains", uid).select("createdAt").limit(1e3).get(),
    db().doc(`profiles/${uid}`).get()
  ]);
  const stamps = /* @__PURE__ */ new Map();
  const stamp = (c, name, at, dir2) => {
    if (typeof c !== "string" || !c) return;
    const old = stamps.get(c);
    if (!old || at < old.at) stamps.set(c, { c, name: String(name ?? ""), at, dir: dir2 });
  };
  const langs = /* @__PURE__ */ new Set();
  const sentCountries = /* @__PURE__ */ new Set();
  const monthStart = /* @__PURE__ */ new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const month = /* @__PURE__ */ new Set();
  let km = 0;
  const journeys = [];
  for (const d of sentQ.docs) {
    const p = d.data();
    const at = (p.landedAt ?? p.createdAt)?.toMillis?.() ?? 0;
    const arrived = p.status === "landed" || p.status === "caught";
    if (arrived) {
      if (p.toCountry) sentCountries.add(String(p.toCountry));
      km += Number(p.km) || 0;
      stamp(p.toCountry, p.toCountryName, at, "out");
      if (p.toLang) langs.add(String(p.toLang));
      if (at >= monthStart.getTime() && p.toCountry) month.add(String(p.toCountry));
    }
    journeys.push({ id: d.id, status: p.status, country: p.toCountry ?? "", countryName: p.toCountryName ?? "", city: p.toCity ?? "", km: Math.round(Number(p.km) || 0), at: p.createdAt?.toMillis?.() ?? 0 });
  }
  let received = 0;
  for (const d of gotQ.docs) {
    const p = d.data();
    if (p.status !== "landed" && p.status !== "caught") continue;
    received++;
    const at = (p.landedAt ?? p.createdAt)?.toMillis?.() ?? 0;
    stamp(p.fromCountry, p.fromCountryName, at, "in");
    if (p.fromLang) langs.add(String(p.fromLang));
    if (at >= monthStart.getTime() && p.fromCountry) month.add(String(p.fromCountry));
  }
  journeys.sort((a, b) => b.at - a.at);
  const pr = prof.data() ?? {};
  const earned = [];
  if (sentQ.size >= 1) earned.push("first_pigeon");
  if (stamps.size >= 5) earned.push("countries_5");
  if (langs.size >= 5) earned.push("langs_5");
  if (pr.photoUrl && pr.bio) earned.push("profile_full");
  if (km >= 1e4) earned.push("km_10k");
  if (chatsQ.size >= 10) earned.push("chats_10");
  return {
    sent: sentQ.size,
    received,
    countries: sentCountries.size,
    km: Math.round(km),
    chats: chatsQ.size,
    langs: langs.size,
    stamps: [...stamps.values()].sort((a, b) => a.at - b.at),
    journeys: journeys.slice(0, 20),
    achievements: earned,
    monthCountries: month.size
  };
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
  checkRestricted(me);
  const replyTo = await readReply(ref, req.data?.replyTo);
  const { src, tr } = text ? await translateAll(text, [me.lang, them.lang], me.lang) : { src: me.lang, tr: {} };
  const now = import_firestore.Timestamp.now();
  const label = media ? mediaLabel(media.kind, String(media.name ?? "")) : "";
  const ttlH = Number(c.ttlH) || 0;
  await ref.collection("messages").add({
    from: uid,
    text,
    src,
    tr,
    at: now,
    ...media ? { media } : {},
    ...replyTo ? { replyTo } : {},
    ...ttlH ? { expireAt: import_firestore.Timestamp.fromMillis(now.toMillis() + ttlH * 36e5) } : {}
  });
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
  await pushTo(other, { title: me.name, body: lastTr[them.lang] ?? lastText, data: { type: "chat", chatId: ref.id } }, "message");
  return { ok: true, src };
});
async function readReply(chatRef, v) {
  if (typeof v !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(v)) return null;
  const m = (await chatRef.collection("messages").doc(v).get()).data();
  if (!m || m.deleted) return null;
  return { id: v, from: m.from, text: String(m.text ?? "").slice(0, 140), ...m.media ? { media: m.media.kind } : {} };
}
var deleteMessage = onCall(async (req) => {
  const uid = requireUid(req);
  const { ref } = await memberChat(uid, String(req.data?.chatId ?? ""));
  const id = String(req.data?.id ?? "");
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) bad("bad_message");
  const mref = ref.collection("messages").doc(id);
  const m = (await mref.get()).data();
  if (!m || m.from !== uid || m.pigeon || m.system) fail("not_yours");
  await mref.update({ deleted: true, text: "", tr: {}, media: import_firestore.FieldValue.delete(), replyTo: import_firestore.FieldValue.delete() });
  return { ok: true };
});
var TTL_HOURS = [0, 24, 168];
var setChatTtl = onCall(async (req) => {
  const uid = requireUid(req);
  const { ref, c } = await memberChat(uid, String(req.data?.chatId ?? ""));
  if (c.blocked) fail("blocked");
  const hours = Number(req.data?.hours);
  if (!TTL_HOURS.includes(hours)) bad("bad_setting");
  if ((Number(c.ttlH) || 0) === hours) return { ok: true };
  const now = import_firestore.Timestamp.now();
  await ref.update({ ttlH: hours, ttlBy: uid, updatedAt: now, ...hours ? { ttlEver: true } : {} });
  await ref.collection("messages").add({ from: uid, text: "", tr: {}, at: now, system: "ttl", hours });
  return { ok: true };
});
async function purgeExpiredMessages() {
  const chats = await db().collection("chats").where("ttlEver", "==", true).limit(500).get();
  let n = 0;
  for (const c of chats.docs) {
    const old = await c.ref.collection("messages").where("expireAt", "<=", import_firestore.Timestamp.now()).limit(400).get();
    if (old.empty) continue;
    const b = db().batch();
    old.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
    n += old.size;
  }
  return n;
}
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
  checkRestricted(me);
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
  }, "pigeon");
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
        if (s) await pushTo(p.from, { title: fmt(s.lang, "expired_t"), body: fmt(s.lang, "expired_b"), data: { type: "pigeon", id: d.id } }, "pigeon");
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

// src/errors.ts
var KEEP_DAYS = 30;
var clip = (v, n) => normalize(v).slice(0, n);
async function recordError(e) {
  try {
    await db().collection("errors").add({ ...e, msg: e.msg.slice(0, 500), stack: (e.stack ?? "").slice(0, 3e3), at: import_firestore.Timestamp.now() });
  } catch (x) {
    logger.warn("could not record error", String(x));
  }
}
function serverError(where, e) {
  const err = e instanceof Error ? e : new Error(String(e));
  return recordError({ source: "server", where, msg: err.message, stack: err.stack });
}
var logError = onCall(async (req) => {
  const uid = requireUid(req);
  const d = req.data ?? {};
  const msg = clip(d.msg, 500);
  if (!msg) return { ok: true };
  await recordError({
    source: "app",
    where: clip(d.where, 80) || "app",
    msg,
    stack: String(d.stack ?? "").slice(0, 3e3),
    uid,
    ver: clip(d.ver, 20),
    os: clip(d.os, 40)
  });
  return { ok: true };
});
async function purgeErrors() {
  const old = await db().collection("errors").where("at", "<", import_firestore.Timestamp.fromMillis(Date.now() - KEEP_DAYS * 864e5)).limit(400).get();
  const b = db().batch();
  old.docs.forEach((d) => b.delete(d.ref));
  if (!old.empty) await b.commit();
  return old.size;
}

// src/facts.ts
var FACTS = {
  AF: "Afghanistan is home to the Minaret of Jam, a 65-metre tower built in the 12th century.",
  AL: "Albanians nod to say no and shake their head to say yes.",
  DZ: "Algeria is the largest country in Africa by area.",
  AO: "The Kalandula Falls in Angola are among the largest waterfalls in Africa by volume.",
  AQ: "Antarctica holds about 70 percent of the world\u2019s fresh water as ice.",
  AR: "Aconcagua in Argentina is the highest mountain outside Asia.",
  AM: "Armenia was the first country to adopt Christianity as a state religion, in 301.",
  AU: "The Great Barrier Reef off Australia can be seen from space.",
  AT: "Vienna\u2019s Caf\xE9 Sacher gave the world the famous Sachertorte chocolate cake.",
  AZ: "Azerbaijan is called the Land of Fire for gas vents that have burned for centuries.",
  BS: "The Bahamas are made up of about 700 islands and more than 2,000 cays.",
  BD: "The Sundarbans in Bangladesh are the largest mangrove forest in the world.",
  BY: "Belarus has one of the last parts of the primeval forest that once covered Europe.",
  BE: "Belgium produces hundreds of millions of kilograms of chocolate every year.",
  BZ: "Belize has the second-longest barrier reef in the world.",
  BJ: "The town of Ganvi\xE9 in Benin is built entirely on stilts in a lake.",
  BT: "Bhutan measures its progress with Gross National Happiness.",
  BO: "Salar de Uyuni in Bolivia is the largest salt flat on Earth.",
  BA: "The Old Bridge of Mostar in Bosnia and Herzegovina dates from 1566.",
  BW: "The Okavango Delta in Botswana is an inland river delta that never reaches the sea.",
  BR: "Brazil is home to about 60 percent of the Amazon rainforest.",
  BN: "Kampong Ayer in Brunei is one of the largest water villages in the world.",
  BG: "Bulgaria produces a large share of the world\u2019s rose oil, used in perfumes.",
  BF: "Burkina Faso hosts FESPACO, the largest film festival in Africa.",
  BI: "Burundi is known for its royal drummers, a tradition listed by UNESCO.",
  KH: "Angkor Wat in Cambodia is the largest religious monument in the world.",
  CM: 'Cameroon is called "Africa in miniature" for its wide variety of landscapes.',
  CA: "Canada has the longest coastline of any country.",
  CF: "The Central African Republic has some of the darkest night skies in Africa.",
  TD: "Lake Chad gave its name to the country of Chad.",
  CL: "The Atacama Desert in Chile is one of the driest places on Earth.",
  CN: "Paper, printing, the compass and gunpowder were all first developed in China.",
  CO: "Colombia has more species of birds than any other country.",
  CG: "Odzala-Kokoua in the Republic of the Congo is one of Africa\u2019s oldest national parks.",
  CD: "The Congo River is the deepest river in the world.",
  CR: "Costa Rica holds about 5 percent of the world\u2019s plant and animal species.",
  HR: "The necktie takes its name from Croatian soldiers of the 17th century.",
  CU: "The bee hummingbird of Cuba is the smallest bird in the world.",
  CY: "Cyprus is said in legend to be the birthplace of Aphrodite.",
  CZ: "Prague Castle is one of the largest castle complexes in the world.",
  CI: "C\xF4te d\u2019Ivoire is the world\u2019s largest producer of cocoa beans.",
  DK: 'LEGO bricks were invented in Denmark; the name means "play well".',
  DJ: "Lake Assal in Djibouti is the lowest point in Africa.",
  DO: "Santo Domingo has the oldest cathedral in the Americas.",
  EC: "Ecuador is named after the equator, which runs through it.",
  EG: "The Great Pyramid of Giza was the tallest human-made structure for almost 4,000 years.",
  SV: "El Salvador is known as the Land of Volcanoes.",
  GQ: "Equatorial Guinea is the only country in Africa with Spanish as an official language.",
  ER: "Asmara, the capital of Eritrea, is famous for its modernist architecture.",
  EE: "Estonia was one of the first countries to offer online voting nationwide.",
  SZ: "Eswatini celebrates the Umhlanga reed dance every year.",
  ET: "Ethiopia has its own calendar, about seven years behind the Gregorian one.",
  FK: "The Falkland Islands are home to five species of penguin.",
  FJ: "Fiji is made up of more than 330 islands.",
  FI: "Finland has about three million saunas for five and a half million people.",
  FR: "France is the most visited country in the world.",
  TF: "The French Southern Territories are home to large colonies of king penguins.",
  GA: "About 85 percent of Gabon is covered by rainforest.",
  GM: "The Gambia is the smallest country on mainland Africa.",
  GE: "Georgia has one of the oldest traditions of winemaking, about 8,000 years old.",
  DE: "Germany has more than 1,500 kinds of sausage.",
  GH: "Lake Volta in Ghana is one of the largest artificial lakes in the world.",
  GR: "The first Olympic Games were held in ancient Greece in 776 BC.",
  GL: "Greenland is the largest island in the world that is not a continent.",
  GT: "Guatemala is home to Tikal, one of the greatest cities of the ancient Maya.",
  GN: "Many of West Africa\u2019s great rivers, including the Niger, start in Guinea.",
  GW: "The Bijag\xF3s Islands of Guinea-Bissau are a UNESCO biosphere reserve.",
  GY: "Kaieteur Falls in Guyana is one of the most powerful single-drop waterfalls.",
  HT: "The Citadelle Laferri\xE8re in Haiti is the largest fortress in the Americas.",
  HN: "Cop\xE1n in Honduras is famous for its carved Maya stairway.",
  HU: "The Rubik\u2019s Cube was invented in Hungary in 1974.",
  IS: "Iceland gets most of its electricity and heat from renewable sources.",
  IN: "India has 22 officially recognised languages.",
  ID: "Indonesia is made up of more than 17,000 islands.",
  IR: "Persian carpets from Iran have been woven for more than 2,500 years.",
  IQ: "Writing was first developed in Mesopotamia, in today\u2019s Iraq.",
  IE: "Halloween has its roots in the ancient Irish festival of Samhain.",
  IL: "The Dead Sea is the lowest point on land, more than 400 metres below sea level.",
  IT: "Italy has more UNESCO World Heritage Sites than any other country.",
  JM: "Jamaica\u2019s Blue Mountain coffee is among the most prized coffees in the world.",
  JP: "Japan has more than 6,800 islands.",
  JO: "Petra in Jordan was carved into rose-coloured rock over 2,000 years ago.",
  KZ: "Kazakhstan is the largest landlocked country in the world.",
  KE: "Kenya is famous for the yearly great migration in the Maasai Mara.",
  KW: "The Kuwait Towers are the best-known landmark of Kuwait City.",
  KG: "Lake Issyk-Kul in Kyrgyzstan never freezes, despite its high altitude.",
  LA: "The Plain of Jars in Laos is scattered with thousands of ancient stone jars.",
  LV: "Riga has one of the largest collections of Art Nouveau buildings in the world.",
  LB: "Byblos in Lebanon is one of the oldest continuously inhabited cities.",
  LS: "Lesotho is the only country lying entirely above 1,000 metres.",
  LR: "Liberia\u2019s capital, Monrovia, is named after US president James Monroe.",
  LY: "Leptis Magna in Libya is one of the best-preserved Roman cities.",
  LT: "Lithuanian is one of the oldest living Indo-European languages.",
  LU: "Luxembourg was the first country to make all public transport free.",
  MG: "About 90 percent of Madagascar\u2019s wildlife lives nowhere else on Earth.",
  MW: "Lake Malawi has more species of fish than any other lake.",
  MY: "The Petronas Towers in Kuala Lumpur were the tallest buildings in the world until 2004.",
  ML: "Timbuktu in Mali was a great centre of learning with thousands of manuscripts.",
  MR: "The Eye of the Sahara, a huge circular formation, lies in Mauritania.",
  MX: "Chocolate, chillies and maize were first cultivated in Mexico.",
  MD: "Moldova has one of the largest wine cellars in the world, with miles of tunnels.",
  MN: "Mongolia is the most sparsely populated country in the world.",
  ME: "The Bay of Kotor in Montenegro is often called Europe\u2019s southernmost fjord.",
  MA: "The University of al-Qarawiyyin in Fez is one of the oldest in the world.",
  MZ: "Mozambique has more than 2,400 kilometres of Indian Ocean coastline.",
  MM: "Bagan in Myanmar has more than 2,000 ancient temples and pagodas.",
  NA: "The Namib is considered the oldest desert in the world.",
  NP: "Eight of the ten highest mountains in the world are in Nepal.",
  NL: "About a quarter of the Netherlands lies below sea level.",
  NC: "New Caledonia has one of the largest lagoons in the world.",
  NZ: "New Zealand was the first country to give women the vote, in 1893.",
  NI: "Lake Nicaragua is home to freshwater sharks.",
  NE: "The A\xEFr Mountains of Niger are home to ancient rock art.",
  NG: "Nigeria has the largest population in Africa.",
  KP: "Mount Paektu, on the northern border of Korea, is an active volcano with a crater lake.",
  MK: "Lake Ohrid in North Macedonia is one of the oldest lakes in Europe.",
  NO: "Norway\u2019s fjords are among the deepest in the world.",
  OM: "Frankincense has been harvested in Oman for thousands of years.",
  PK: "K2 in Pakistan is the second-highest mountain in the world.",
  PS: "Jericho is among the oldest continuously inhabited cities in the world.",
  PA: "The Panama Canal links the Atlantic and Pacific oceans.",
  PG: "More than 800 languages are spoken in Papua New Guinea.",
  PY: "Most people in Paraguay speak both Spanish and Guaran\xED.",
  PE: "Machu Picchu in Peru was built by the Inca in the 15th century.",
  PH: "The Philippines is made up of more than 7,600 islands.",
  PL: "Marie Curie, twice a Nobel Prize winner, was born in Warsaw.",
  PT: "Portugal is the world\u2019s largest producer of cork.",
  PR: "Puerto Rico has one of the brightest bioluminescent bays in the world.",
  QA: "Qatar is a peninsula that reaches into the Persian Gulf.",
  RO: "The Palace of the Parliament in Bucharest is one of the heaviest buildings in the world.",
  RU: "Russia spans 11 time zones.",
  RW: "Rwanda is known as the land of a thousand hills.",
  SA: "Saudi Arabia has some of the largest sand deserts in the world, such as the Empty Quarter.",
  SN: "Lac Rose in Senegal is pink because of salt-loving algae.",
  RS: "Serbia is one of the world\u2019s largest producers of raspberries.",
  SL: 'Sierra Leone means "lion mountains" in Portuguese.',
  SK: "Slovakia has more castles per person than almost any other country.",
  SI: "More than half of Slovenia is covered by forest.",
  SB: "The Solomon Islands are made up of nearly 1,000 islands.",
  SO: "Somalia has the longest coastline on mainland Africa.",
  ZA: "South Africa has three capital cities.",
  KR: "The Korean alphabet, Hangul, was created in the 15th century to be easy to learn.",
  SS: "The Sudd in South Sudan is one of the largest wetlands in the world.",
  ES: "Spain has the second-largest number of UNESCO World Heritage Sites.",
  LK: "Sri Lanka is one of the largest exporters of tea in the world.",
  SD: "Sudan has more pyramids than Egypt.",
  SR: "Suriname is the most forested country in the world.",
  SE: "Sweden has more than 260,000 islands.",
  CH: "Switzerland has four national languages.",
  SY: "Damascus is one of the oldest continuously inhabited cities in the world.",
  TW: "Taiwan\u2019s Taroko Gorge has marble cliffs hundreds of metres high.",
  TJ: "More than 90 percent of Tajikistan is mountainous.",
  TZ: "Mount Kilimanjaro in Tanzania is the highest mountain in Africa.",
  TH: "Bangkok\u2019s full ceremonial name is one of the longest place names in the world.",
  TL: "Timor-Leste became independent in 2002.",
  TG: "Koutammakou in Togo is known for its tower-shaped mud houses.",
  TT: "The steelpan, a musical instrument, was invented in Trinidad and Tobago.",
  TN: "The ruins of ancient Carthage lie near Tunis.",
  TM: "The Darvaza gas crater in Turkmenistan has been burning since 1971.",
  TR: "Istanbul is a city on two continents, Europe and Asia.",
  UG: "Uganda is home to about half of the world\u2019s mountain gorillas.",
  UA: "The Arsenalna metro station in Kyiv is one of the deepest in the world.",
  AE: "The Burj Khalifa in Dubai is the tallest building in the world.",
  GB: "Big Ben is the name of the great bell, not the clock tower.",
  US: "Yellowstone was the first national park in the world, created in 1872.",
  UY: "Uruguay won the first football World Cup, in 1930.",
  UZ: "Samarkand in Uzbekistan was a key city on the Silk Road.",
  VU: "Vanuatu has more languages per person than any other country.",
  VE: "Angel Falls in Venezuela is the highest uninterrupted waterfall in the world.",
  VN: "Son Doong in Vietnam is the largest known cave in the world.",
  EH: "Much of Western Sahara is part of the Sahara, the largest hot desert.",
  YE: "Shibam in Yemen is famous for its mud-brick tower houses.",
  ZM: 'Victoria Falls, on the border of Zambia, is called "the smoke that thunders".',
  ZW: "Great Zimbabwe is a medieval stone city that gave the country its name."
};
var countryFact = onCall(async (req) => {
  requireUid(req);
  const c = String(req.data?.country ?? "");
  const lang = String(req.data?.lang ?? "en");
  if (!isLang(lang)) bad("bad_lang");
  const en = FACTS[c];
  if (!en) return { fact: null };
  if (lang === "en") return { fact: en };
  const ref = db().doc(`config/facts_${lang}`);
  const cached = (await ref.get()).data()?.[c];
  if (typeof cached === "string") return { fact: cached };
  const { tr } = await translateAll(en, [lang], "en");
  const fact = tr[lang];
  if (fact && fact !== en) await ref.set({ [c]: fact }, { merge: true });
  return { fact: fact || en };
});

// src/admin.ts
var import_auth2 = require("firebase-admin/auth");

// src/backup.ts
var import_node_fs4 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path4 = require("node:path");
var import_node_zlib = require("node:zlib");
var import_firestore3 = require("firebase-admin/firestore");
var COLLECTIONS = ["users", "profiles", "pigeons", "chats", "reports", "calls", "config", "admins", "adminLog"];
var KEEP = 7;
var MAX_DOCS = 25e3;
var backupDir = () => env("BACKUP_DIR", (0, import_node_path4.join)((0, import_node_os.homedir)(), "zajel-backups"));
function plain(v) {
  if (v instanceof import_firestore3.Timestamp) return { _ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") {
    if (typeof v.path === "string" && typeof v.id === "string" && v.firestore) return { _ref: v.path };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  }
  return v;
}
var fileFor = (d) => (0, import_node_path4.join)(backupDir(), `zajel-${d.toISOString().slice(0, 10)}.json.gz`);
var backupExists = (d = /* @__PURE__ */ new Date()) => (0, import_node_fs4.existsSync)(fileFor(d));
async function runBackup() {
  const dir2 = backupDir();
  if (!(0, import_node_fs4.existsSync)(dir2)) (0, import_node_fs4.mkdirSync)(dir2, { recursive: true, mode: 448 });
  const file2 = fileFor(/* @__PURE__ */ new Date());
  const gz = (0, import_node_zlib.createGzip)();
  const out = gz.pipe((0, import_node_fs4.createWriteStream)(file2, { mode: 384 }));
  const write = (s) => new Promise((res) => {
    if (!gz.write(s)) gz.once("drain", () => res());
    else res();
  });
  let docs = 0, truncated = false;
  await write(`{"at":${Date.now()},"collections":{`);
  for (const [ci, name] of COLLECTIONS.entries()) {
    await write(`${ci ? "," : ""}${JSON.stringify(name)}:[`);
    const snap = await db().collection(name).limit(Math.max(0, MAX_DOCS - docs)).get();
    let first = true;
    for (const d of snap.docs) {
      const row = { id: d.id, data: plain(d.data()) };
      docs++;
      if (name === "chats" && docs < MAX_DOCS) {
        const m = await d.ref.collection("messages").orderBy("at").limit(Math.min(2e3, MAX_DOCS - docs)).get();
        docs += m.size;
        row.messages = m.docs.map((x) => ({ id: x.id, data: plain(x.data()) }));
      }
      await write((first ? "" : ",") + JSON.stringify(row));
      first = false;
    }
    if (docs >= MAX_DOCS) truncated = true;
    await write("]");
  }
  await write(`},"docs":${docs},"truncated":${truncated}}`);
  gz.end();
  await new Promise((res, rej) => {
    out.on("finish", () => res());
    out.on("error", rej);
  });
  const files = (0, import_node_fs4.readdirSync)(dir2).filter((f) => /^zajel-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) (0, import_node_fs4.rmSync)((0, import_node_path4.join)(dir2, f), { force: true });
  logger.info("backup written", { file: file2, docs, truncated });
  return { file: file2, docs, truncated };
}
function listBackups() {
  const dir2 = backupDir();
  if (!(0, import_node_fs4.existsSync)(dir2)) return [];
  return (0, import_node_fs4.readdirSync)(dir2).filter((f) => f.endsWith(".json.gz")).sort().reverse().map((f) => {
    const s = (0, import_node_fs4.statSync)((0, import_node_path4.join)(dir2, f));
    return { name: f, bytes: s.size, at: s.mtimeMs };
  });
}

// src/admin.ts
var RANK = { reviewer: 1, mod: 2, admin: 3 };
var ROLES = Object.keys(RANK);
async function roleOf(uid) {
  const [user, doc] = await Promise.all([(0, import_auth2.getAuth)().getUser(uid).catch(() => null), db().doc(`admins/${uid}`).get()]);
  const email = (user?.email ?? "").toLowerCase();
  const envAdmins = env("ADMIN_EMAILS", "delberinalkhalil@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (email && user?.emailVerified === true && envAdmins.includes(email)) return { role: "admin", email };
  const r2 = doc.data()?.role;
  return { role: r2 && r2 in RANK ? r2 : null, email };
}
async function need(req, min) {
  const uid = requireUid(req);
  const { role, email } = await roleOf(uid);
  if (!role || RANK[role] < RANK[min]) throw new HttpsError("permission-denied", "not_admin");
  return { uid, role, email };
}
async function log(by, action, extra) {
  await db().collection("adminLog").add({ by: by.uid, email: by.email, action, ...extra, at: import_firestore.Timestamp.now() });
}
var ms = (t) => t?.toMillis ? t.toMillis() : null;
var ago = (h) => import_firestore.Timestamp.fromMillis(Date.now() - h * 36e5);
var adminMe = onCall(async (req) => {
  const uid = requireUid(req);
  const { role, email } = await roleOf(uid);
  return { role, email };
});
var adminStats = onCall(async (req) => {
  await need(req, "reviewer");
  const c = (q) => q.count().get().then((s) => s.data().count);
  const users = db().collection("users"), pigeons = db().collection("pigeons");
  const [total, day, week, pigeonsDay, pigeonsWeek, caughtWeek, chats, openReports, review, banned, errorsDay] = await Promise.all([
    c(users),
    c(users.where("lastActive", ">=", ago(24))),
    c(users.where("lastActive", ">=", ago(24 * 7))),
    c(pigeons.where("createdAt", ">=", ago(24))),
    c(pigeons.where("createdAt", ">=", ago(24 * 7))),
    c(pigeons.where("caughtAt", ">=", ago(24 * 7))),
    c(db().collection("chats")),
    c(db().collection("reports").where("status", "==", "open")),
    c(users.where("review", "==", true)),
    c(users.where("banned", "==", true)),
    c(db().collection("errors").where("at", ">=", ago(24)))
  ]);
  return {
    users: total,
    active24h: day,
    active7d: week,
    pigeons24h: pigeonsDay,
    pigeons7d: pigeonsWeek,
    catchRate7d: pigeonsWeek ? Math.round(caughtWeek / pigeonsWeek * 100) : 0,
    chats,
    openReports,
    review,
    banned,
    errors24h: errorsDay
  };
});
async function nameOf(uid) {
  const p = (await db().doc(`profiles/${uid}`).get()).data();
  return { uid, name: p?.name ?? "?", country: p?.countryName ?? "", photoUrl: p?.photoUrl ?? "" };
}
var adminReports = onCall(async (req) => {
  await need(req, "reviewer");
  const status = ["open", "actioned", "dismissed", "all"].includes(req.data?.status) ? req.data.status : "open";
  const q = await db().collection("reports").orderBy("at", "desc").limit(300).get();
  const rows = q.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r2) => status === "all" || (r2.status ?? "open") === status).slice(0, 100);
  const week = Date.now() - 7 * 864e5;
  const counts = {};
  for (const d of q.docs) {
    const r2 = d.data();
    if (ms(r2.at) >= week) counts[r2.target] = (counts[r2.target] ?? 0) + 1;
  }
  const ids = [...new Set(rows.flatMap((r2) => [r2.by, r2.target]))];
  const names = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await nameOf(id)])));
  const flagged = await db().collection("users").where("review", "==", true).limit(50).get();
  return {
    reports: rows.map((r2) => ({
      id: r2.id,
      reason: r2.reason,
      note: r2.note ?? "",
      chatId: r2.chatId ?? "",
      status: r2.status ?? "open",
      at: ms(r2.at),
      by: names[r2.by],
      target: names[r2.target],
      weekCount: counts[r2.target] ?? 0
    })),
    review: await Promise.all(flagged.docs.map(async (d) => ({ ...await nameOf(d.id), reason: d.data().reviewReason ?? "", at: ms(d.data().reviewAt) })))
  };
});
var adminUser = onCall(async (req) => {
  await need(req, "reviewer");
  const uid = String(req.data?.uid ?? "");
  const u = (await db().doc(`users/${uid}`).get()).data();
  if (!u) throw new HttpsError("not-found", "not_found");
  const reports = await db().collection("reports").where("target", "==", uid).limit(50).get();
  return {
    ...await nameOf(uid),
    lang: u.lang,
    createdAt: ms(u.createdAt),
    lastActive: ms(u.lastActive),
    banned: !!u.banned,
    review: !!u.review,
    restrictedUntil: ms(u.restrictedUntil),
    warnings: (u.warnings ?? []).length,
    reports: reports.docs.map((d) => ({ id: d.id, reason: d.data().reason, at: ms(d.data().at), status: d.data().status ?? "open" }))
  };
});
var adminChat = onCall(async (req) => {
  const me = await need(req, "mod");
  const reportId = String(req.data?.reportId ?? "");
  const rep = (await db().doc(`reports/${reportId}`).get()).data();
  if (!rep?.chatId) throw new HttpsError("failed-precondition", "no_chat_in_report");
  const chat = (await db().doc(`chats/${rep.chatId}`).get()).data();
  if (!chat) throw new HttpsError("not-found", "chat_gone");
  const m = await db().collection(`chats/${rep.chatId}/messages`).orderBy("at", "desc").limit(100).get();
  await log(me, "view_chat", { reportId, chatId: rep.chatId, target: rep.target });
  return {
    members: await Promise.all(chat.members.map(nameOf)),
    messages: m.docs.reverse().map((d) => {
      const x = d.data();
      return { id: d.id, from: x.from, text: x.deleted ? "" : x.text ?? "", deleted: !!x.deleted, media: x.media?.kind ?? null, at: ms(x.at), system: x.system ?? null };
    })
  };
});
var ACTIONS = ["warn", "restrict", "unrestrict", "suspend", "unsuspend", "dismiss", "clear_review"];
var adminAction = onCall(async (req) => {
  const me = await need(req, "mod");
  const action = String(req.data?.action ?? "");
  if (!ACTIONS.includes(action)) throw new HttpsError("invalid-argument", "bad_action");
  const uid = String(req.data?.uid ?? "");
  const reportId = req.data?.reportId ? String(req.data.reportId) : "";
  const note = normalize(req.data?.note).slice(0, 300);
  const ref = db().doc(`users/${uid}`);
  if (action !== "dismiss" && !(await ref.get()).exists) throw new HttpsError("not-found", "not_found");
  const now = import_firestore.Timestamp.now();
  let extra = {};
  switch (action) {
    case "warn":
      await ref.update({ warnings: import_firestore.FieldValue.arrayUnion({ at: now, note }), notice: { kind: "warn", note, at: now } });
      break;
    case "restrict": {
      const days = Math.max(1, Math.min(30, Math.round(Number(req.data?.days) || 1)));
      const until = import_firestore.Timestamp.fromMillis(Date.now() + days * 864e5);
      await ref.update({ restrictedUntil: until, notice: { kind: "restrict", note, at: now, until } });
      extra = { days };
      break;
    }
    case "unrestrict":
      await ref.update({ restrictedUntil: import_firestore.FieldValue.delete(), notice: import_firestore.FieldValue.delete() });
      break;
    case "suspend":
      await ref.update({ banned: true, receiving: false, bannedAt: now, banReason: "moderator", review: false });
      break;
    case "unsuspend":
      await ref.update({ banned: false, receiving: true, banReason: import_firestore.FieldValue.delete(), review: false });
      break;
    case "clear_review":
      await ref.update({ review: false });
      break;
    case "dismiss":
      break;
  }
  if (reportId) await db().doc(`reports/${reportId}`).update({ status: action === "dismiss" ? "dismissed" : "actioned", handledBy: me.uid, handledAt: now });
  await log(me, action, { target: uid, reportId, note, ...extra });
  return { ok: true };
});
var adminLog = onCall(async (req) => {
  await need(req, "mod");
  const q = await db().collection("adminLog").orderBy("at", "desc").limit(200).get();
  return { rows: q.docs.map((d) => ({ id: d.id, ...d.data(), at: ms(d.data().at) })) };
});
var adminErrors = onCall(async (req) => {
  await need(req, "admin");
  const q = await db().collection("errors").orderBy("at", "desc").limit(200).get();
  return { rows: q.docs.map((d) => ({ id: d.id, ...d.data(), at: ms(d.data().at) })), backups: listBackups() };
});
var adminSetRole = onCall(async (req) => {
  const me = await need(req, "admin");
  const email = String(req.data?.email ?? "").trim().toLowerCase();
  const role = req.data?.role == null || req.data.role === "" ? null : String(req.data.role);
  if (role && !ROLES.includes(role)) throw new HttpsError("invalid-argument", "bad_role");
  const user = await (0, import_auth2.getAuth)().getUserByEmail(email).catch(() => null);
  if (!user) throw new HttpsError("not-found", "no_such_account");
  if (user.uid === me.uid) throw new HttpsError("failed-precondition", "not_yourself");
  if (role) await db().doc(`admins/${user.uid}`).set({ role, email, at: import_firestore.Timestamp.now(), by: me.uid });
  else await db().doc(`admins/${user.uid}`).delete();
  await log(me, "set_role", { target: user.uid, email, role });
  return { ok: true };
});
var adminRoles = onCall(async (req) => {
  await need(req, "admin");
  const q = await db().collection("admins").get();
  return { rows: q.docs.map((d) => ({ uid: d.id, email: d.data().email, role: d.data().role })) };
});
var adminAnnounce = onCall(async (req) => {
  const me = await need(req, "admin");
  const text = normalize(req.data?.text).slice(0, 200);
  const days = Math.max(1, Math.min(30, Math.round(Number(req.data?.days) || 3)));
  const ref = db().doc("config/announcement");
  if (!text) await ref.set({ active: false, at: import_firestore.Timestamp.now() });
  else {
    const { src, tr } = await translateAll(text, [...LANGS]);
    await ref.set({ active: true, text, src, tr, at: import_firestore.Timestamp.now(), until: import_firestore.Timestamp.fromMillis(Date.now() + days * 864e5) });
  }
  await log(me, "announce", { text, days });
  return { ok: true };
});

// src/index.ts
var handlers = {
  initUser,
  updateProfile,
  registerToken,
  deleteAccount,
  ackNotice,
  sendPigeon,
  catchPigeon,
  releasePigeon,
  landPigeon,
  myStats,
  sendMessage,
  markRead,
  markDelivered,
  deleteMessage,
  setChatTtl,
  startCall,
  answerCall,
  endCall,
  verifyPurchase,
  blockUser,
  unblockUser,
  reportUser,
  logError,
  countryFact,
  adminMe,
  adminStats,
  adminReports,
  adminUser,
  adminChat,
  adminAction,
  adminLog,
  adminErrors,
  adminSetRole,
  adminRoles,
  adminAnnounce
};

// src/limits.ts
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
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
  avatar: [10, 3600],
  logError: [30, 3600],
  deleteMessage: [60, 600],
  setChatTtl: [20, 3600],
  countryFact: [60, 3600],
  adminChat: [60, 3600]
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
function guardMediaRoot(root2) {
  try {
    (0, import_node_fs5.mkdirSync)(root2, { recursive: true });
    const rules = "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .shtml\nRemoveType .php .phtml .phar\n";
    (0, import_node_fs5.writeFileSync)((0, import_node_path5.join)(root2, ".htaccess"), rules);
    const av = (0, import_node_path5.join)(root2, "avatars");
    (0, import_node_fs5.mkdirSync)(av, { recursive: true });
    if (!(0, import_node_fs5.existsSync)((0, import_node_path5.join)(av, ".htaccess"))) (0, import_node_fs5.writeFileSync)((0, import_node_path5.join)(av, ".htaccess"), rules);
  } catch {
  }
}

// src/publishRules.ts
var import_node_crypto3 = require("node:crypto");
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
var import_app = require("firebase-admin/app");
var root = (0, import_node_path6.join)(__dirname, "..");
function projectId() {
  const f = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
  return JSON.parse((0, import_node_fs6.readFileSync)(f, "utf8")).project_id;
}
async function googleApi(url2, method, body) {
  const { access_token } = await (0, import_app.applicationDefault)().getAccessToken();
  const r2 = await httpJson(url2, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : void 0,
    timeoutMs: 3e4
  });
  return { status: r2.status, text: r2.text };
}
async function publishRules() {
  const project = projectId();
  const content = (0, import_node_fs6.readFileSync)((0, import_node_path6.join)(root, "firestore.rules"), "utf8");
  const rs = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, "POST", {
    source: { files: [{ name: "firestore.rules", content }] }
  });
  if (rs.status !== 200) throw new Error("ruleset " + rs.text.slice(0, 300));
  const name = JSON.parse(rs.text).name;
  const rel = `projects/${project}/releases/cloud.firestore`;
  let r2 = await googleApi(`https://firebaserules.googleapis.com/v1/${rel}`, "PATCH", { release: { name: rel, rulesetName: name } });
  if (r2.status === 404) r2 = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, "POST", { name: rel, rulesetName: name });
  if (r2.status !== 200) throw new Error("release " + r2.text.slice(0, 300));
  return "published";
}
async function publishRulesIfChanged() {
  const file2 = (0, import_node_path6.join)(root, "firestore.rules");
  if (!(0, import_node_fs6.existsSync)(file2) || !process.env.GOOGLE_APPLICATION_CREDENTIALS) return "skipped";
  const hash = (0, import_node_crypto3.createHash)("sha256").update((0, import_node_fs6.readFileSync)(file2)).digest("hex");
  const mark = (0, import_node_path6.join)(root, "tmp", "rules.sha256");
  if ((0, import_node_fs6.existsSync)(mark) && (0, import_node_fs6.readFileSync)(mark, "utf8").trim() === hash) return "unchanged";
  const res = await publishRules();
  try {
    (0, import_node_fs6.writeFileSync)(mark, hash);
  } catch {
  }
  return res;
}

// src/server.ts
(0, import_app2.initializeApp)();
guardMediaRoot(env("MEDIA_DIR", "/tmp/zajel-media"));
publishRulesIfChanged().then((r2) => console.log("firestore rules", r2)).catch((e) => console.error("firestore rules", e));
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
  const t = await (0, import_auth3.getAuth)().verifyIdToken(m[1]);
  return t.uid;
}
function sendError(res, e) {
  if (e instanceof HttpsError) {
    const status = e.code === "unauthenticated" ? 401 : e.code === "not-found" ? 404 : e.code === "resource-exhausted" ? 429 : e.code === "permission-denied" ? 403 : 400;
    res.status(status).json({ error: { code: e.code, message: e.message } });
  } else {
    logger.error("unhandled", e);
    void serverError("http", e);
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
    const dir2 = (0, import_node_path7.join)(env("MEDIA_DIR", "/tmp/zajel-media"), "avatars", uid);
    (0, import_node_fs7.mkdirSync)(dir2, { recursive: true });
    for (const f of (0, import_node_fs7.readdirSync)(dir2)) (0, import_node_fs7.rmSync)((0, import_node_path7.join)(dir2, f), { force: true });
    const name = `${Date.now()}.${ext}`;
    (0, import_node_fs7.writeFileSync)((0, import_node_path7.join)(dir2, name), body);
    const url2 = `${env("MEDIA_URL")}/avatars/${uid}/${name}`;
    await (0, import_firestore4.getFirestore)().doc(`profiles/${uid}`).set({ photoUrl: url2 }, { merge: true });
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
    const now = /* @__PURE__ */ new Date();
    if (now.getUTCMinutes() === 0) {
      await vipExpiry();
      await purgeExpiredMessages();
    }
    if (now.getUTCHours() >= 2 && !backupExists(now)) {
      await runBackup().catch((e) => serverError("backup", e));
      await purgeErrors().catch((e) => serverError("purgeErrors", e));
    }
    res.json({ ok: true });
  } catch (e) {
    logger.error("cron failed", e);
    void serverError("cron", e);
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
