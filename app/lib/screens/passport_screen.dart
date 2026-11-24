import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:share_plus/share_plus.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';

/// The Zajel passport: a stamp for every country a letter reached or came from, achievements,
/// this month's challenge, the latest journeys and a card to share.
class PassportScreen extends StatefulWidget {
  const PassportScreen({super.key});
  @override
  State<PassportScreen> createState() => _PassportScreenState();
}

const kChallengeCountries = 5;
const kAchievements = {
  'first_pigeon': Icons.send,
  'countries_5': Icons.public,
  'langs_5': Icons.translate,
  'profile_full': Icons.badge_outlined,
  'km_10k': Icons.flight_takeoff,
  'chats_10': Icons.forum_outlined,
};

class _PassportScreenState extends State<PassportScreen> {
  late Future<Map<String, dynamic>> _stats = Api.call('myStats');
  final _card = GlobalKey();
  bool _sharing = false;

  Future<void> _share(Map<String, dynamic> s) async {
    setState(() => _sharing = true);
    try {
      final box = _card.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      final text = context.t('share_passport_text', {'countries': s['countries'] ?? 0, 'km': s['km'] ?? 0});
      if (box == null) {
        await Share.share(text);
      } else {
        final img = await box.toImage(pixelRatio: 3);
        final png = await img.toByteData(format: ui.ImageByteFormat.png);
        img.dispose();
        if (png == null) {
          await Share.share(text);
        } else {
          await Share.shareXFiles([XFile.fromData(png.buffer.asUint8List(), mimeType: 'image/png', name: 'zajel_passport.png')], text: text);
        }
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final lang = context.lang;
    return Scaffold(
      appBar: AppBar(title: Text(context.t('passport'))),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _stats,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(
              child: TextButton(onPressed: () => setState(() => _stats = Api.call('myStats')), child: Text(context.t('retry'))),
            );
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final s = snap.data!;
          int n(String k) => (s[k] as num?)?.toInt() ?? 0;
          final stamps = ((s['stamps'] as List?) ?? const []).whereType<Map>().toList();
          final journeys = ((s['journeys'] as List?) ?? const []).whereType<Map>().toList();
          final earned = ((s['achievements'] as List?) ?? const []).map((e) => '$e').toSet();
          final month = n('monthCountries');
          return ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
            RepaintBoundary(
              key: _card,
              child: LetterCard(
                margin: EdgeInsets.zero,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Image.asset('assets/img/bird.png', width: 40),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(me.name, style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 22, color: kInk), overflow: TextOverflow.ellipsis),
                    ),
                    Text(context.t('passport').toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 1, color: kInkSoft, fontWeight: FontWeight.w700)),
                  ]),
                  const SizedBox(height: 10),
                  Wrap(spacing: 18, runSpacing: 8, children: [
                    _big(context, n('sent'), context.t('stat_sent')),
                    _big(context, n('received'), context.t('stat_received')),
                    _big(context, stamps.length, context.t('stat_stamps')),
                    _big(context, n('km'), context.t('stat_km')),
                  ]),
                  if (stamps.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      for (final st in stamps.take(24)) _Stamp(code: '${st['c']}', name: Countries.byCode('${st['c']}')?.name(lang) ?? '${st['name']}', incoming: st['dir'] == 'in'),
                    ]),
                  ],
                  const SizedBox(height: 10),
                  const Text('zajel · bawer-kalash.com/zajel', style: TextStyle(fontSize: 10, color: kInkSoft)),
                ]),
              ),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: _sharing ? null : () => _share(s),
              icon: const Icon(Icons.ios_share),
              label: Text(context.t('share_passport')),
            ),
            const SizedBox(height: 20),
            _title(context, context.t('challenge_title')),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(context.t('challenge_body', {'n': kChallengeCountries})),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(value: (month / kChallengeCountries).clamp(0.0, 1.0), minHeight: 8, borderRadius: BorderRadius.circular(8)),
                  const SizedBox(height: 6),
                  Text(
                    month >= kChallengeCountries ? context.t('challenge_done') : context.t('challenge_progress', {'n': month, 'max': kChallengeCountries}),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            _title(context, context.t('achievements')),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: .9,
              children: [
                for (final e in kAchievements.entries)
                  Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: earned.contains(e.key) ? kGold : kPanel2,
                          child: Icon(e.value, color: earned.contains(e.key) ? kNight : kMuted),
                        ),
                        const SizedBox(height: 6),
                        Text(context.t('ach_${e.key}'), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: earned.contains(e.key) ? kParchment : kMuted)),
                      ]),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _title(context, context.t('stamps')),
            if (stamps.isEmpty) Text(context.t('no_stamps'), style: Theme.of(context).textTheme.bodySmall),
            for (final st in stamps)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: _Stamp(code: '${st['c']}', name: '', incoming: st['dir'] == 'in', small: true),
                title: Text(Countries.byCode('${st['c']}')?.name(lang) ?? '${st['name']}'),
                subtitle: Text(context.t(st['dir'] == 'in' ? 'stamp_in' : 'stamp_out', {
                  'date': st['at'] is num ? shortDate(context, DateTime.fromMillisecondsSinceEpoch((st['at'] as num).toInt())) : '',
                })),
              ),
            const SizedBox(height: 16),
            _title(context, context.t('journey_log')),
            if (journeys.isEmpty) Text(context.t('no_pigeons_yet'), style: Theme.of(context).textTheme.bodySmall),
            for (final j in journeys)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(j['status'] == 'expired' ? Icons.undo : j['status'] == 'caught' ? Icons.forum_outlined : Icons.air, color: kGold),
                title: Text([
                  '${j['city'] ?? ''}',
                  Countries.byCode('${j['country']}')?.name(lang) ?? '${j['countryName'] ?? ''}',
                ].where((e) => e.isNotEmpty).join(', ').ifEmpty(context.t('surprise_dest'))),
                subtitle: Text([
                  context.t('status_${j['status']}'),
                  if ((j['km'] as num? ?? 0) > 0) '${j['km']} ${context.t('km')}',
                  if (j['at'] is num) shortDate(context, DateTime.fromMillisecondsSinceEpoch((j['at'] as num).toInt())),
                ].join(' · ')),
              ),
          ]);
        },
      ),
    );
  }

  Widget _title(BuildContext c, String s) =>
      Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(s, style: Theme.of(c).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)));

  Widget _big(BuildContext c, int v, String label) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(MaterialLocalizations.of(c).formatDecimal(v), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 20, color: kInk)),
        Text(label, style: const TextStyle(fontSize: 11, color: kInkSoft)),
      ]);
}

extension on String {
  String ifEmpty(String other) => isEmpty ? other : this;
}

/// A round ink stamp with the country code: red for letters I sent, blue for letters I received.
class _Stamp extends StatelessWidget {
  const _Stamp({required this.code, required this.name, required this.incoming, this.small = false});
  final String code;
  final String name;
  final bool incoming;
  final bool small;
  @override
  Widget build(BuildContext context) {
    final color = incoming ? kBlue : kRed;
    final size = small ? 40.0 : 52.0;
    final stamp = Transform.rotate(
      angle: (code.hashCode % 21 - 10) / 100,
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color, width: 2)),
        child: Container(
          width: size - 8,
          height: size - 8,
          alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color.withValues(alpha: .6), width: 1)),
          child: Text(code, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: small ? 12 : 14, letterSpacing: 1)),
        ),
      ),
    );
    if (name.isEmpty) return stamp;
    return Tooltip(message: name, child: stamp);
  }
}
