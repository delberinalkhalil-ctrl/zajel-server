import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zajel/core/i18n.dart';
import 'package:zajel/screens/chat_screen.dart' show Tick, TickIcon;
import 'package:zajel/widgets/common.dart';

/// Renders the new "night airmail" pieces with the real fonts, in Arabic and in German,
/// and saves them as pictures (test/goldens/) so the build can be checked by eye.
/// Run with --update-goldens to write the pictures.
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

class _Preview extends StatelessWidget {
  const _Preview();
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('app_name'), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 24))),
        bottomNavigationBar: FloatingNav(index: 1, onTap: (_) {}, items: [
          FloatingNavItem(Icons.send_outlined, Icons.send, context.t('tab_send')),
          FloatingNavItem(Icons.mail_outline, Icons.mail, context.t('tab_inbox'), badge: 2),
          FloatingNavItem(Icons.chat_bubble_outline, Icons.chat_bubble, context.t('tab_chats'), badge: 5),
          FloatingNavItem(Icons.person_outline, Icons.person, context.t('tab_me')),
        ]),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          Text(context.t('inbox_title'), style: Theme.of(context).textTheme.headlineSmall),
          LetterCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Avatar(name: 'Léa', size: 46),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Léa', style: TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w700, fontSize: 16, color: kInk)),
                    Text('Lyon, France · 3200 km', style: TextStyle(fontSize: 12, color: kInkSoft)),
                  ]),
                ),
                const Postmark(code: 'FR'),
              ]),
              const SizedBox(height: 12),
              Text(context.t('letter_hint'), style: const TextStyle(fontSize: 16, height: 1.7, color: kInk)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(flex: 2, child: LaunchButton(onPressed: () {}, label: context.t('catch_reply'), icon: Icons.reply)),
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton(onPressed: () {}, child: Text(context.t('release')))),
              ]),
            ]),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                Expanded(child: Text(context.t('tick_read'))),
                const TickIcon(tick: Tick.sent, color: kParchment),
                const SizedBox(width: 8),
                const TickIcon(tick: Tick.delivered, color: kParchment),
                const SizedBox(width: 8),
                const TickIcon(tick: Tick.read, color: kParchment),
              ]),
            ),
          ),
          const SizedBox(height: 8),
          LaunchButton(onPressed: () {}, label: context.t('launch')),
        ]),
      );
}

void main() {
  setUpAll(_fonts);

  for (final lang in ['ar', 'de']) {
    testWidgets('night airmail preview ($lang)', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: zajelTheme(),
        locale: Locale(lang),
        supportedLocales: L10n.supported,
        localizationsDelegates: L10n.delegates,
        home: const _Preview(),
      ));
      // The translations and fonts load from real files: let that I/O finish before settling.
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 500)));
      await tester.pumpAndSettle();
      expect(find.byType(LetterCard), findsOneWidget);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/preview_$lang.png'));
    });
  }
}
