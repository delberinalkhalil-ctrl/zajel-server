import 'package:flutter/material.dart';

import '../core/i18n.dart';
import '../widgets/common.dart';

/// Three short pages shown once to a new user: the idea, how a letter travels, safety.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});
  final VoidCallback onDone;
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = PageController();
  int _i = 0;

  static const _icons = [Icons.public, Icons.translate, Icons.verified_user_outlined];

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _next() {
    if (_i == 2) return widget.onDone();
    _pages.nextPage(duration: const Duration(milliseconds: 380), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: kNight,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 8, 0),
            child: Row(children: [
              for (var k = 0; k < 3; k++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsetsDirectional.only(end: 6),
                  width: k == _i ? 26 : 7,
                  height: 7,
                  decoration: BoxDecoration(color: k == _i ? kGold : Colors.white24, borderRadius: BorderRadius.circular(4)),
                ),
              const Spacer(),
              TextButton(onPressed: widget.onDone, child: Text(context.t('onb_skip'), style: const TextStyle(color: kMuted))),
            ]),
          ),
          Expanded(
            child: PageView.builder(
              controller: _pages,
              itemCount: 3,
              onPageChanged: (v) => setState(() => _i = v),
              itemBuilder: (c, k) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 26),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  SizedBox(
                    height: 230,
                    child: Stack(alignment: Alignment.center, children: [
                      Container(
                        width: 210,
                        height: 210,
                        decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [kGold.withValues(alpha: .28), kGold.withValues(alpha: 0)])),
                      ),
                      Icon(_icons[k], size: 120, color: kPanel2),
                      Transform.rotate(angle: -.2, child: Image.asset('assets/img/bird.png', width: 120)),
                    ]),
                  ),
                  const SizedBox(height: 28),
                  Text(c.t('onb_${k + 1}_t'), textAlign: TextAlign.center, style: t.headlineSmall?.copyWith(fontFamily: kTitleFont, fontWeight: FontWeight.w800, height: 1.35)),
                  const SizedBox(height: 14),
                  Text(c.t('onb_${k + 1}_b'), textAlign: TextAlign.center, style: t.bodyLarge?.copyWith(color: const Color(0xFFC9D1E6), height: 1.7)),
                ]),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 0, 22, 22),
            child: LaunchButton(label: context.t(_i == 2 ? 'onb_start' : 'onb_next'), onPressed: _next, icon: _i == 2 ? Icons.send : Icons.arrow_forward),
          ),
        ]),
      ),
    );
  }
}
