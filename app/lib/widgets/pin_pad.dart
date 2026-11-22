import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Four-dot PIN entry with a numeric keypad. Calls [onComplete] with the 4 digits.
class PinPad extends StatefulWidget {
  const PinPad({super.key, required this.onComplete, this.onBiometric, this.dark = false});
  final Future<bool> Function(String pin) onComplete; // return false to shake and clear
  final VoidCallback? onBiometric;
  final bool dark;

  @override
  State<PinPad> createState() => _PinPadState();
}

class _PinPadState extends State<PinPad> with SingleTickerProviderStateMixin {
  String _buf = '';
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  Future<void> _tap(String k) async {
    HapticFeedback.selectionClick();
    if (k == 'del') {
      if (_buf.isNotEmpty) setState(() => _buf = _buf.substring(0, _buf.length - 1));
      return;
    }
    if (_buf.length >= 4) return;
    setState(() => _buf += k);
    if (_buf.length == 4) {
      final pin = _buf;
      await Future.delayed(const Duration(milliseconds: 120));
      final ok = await widget.onComplete(pin);
      if (!mounted) return;
      if (!ok) {
        HapticFeedback.heavyImpact();
        _shake.forward(from: 0);
      }
      setState(() => _buf = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final fg = widget.dark ? Colors.white : Theme.of(context).colorScheme.onSurface;
    final keyBg = widget.dark ? Colors.white.withValues(alpha: .14) : Theme.of(context).colorScheme.surfaceContainerHighest;
    Widget key(String k, {Widget? child, VoidCallback? onTap}) => SizedBox(
          width: 76,
          height: 76,
          child: Material(
            color: keyBg,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onTap ?? () => _tap(k),
              child: Center(child: child ?? Text(k, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: fg))),
            ),
          ),
        );
    final rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedBuilder(
          animation: _shake,
          builder: (_, child) => Transform.translate(offset: Offset(math.sin(_shake.value * math.pi * 6) * 10 * (1 - _shake.value), 0), child: child),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(4, (i) => Container(
                  margin: const EdgeInsets.all(9),
                  width: 15,
                  height: 15,
                  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: fg, width: 2), color: i < _buf.length ? fg : null),
                )),
          ),
        ),
        const SizedBox(height: 18),
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: Row(mainAxisSize: MainAxisSize.min, children: [for (final k in r) Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: key(k))]),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: widget.onBiometric == null
                  ? const SizedBox(width: 76, height: 76)
                  : key('bio', child: Icon(Icons.fingerprint, size: 36, color: fg), onTap: widget.onBiometric),
            ),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: key('0')),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: key('del', child: Icon(Icons.backspace_outlined, color: fg))),
          ]),
        ),
      ]),
    );
  }
}
