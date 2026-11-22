import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/lock.dart';
import '../widgets/common.dart';
import '../widgets/pin_pad.dart';

/// Covers the whole app until the PIN or biometric check passes.
class LockScreen extends StatefulWidget {
  const LockScreen({super.key});
  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  String? _msg;
  int _tries = 0;

  @override
  void initState() {
    super.initState();
    final lock = context.read<LockService>();
    if (lock.method == 'bio' && lock.bioAvailable) WidgetsBinding.instance.addPostFrameCallback((_) => _bio());
  }

  Future<void> _bio() async {
    final lock = context.read<LockService>();
    final ok = await lock.biometric(context.t('lock_bio_reason'));
    if (ok) lock.unlock();
  }

  Future<void> _forgot() async {
    final lock = context.read<LockService>();
    await lock.reset();
    await FirebaseAuth.instance.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final lock = context.watch<LockService>();
    return Material(
      color: kSpace,
      child: Container(
        decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(0, -.6), radius: 1.1, colors: [Color(0xFF2F5FD0), kSpace])),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Image.asset('assets/img/bird.png', width: 110),
                Text(context.t('lock_title'), style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(_msg ?? context.t(lock.method == 'bio' ? 'lock_prompt_bio' : 'lock_prompt'), style: const TextStyle(color: Colors.white70)),
                const SizedBox(height: 16),
                PinPad(
                  dark: true,
                  onBiometric: lock.method == 'bio' && lock.bioAvailable ? _bio : null,
                  onComplete: (pin) async {
                    if (lock.check(pin)) {
                      lock.unlock();
                      return true;
                    }
                    setState(() {
                      _tries++;
                      _msg = context.t(_tries >= 3 ? 'lock_wrong_many' : 'lock_wrong');
                    });
                    return false;
                  },
                ),
                TextButton(onPressed: _forgot, child: Text(context.t('lock_forgot'), style: const TextStyle(color: Colors.white))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Used from settings: create a PIN (twice), or verify the current one.
class PinSetupScreen extends StatefulWidget {
  const PinSetupScreen({super.key, this.verifyFirst = false});
  final bool verifyFirst;
  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  late String _step = widget.verifyFirst ? 'old' : 'new';
  String _first = '';
  String? _err;

  @override
  Widget build(BuildContext context) {
    final lock = context.read<LockService>();
    final title = {'old': 'pin_enter_current', 'new': 'pin_choose', 'again': 'pin_repeat'}[_step]!;
    return Scaffold(
      appBar: AppBar(title: Text(context.t('pin_title'))),
      body: Center(
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(context.t(title), style: Theme.of(context).textTheme.titleMedium),
            if (_err != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_err!, style: const TextStyle(color: kRed))),
            const SizedBox(height: 16),
            PinPad(onComplete: (pin) async {
              switch (_step) {
                case 'old':
                  if (!lock.check(pin)) {
                    setState(() => _err = context.t('lock_wrong'));
                    return false;
                  }
                  setState(() {
                    _step = 'new';
                    _err = null;
                  });
                case 'new':
                  setState(() {
                    _first = pin;
                    _step = 'again';
                    _err = null;
                  });
                default:
                  if (pin != _first) {
                    setState(() {
                      _step = 'new';
                      _err = context.t('pin_mismatch');
                    });
                    return false;
                  }
                  await lock.setPin(pin);
                  if (context.mounted) Navigator.of(context).pop(true);
              }
              return true;
            }),
          ]),
        ),
      ),
    );
  }
}

/// Asks for the current PIN; pops true when correct.
class PinVerifyScreen extends StatelessWidget {
  const PinVerifyScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final lock = context.read<LockService>();
    return Scaffold(
      appBar: AppBar(title: Text(context.t('pin_enter_current'))),
      body: Center(
        child: PinPad(onComplete: (pin) async {
          if (!lock.check(pin)) return false;
          Navigator.of(context).pop(true);
          return true;
        }),
      ),
    );
  }
}
