import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/occasions.dart';
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

  /// Names and photos of the people my pigeons landed with, loaded once per person.
  final Map<String, Profile> _people = {};
  final Set<String> _loading = {};
  Profile? _person(String? uid) {
    if (uid == null || uid.isEmpty) return null;
    final p = _people[uid];
    if (p == null && _loading.add(uid)) {
      Api.profile(uid).first.then((v) {
        if (mounted) setState(() => _people[uid] = v);
      }).catchError((_) {});
    }
    return p;
  }
  String? _dest;
  /// Who should receive it: region, lang, ageMin, ageMax, gender (all optional). Sent as `filters`.
  Map<String, dynamic> _want = {};
  bool _fast = false;
  bool _busy = false;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(milliseconds: 500), (_) {
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
      final r = await Api.call('sendPigeon', {
        'text': text, 'fast': _fast, if (_dest != null) 'toCountry': _dest,
        if (_want.isNotEmpty) 'filters': {..._want, if (_dest != null) 'region': null},
      });
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

  /// Pigeons whose flight has ended and for which the app has asked the server to land them.
  final Set<String> _landAsked = {};

  String _eta(BuildContext c, Pigeon p) {
    final a = p.arriveAt;
    if (a == null) return c.t('waiting_for_catcher');
    final ms = a.difference(DateTime.now()).inMilliseconds;
    if (ms <= 0) {
      // Flights last 3 to 15 seconds: as soon as one ends, ask the server to land it (it also has its own timer).
      if (p.status == 'flying' && _landAsked.add(p.id)) Api.call('landPigeon', {'id': p.id}).ignore();
      return c.t('landing_now');
    }
    final s = (ms / 1000).ceil();
    if (s < 60) return c.t('eta_s', {'s': s});
    final m = (s / 60).ceil();
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
              GlobeLanding(
                p.id, p.toLoc!, p.toCity.isNotEmpty ? p.toCity : p.toCountryName, p.landedAt!.millisecondsSinceEpoch,
                name: _person(p.toUid)?.name ?? p.toName, photo: _person(p.toUid)?.photoUrl ?? '',
              ),
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
                  effects: me.effects,
                  color: me.pigeonColor,
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
              for (final o in Occasions.near(DateTime.now()).take(1))
                Transform.translate(
                  offset: const Offset(0, -30),
                  child: GestureDetector(
                    onTap: _pickIdea,
                    child: NoticeBanner(icon: Icons.celebration_outlined, text: '${context.t(o.nameKey)} · ${context.t('occasion_tap')}'),
                  ),
                ),
              Transform.translate(
                offset: const Offset(0, -22),
                child: LetterCard(
                  margin: EdgeInsets.zero,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Row(children: [
                      Expanded(child: Text(context.t('new_letter'), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 20, color: kInk))),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: kParchmentDark, borderRadius: BorderRadius.circular(99)),
                          child: Text(
                            !Cfg.storeEnabled
                                ? context.t('free_left_free', {'n': me.freeToday, 'max': Cfg.freeModeDailyPigeons})
                                : me.vip ? context.t('vip_unlimited') : context.t('free_left', {'n': me.freeToday, 'max': Cfg.freePerDay, 'cost': Cfg.costExtra}),
                            maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 11, color: kInkSoft),
                          ),
                        ),
                      ),
                    ]),
                    TextField(
                      controller: _text,
                      minLines: 3,
                      maxLines: 6,
                      maxLength: Cfg.maxPigeonLen,
                      style: const TextStyle(color: kInk, fontSize: 16, height: 1.6),
                      cursorColor: kRed,
                      decoration: InputDecoration(
                        hintText: context.t('letter_hint'),
                        border: const UnderlineInputBorder(borderSide: BorderSide(color: kParchmentLine)),
                        enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: kParchmentLine)),
                        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: kInk)),
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String?>(
                      value: _dest,
                      isExpanded: true,
                      dropdownColor: kParchment,
                      style: const TextStyle(color: kInk, fontFamily: kBodyFont, fontSize: 15),
                      decoration: InputDecoration(
                        labelText: context.t('where_to'),
                        prefixIcon: const Icon(Icons.public, color: kInk),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kParchmentLine)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kParchmentLine, width: 1.5)),
                      ),
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
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                      ActionChip(
                        avatar: const Icon(Icons.tune, size: 18, color: kInk),
                        label: Text(_want.isEmpty ? context.t('filters') : context.t('filters_n', {'n': _want.length})),
                        backgroundColor: _want.isEmpty ? kParchmentDark : kGold.withValues(alpha: .35),
                        labelStyle: const TextStyle(color: kInk),
                        side: const BorderSide(color: kParchmentLine),
                        onPressed: () => _pickFilters(me),
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.lightbulb_outline, size: 18, color: kInk),
                        label: Text(context.t('ideas')),
                        backgroundColor: kParchmentDark,
                        labelStyle: const TextStyle(color: kInk),
                        side: const BorderSide(color: kParchmentLine),
                        onPressed: _pickIdea,
                      ),
                      for (final f in _filterLabels(context))
                        Chip(label: Text(f, style: const TextStyle(color: kInk, fontSize: 12)), backgroundColor: kParchment, side: const BorderSide(color: kParchmentLine), visualDensity: VisualDensity.compact),
                    ]),
                    const SizedBox(height: 12),
                    SegmentedButton<bool>(
                      segments: [
                        ButtonSegment(value: false, icon: const Icon(Icons.air), label: Text(context.t('speed_normal'))),
                        ButtonSegment(value: true, icon: const Icon(Icons.bolt), label: Text(Cfg.storeEnabled ? '${context.t('speed_fast')} · ${Cfg.costFast}' : context.t('speed_fast'))),
                      ],
                      selected: {_fast},
                      onSelectionChanged: (s) => setState(() => _fast = s.first),
                    ),
                    const SizedBox(height: 16),
                    LaunchButton(
                      busy: _busy,
                      onPressed: _busy || inAir.length >= Cfg.maxInAir ? null : () => _launch(me),
                      label: Cfg.storeEnabled ? '${context.t('launch')}  ·  ${cost == 0 ? context.t('free') : context.t('n_points', {'n': cost})}' : context.t('launch'),
                    ),
                  ]),
                ),
              ),
              if (mine.isNotEmpty) JourneyStages(p: mine.first),
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

  List<String> _filterLabels(BuildContext c) {
    final w = _want;
    return [
      if (w['region'] != null && _dest == null) c.t('region_${w['region']}'),
      if (w['lang'] != null) Cfg.langNames[w['lang']] ?? '${w['lang']}',
      if (w['ageMin'] != null || w['ageMax'] != null) c.t('age_range', {'a': w['ageMin'] ?? 18, 'b': w['ageMax'] ?? 80}),
      if (w['gender'] != null) c.t(w['gender'] == 'f' ? 'gender_f' : 'gender_m'),
    ].where((e) => e.isNotEmpty).toList();
  }

  Future<void> _pickFilters(Me me) async {
    final r = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => FilterSheet(initial: _want, me: me, countryChosen: _dest != null),
    );
    if (r != null && mounted) setState(() => _want = r);
  }

  /// Ready letters and the letter for a nearby occasion; tapping one fills the letter.
  Future<void> _pickIdea() async {
    final near = Occasions.near(DateTime.now());
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (c) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(c).height * .7),
          child: ListView(shrinkWrap: true, padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), children: [
            if (near.isNotEmpty) ...[
              Text(c.t('occasions'), style: Theme.of(c).textTheme.titleMedium),
              for (final o in near)
                ListTile(
                  leading: const Icon(Icons.celebration_outlined, color: kGold),
                  title: Text(c.t(o.nameKey)),
                  subtitle: Text(c.t(o.msgKey), maxLines: 2, overflow: TextOverflow.ellipsis),
                  onTap: () => Navigator.pop(c, c.t(o.msgKey)),
                ),
              const Divider(),
            ],
            Text(c.t('ready_letters'), style: Theme.of(c).textTheme.titleMedium),
            for (final k in Occasions.ready)
              ListTile(
                leading: const Icon(Icons.mail_outline, color: kGold),
                title: Text(c.t(k), maxLines: 3, overflow: TextOverflow.ellipsis),
                onTap: () => Navigator.pop(c, c.t(k)),
              ),
          ]),
        ),
      ),
    );
    if (picked == null || !mounted) return;
    _text.text = picked;
    _text.selection = TextSelection.collapsed(offset: picked.length);
  }

  Widget _hud(String s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: kParchment, borderRadius: BorderRadius.circular(99), boxShadow: const [BoxShadow(color: Color(0x88000000), blurRadius: 12)]),
        child: Text(s, style: const TextStyle(color: kInk, fontSize: 12, fontWeight: FontWeight.w600)),
      );
}

Color _statusColor(String s) => switch (s) {
      'flying' => kGoldLight,
      'landed' || 'caught' => const Color(0xFF7FE0A8),
      'expired' => const Color(0xFFFF8A94),
      _ => kMuted,
    };

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
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(p.fast ? Icons.bolt : Icons.air, size: 18, color: kGold),
            const SizedBox(width: 6),
            Expanded(child: Text(where, style: const TextStyle(fontWeight: FontWeight.w600))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: _statusColor(p.status).withValues(alpha: .18), borderRadius: BorderRadius.circular(99)),
              child: Text(status, style: TextStyle(fontSize: 12, color: _statusColor(p.status), fontWeight: FontWeight.w600)),
            ),
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


/// Where the latest letter is: written → in the air → landed → a conversation (or "not accepted").
class JourneyStages extends StatelessWidget {
  const JourneyStages({super.key, required this.p});
  final Pigeon p;

  @override
  Widget build(BuildContext context) {
    final expired = p.status == 'expired';
    final reached = switch (p.status) { 'waiting' => 0, 'flying' => 1, 'landed' => 2, 'caught' => 3, 'expired' => 3, _ => 0 };
    final steps = [
      (Icons.edit_outlined, context.t('stage_written')),
      (Icons.air, context.t('stage_flying')),
      (Icons.place_outlined, context.t('stage_landed')),
      expired ? (Icons.undo, context.t('status_expired')) : (Icons.forum_outlined, context.t('stage_caught')),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(context.t('journey_title'), style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(children: [
            for (var i = 0; i < steps.length; i++) ...[
              Expanded(
                child: Column(children: [
                  CircleAvatar(
                    radius: 17,
                    backgroundColor: i <= reached ? (expired && i == 3 ? const Color(0xFFFF8A94) : kGold) : kPanel2,
                    child: Icon(steps[i].$1, size: 18, color: i <= reached ? kNight : kMuted),
                  ),
                  const SizedBox(height: 6),
                  Text(steps[i].$2, textAlign: TextAlign.center, maxLines: 2, style: TextStyle(fontSize: 11.5, color: i <= reached ? kParchment : kMuted)),
                ]),
              ),
              if (i < steps.length - 1)
                Expanded(
                  flex: 0,
                  child: Container(width: 14, height: 2, margin: const EdgeInsets.only(bottom: 26), color: i < reached ? kGold : kPanel2),
                ),
            ],
          ]),
        ]),
      ),
    );
  }
}

/// Optional matching filters for a letter. Gender can only be chosen by people who share their own.
class FilterSheet extends StatefulWidget {
  const FilterSheet({super.key, required this.initial, required this.me, required this.countryChosen});
  final Map<String, dynamic> initial;
  final Me me;
  final bool countryChosen;
  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  late String? _region = widget.initial['region'] as String?;
  late String? _lang = widget.initial['lang'] as String?;
  late String? _gender = widget.initial['gender'] as String?;
  late bool _age = widget.initial['ageMin'] != null || widget.initial['ageMax'] != null;
  late RangeValues _ages = RangeValues(((widget.initial['ageMin'] as num?) ?? 18).toDouble(), ((widget.initial['ageMax'] as num?) ?? 80).toDouble());

  Map<String, dynamic> get _result => {
        if (_region != null && !widget.countryChosen) 'region': _region,
        if (_lang != null) 'lang': _lang,
        if (_age) 'ageMin': _ages.start.round(),
        if (_age) 'ageMax': _ages.end.round(),
        if (_gender != null && widget.me.genderMatch) 'gender': _gender,
      };

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(context.t('filters_title'), style: t.titleLarge),
          Text(context.t('filters_hint'), style: t.bodySmall?.copyWith(color: kMuted)),
          const SizedBox(height: 14),
          Text(context.t('filter_region'), style: t.titleSmall),
          const SizedBox(height: 6),
          if (widget.countryChosen)
            Text(context.t('filter_region_country'), style: t.bodySmall?.copyWith(color: kMuted))
          else
            Wrap(spacing: 6, runSpacing: 6, children: [
              ChoiceChip(label: Text(context.t('any')), selected: _region == null, onSelected: (_) => setState(() => _region = null)),
              for (final r in kRegions)
                ChoiceChip(label: Text(context.t('region_$r')), selected: _region == r, onSelected: (_) => setState(() => _region = r)),
            ]),
          const SizedBox(height: 16),
          Text(context.t('filter_lang'), style: t.titleSmall),
          const SizedBox(height: 6),
          DropdownButtonFormField<String?>(
            value: _lang,
            isExpanded: true,
            items: [
              DropdownMenuItem<String?>(value: null, child: Text(context.t('any'))),
              for (final l in Cfg.langs) DropdownMenuItem<String?>(value: l, child: Text(Cfg.langNames[l] ?? l)),
            ],
            onChanged: (v) => setState(() => _lang = v),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(context.t('filter_age')),
            subtitle: _age ? Text(context.t('age_range', {'a': _ages.start.round(), 'b': _ages.end.round()})) : null,
            value: _age,
            onChanged: (v) => setState(() => _age = v),
          ),
          if (_age)
            RangeSlider(
              min: 18, max: 80, divisions: 62, values: _ages,
              labels: RangeLabels('${_ages.start.round()}', '${_ages.end.round()}'),
              onChanged: (v) => setState(() => _ages = v),
            ),
          const SizedBox(height: 8),
          Text(context.t('filter_gender'), style: t.titleSmall),
          const SizedBox(height: 6),
          if (!widget.me.genderMatch)
            Text(context.t('filter_gender_off'), style: t.bodySmall?.copyWith(color: kMuted))
          else
            Wrap(spacing: 6, children: [
              ChoiceChip(label: Text(context.t('any')), selected: _gender == null, onSelected: (_) => setState(() => _gender = null)),
              ChoiceChip(label: Text(context.t('gender_f')), selected: _gender == 'f', onSelected: (_) => setState(() => _gender = 'f')),
              ChoiceChip(label: Text(context.t('gender_m')), selected: _gender == 'm', onSelected: (_) => setState(() => _gender = 'm')),
            ]),
          const SizedBox(height: 10),
          Text(context.t('filters_slower'), style: t.bodySmall?.copyWith(color: kMuted)),
          const SizedBox(height: 14),
          Row(children: [
            TextButton(onPressed: () => Navigator.pop(context, <String, dynamic>{}), child: Text(context.t('clear'))),
            const Spacer(),
            FilledButton(onPressed: () => Navigator.pop(context, _result), child: Text(context.t('apply'))),
          ]),
        ]),
      ),
    );
  }
}
