import 'dart:async';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import 'api.dart';

/// Sends crashes and unexpected errors to the server (admin page → errors). At most a few per minute,
/// never the same message twice in a row, and never while signed out.
class ErrorReporter {
  static const build = String.fromEnvironment('BUILD', defaultValue: 'dev');
  static String _last = '';
  static int _sentThisMinute = 0;
  static DateTime _minute = DateTime.now();

  static void init() {
    final prev = FlutterError.onError;
    FlutterError.onError = (d) {
      prev?.call(d);
      report('flutter', d.exception, d.stack);
    };
    PlatformDispatcher.instance.onError = (e, s) {
      report('platform', e, s);
      return true;
    };
  }

  static void report(String where, Object error, [StackTrace? stack]) {
    if (kDebugMode || FirebaseAuth.instance.currentUser == null) return;
    final msg = error.toString();
    if (msg == _last) return;
    final now = DateTime.now();
    if (now.difference(_minute).inSeconds > 60) {
      _minute = now;
      _sentThisMinute = 0;
    }
    if (++_sentThisMinute > 5) return;
    _last = msg;
    unawaited(Api.call('logError', {
      'where': where,
      'msg': msg.length > 500 ? msg.substring(0, 500) : msg,
      'stack': (stack?.toString() ?? '').split('\n').take(25).join('\n'),
      'ver': build,
      'os': Platform.operatingSystemVersion.length > 40 ? Platform.operatingSystemVersion.substring(0, 40) : Platform.operatingSystemVersion,
    }).then((_) {}, onError: (_) {}));
  }
}
