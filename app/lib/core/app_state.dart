import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// Device-level preferences: interface language and how chats are displayed.
class AppState extends ChangeNotifier {
  late SharedPreferences _p;
  Locale? locale;
  bool autoTranslate = true;
  bool showOriginal = false;
  /// The three welcome pages were seen on this device.
  bool onboarded = false;

  Future<void> init() async {
    _p = await SharedPreferences.getInstance();
    final l = _p.getString('lang');
    if (l != null && Cfg.langs.contains(l)) locale = Locale(l);
    autoTranslate = _p.getBool('autoTranslate') ?? true;
    showOriginal = _p.getBool('showOriginal') ?? false;
    onboarded = _p.getBool('onboarded') ?? false;
  }

  bool get hasChosenLanguage => _p.getString('lang') != null;

  Future<void> setLanguage(String code) async {
    if (!Cfg.langs.contains(code)) return;
    locale = Locale(code);
    await _p.setString('lang', code);
    notifyListeners();
  }

  Future<void> setAutoTranslate(bool v) async {
    autoTranslate = v;
    await _p.setBool('autoTranslate', v);
    notifyListeners();
  }

  Future<void> setOnboarded() async {
    onboarded = true;
    await _p.setBool('onboarded', true);
    notifyListeners();
  }

  Future<void> setShowOriginal(bool v) async {
    showOriginal = v;
    await _p.setBool('showOriginal', v);
    notifyListeners();
  }
}
