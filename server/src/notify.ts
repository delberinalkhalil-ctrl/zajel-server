import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from './runtime';

type Key = 'landed_t' | 'landed_b' | 'caught_t' | 'caught_b' | 'call_t' | 'voice' | 'video' | 'expired_t' | 'expired_b' | 'app' | 'hidden' | 'gift_t' | 'gift_b' | 'support_t';

// Push notification text, one entry per app language. {x} placeholders are filled by fmt().
const T: Record<string, Record<Key, string>> = {
  ar: { landed_t: 'حطّ عندك زاجل!', landed_b: 'رسالة من {city}، {country}', caught_t: '{name} التقط زاجلك', caught_b: 'في {city}. قل مرحباً!', call_t: '{name} يتصل بك', voice: 'مكالمة صوتية مترجمة', video: 'مكالمة فيديو مترجمة', expired_t: 'عاد زاجلك', expired_b: 'لم يلتقطه أحد هذه المرة. جرّب إطلاق زاجل آخر.', app: 'زاجل', hidden: 'لديك إشعار جديد', gift_t: 'هدية من فريق زاجل 🎁', gift_b: 'افتح التطبيق لترى ما وصلك', support_t: 'فريق زاجل' },
  en: { landed_t: 'A pigeon landed with you!', landed_b: 'A letter from {city}, {country}', caught_t: '{name} caught your pigeon', caught_b: 'In {city}. Say hello!', call_t: '{name} is calling', voice: 'Translated voice call', video: 'Translated video call', expired_t: 'Your pigeon came back', expired_b: 'Nobody caught it this time. Try sending another.', app: 'Zajel', hidden: 'You have a new notification', gift_t: 'A gift from the Zajel team 🎁', gift_b: 'Open the app to see what you got', support_t: 'Zajel team' },
  fr: { landed_t: 'Un pigeon s’est posé chez vous !', landed_b: 'Une lettre de {city}, {country}', caught_t: '{name} a attrapé votre pigeon', caught_b: 'À {city}. Dites bonjour !', call_t: '{name} vous appelle', voice: 'Appel vocal traduit', video: 'Appel vidéo traduit', expired_t: 'Votre pigeon est revenu', expired_b: 'Personne ne l’a attrapé cette fois. Envoyez-en un autre.', app: 'Zajel', hidden: 'Vous avez une nouvelle notification', gift_t: 'Un cadeau de l’équipe Zajel 🎁', gift_b: 'Ouvrez l’app pour le découvrir', support_t: 'Équipe Zajel' },
  tr: { landed_t: 'Sana bir güvercin kondu!', landed_b: '{city}, {country} şehrinden bir mektup', caught_t: '{name} güvercinini yakaladı', caught_b: '{city} şehrinde. Merhaba de!', call_t: '{name} seni arıyor', voice: 'Çevirili sesli arama', video: 'Çevirili görüntülü arama', expired_t: 'Güvercinin geri döndü', expired_b: 'Bu sefer kimse yakalamadı. Bir tane daha gönder.', app: 'Zajel', hidden: 'Yeni bir bildirimin var', gift_t: 'Zajel ekibinden bir hediye 🎁', gift_b: 'Ne geldiğini görmek için uygulamayı aç', support_t: 'Zajel ekibi' },
  he: { landed_t: 'יונה נחתה אצלך!', landed_b: 'מכתב מ{city}, {country}', caught_t: '{name} תפס/ה את היונה שלך', caught_b: 'ב{city}. תגיד/י שלום!', call_t: '{name} מתקשר/ת', voice: 'שיחה קולית מתורגמת', video: 'שיחת וידאו מתורגמת', expired_t: 'היונה שלך חזרה', expired_b: 'אף אחד לא תפס אותה הפעם. נסה/י לשלוח עוד אחת.', app: 'Zajel', hidden: 'יש לך התראה חדשה', gift_t: 'מתנה מצוות Zajel 🎁', gift_b: 'פתחו את האפליקציה כדי לראות', support_t: 'צוות Zajel' },
  es: { landed_t: '¡Una paloma aterrizó contigo!', landed_b: 'Una carta desde {city}, {country}', caught_t: '{name} atrapó tu paloma', caught_b: 'En {city}. ¡Saluda!', call_t: '{name} te está llamando', voice: 'Llamada de voz traducida', video: 'Videollamada traducida', expired_t: 'Tu paloma volvió', expired_b: 'Nadie la atrapó esta vez. Prueba a enviar otra.', app: 'Zajel', hidden: 'Tienes una notificación nueva', gift_t: 'Un regalo del equipo de Zajel 🎁', gift_b: 'Abre la app para verlo', support_t: 'Equipo de Zajel' },
  pt: { landed_t: 'Um pombo pousou com você!', landed_b: 'Uma carta de {city}, {country}', caught_t: '{name} pegou o seu pombo', caught_b: 'Em {city}. Diga olá!', call_t: '{name} está ligando', voice: 'Chamada de voz traduzida', video: 'Videochamada traduzida', expired_t: 'Seu pombo voltou', expired_b: 'Ninguém o pegou desta vez. Tente enviar outro.', app: 'Zajel', hidden: 'Você tem uma nova notificação', gift_t: 'Um presente da equipe Zajel 🎁', gift_b: 'Abra o app para ver', support_t: 'Equipe Zajel' },
  fa: { landed_t: 'یک کبوتر پیش تو نشست!', landed_b: 'نامه‌ای از {city}، {country}', caught_t: '{name} کبوترت را گرفت', caught_b: 'در {city}. سلام کن!', call_t: '{name} در حال تماس است', voice: 'تماس صوتی ترجمه‌شده', video: 'تماس تصویری ترجمه‌شده', expired_t: 'کبوترت برگشت', expired_b: 'این بار کسی آن را نگرفت. یکی دیگر بفرست.', app: 'زاجل', hidden: 'یک اعلان جدید داری', gift_t: 'هدیه‌ای از تیم زاجل 🎁', gift_b: 'برنامه را باز کن تا ببینی', support_t: 'تیم زاجل' },
  ru: { landed_t: 'К вам прилетел голубь!', landed_b: 'Письмо из {city}, {country}', caught_t: '{name} поймал(а) вашего голубя', caught_b: 'В {city}. Поздоровайтесь!', call_t: '{name} звонит вам', voice: 'Голосовой звонок с переводом', video: 'Видеозвонок с переводом', expired_t: 'Ваш голубь вернулся', expired_b: 'В этот раз его никто не поймал. Отправьте ещё одного.', app: 'Zajel', hidden: 'У вас новое уведомление', gift_t: 'Подарок от команды Zajel 🎁', gift_b: 'Откройте приложение, чтобы посмотреть', support_t: 'Команда Zajel' },
  de: { landed_t: 'Eine Taube ist bei dir gelandet!', landed_b: 'Ein Brief aus {city}, {country}', caught_t: '{name} hat deine Taube gefangen', caught_b: 'In {city}. Sag hallo!', call_t: '{name} ruft dich an', voice: 'Übersetzter Sprachanruf', video: 'Übersetzter Videoanruf', expired_t: 'Deine Taube ist zurück', expired_b: 'Diesmal hat sie niemand gefangen. Schick eine neue.', app: 'Zajel', hidden: 'Du hast eine neue Benachrichtigung', gift_t: 'Ein Geschenk vom Zajel-Team 🎁', gift_b: 'Öffne die App, um es zu sehen', support_t: 'Zajel-Team' },
  it: { landed_t: 'Un piccione è atterrato da te!', landed_b: 'Una lettera da {city}, {country}', caught_t: '{name} ha preso il tuo piccione', caught_b: 'A {city}. Saluta!', call_t: '{name} ti sta chiamando', voice: 'Chiamata vocale tradotta', video: 'Videochiamata tradotta', expired_t: 'Il tuo piccione è tornato', expired_b: 'Questa volta nessuno l\'ha preso. Prova a mandarne un altro.', app: 'Zajel', hidden: 'Hai una nuova notifica', gift_t: 'Un regalo dal team di Zajel 🎁', gift_b: 'Apri l’app per scoprirlo', support_t: 'Team di Zajel' },
  uk: { landed_t: 'До тебе прилетів голуб!', landed_b: 'Лист із {city}, {country}', caught_t: '{name} спіймав(ла) твого голуба', caught_b: 'У {city}. Привітайся!', call_t: '{name} дзвонить тобі', voice: 'Голосовий дзвінок із перекладом', video: 'Відеодзвінок із перекладом', expired_t: 'Твій голуб повернувся', expired_b: 'Цього разу його ніхто не спіймав. Надішли ще одного.', app: 'Zajel', hidden: 'У тебе нове сповіщення', gift_t: 'Подарунок від команди Zajel 🎁', gift_b: 'Відкрий застосунок, щоб побачити', support_t: 'Команда Zajel' },
  zh: { landed_t: '一只信鸽落在你这里！', landed_b: '来自{country}{city}的信', caught_t: '{name} 接住了你的信鸽', caught_b: '在{city}。打个招呼吧！', call_t: '{name} 正在呼叫你', voice: '翻译语音通话', video: '翻译视频通话', expired_t: '你的信鸽飞回来了', expired_b: '这次没有人接住它。再放飞一只吧。', app: 'Zajel', hidden: '你有一条新通知', gift_t: '来自 Zajel 团队的礼物 🎁', gift_b: '打开应用查看', support_t: 'Zajel 团队' },
  hi: { landed_t: 'आपके पास एक कबूतर उतरा!', landed_b: '{city}, {country} से एक चिट्ठी', caught_t: '{name} ने आपका कबूतर पकड़ा', caught_b: '{city} में। नमस्ते कहिए!', call_t: '{name} कॉल कर रहे हैं', voice: 'अनुवादित वॉइस कॉल', video: 'अनुवादित वीडियो कॉल', expired_t: 'आपका कबूतर लौट आया', expired_b: 'इस बार किसी ने नहीं पकड़ा। एक और भेजिए।', app: 'Zajel', hidden: 'आपके लिए एक नई सूचना है', gift_t: 'ज़ाजेल टीम की ओर से एक उपहार 🎁', gift_b: 'देखने के लिए ऐप खोलें', support_t: 'ज़ाजेल टीम' },
  ku: { landed_t: 'Kevokek li cem te daket!', landed_b: 'Nameyek ji {city}, {country}', caught_t: '{name} kevoka te girt', caught_b: 'Li {city}. Silav bike!', call_t: '{name} li te digere', voice: 'Banga dengî ya wergerandî', video: 'Banga vîdyoyî ya wergerandî', expired_t: 'Kevoka te vegeriya', expired_b: 'Vê carê kesî ew negirt. Yeke din bişîne.', app: 'Zajel', hidden: 'Agahdariyek nû ji te re heye', gift_t: 'Diyariyek ji tîma Zajel 🎁', gift_b: 'Sepanê veke da ku bibînî', support_t: 'Tîma Zajel' },
};

export function fmt(lang: string, key: Key, vars: Record<string, string> = {}): string {
  const s = (T[lang] ?? T.en)[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export type PushKind = 'pigeon' | 'message' | 'accept' | 'call' | 'system';
const KIND_SETTING: Partial<Record<PushKind, string>> = { pigeon: 'notifPigeon', message: 'notifMessage', accept: 'notifAccept' };

/**
 * Send to every device of a user. Honours "all notifications", the per-kind switches and "hide content on
 * the lock screen". Calls always ring. Removes tokens that are no longer valid.
 */
export async function pushTo(uid: string, msg: { title: string; body: string; data: Record<string, string>; call?: boolean }, kind: PushKind = msg.call ? 'call' : 'system') {
  const db = getFirestore();
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  const u = snap.data();
  if (!u) return;
  if (kind !== 'call') {
    if (u.settings?.notif === false) return;
    const k = KIND_SETTING[kind];
    if (k && u.settings?.[k] === false) return;
    if (u.settings?.hidePreview && kind !== 'system') msg = { ...msg, title: fmt(u.lang, 'app'), body: fmt(u.lang, 'hidden') };
  }
  const tokens: string[] = (u.fcm ?? []).slice(-10);
  if (!tokens.length) return;
  try {
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: msg.title, body: msg.body.slice(0, 160) },
      data: msg.data,
      android: {
        priority: 'high',
        notification: { sound: u.settings?.sound === false ? undefined : 'default' },
        ttl: msg.call ? 45_000 : undefined,
      },
      apns: { payload: { aps: { sound: u.settings?.sound === false ? undefined : 'default' } } },
    });
    const bad = res.responses.map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code ?? '') ? tokens[i] : null)).filter(Boolean);
    if (bad.length) await ref.update({ fcm: FieldValue.arrayRemove(...bad) });
  } catch (e) {
    logger.warn('push failed', { uid, e: String(e) });
  }
}
