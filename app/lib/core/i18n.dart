import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'api.dart';
import 'config.dart';

/// UI strings live in assets/i18n/<lang>.json. Missing keys fall back to English.
class L10n {
  L10n(this.locale, this._m, this._en);
  final Locale locale;
  final Map<String, String> _m;
  final Map<String, String> _en;

  static final Map<String, Map<String, String>> _cache = {};

  static Future<Map<String, String>> _load(String code) async {
    final hit = _cache[code];
    if (hit != null) return hit;
    final raw = await rootBundle.loadString('assets/i18n/$code.json');
    final m = (jsonDecode(raw) as Map<String, dynamic>).map((k, v) => MapEntry(k, v.toString()));
    return _cache[code] = m;
  }

  static Future<L10n> load(Locale l) async {
    final en = await _load('en');
    final code = Cfg.langs.contains(l.languageCode) ? l.languageCode : 'en';
    return L10n(Locale(code), code == 'en' ? en : await _load(code), en);
  }

  static L10n of(BuildContext c) => Localizations.of<L10n>(c, L10n)!;

  String get lang => locale.languageCode;

  String t(String key, [Map<String, Object?> args = const {}]) {
    var s = _m[key] ?? _en[key] ?? key;
    args.forEach((k, v) => s = s.replaceAll('{$k}', '${v ?? ''}'));
    return s;
  }

  bool has(String key) => _m.containsKey(key) || _en.containsKey(key);

  static final supported = Cfg.langs.map((c) => Locale(c)).toList();

  static const delegates = <LocalizationsDelegate<dynamic>>[
    _L10nDelegate(),
    _KuMaterial(),
    _KuCupertino(),
    _KuWidgets(),
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];
}

class _L10nDelegate extends LocalizationsDelegate<L10n> {
  const _L10nDelegate();
  @override
  bool isSupported(Locale l) => Cfg.langs.contains(l.languageCode);
  @override
  Future<L10n> load(Locale l) => L10n.load(l);
  @override
  bool shouldReload(_L10nDelegate old) => false;
}

// Flutter has no built-in Kurdish (Kurmanji) date pickers and dialogs; English ones are used for those few labels.
class _KuMaterial extends LocalizationsDelegate<MaterialLocalizations> {
  const _KuMaterial();
  @override
  bool isSupported(Locale l) => l.languageCode == 'ku';
  @override
  Future<MaterialLocalizations> load(Locale l) => GlobalMaterialLocalizations.delegate.load(const Locale('en'));
  @override
  bool shouldReload(_KuMaterial old) => false;
}

class _KuCupertino extends LocalizationsDelegate<CupertinoLocalizations> {
  const _KuCupertino();
  @override
  bool isSupported(Locale l) => l.languageCode == 'ku';
  @override
  Future<CupertinoLocalizations> load(Locale l) => GlobalCupertinoLocalizations.delegate.load(const Locale('en'));
  @override
  bool shouldReload(_KuCupertino old) => false;
}

class _KuWidgets extends LocalizationsDelegate<WidgetsLocalizations> {
  const _KuWidgets();
  @override
  bool isSupported(Locale l) => l.languageCode == 'ku';
  @override
  Future<WidgetsLocalizations> load(Locale l) => DefaultWidgetsLocalizations.load(l);
  @override
  bool shouldReload(_KuWidgets old) => false;
}

extension Tx on BuildContext {
  String t(String key, [Map<String, Object?> args = const {}]) => L10n.of(this).t(key, args);
  String get lang => L10n.of(this).lang;
}

/// Turns server and auth errors into a sentence in the user's language.
String errText(BuildContext c, Object e) {
  var code = 'generic';
  if (e is ApiException) {
    code = (e.code == 'failed-precondition' || e.code == 'invalid-argument') ? e.message : e.code;
  } else if (e is FirebaseAuthException) {
    code = 'auth_${e.code}';
  }
  final l = L10n.of(c);
  return l.has('err_$code') ? l.t('err_$code') : l.t('err_generic');
}

void showError(BuildContext c, Object e) {
  ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(errText(c, e))));
}

void showInfo(BuildContext c, String msg) {
  ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(msg)));
}
