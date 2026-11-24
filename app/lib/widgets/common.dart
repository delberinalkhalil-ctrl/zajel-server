import 'package:flutter/material.dart';

import '../core/models.dart';

const kBlue = Color(0xFF2346A8);
const kNavy = Color(0xFF0B2A7A);
const kRed = Color(0xFFC8323E);
const kRedDeep = Color(0xFF8E1F29);
const kGold = Color(0xFFE8B84A);
const kGoldLight = Color(0xFFFFD77A);
const kSpace = Color(0xFF02060F);

// "Night airmail": a night sky, parchment letters, airmail red and blue, gold for what matters.
const kNight = Color(0xFF060D22);
const kDeep = Color(0xFF0A1430);
const kPanel = Color(0xFF0F1C3F);
const kPanel2 = Color(0xFF16244D);
const kMuted = Color(0xFFA9B4D0);
const kParchment = Color(0xFFF6EEDC);
const kParchmentDark = Color(0xFFE9DEC4);
const kParchmentLine = Color(0xFFBFAE88);
const kInk = Color(0xFF1E2A44);
const kInkSoft = Color(0xFF6B5E44);

const kBodyFont = 'Plex';
const kTitleFont = 'Cairo';

/// One theme for the whole app: a night sky. (The [b] argument is kept for callers; both modes look the same.)
ThemeData zajelTheme([Brightness b = Brightness.dark]) {
  const scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: kBlue, onPrimary: Colors.white,
    primaryContainer: kPanel2, onPrimaryContainer: kParchment,
    secondary: kGold, onSecondary: Color(0xFF2A1D00),
    tertiary: kRed, onTertiary: Colors.white,
    error: Color(0xFFFF8A94), onError: kNight,
    surface: kNight, onSurface: kParchment,
    surfaceContainerLowest: kNight, surfaceContainerLow: kDeep, surfaceContainer: kPanel,
    surfaceContainerHigh: kPanel, surfaceContainerHighest: kPanel2,
    onSurfaceVariant: kMuted, outline: Color(0x33FFFFFF), outlineVariant: Color(0x1FFFFFFF),
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: kBodyFont, scaffoldBackgroundColor: kNight);
  TextStyle? title(TextStyle? t) => t?.copyWith(fontFamily: kTitleFont, fontWeight: FontWeight.w800, color: kParchment);
  final tt = base.textTheme;
  return base.copyWith(
    textTheme: tt.copyWith(
      headlineLarge: title(tt.headlineLarge), headlineMedium: title(tt.headlineMedium), headlineSmall: title(tt.headlineSmall),
      titleLarge: title(tt.titleLarge), titleMedium: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
    ),
    appBarTheme: const AppBarTheme(backgroundColor: kNight, foregroundColor: kParchment, surfaceTintColor: Colors.transparent, elevation: 0, scrolledUnderElevation: 0),
    cardTheme: CardThemeData(
      color: kPanel, elevation: 0, margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Color(0x1AFFFFFF))),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: const Color(0x0FFFFFFF),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      hintStyle: const TextStyle(color: kMuted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kRed, foregroundColor: Colors.white, minimumSize: const Size(48, 52),
        textStyle: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kParchment, minimumSize: const Size(48, 52), side: const BorderSide(color: Color(0x40FFFFFF)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: kGold)),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? kInk : Colors.transparent),
        foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? kParchment : kInk),
        side: const WidgetStatePropertyAll(BorderSide(color: kParchmentLine)),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: const WidgetStatePropertyAll(Colors.white),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? const Color(0xFF34C27A) : const Color(0x33FFFFFF)),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    badgeTheme: const BadgeThemeData(backgroundColor: kRed, textColor: Colors.white),
    dividerTheme: const DividerThemeData(color: Color(0x14FFFFFF)),
    dialogTheme: DialogThemeData(backgroundColor: kPanel, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22))),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: kPanel, surfaceTintColor: Colors.transparent),
    snackBarTheme: const SnackBarThemeData(backgroundColor: kParchment, contentTextStyle: TextStyle(color: kInk, fontFamily: kBodyFont), behavior: SnackBarBehavior.floating),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: kGold, linearTrackColor: Color(0x22FFFFFF)),
    listTileTheme: const ListTileThemeData(iconColor: kGold),
  );
}

/// Light "paper" theme used inside letters, so fields and buttons read as ink on parchment.
ThemeData parchmentTheme(BuildContext context) {
  final t = Theme.of(context);
  return t.copyWith(
    colorScheme: t.colorScheme.copyWith(brightness: Brightness.light, surface: kParchment, onSurface: kInk, onSurfaceVariant: kInkSoft, primary: kInk, outline: kParchmentLine),
    textTheme: t.textTheme.apply(bodyColor: kInk, displayColor: kInk),
    iconTheme: const IconThemeData(color: kInk),
    inputDecorationTheme: t.inputDecorationTheme.copyWith(
      fillColor: Colors.transparent, hintStyle: const TextStyle(color: kInkSoft),
      labelStyle: const TextStyle(color: kInkSoft), floatingLabelStyle: const TextStyle(color: kInk),
      counterStyle: const TextStyle(color: kInkSoft),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kInk, minimumSize: const Size(48, 48), side: const BorderSide(color: kParchmentLine, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: kBlue)),
  );
}

/// A letter: parchment paper with the airmail stripe on top. Everything inside reads as ink on paper.
class LetterCard extends StatelessWidget {
  const LetterCard({super.key, required this.child, this.padding = const EdgeInsets.fromLTRB(16, 14, 16, 16), this.margin = const EdgeInsets.symmetric(vertical: 8)});
  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;
  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: kParchment,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [BoxShadow(color: Color(0x88000000), blurRadius: 24, offset: Offset(0, 8))],
        ),
        child: Theme(
          data: parchmentTheme(context),
          child: DefaultTextStyle.merge(
            style: const TextStyle(color: kInk),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
              const AirmailStripe(height: 7),
              Padding(padding: padding, child: child),
            ]),
          ),
        ),
      );
}

/// Round postmark stamped on letters, with the sender's country code.
class Postmark extends StatelessWidget {
  const Postmark({super.key, required this.code, this.label = 'AIR MAIL', this.color = kRed, this.angle = -.2});
  final String code;
  final String label;
  final Color color;
  final double angle;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: Transform.rotate(
          angle: angle,
          child: Container(
            width: 54, height: 54,
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color.withValues(alpha: .85), width: 2)),
            alignment: Alignment.center,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(code.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 14, height: 1.1, fontFamily: kTitleFont)),
              Text(label, style: TextStyle(color: color, fontSize: 7, fontWeight: FontWeight.w700, letterSpacing: .5)),
            ]),
          ),
        ),
      );
}

/// The big red "release the pigeon" button, with a pressed-in edge underneath.
class LaunchButton extends StatelessWidget {
  const LaunchButton({super.key, required this.label, required this.onPressed, this.busy = false, this.icon = Icons.send});
  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool busy;
  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: onPressed == null ? Colors.transparent : kRedDeep, offset: const Offset(0, 5))],
        ),
        child: FilledButton.icon(
          onPressed: onPressed,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56), disabledBackgroundColor: kParchmentLine, disabledForegroundColor: kParchment),
          icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(icon),
          label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17)),
        ),
      );
}

/// Floating bottom bar used by the home screen.
class FloatingNavItem {
  const FloatingNavItem(this.icon, this.selectedIcon, this.label, {this.badge = 0});
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final int badge;
}

class FloatingNav extends StatelessWidget {
  const FloatingNav({super.key, required this.items, required this.index, required this.onTap});
  final List<FloatingNavItem> items;
  final int index;
  final ValueChanged<int> onTap;
  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: kPanel.withValues(alpha: .96),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0x1FFFFFFF)),
            boxShadow: const [BoxShadow(color: Color(0x99000000), blurRadius: 20, offset: Offset(0, 6))],
          ),
          child: Row(children: [
            for (var i = 0; i < items.length; i++)
              Expanded(
                child: Semantics(
                  selected: i == index,
                  button: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => onTap(i),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Badge(
                        isLabelVisible: items[i].badge > 0,
                        label: Text('${items[i].badge}'),
                        child: Icon(i == index ? items[i].selectedIcon : items[i].icon, color: i == index ? kGold : kMuted, size: 24),
                      ),
                      const SizedBox(height: 3),
                      Text(items[i].label, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11, color: i == index ? kGold : kMuted, fontWeight: i == index ? FontWeight.w600 : FontWeight.w400)),
                    ]),
                  ),
                ),
              ),
          ]),
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
    final colors = [kRed, kParchment, kBlue, kParchment];
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

/// Clock time for someone whose phone is [tzMinutes] from UTC.
String localTime(BuildContext c, int tzMinutes) {
  final t = DateTime.now().toUtc().add(Duration(minutes: tzMinutes));
  return MaterialLocalizations.of(c).formatTimeOfDay(TimeOfDay(hour: t.hour, minute: t.minute));
}
