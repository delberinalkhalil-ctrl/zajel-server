import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api.dart';

/// Registers this device for notifications and remembers which notification opened the app.
class Push {
  static final pending = ValueNotifier<Map<String, dynamic>?>(null);
  static StreamSubscription<String>? _refresh;
  static bool _started = false;

  static Future<void> start() async {
    if (_started) return;
    _started = true;
    final m = FirebaseMessaging.instance;
    try {
      await m.requestPermission(alert: true, badge: true, sound: true);
      final token = await m.getToken();
      if (token != null) await Api.call('registerToken', {'token': token});
      _refresh = m.onTokenRefresh.listen((t) => Api.call('registerToken', {'token': t}));
      final first = await m.getInitialMessage();
      if (first != null) pending.value = first.data;
      FirebaseMessaging.onMessageOpenedApp.listen((r) => pending.value = r.data);
    } catch (e) {
      debugPrint('push setup failed: $e');
    }
  }

  static Future<void> stop() async {
    await _refresh?.cancel();
    _started = false;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }
}
