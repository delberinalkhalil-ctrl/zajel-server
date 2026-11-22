/// Business rules shown in the app. The server (functions/src/config.ts) is the authority.
class Cfg {
  /// Zajel API server (server/ folder), hosted on your own Node.js hosting.
  static const apiBase = 'https://bawer-kalash.com/zajel-api';

  /// In-app purchases (points store, VIP). Off for now: every feature is free.
  /// To turn on: set this to true AND set FREE_MODE=0 on the server.
  static const storeEnabled = false;
  static const freeModeDailyPigeons = 20;

  static const costExtra = 10;
  static const costDest = 20;
  static const costFast = 15;
  static const costVoice = 30;
  static const costVideo = 50;
  static const freePerDay = 3;
  static const maxInAir = 3;
  static const maxPigeonLen = 400;
  static const maxMessageLen = 1000;

  static const pointProducts = {'points_100': 100, 'points_550': 550, 'points_1200': 1200, 'points_3000': 3000};
  static const pointBonus = {'points_550': '+10%', 'points_1200': '+20%', 'points_3000': 'best'};
  static const vipProducts = ['vip_monthly', 'vip_quarterly', 'vip_yearly'];

  static const langs = ['ar', 'en', 'fr', 'tr', 'he', 'es', 'pt', 'fa', 'ru', 'zh', 'hi', 'ku'];
  static const rtl = {'ar', 'he', 'fa'};
  static const langNames = {
    'ar': 'العربية', 'en': 'English', 'fr': 'Français', 'tr': 'Türkçe', 'he': 'עברית', 'es': 'Español',
    'pt': 'Português', 'fa': 'فارسی', 'ru': 'Русский', 'zh': '中文', 'hi': 'हिन्दी', 'ku': 'Kurdî (Kurmancî)',
  };

  // Replace with your own pages before publishing (Google Play requires a privacy policy URL).
  static const privacyUrl = 'https://example.com/zajel/privacy';
  static const termsUrl = 'https://example.com/zajel/terms';
  static const supportEmail = 'support@example.com';
}
