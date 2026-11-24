import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zajel/core/i18n.dart';
import 'package:zajel/screens/chat_screen.dart' show Tick, TickIcon;
import 'package:zajel/widgets/common.dart';

/// Phone screenshots for the Play store listing (1080 x 1920), drawn from the app's real widgets,
/// theme and fonts with sample people and letters. Run with --update-goldens; pictures land in test/goldens/.
late Uint8List _globe;

Future<void> _setUp() async {
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
  _globe = File('test/assets/globe.png').readAsBytesSync();
}

Widget _nav(BuildContext context, int i) => FloatingNav(index: i, onTap: (_) {}, items: [
      FloatingNavItem(Icons.send_outlined, Icons.send, context.t('tab_send')),
      FloatingNavItem(Icons.mail_outline, Icons.mail, context.t('tab_inbox'), badge: i == 1 ? 0 : 2),
      FloatingNavItem(Icons.chat_bubble_outline, Icons.chat_bubble, context.t('tab_chats'), badge: i == 2 ? 0 : 1),
      FloatingNavItem(Icons.person_outline, Icons.person, context.t('tab_me')),
    ]);

PreferredSizeWidget _bar(BuildContext context) => AppBar(
      title: Row(mainAxisSize: MainAxisSize.min, children: [
        Image.asset('assets/img/bird.png', width: 40),
        const SizedBox(width: 8),
        Text(context.t('app_name'), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 24)),
      ]),
    );

/// 1. The sky: the globe, a pigeon on its way, and a new letter.
class _Sky extends StatelessWidget {
  const _Sky();
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: _bar(context),
        bottomNavigationBar: _nav(context, 0),
        body: Stack(children: [
          Positioned(top: -6, left: 0, right: 0, child: Center(child: Image.memory(_globe, width: 300, height: 300))),
          PositionedDirectional(
            top: 34, start: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: kParchment, borderRadius: BorderRadius.circular(99), boxShadow: const [BoxShadow(color: Color(0x88000000), blurRadius: 12)]),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Image.asset('assets/img/bird.png', width: 20),
                const SizedBox(width: 6),
                const Text('ليون، فرنسا · ٤ ث', style: TextStyle(color: kInk, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
          Positioned(
            left: 14, right: 14, bottom: 4,
            child: LetterCard(
              margin: EdgeInsets.zero,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  Expanded(child: Text(context.t('new_letter'), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 20, color: kInk))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: kParchmentDark, borderRadius: BorderRadius.circular(99)),
                    child: Text(context.t('free_left_free', {'n': 4, 'max': 5}), style: const TextStyle(fontSize: 11, color: kInkSoft)),
                  ),
                ]),
                const SizedBox(height: 10),
                const Text('مرحباً من أربيل! أحب السفر والقهوة وتعلّم اللغات. ما أجمل مكان في مدينتك؟',
                    style: TextStyle(color: kInk, fontSize: 15, height: 1.6)),
                const Divider(color: kParchmentLine, height: 18),
                SegmentedButton<bool>(
                  segments: [
                    ButtonSegment(value: false, icon: const Icon(Icons.air), label: Text(context.t('speed_normal'))),
                    ButtonSegment(value: true, icon: const Icon(Icons.bolt), label: Text(context.t('speed_fast'))),
                  ],
                  selected: const {false},
                  onSelectionChanged: (_) {},
                ),
                const SizedBox(height: 14),
                LaunchButton(onPressed: () {}, label: context.t('launch')),
              ]),
            ),
          ),
        ]),
      );
}

/// 2. Letters that landed for you.
class _Inbox extends StatelessWidget {
  const _Inbox();
  Widget _letter(BuildContext c, String name, String place, String code, String text, String from, bool first) => LetterCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Avatar(name: name, seed: name, size: 44),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w700, fontSize: 16, color: kInk)),
                Text(place, style: const TextStyle(fontSize: 12, color: kInkSoft)),
              ]),
            ),
            Postmark(code: code, color: first ? kRed : kBlue, angle: first ? -.2 : .14),
          ]),
          const SizedBox(height: 10),
          Text(text, style: const TextStyle(fontSize: 15, height: 1.6, color: kInk)),
          const SizedBox(height: 4),
          Text(from, style: const TextStyle(fontSize: 12, color: kBlue, fontWeight: FontWeight.w600)),
          if (first) ...[
            const SizedBox(height: 10),
            LaunchButton(onPressed: () {}, label: c.t('catch_reply'), icon: Icons.reply),
            const SizedBox(height: 8),
            OutlinedButton(style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)), onPressed: () {}, child: Text(c.t('release'))),
          ],
        ]),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: _bar(context),
        bottomNavigationBar: _nav(context, 1),
        body: ListView(padding: const EdgeInsets.fromLTRB(14, 0, 14, 8), physics: const NeverScrollableScrollPhysics(), children: [
          Text(context.t('inbox_title'), style: Theme.of(context).textTheme.headlineSmall),
          _letter(context, 'Léa', 'ليون، فرنسا · ٣٢٠٠ كم', 'FR', 'مرحباً من ليون! أحب الطبخ وأتعلم العربية منذ سنة. ما أجمل مكان في مدينتك؟', 'مترجمة من الفرنسية', true),
          _letter(context, 'Kenji', 'أوساكا، اليابان · ٧٨٠٠ كم', 'JP', 'أرسلت هذه الحمامة بلا وجهة… أتمنى أن تصل لشخص يحب الموسيقى مثلي.', 'مترجمة من اليابانية', false),
        ]),
      );
}

/// 3. A chat that began with a pigeon, with read ticks.
class _Chat extends StatelessWidget {
  const _Chat();
  Widget _bubble(String text, {required bool mine, bool letter = false, Tick tick = Tick.none, String time = '١١:٢٠', String? note}) {
    final fg = letter ? kInk : kParchment;
    return Align(
      alignment: mine ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 270),
        margin: const EdgeInsets.symmetric(vertical: 4),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: letter ? kParchment : mine ? kBlue : kPanel2,
          borderRadius: BorderRadius.circular(18),
          border: mine || letter ? null : Border.all(color: const Color(0x1AFFFFFF)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          if (letter) const SizedBox(height: 5, width: double.infinity, child: AirmailStripe(height: 5)),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(text, style: TextStyle(color: fg, fontSize: 15, height: 1.5)),
              if (note != null) Text(note, style: const TextStyle(color: kGoldLight, fontSize: 11)),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text(time, style: TextStyle(color: fg.withValues(alpha: .7), fontSize: 11)),
                if (tick != Tick.none) Padding(padding: const EdgeInsetsDirectional.only(start: 4), child: TickIcon(tick: tick, color: fg)),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          titleSpacing: 0,
          title: Row(children: [
            const Avatar(name: 'Léa', seed: 'Léa', size: 40),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Léa', style: TextStyle(fontFamily: kTitleFont, fontSize: 17, fontWeight: FontWeight.w700)),
                Text('ليون، فرنسا · ${context.t('local_time', {'time': '٩:٢٠ ص'})}', style: const TextStyle(fontSize: 12, color: kMuted)),
              ]),
            ),
          ]),
          actions: [
            IconButton(onPressed: () {}, icon: const Icon(Icons.call)),
            IconButton(onPressed: () {}, icon: const Icon(Icons.videocam)),
          ],
        ),
        body: Column(children: [
          Expanded(
            child: ListView(padding: const EdgeInsets.all(12), physics: const NeverScrollableScrollPhysics(), children: [
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0x0DFFFFFF), borderRadius: BorderRadius.circular(99)),
                  child: Text(context.t('route_note', {'km': '٣٢٠٠'}), style: const TextStyle(fontSize: 11, color: kMuted)),
                ),
              ),
              _bubble('مرحباً من ليون! أحب الطبخ وأتعلم العربية منذ سنة.', mine: false, letter: true, time: '١١:٠٢'),
              _bubble('أهلاً Léa! أنا من أربيل، والقلعة أجمل ما في مدينتي.', mine: true, tick: Tick.read, time: '١١:٠٥'),
              _bubble('جرّبت أن أخبز اليوم! ما الطعام المشهور عندكم؟', mine: false, time: '١١:٢٠', note: 'مترجمة · عرض الأصل'),
              _bubble('عندنا الكبة والدولمة، سأرسل لك صورة.', mine: true, tick: Tick.delivered, time: '١١:٢٢'),
              _bubble('وسأعلّمك كيف نصنعها خطوة بخطوة.', mine: true, tick: Tick.sent, time: '١١:٢٣'),
            ]),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
              child: Row(children: [
                IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.add)),
                const SizedBox(width: 6),
                Expanded(child: TextField(decoration: InputDecoration(hintText: context.t('message_hint', {'lang': 'Français'}), isDense: true))),
                const SizedBox(width: 6),
                IconButton.filled(style: IconButton.styleFrom(backgroundColor: kRed), onPressed: () {}, icon: const Icon(Icons.mic)),
              ]),
            ),
          ),
        ]),
      );
}

/// 4. The Zajel passport.
class _Passport extends StatelessWidget {
  const _Passport();
  @override
  Widget build(BuildContext context) {
    Widget cell(String v, String label) => Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(children: [
              Text(v, style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 18, color: kInk)),
              Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: kInkSoft)),
            ]),
          ),
        );
    const line = VerticalDivider(width: 1, color: kParchmentLine);
    Widget row(IconData i, String t, {String? v, bool sw = false}) => ListTile(
          leading: Icon(i), title: Text(t),
          trailing: sw ? Switch(value: true, onChanged: (_) {}) : Text(v ?? '', style: const TextStyle(color: kMuted)),
        );
    return Scaffold(
      appBar: _bar(context),
      bottomNavigationBar: _nav(context, 3),
      body: ListView(padding: const EdgeInsets.fromLTRB(14, 0, 14, 8), physics: const NeverScrollableScrollPhysics(), children: [
        LetterCard(
          padding: EdgeInsets.zero,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                const Avatar(name: 'باور', seed: 'b', size: 64),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(context.t('passport'), style: const TextStyle(fontSize: 11, color: kInkSoft, fontWeight: FontWeight.w600)),
                    const Text('باور', style: TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 22, color: kInk)),
                    const Text('أربيل، العراق · العربية', style: TextStyle(fontSize: 12, color: kInkSoft)),
                  ]),
                ),
              ]),
            ),
            Container(
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: kParchmentLine))),
              child: IntrinsicHeight(
                child: Row(children: [
                  cell('٢٧', context.t('stat_sent')), line, cell('٩', context.t('stat_countries')), line, cell('٤١K', context.t('stat_km')),
                ]),
              ),
            ),
          ]),
        ),
        Card(
          child: Column(children: [
            row(Icons.translate, context.t('auto_translate'), sw: true),
            row(Icons.mark_email_unread_outlined, context.t('receive_pigeons'), sw: true),
            row(Icons.call_outlined, context.t('who_can_call'), v: context.t('calls_ten')),
            row(Icons.lock_outline, context.t('app_lock'), v: context.t('method_bio')),
          ]),
        ),
      ]),
    );
  }
}

void main() {
  setUpAll(_setUp);
  const screens = <String, Widget>{'1_sky': _Sky(), '2_inbox': _Inbox(), '3_chat': _Chat(), '4_passport': _Passport()};
  for (final e in screens.entries) {
    testWidgets('store screenshot ${e.key}', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: zajelTheme(),
        locale: const Locale('ar'),
        supportedLocales: L10n.supported,
        localizationsDelegates: L10n.delegates,
        home: e.value,
      ));
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 500));
        for (final el in find.byType(Image).evaluate()) {
          await precacheImage((el.widget as Image).image, el);
        }
      });
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/store_${e.key}.png'));
    });
  }
}
