import 'package:flutter/material.dart';

import '../core/models.dart';

const kBlue = Color(0xFF1D4ED8);
const kNavy = Color(0xFF0B2A7A);
const kRed = Color(0xFFD7263D);
const kGold = Color(0xFFF2B300);
const kSpace = Color(0xFF02060F);

ThemeData zajelTheme(Brightness b) {
  final scheme = ColorScheme.fromSeed(seedColor: kBlue, brightness: b, primary: b == Brightness.light ? kBlue : const Color(0xFF8AB0FF));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: const Size(48, 52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: scheme.outlineVariant)),
    ),
  );
}

/// Red and blue airmail stripes.
class AirmailStripe extends StatelessWidget {
  const AirmailStripe({super.key, this.height = 8});
  final double height;
  @override
  Widget build(BuildContext context) => SizedBox(height: height, child: CustomPaint(painter: _Stripes(), size: Size.infinite));
}

class _Stripes extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    final colors = [kRed, Colors.white, kBlue, Colors.white];
    var x = -s.height;
    var i = 0;
    while (x < s.width + s.height) {
      final p = Paint()..color = colors[i % 4];
      final w = i.isEven ? 12.0 : 6.0;
      c.drawPath(Path()
        ..moveTo(x, s.height)
        ..lineTo(x + s.height, 0)
        ..lineTo(x + s.height + w, 0)
        ..lineTo(x + w, s.height)
        ..close(), p);
      x += w;
      i++;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.url = '', this.size = 44, this.seed = ''});
  final String name;
  final String url;
  final double size;
  final String seed;

  static const _palette = [Color(0xFFD7263D), Color(0xFF1F9D55), Color(0xFFC2410C), Color(0xFF334155), Color(0xFF7C3AED), Color(0xFF0E7490), Color(0xFFB45309), Color(0xFFBE185D)];

  @override
  Widget build(BuildContext context) {
    final color = _palette[(seed.isEmpty ? name : seed).codeUnits.fold<int>(0, (a, b) => a + b) % _palette.length];
    final letter = name.trim().isEmpty ? '?' : String.fromCharCodes(name.trim().runes.take(1));
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: color,
      foregroundImage: url.isEmpty ? null : NetworkImage(url),
      child: Text(letter, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * .42)),
    );
  }
}

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar(this.p, {super.key, this.size = 44});
  final Profile p;
  final double size;
  @override
  Widget build(BuildContext context) => Avatar(name: p.name, url: p.photoUrl, size: size, seed: p.id);
}

class Coin extends StatelessWidget {
  const Coin({super.key, this.size = 20});
  final double size;
  @override
  Widget build(BuildContext context) => Image.asset('assets/img/coin.png', width: size, height: size);
}

class PointsChip extends StatelessWidget {
  const PointsChip({super.key, required this.points, required this.vip, this.onTap});
  final int points;
  final bool vip;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => ActionChip(
        onPressed: onTap,
        avatar: const Coin(size: 20),
        label: Text('$points', style: const TextStyle(fontWeight: FontWeight.w700)),
        shape: const StadiumBorder(),
        side: vip ? const BorderSide(color: kGold, width: 1.5) : null,
      );
}

class VipBadge extends StatelessWidget {
  const VipBadge({super.key});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFFFD75E), Color(0xFFE0A100)]), borderRadius: BorderRadius.circular(99)),
        child: const Text('VIP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2A1D00))),
      );
}

String shortTime(BuildContext c, DateTime? t) {
  if (t == null) return '';
  final now = DateTime.now();
  final l = MaterialLocalizations.of(c);
  if (now.difference(t).inHours < 24 && now.day == t.day) return l.formatTimeOfDay(TimeOfDay.fromDateTime(t));
  return l.formatShortDate(t);
}
