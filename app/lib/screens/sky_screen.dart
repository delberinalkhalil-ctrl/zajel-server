import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import '../widgets/globe_view.dart';

/// Write a letter, choose where and how fast, and watch the pigeon fly on the 3D globe.
class SkyScreen extends StatefulWidget {
  const SkyScreen({super.key, required this.onStore});
  final VoidCallback onStore;
  @override
  State<SkyScreen> createState() => _SkyScreenState();
}

class _SkyScreenState extends State<SkyScreen> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  late final Stream<List<Pigeon>> _mine = Api.myPigeons();
  String? _dest;
  bool _fast = false;
  bool _busy = false;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  int _cost(Me me) => !Cfg.storeEnabled ? 0 :
      (me.vip || me.freeToday > 0 ? 0 : Cfg.costExtra) + (_dest != null && !me.vip ? Cfg.costDest : 0) + (_fast ? Cfg.costFast : 0);

  Future<void> _launch(Me me) async {
    final text = _text.text.trim();
    if (text.isEmpty) return showInfo(context, context.t('write_first'));
    final cost = _cost(me);
    if (Cfg.storeEnabled && me.points < cost) return _lowFunds(cost, me.points);
    setState(() => _busy = true);
    try {
      final r = await Api.call('sendPigeon', {'text': text, 'fast': _fast, if (_dest != null) 'toCountry': _dest});
      _text.clear();
      if (!mounted) return;
      FocusScope.of(context).unfocus();
      _scroll.animateTo(0, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
      showInfo(context, r['status'] == 'waiting' ? context.t('sent_waiting') : context.t(Cfg.storeEnabled ? 'sent_flying' : 'sent_flying_free', {'cost': r['charged'] ?? 0}));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _lowFunds(int need, int have) => showDialog<void>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(c.t('low_funds_title')),
          content: Text(c.t('low_funds_body', {'need': need, 'have': have})),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c), child: Text(c.t('later'))),
            FilledButton(onPressed: () {
              Navigator.pop(c);
              widget.onStore();
            }, child: Text(c.t('go_store'))),
          ],
        ),
      );

  String _eta(BuildContext c, Pigeon p) {
    final a = p.arriveAt;
    if (a == null) return c.t('waiting_for_catcher');
    final m = a.difference(DateTime.now()).inMinutes;
    if (m <= 0) return c.t('landing_now');
    return m >= 60 ? c.t('eta_hm', {'h': m ~/ 60, 'm': m % 60}) : c.t('eta_m', {'m': m});
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final lang = context.lang;
    final cost = _cost(me);
    return StreamBuilder<List<Pigeon>>(
      stream: _mine,
      builder: (context, snap) {
        final mine = snap.data ?? const <Pigeon>[];
        final inAir = mine.where((p) => p.status == 'flying' || p.status == 'waiting').toList();
        final flights = <GlobeFlight>[
          for (final p in mine)
            if (p.status == 'flying' && p.toLoc != null && p.departAt != null && p.arriveAt != null)
              GlobeFlight(
                id: p.id, from: p.originLoc, to: p.toLoc!, toLabel: p.toCity.isNotEmpty ? p.toCity : p.toCountryName,
                reveal: p.wantCountry != null, km: p.km, t0: p.departAt!.millisecondsSinceEpoch, t1: p.arriveAt!.millisecondsSinceEpoch,
              ),
        ];
        final landed = <GlobeLanding>[
          for (final p in mine.take(6))
            if ((p.status == 'landed' || p.status == 'caught') && p.toLoc != null && p.landedAt != null)
              GlobeLanding(p.id, p.toLoc!, p.toCity.isNotEmpty ? p.toCity : p.toCountryName, p.landedAt!.millisecondsSinceEpoch),
        ];
        return ListView(controller: _scroll, padding: EdgeInsets.zero, children: [
          SizedBox(
            height: MediaQuery.sizeOf(context).height * .44,
            child: Stack(children: [
              Positioned.fill(
                child: GlobeView(
                  home: me.loc,
                  homeLabel: context.t('you_at', {'city': me.city.isNotEmpty ? me.city : me.countryName}),
                  flights: flights,
                  landed: landed,
                ),
              ),
              if (inAir.isNotEmpty && inAir.first.status == 'flying')
                PositionedDirectional(
                  top: 10, start: 10, end: 10,
                  child: Wrap(spacing: 6, runSpacing: 6, children: [
                    _hud(inAir.first.wantCountry != null ? (inAir.first.toCity.isNotEmpty ? inAir.first.toCity : inAir.first.toCountryName) : context.t('surprise_dest')),
                    _hud('${inAir.first.km} ${context.t('km')}'),
                    _hud(_eta(context, inAir.first)),
                  ]),
                ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Transform.translate(
                offset: const Offset(0, -18),
                child: Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(children: [
                    const AirmailStripe(),
                    TextField(
                      controller: _text,
                      minLines: 3,
                      maxLines: 6,
                      maxLength: Cfg.maxPigeonLen,
                      decoration: InputDecoration(hintText: context.t('letter_hint'), filled: false, border: InputBorder.none, contentPadding: const EdgeInsets.all(14)),
                    ),
                  ]),
                ),
              ),
              DropdownButtonFormField<String?>(
                value: _dest,
                isExpanded: true,
                decoration: InputDecoration(labelText: context.t('where_to')),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text(context.t(Cfg.storeEnabled ? 'dest_random' : 'surprise_dest'))),
                  for (final c in Countries.sorted(lang))
                    DropdownMenuItem<String?>(
                      value: c.code,
                      child: Text(Cfg.storeEnabled ? '${c.name(lang)} · ${me.vip ? 'VIP' : context.t('n_points', {'n': Cfg.costDest})}' : c.name(lang), overflow: TextOverflow.ellipsis),
                    ),
                ],
                onChanged: (v) => setState(() => _dest = v),
              ),
              const SizedBox(height: 12),
              SegmentedButton<bool>(
                segments: [
                  ButtonSegment(value: false, icon: const Icon(Icons.air), label: Text(context.t('speed_normal'))),
                  ButtonSegment(value: true, icon: const Icon(Icons.bolt), label: Text(Cfg.storeEnabled ? '${context.t('speed_fast')} · ${Cfg.costFast}' : context.t('speed_fast'))),
                ],
                selected: {_fast},
                onSelectionChanged: (s) => setState(() => _fast = s.first),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _busy || inAir.length >= Cfg.maxInAir ? null : () => _launch(me),
                icon: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
                label: Text(Cfg.storeEnabled ? '${context.t('launch')}  ·  ${cost == 0 ? context.t('free') : context.t('n_points', {'n': cost})}' : context.t('launch')),
              ),
              const SizedBox(height: 6),
              Text(
                !Cfg.storeEnabled
                    ? context.t('free_left_free', {'n': me.freeToday, 'max': Cfg.freeModeDailyPigeons})
                    : me.vip ? context.t('vip_unlimited') : context.t('free_left', {'n': me.freeToday, 'max': Cfg.freePerDay, 'cost': Cfg.costExtra}),
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Text(context.t('my_pigeons'), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              if (mine.isEmpty) Text(context.t('no_pigeons_yet')),
              for (final p in mine.take(10)) _PigeonTile(p: p, eta: _eta(context, p)),
            ]),
          ),
        ]);
      },
    );
  }

  Widget _hud(String s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xCC0B1630), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white24)),
        child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 13)),
      );
}

class _PigeonTile extends StatelessWidget {
  const _PigeonTile({required this.p, required this.eta});
  final Pigeon p;
  final String eta;
  @override
  Widget build(BuildContext context) {
    final where = p.toCity.isNotEmpty || p.toCountryName.isNotEmpty
        ? (p.wantCountry != null || p.status == 'landed' || p.status == 'caught' ? [p.toCity, p.toCountryName].where((e) => e.isNotEmpty).join(', ') : context.t('surprise_dest'))
        : context.t('surprise_dest');
    final status = context.t('status_${p.status}');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(p.fast ? Icons.bolt : Icons.air, size: 18),
            const SizedBox(width: 6),
            Expanded(child: Text(where, style: const TextStyle(fontWeight: FontWeight.w600))),
            Text(status, style: Theme.of(context).textTheme.labelMedium),
          ]),
          const SizedBox(height: 4),
          Text(p.text, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
          if (p.status == 'flying') ...[
            const SizedBox(height: 8),
            LinearProgressIndicator(value: p.progress, minHeight: 6, borderRadius: BorderRadius.circular(6)),
            const SizedBox(height: 4),
            Text('${p.km} ${context.t('km')} · $eta', style: Theme.of(context).textTheme.bodySmall),
          ],
        ]),
      ),
    );
  }
}
