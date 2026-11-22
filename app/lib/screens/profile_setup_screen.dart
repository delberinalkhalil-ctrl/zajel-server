import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/location.dart';
import '../core/models.dart';
import '../widgets/common.dart';

/// First run after sign-up: name, age, language and city. Calls initUser.
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});
  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _name = TextEditingController(text: FirebaseAuth.instance.currentUser?.displayName ?? '');
  final _city = TextEditingController();
  int? _year;
  String? _country;
  LatLon? _loc;
  bool _locating = false;
  bool _busy = false;
  String? _err;

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    setState(() => _locating = true);
    final p = await currentPlace(context.lang);
    if (!mounted) return;
    setState(() {
      _locating = false;
      if (p == null) {
        _err = context.t('setup_location_denied');
        return;
      }
      _loc = p.loc;
      if (p.city.isNotEmpty) _city.text = p.city;
      if (Countries.byCode(p.country) != null) _country = p.country;
    });
  }

  Future<void> _save() async {
    final lang = context.lang;
    final name = _name.text.trim();
    setState(() => _err = null);
    if (name.characters.length < 2) return setState(() => _err = context.t('err_bad_name'));
    if (_year == null) return setState(() => _err = context.t('setup_pick_year'));
    if (DateTime.now().year - _year! < 18) return setState(() => _err = context.t('err_under_18'));
    final c = _country == null ? null : Countries.byCode(_country!);
    if (c == null) return setState(() => _err = context.t('setup_pick_country'));
    setState(() => _busy = true);
    try {
      await Api.call('initUser', {
        'name': name,
        'birthYear': _year,
        'lang': lang,
        'country': c.code,
        'countryName': c.name(lang),
        'city': _city.text.trim(),
        'loc': (_loc ?? c.loc).toMap(),
      });
      if (mounted) await context.read<AppState>().setLanguage(lang);
    } catch (e) {
      if (mounted) setState(() => _err = errText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final lang = context.lang;
    final now = DateTime.now().year;
    final countries = Countries.sorted(lang);
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('setup_title')),
        actions: [IconButton(tooltip: context.t('sign_out'), onPressed: () => FirebaseAuth.instance.signOut(), icon: const Icon(Icons.logout))],
      ),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        Text(context.t('setup_intro'), style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 20),
        TextField(controller: _name, maxLength: 30, decoration: InputDecoration(labelText: context.t('display_name'))),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          value: _year,
          decoration: InputDecoration(labelText: context.t('birth_year'), helperText: context.t('birth_year_hint')),
          items: [for (var y = now - 18; y >= now - 90; y--) DropdownMenuItem(value: y, child: Text('$y'))],
          onChanged: (v) => setState(() => _year = v),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: lang,
          decoration: InputDecoration(labelText: context.t('your_language')),
          items: [for (final l in Cfg.langs) DropdownMenuItem(value: l, child: Text(Cfg.langNames[l]!))],
          onChanged: (v) => v == null ? null : app.setLanguage(v),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _locating ? null : _locate,
          icon: _locating ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.my_location),
          label: Text(context.t('use_my_location')),
          style: OutlinedButton.styleFrom(minimumSize: const Size(48, 50)),
        ),
        Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(context.t('location_privacy'), style: Theme.of(context).textTheme.bodySmall)),
        DropdownButtonFormField<String>(
          value: _country,
          isExpanded: true,
          decoration: InputDecoration(labelText: context.t('country')),
          items: [for (final c in countries) DropdownMenuItem(value: c.code, child: Text(c.name(lang), overflow: TextOverflow.ellipsis))],
          onChanged: (v) => setState(() => _country = v),
        ),
        const SizedBox(height: 12),
        TextField(controller: _city, maxLength: 60, decoration: InputDecoration(labelText: context.t('city'))),
        if (_err != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_err!, style: const TextStyle(color: kRed))),
        FilledButton(onPressed: _busy ? null : _save, child: Text(context.t('setup_done'))),
      ]),
    );
  }
}
