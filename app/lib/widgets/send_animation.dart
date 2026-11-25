import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/i18n.dart';
import 'common.dart';

/// The moment a letter leaves: it folds, gets a red stamp (with a short vibration), and the pigeon carries it away.
/// About two seconds; closes itself.
Future<void> playSendAnimation(BuildContext context) => Navigator.of(context).push(PageRouteBuilder<void>(
      opaque: false,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      transitionDuration: Duration.zero,
      pageBuilder: (_, __, ___) => const _SendAnimation(),
    ));

class _SendAnimation extends StatefulWidget {
  const _SendAnimation();
  @override
  State<_SendAnimation> createState() => _SendAnimationState();
}

class _SendAnimationState extends State<_SendAnimation> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2300));
  bool _stamped = false;

  @override
  void initState() {
    super.initState();
    HapticFeedback.selectionClick();
    _c.addListener(() {
      if (!_stamped && _c.value > .36) {
        _stamped = true;
        HapticFeedback.mediumImpact();
      }
    });
    _c.forward().whenComplete(() {
      if (mounted) Navigator.of(context).maybePop();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  double _seg(double a, double b, [Curve c = Curves.easeInOut]) => c.transform(((_c.value - a) / (b - a)).clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return GestureDetector(
      onTap: () => Navigator.of(context).maybePop(),
      child: Material(
        type: MaterialType.transparency,
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            final fold = _seg(0, .3), stamp = _seg(.3, .42, Curves.easeOutBack), take = _seg(.5, .62), fly = _seg(.62, 1, Curves.easeIn);
            final fade = 1 - _seg(.88, 1);
            return Opacity(
              opacity: fade,
              child: Stack(children: [
                // the letter: a sheet that folds into an envelope, then goes with the bird
                Positioned(
                  left: size.width / 2 - 110 + fly * size.width * .55,
                  top: size.height * .42 - fly * size.height * .5,
                  child: Transform.scale(
                    scale: 1 - take * .55,
                    child: Transform.rotate(
                      angle: -.06 - fly * .4,
                      child: SizedBox(
                        width: 220,
                        height: 150,
                        child: Stack(clipBehavior: Clip.none, children: [
                          Transform(
                            alignment: Alignment.bottomCenter,
                            transform: Matrix4.identity()..setEntry(3, 2, .0015)..rotateX(-fold * 2.9),
                            child: Container(
                              height: 75,
                              decoration: const BoxDecoration(color: kParchment, borderRadius: BorderRadius.vertical(top: Radius.circular(10))),
                            ),
                          ),
                          Positioned(
                            top: 75,
                            left: 0,
                            right: 0,
                            child: Container(
                              height: 75,
                              decoration: const BoxDecoration(color: kParchmentDark, borderRadius: BorderRadius.vertical(bottom: Radius.circular(10))),
                            ),
                          ),
                          if (stamp > 0)
                            Positioned(
                              left: 82,
                              top: 50,
                              child: Transform.scale(
                                scale: 2.2 - stamp * 1.2,
                                child: Opacity(
                                  opacity: stamp.clamp(0.0, 1.0),
                                  child: Transform.rotate(
                                    angle: .25,
                                    child: Container(
                                      width: 56,
                                      height: 56,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: kRed, width: 3)),
                                      child: const Text('زاجل', style: TextStyle(color: kRed, fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 13)),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ]),
                      ),
                    ),
                  ),
                ),
                // the pigeon arrives, takes the envelope and flies off to the top corner
                if (take > 0 || fly > 0)
                  Positioned(
                    left: size.width + 40 - take * (size.width * .5 + 110) + fly * size.width * .6,
                    top: size.height * .2 + take * size.height * .16 - fly * size.height * .5,
                    child: Transform.rotate(angle: -.25, child: Image.asset('assets/img/bird.png', width: 110)),
                  ),
                Positioned(
                  left: 24,
                  right: 24,
                  bottom: 48,
                  child: Opacity(
                    opacity: _seg(.62, .75),
                    child: Text(context.t('sent_anim'), textAlign: TextAlign.center,
                        style: const TextStyle(color: kParchment, fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 22)),
                  ),
                ),
              ]),
            );
          },
        ),
      ),
    );
  }
}
