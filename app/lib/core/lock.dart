import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// App lock with a 4-digit PIN (stored as a salted hash in the Android Keystore) and optional fingerprint / face.
class LockService extends ChangeNotifier with WidgetsBindingObserver {
  static final LockService instance = LockService._();
  LockService._();

  final _s = const FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true));
  final _auth = LocalAuthentication();

  bool enabled = false;
  String method = 'pin'; // 'pin' or 'bio'
  int autoSeconds = 0;
  bool locked = false;
  bool bioAvailable = false;
  String? _hash;
  DateTime? _away;
  int _busy = 0;

  Future<void> load() async {
    enabled = await _s.read(key: 'lock_on') == '1';
    method = await _s.read(key: 'lock_method') ?? 'pin';
    autoSeconds = int.tryParse(await _s.read(key: 'lock_auto') ?? '0') ?? 0;
    _hash = await _s.read(key: 'lock_pin');
    if (_hash == null) enabled = false;
    locked = enabled;
    try {
      bioAvailable = await _auth.canCheckBiometrics && (await _auth.getAvailableBiometrics()).isNotEmpty;
    } catch (_) {
      bioAvailable = false;
    }
    WidgetsBinding.instance.addObserver(this);
    notifyListeners();
  }

  String _h(String pin) => sha256.convert(utf8.encode('zajel-lock:$pin')).toString();
  bool check(String pin) => _hash != null && _h(pin) == _hash;

  Future<void> setPin(String pin) async {
    _hash = _h(pin);
    await _s.write(key: 'lock_pin', value: _hash);
    enabled = true;
    await _s.write(key: 'lock_on', value: '1');
    notifyListeners();
  }

  Future<void> disable() async {
    enabled = false;
    locked = false;
    await _s.write(key: 'lock_on', value: '0');
    notifyListeners();
  }

  Future<void> setMethod(String m) async {
    method = m;
    await _s.write(key: 'lock_method', value: m);
    notifyListeners();
  }

  Future<void> setAuto(int s) async {
    autoSeconds = s;
    await _s.write(key: 'lock_auto', value: '$s');
    notifyListeners();
  }

  void unlock() {
    locked = false;
    notifyListeners();
  }

  void lockNow() {
    if (!enabled) return;
    locked = true;
    notifyListeners();
  }

  /// Forget everything (sign out, account deletion, forgotten PIN).
  Future<void> reset() async {
    await _s.deleteAll();
    _hash = null;
    enabled = false;
    locked = false;
    method = 'pin';
    autoSeconds = 0;
    notifyListeners();
  }

  /// Runs `f` (photo picker, Google Play purchase, biometric prompt) without locking when the app returns.
  Future<T> guard<T>(Future<T> Function() f) async {
    _busy++;
    try {
      return await f();
    } finally {
      Future.delayed(const Duration(milliseconds: 800), () => _busy--);
    }
  }

  Future<bool> biometric(String reason) async {
    if (!bioAvailable) return false;
    return guard(() async {
      try {
        return await _auth.authenticate(
          localizedReason: reason,
          options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
        );
      } catch (_) {
        return false;
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!enabled || _busy > 0) return;
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _away ??= DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final away = _away;
      _away = null;
      if (away != null && DateTime.now().difference(away).inSeconds >= autoSeconds) lockNow();
    }
  }
}
