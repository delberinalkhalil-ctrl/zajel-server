import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zajel/core/i18n.dart';
import 'package:zajel/core/models.dart';
import 'package:zajel/core/occasions.dart';
import 'package:zajel/screens/sky_screen.dart' show FilterSheet, JourneyStages;
import 'package:zajel/widgets/common.dart';

/// Pictures of the new pieces in this update (journey stages, filters, banners), in Arabic and English.
Future<void> _fonts() async {
  Future<void> load(String family, List<String> files) async {
    final l = FontLoader(family);
    for (final f in files) {
      l.addFont(rootBundle.load(f));
    }
    await l.load();
  }

  await load('Plex', [
    'assets/fonts/IBMPlexSansArabic-Regular.ttf',
    'assets/fonts/IBMPlexSansArabic-Medium.ttf',
    'assets/fonts/IBMPlexSansArabic-SemiBold.ttf',
    'assets/fonts/IBMPlexSansArabic-Bold.ttf',
  ]);
  await load('Cairo', ['assets/fonts/Cairo-Bold.ttf', 'assets/fonts/Cairo-ExtraBold.ttf']);
  await load('MaterialIcons', ['fonts/MaterialIcons-Regular.otf']);
}

class _V2 extends StatelessWidget {
  const _V2();
  @override
  Widget build(BuildContext context) {
    final flying = Pigeon('a', {'status': 'flying', 'departAt': Timestamp.now(), 'arriveAt': Timestamp.now()});
    final expired = Pigeon('b', {'status': 'expired'});
    final me = Me({'name': 'Delber', 'genderMatch': true, 'gender': 'm'});
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(12), children: [
          NoticeBanner(icon: Icons.campaign_outlined, text: context.t('occ_post'), onClose: () {}),
          NoticeBanner(icon: Icons.lock_clock_outlined, color: kRed, text: context.t('restricted_until', {'date': '1/12/2026'})),
          const SizedBox(height: 8),
          JourneyStages(p: flying),
          JourneyStages(p: expired),
          const SizedBox(height: 8),
          Card(child: FilterSheet(initial: const {'region': 'EU', 'lang': 'de', 'ageMin': 20, 'ageMax': 35}, me: me, countryChosen: false)),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Wrap(spacing: 6, runSpacing: 6, children: [for (final r in kRegions) Chip(label: Text(context.t('region_$r')))]),
            ),
          ),
        ]),
      ),
    );
  }
}

void main() {
  setUpAll(_fonts);

  test('occasions near a date', () {
    expect(Occasions.near(DateTime(2026, 10, 8)).map((o) => o.id), contains('post'));
    expect(Occasions.near(DateTime(2026, 12, 31)).map((o) => o.id), contains('new_year'));
    expect(Occasions.near(DateTime(2026, 6, 15)), isEmpty);
  });

  for (final lang in ['ar', 'en']) {
    testWidgets('v2 preview ($lang)', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 1500 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: zajelTheme(),
        locale: Locale(lang),
        supportedLocales: L10n.supported,
        localizationsDelegates: L10n.delegates,
        home: const _V2(),
      ));
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 500)));
      await tester.pumpAndSettle();
      expect(find.byType(JourneyStages), findsNWidgets(2));
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/v2_$lang.png'));
    });
  }
}
