/**
 * خادم زاجل - REST API حقيقي
 * ------------------------------------
 * Express + JWT auth (بريد/كلمة مرور حقيقية) + lowdb + لوحة تحكم إدارية + متجر (محاكاة شراء بدون بوابة دفع حقيقية بعد)
 *
 * تشغيل محلي:   npm install && npm start
 * البيئة:       PORT (افتراضي 3001), JWT_SECRET (غيّره في الإنتاج!)
 * أول مستخدم يسجّل في النظام يصبح تلقائياً "أدمن" (صاحب التطبيق).
 */
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hamam-alzajal-dev-secret-غيّر-هذا-في-الإنتاج';
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- قاعدة البيانات ----------
const adapter = new FileSync('db.json');
const db = low(adapter);
const DEFAULT_PRODUCTS = [
  { id: 'pack_fast_5', name: '5 حمامات سريعة ⚡', grantType: 'سريعة', qty: 5, price: 2.99, emoji: '⚡' },
  { id: 'pack_gold_3', name: '3 حمامات ذهبية 💌', grantType: 'ذهبية', qty: 3, price: 4.99, emoji: '💌' },
  { id: 'pack_rare_1', name: 'حمامة نادرة ⭐', grantType: 'نادرة', qty: 1, price: 1.99, emoji: '⭐' },
  { id: 'pack_normal_10', name: '10 حمامات عادية إضافية', grantType: 'عادية', qty: 10, price: 3.99, emoji: '🕊️' },
  { id: 'premium_month', name: 'اشتراك مميز - شهر كامل 👑', grantType: 'premium', days: 30, price: 9.99, emoji: '👑' }
];
db.defaults({
  users: [], chats: [], reports: [],
  config: {
    products: DEFAULT_PRODUCTS,
    storeEnabled: true,
    launchPromo: { enabled: true, days: 90, title: '🎉 اشتراك مميز مجاني لمدة 3 أشهر بمناسبة انطلاق زاجل!' }
  }
}).write();
// ترقية آمنة لقواعد بيانات مُنشأة قبل إضافة هذا الحقل (كي لا تُفقد الإعدادات الحالية)
if (!db.get('config.launchPromo').value()) {
  db.set('config.launchPromo', { enabled: true, days: 90, title: '🎉 اشتراك مميز مجاني لمدة 3 أشهر بمناسبة انطلاق زاجل!' }).write();
}

const PIGEON_TYPES = ['عادية','سريعة','بعيدة المدى','مجهولة','ذهبية','مفاجأة','نادرة','محلية'];

function defaultInventory() {
  const inv = {};
  PIGEON_TYPES.forEach(t => { if (t !== 'عادية') inv[t] = 1; });
  return inv;
}

function checkDailyReset(user) {
  if (user.isPremium && user.premiumUntil && Date.now() > user.premiumUntil) {
    user.isPremium = false;
    user.premiumUntil = null;
    db.get('users').find({ id: user.id }).assign(user).write();
  }
  if (Date.now() - user.lastReset >= DAY_MS) {
    user.balance = user.isPremium ? 15 : 10;
    user.lastReset = Date.now();
    if (Math.random() < 0.25) user.inventory['نادرة'] = (user.inventory['نادرة'] || 0) + 1;
    db.get('users').find({ id: user.id }).assign(user).write();
  }
  return user;
}

function publicUser(user) {
  const { id, name, email, avatar, bio, hobbies, reputation, balance, lastReset, inventory, filters, hintsEnabled, homeRegion, isAdmin, isPremium, premiumUntil, banned, createdAt, claimedLaunchPromo } = user;
  return { id, name, email, avatar, bio, hobbies, reputation, balance, lastReset, inventory, filters, hintsEnabled, homeRegion, isAdmin: !!isAdmin, isPremium: !!isPremium, premiumUntil, banned: !!banned, createdAt, claimedLaunchPromo: !!claimedLaunchPromo };
}

// ---------- تطبيق Express ----------
const app = express();
app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول (Authorization: Bearer <token>)' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.get('users').find({ id: payload.uid }).value();
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    if (user.banned) return res.status(403).json({ error: 'هذا الحساب محظور' });
    req.user = checkDailyReset(user);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'رمز الدخول غير صالح' });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'صلاحية أدمن مطلوبة' });
  next();
}

// ---------- المصادقة ----------
app.post('/api/auth/register', async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  if (db.get('users').find({ email }).value()) return res.status(409).json({ error: 'هذا البريد مسجّل مسبقاً' });

  const isFirstUser = db.get('users').size().value() === 0;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    name,
    email,
    passwordHash,
    isAdmin: isFirstUser, // أول من يسجّل في النظام يصبح صاحب التطبيق (أدمن) تلقائياً
    banned: false,
    avatar: '😊',
    bio: '',
    hobbies: [],
    reputation: 87,
    balance: 10,
    lastReset: Date.now(),
    inventory: defaultInventory(),
    filters: { ageMin: 20, ageMax: 35, interestedIn: 'الكل' },
    homeRegion: 'الشرق الأوسط',
    hintsEnabled: true,
    isPremium: false,
    premiumUntil: null,
    claimedLaunchPromo: false,
    createdAt: Date.now()
  };
  db.get('users').push(user).write();
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const user = db.get('users').find({ email }).value();
  if (!user) return res.status(404).json({ error: 'لا يوجد حساب بهذا البريد' });
  if (user.banned) return res.status(403).json({ error: 'هذا الحساب محظور' });
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/me', authMiddleware, (req, res) => {
  const { avatar, hintsEnabled, filters, bio, hobbies, homeRegion } = req.body;
  const updates = {};
  if (avatar) updates.avatar = avatar;
  if (typeof bio === 'string') updates.bio = bio;
  if (Array.isArray(hobbies)) updates.hobbies = hobbies;
  if (typeof hintsEnabled === 'boolean') updates.hintsEnabled = hintsEnabled;
  if (filters) updates.filters = { ...req.user.filters, ...filters };
  if (typeof homeRegion === 'string') updates.homeRegion = homeRegion;
  db.get('users').find({ id: req.user.id }).assign(updates).write();
  const user = db.get('users').find({ id: req.user.id }).value();
  res.json({ user: publicUser(user) });
});

// ---------- إرسال الحمامات (مطابقة حقيقية بين مستخدمين فعليين) ----------
app.post('/api/pigeons/send', authMiddleware, (req, res) => {
  const { type, message, targetRegion } = req.body;
  if (!PIGEON_TYPES.includes(type)) return res.status(400).json({ error: 'نوع حمامة غير معروف' });
  const user = req.user;

  // نبحث عن مستقبِل حقيقي محتمل قبل الخصم، حتى لا نخصم حمامة بلا فائدة
  const allOthers = db.get('users').value().filter(u => u.id !== user.id && !u.banned);
  if (allOthers.length === 0) {
    return res.status(400).json({ error: 'لا يوجد مستخدمون آخرون على المنصة حالياً. شارك التطبيق مع أصدقائك عشان تبدأ المطابقات!' });
  }

  let pool = allOthers;
  if (type === 'ذهبية' && targetRegion) {
    const chosen = allOthers.filter(u => u.homeRegion === targetRegion);
    if (!chosen.length) return res.status(400).json({ error: 'لا يوجد مستخدمون في هذه المنطقة حالياً، جرّب منطقة أخرى' });
    pool = chosen;
  } else if (type === 'محلية' || type === 'سريعة') {
    const sameRegion = allOthers.filter(u => u.homeRegion === user.homeRegion);
    pool = sameRegion.length ? sameRegion : allOthers;
  } else if (type === 'بعيدة المدى') {
    const otherRegion = allOthers.filter(u => u.homeRegion !== user.homeRegion);
    pool = otherRegion.length ? otherRegion : allOthers;
  }

  const recipient = pool[Math.floor(Math.random() * pool.length)];

  if (type === 'عادية') {
    if (user.balance <= 0) return res.status(400).json({ error: 'انتهى رصيدك اليومي من الحمام العادي' });
    user.balance -= 1;
  } else {
    if ((user.inventory[type] || 0) <= 0) return res.status(400).json({ error: `لا تملك حمام من نوع ${type}` });
    user.inventory[type] -= 1;
  }
  db.get('users').find({ id: user.id }).assign(user).write();

  const chat = {
    id: nanoid(),
    participants: [user.id, recipient.id],
    senderId: user.id,
    status: 'pending', // pending حتى يوافق المستقبِل، active بعد الموافقة، declined لو رفض
    pigeonType: type,
    anonymous: type === 'مجهولة',
    rare: type === 'نادرة',
    unlocked: { voiceMsg: {}, call: {}, video: {} }, // { userId: true } لكل طرف وافق
    messages: [
      { from: user.id, text: message || 'رسالتك وصلت 🕊️', at: Date.now() }
    ],
    // لقطة من بيانات الملف الشخصي وقت الإرسال (يكفي لعرض بطاقة التعارف دون طلبات إضافية)
    profiles: {
      [user.id]: { name: user.name, avatar: user.avatar, bio: user.bio, hobbies: user.hobbies, homeRegion: user.homeRegion },
      [recipient.id]: { name: recipient.name, avatar: recipient.avatar, bio: recipient.bio, hobbies: recipient.hobbies, homeRegion: recipient.homeRegion }
    },
    createdAt: Date.now()
  };
  db.get('chats').push(chat).write();
  res.json({
    chat,
    recipientRegion: recipient.homeRegion, // للعرض البصري فقط على الخريطة، بدون كشف الهوية
    user: publicUser(db.get('users').find({ id: user.id }).value())
  });
});

// ---------- الحمام الوارد (طلبات تعارف بانتظار ردّك) ----------
app.get('/api/pigeons/incoming', authMiddleware, (req, res) => {
  const incoming = db.get('chats')
    .filter(c => c.status === 'pending' && c.participants.includes(req.user.id) && c.senderId !== req.user.id)
    .sortBy('createdAt').reverse()
    .value();
  res.json({ incoming });
});

app.post('/api/chats/:id/respond', authMiddleware, (req, res) => {
  const chatRef = db.get('chats').find({ id: req.params.id });
  const chat = chatRef.value();
  if (!chat) return res.status(404).json({ error: 'المحادثة غير موجودة' });
  if (!chat.participants.includes(req.user.id) || chat.senderId === req.user.id) {
    return res.status(403).json({ error: 'غير مسموح' });
  }
  if (chat.status !== 'pending') return res.status(400).json({ error: 'تم الرد على هذا الطلب مسبقاً' });

  if (req.body.accept) {
    chat.status = 'active';
    const senderRef = db.get('users').find({ id: chat.senderId });
    if (senderRef.value()) senderRef.assign({ reputation: Math.min(100, (senderRef.value().reputation || 0) + 1) }).write();
  } else {
    chat.status = 'declined';
    const senderRef = db.get('users').find({ id: chat.senderId });
    if (senderRef.value()) senderRef.assign({ reputation: Math.max(0, (senderRef.value().reputation || 0) - 1) }).write();
  }
  chatRef.assign(chat).write();
  res.json({ chat });
});

// ---------- المحادثات ----------
app.get('/api/chats', authMiddleware, (req, res) => {
  const chats = db.get('chats')
    .filter(c => c.status === 'active' && c.participants.includes(req.user.id))
    .sortBy('createdAt').reverse()
    .value();
  res.json({ chats });
});

app.get('/api/chats/:id', authMiddleware, (req, res) => {
  const chat = db.get('chats').find(c => c.id === req.params.id && c.participants.includes(req.user.id)).value();
  if (!chat) return res.status(404).json({ error: 'المحادثة غير موجودة' });
  res.json({ chat });
});

app.post('/api/chats/:id/messages', authMiddleware, (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'الرسالة فارغة' });
  const chatRef = db.get('chats').find(c => c.id === req.params.id && c.participants.includes(req.user.id));
  const chat = chatRef.value();
  if (!chat) return res.status(404).json({ error: 'المحادثة غير موجودة' });
  if (chat.status !== 'active') return res.status(400).json({ error: 'المحادثة غير مفعّلة بعد' });

  chat.messages.push({ from: req.user.id, text, at: Date.now() });
  if (chat.anonymous && chat.messages.length >= 4) chat.anonymous = false;
  chatRef.assign(chat).write();
  res.json({ chat });
});

app.post('/api/chats/:id/consent/:type', authMiddleware, (req, res) => {
  const validTypes = ['voiceMsg', 'call', 'video'];
  if (!validTypes.includes(req.params.type)) return res.status(400).json({ error: 'نوع غير صالح' });
  const chatRef = db.get('chats').find(c => c.id === req.params.id && c.participants.includes(req.user.id));
  const chat = chatRef.value();
  if (!chat) return res.status(404).json({ error: 'المحادثة غير موجودة' });
  if (chat.status !== 'active') return res.status(400).json({ error: 'المحادثة غير مفعّلة بعد' });

  chat.unlocked[req.params.type] = chat.unlocked[req.params.type] || {};
  chat.unlocked[req.params.type][req.user.id] = true;
  const bothAgreed = chat.participants.every(pid => chat.unlocked[req.params.type][pid]);
  chatRef.assign(chat).write();
  res.json({ chat, bothAgreed });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// ============ المتجر (محاكاة شراء — بدون بوابة دفع حقيقية بعد) ============
// ============ عرض الإطلاق (اشتراك مميز مجاني لفترة محدودة) ============
app.get('/api/promo/launch', authMiddleware, (req, res) => {
  const promo = db.get('config.launchPromo').value() || { enabled: false };
  res.json({ promo, claimed: !!req.user.claimedLaunchPromo });
});

app.post('/api/promo/claim-launch', authMiddleware, (req, res) => {
  const promo = db.get('config.launchPromo').value();
  if (!promo || !promo.enabled) return res.status(400).json({ error: 'العرض غير متاح حالياً' });
  const user = req.user;
  if (user.claimedLaunchPromo) return res.status(400).json({ error: 'استخدمت هذا العرض مسبقاً' });

  user.isPremium = true;
  const base = (user.premiumUntil && user.premiumUntil > Date.now()) ? user.premiumUntil : Date.now();
  user.premiumUntil = base + (promo.days || 90) * DAY_MS;
  user.claimedLaunchPromo = true;
  if (user.balance < 15) user.balance = 15;
  db.get('users').find({ id: user.id }).assign(user).write();
  res.json({ ok: true, user: publicUser(db.get('users').find({ id: user.id }).value()) });
});

app.get('/api/store/products', (req, res) => {
  const config = db.get('config').value();
  res.json({ products: config.products, storeEnabled: config.storeEnabled });
});

app.post('/api/purchase', authMiddleware, (req, res) => {
  const config = db.get('config').value();
  if (!config.storeEnabled) return res.status(403).json({ error: 'المتجر متوقف حالياً' });
  const product = config.products.find(p => p.id === req.body.productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  // ⚠️ نقطة حرجة: هذا شراء وهمي يمنح المنتج فوراً بدون تحقق دفع حقيقي.
  // قبل الإطلاق الفعلي، يجب هنا التحقق من نجاح دفع حقيقي (مثل Stripe Checkout
  // + Webhook موقّع) قبل استدعاء منطق المنح أدناه — لا تُطلق بهذا الشكل تجارياً.
  const user = req.user;
  if (product.grantType === 'premium') {
    user.isPremium = true;
    const base = (user.premiumUntil && user.premiumUntil > Date.now()) ? user.premiumUntil : Date.now();
    user.premiumUntil = base + (product.days || 30) * DAY_MS;
    if (user.balance < 15) user.balance = 15;
  } else if (product.grantType === 'عادية') {
    user.balance += (product.qty || 1);
  } else {
    user.inventory[product.grantType] = (user.inventory[product.grantType] || 0) + (product.qty || 1);
  }
  db.get('users').find({ id: user.id }).assign(user).write();
  res.json({ ok: true, granted: product, user: publicUser(db.get('users').find({ id: user.id }).value()) });
});

// ============ لوحة تحكم الأدمن (صاحب التطبيق فقط) ============
app.get('/api/admin/stats', authMiddleware, requireAdmin, (req, res) => {
  const users = db.get('users').value();
  const chats = db.get('chats').value();
  const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);
  res.json({
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.isPremium).length,
    bannedUsers: users.filter(u => u.banned).length,
    totalChats: chats.length,
    totalMessages,
    newUsersLast7Days: users.filter(u => Date.now() - u.createdAt < 7 * DAY_MS).length
  });
});

app.get('/api/admin/users', authMiddleware, requireAdmin, (req, res) => {
  const users = db.get('users').value().map(publicUser);
  res.json({ users });
});

app.patch('/api/admin/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const target = db.get('users').find({ id: req.params.id });
  if (!target.value()) return res.status(404).json({ error: 'المستخدم غير موجود' });
  const { balance, reputation, isPremium, banned, isAdmin } = req.body;
  const updates = {};
  if (typeof balance === 'number') updates.balance = balance;
  if (typeof reputation === 'number') updates.reputation = reputation;
  if (typeof isPremium === 'boolean') updates.isPremium = isPremium;
  if (typeof banned === 'boolean') updates.banned = banned;
  if (typeof isAdmin === 'boolean') updates.isAdmin = isAdmin;
  target.assign(updates).write();
  res.json({ user: publicUser(db.get('users').find({ id: req.params.id }).value()) });
});

// ============ حذف الحساب الذاتي (يطلبه المستخدم بنفسه) ============
function purgeUserChats(userId) {
  const involved = db.get('chats').filter(c => c.participants.includes(userId)).value();
  involved.forEach(c => {
    const other = c.participants.find(pid => pid !== userId);
    if (other && c.status === 'active') {
      // نبقي المحادثة لصاحبها الآخر مع إشعار أن الطرف الثاني حذف حسابه، بدل حذفها بالكامل
      db.get('chats').find({ id: c.id }).assign({ status: 'ended', endedReason: 'الطرف الآخر حذف حسابه' }).write();
    } else {
      db.get('chats').remove({ id: c.id }).write();
    }
  });
}

app.delete('/api/me', authMiddleware, (req, res) => {
  purgeUserChats(req.user.id);
  db.get('users').remove({ id: req.user.id }).write();
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  purgeUserChats(req.params.id);
  db.get('users').remove({ id: req.params.id }).write();
  res.json({ ok: true });
});

app.get('/api/admin/config', authMiddleware, requireAdmin, (req, res) => {
  res.json({ config: db.get('config').value() });
});

app.patch('/api/admin/config', authMiddleware, requireAdmin, (req, res) => {
  const { products, storeEnabled, launchPromo } = req.body;
  const updates = {};
  if (Array.isArray(products)) updates.products = products;
  if (typeof storeEnabled === 'boolean') updates.storeEnabled = storeEnabled;
  if (launchPromo && typeof launchPromo === 'object') {
    updates.launchPromo = { ...db.get('config.launchPromo').value(), ...launchPromo };
  }
  db.get('config').assign(updates).write();
  res.json({ config: db.get('config').value() });
});

app.get('/api/admin/promo-stats', authMiddleware, requireAdmin, (req, res) => {
  const users = db.get('users').value();
  res.json({
    claimedCount: users.filter(u => u.claimedLaunchPromo).length,
    totalUsers: users.length
  });
});

// ============ الإبلاغ عن محتوى/محادثة ============
app.post('/api/reports', authMiddleware, (req, res) => {
  const { chatId, reason, details } = req.body;
  if (!reason) return res.status(400).json({ error: 'سبب البلاغ مطلوب' });
  const chat = db.get('chats').find(c => c.id === chatId && c.participants.includes(req.user.id)).value();
  let targetName = null;
  if (chat) {
    const otherId = chat.participants.find(pid => pid !== req.user.id);
    targetName = chat.profiles && chat.profiles[otherId] ? chat.profiles[otherId].name : null;
  }
  const report = {
    id: nanoid(),
    reporterId: req.user.id,
    reporterName: req.user.name,
    chatId: chatId || null,
    targetName,
    reason,
    details: details || '',
    resolved: false,
    createdAt: Date.now()
  };
  db.get('reports').push(report).write();
  res.json({ ok: true, report });
});

app.get('/api/admin/reports', authMiddleware, requireAdmin, (req, res) => {
  const reports = db.get('reports').sortBy('createdAt').reverse().value();
  res.json({ reports });
});

app.patch('/api/admin/reports/:id', authMiddleware, requireAdmin, (req, res) => {
  const target = db.get('reports').find({ id: req.params.id });
  if (!target.value()) return res.status(404).json({ error: 'البلاغ غير موجود' });
  target.assign({ resolved: !!req.body.resolved }).write();
  res.json({ report: db.get('reports').find({ id: req.params.id }).value() });
});

app.listen(PORT, () => {
  console.log(`🕊️  خادم زاجل يعمل على المنفذ ${PORT}`);
});
