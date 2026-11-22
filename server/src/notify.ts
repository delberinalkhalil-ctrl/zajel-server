import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from './runtime';

type Key = 'landed_t' | 'landed_b' | 'caught_t' | 'caught_b' | 'call_t' | 'voice' | 'video' | 'expired_t' | 'expired_b';

// Push notification text, one entry per app language. {x} placeholders are filled by fmt().
const T: Record<string, Record<Key, string>> = {
  ar: { landed_t: 'حطّ عندك زاجل!', landed_b: 'رسالة من {city}، {country}', caught_t: '{name} التقط زاجلك', caught_b: 'في {city}. قل مرحباً!', call_t: '{name} يتصل بك', voice: 'مكالمة صوتية مترجمة', video: 'مكالمة فيديو مترجمة', expired_t: 'عاد زاجلك', expired_b: 'لم يلتقطه أحد هذه المرة. جرّب إطلاق زاجل آخر.' },
  en: { landed_t: 'A pigeon landed with you!', landed_b: 'A letter from {city}, {country}', caught_t: '{name} caught your pigeon', caught_b: 'In {city}. Say hello!', call_t: '{name} is calling', voice: 'Translated voice call', video: 'Translated video call', expired_t: 'Your pigeon came back', expired_b: 'Nobody caught it this time. Try sending another.' },
  fr: { landed_t: 'Un pigeon s’est posé chez vous !', landed_b: 'Une lettre de {city}, {country}', caught_t: '{name} a attrapé votre pigeon', caught_b: 'À {city}. Dites bonjour !', call_t: '{name} vous appelle', voice: 'Appel vocal traduit', video: 'Appel vidéo traduit', expired_t: 'Votre pigeon est revenu', expired_b: 'Personne ne l’a attrapé cette fois. Envoyez-en un autre.' },
  tr: { landed_t: 'Sana bir güvercin kondu!', landed_b: '{city}, {country} şehrinden bir mektup', caught_t: '{name} güvercinini yakaladı', caught_b: '{city} şehrinde. Merhaba de!', call_t: '{name} seni arıyor', voice: 'Çevirili sesli arama', video: 'Çevirili görüntülü arama', expired_t: 'Güvercinin geri döndü', expired_b: 'Bu sefer kimse yakalamadı. Bir tane daha gönder.' },
  he: { landed_t: 'יונה נחתה אצלך!', landed_b: 'מכתב מ{city}, {country}', caught_t: '{name} תפס/ה את היונה שלך', caught_b: 'ב{city}. תגיד/י שלום!', call_t: '{name} מתקשר/ת', voice: 'שיחה קולית מתורגמת', video: 'שיחת וידאו מתורגמת', expired_t: 'היונה שלך חזרה', expired_b: 'אף אחד לא תפס אותה הפעם. נסה/י לשלוח עוד אחת.' },
  es: { landed_t: '¡Una paloma aterrizó contigo!', landed_b: 'Una carta desde {city}, {country}', caught_t: '{name} atrapó tu paloma', caught_b: 'En {city}. ¡Saluda!', call_t: '{name} te está llamando', voice: 'Llamada de voz traducida', video: 'Videollamada traducida', expired_t: 'Tu paloma volvió', expired_b: 'Nadie la atrapó esta vez. Prueba a enviar otra.' },
  pt: { landed_t: 'Um pombo pousou com você!', landed_b: 'Uma carta de {city}, {country}', caught_t: '{name} pegou o seu pombo', caught_b: 'Em {city}. Diga olá!', call_t: '{name} está ligando', voice: 'Chamada de voz traduzida', video: 'Videochamada traduzida', expired_t: 'Seu pombo voltou', expired_b: 'Ninguém o pegou desta vez. Tente enviar outro.' },
  fa: { landed_t: 'یک کبوتر پیش تو نشست!', landed_b: 'نامه‌ای از {city}، {country}', caught_t: '{name} کبوترت را گرفت', caught_b: 'در {city}. سلام کن!', call_t: '{name} در حال تماس است', voice: 'تماس صوتی ترجمه‌شده', video: 'تماس تصویری ترجمه‌شده', expired_t: 'کبوترت برگشت', expired_b: 'این بار کسی آن را نگرفت. یکی دیگر بفرست.' },
  ru: { landed_t: 'К вам прилетел голубь!', landed_b: 'Письмо из {city}, {country}', caught_t: '{name} поймал(а) вашего голубя', caught_b: 'В {city}. Поздоровайтесь!', call_t: '{name} звонит вам', voice: 'Голосовой звонок с переводом', video: 'Видеозвонок с переводом', expired_t: 'Ваш голубь вернулся', expired_b: 'В этот раз его никто не поймал. Отправьте ещё одного.' },
  zh: { landed_t: '一只信鸽落在你这里！', landed_b: '来自{country}{city}的信', caught_t: '{name} 接住了你的信鸽', caught_b: '在{city}。打个招呼吧！', call_t: '{name} 正在呼叫你', voice: '翻译语音通话', video: '翻译视频通话', expired_t: '你的信鸽飞回来了', expired_b: '这次没有人接住它。再放飞一只吧。' },
  hi: { landed_t: 'आपके पास एक कबूतर उतरा!', landed_b: '{city}, {country} से एक चिट्ठी', caught_t: '{name} ने आपका कबूतर पकड़ा', caught_b: '{city} में। नमस्ते कहिए!', call_t: '{name} कॉल कर रहे हैं', voice: 'अनुवादित वॉइस कॉल', video: 'अनुवादित वीडियो कॉल', expired_t: 'आपका कबूतर लौट आया', expired_b: 'इस बार किसी ने नहीं पकड़ा। एक और भेजिए।' },
  ku: { landed_t: 'Kevokek li cem te daket!', landed_b: 'Nameyek ji {city}, {country}', caught_t: '{name} kevoka te girt', caught_b: 'Li {city}. Silav bike!', call_t: '{name} li te digere', voice: 'Banga dengî ya wergerandî', video: 'Banga vîdyoyî ya wergerandî', expired_t: 'Kevoka te vegeriya', expired_b: 'Vê carê kesî ew negirt. Yeke din bişîne.' },
};

export function fmt(lang: string, key: Key, vars: Record<string, string> = {}): string {
  const s = (T[lang] ?? T.en)[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/** Send to every device of a user. Removes tokens that are no longer valid. */
export async function pushTo(uid: string, msg: { title: string; body: string; data: Record<string, string>; call?: boolean }) {
  const db = getFirestore();
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  const u = snap.data();
  if (!u || u.settings?.notif === false && !msg.call) return;
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
