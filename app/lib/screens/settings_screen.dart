import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/lock.dart';
import '../core/models.dart';
import '../core/push.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import 'lock_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final Stream<Profile> _profile = Api.profile(Api.uid);
  final _name = TextEditingController();
  final _bio = TextEditingController();
  bool _filled = false;
  bool _saving = false;
  bool _uploading = false;

  @override
  void dispose() {
    _name.dispose();
    _bio.dispose();
    super.dispose();
  }

  Future<void> _update(Map<String, dynamic> data, {String? ok}) async {
    try {
      await Api.call('updateProfile', data);
      if (ok != null && mounted) showInfo(context, ok);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await _update({'name': _name.text.trim(), 'bio': _bio.text.trim()}, ok: context.t('saved'));
    if (mounted) setState(() => _saving = false);
  }

  Future<void> _pickPhoto() async {
    final x = await LockService.instance.guard(
      () => ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800, maxHeight: 800, imageQuality: 85),
    );
    if (x == null) return;
    setState(() => _uploading = true);
    try {
      final mime = x.mimeType ?? (x.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      await Api.uploadAvatar(await x.readAsBytes(), mime);
      if (mounted) showInfo(context, context.t('photo_updated'));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _setLang(String l) async {
    await context.read<AppState>().setLanguage(l);
    await _update({'lang': l});
  }

  Future<void> _toggleLock(bool on) async {
    final lock = context.read<LockService>();
    if (on) {
      await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const PinSetupScreen()));
    } else {
      final ok = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const PinVerifyScreen()));
      if (ok == true) await lock.disable();
    }
  }

  Future<void> _setMethod(String m) async {
    final lock = context.read<LockService>();
    if (m == 'bio') {
      final ok = await lock.biometric(context.t('lock_bio_reason'));
      if (!ok) {
        if (mounted) showInfo(context, context.t('bio_unavailable'));
        return;
      }
    }
    await lock.setMethod(m);
  }

  Future<bool> _confirm(String title, String body, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: Text(c.t('cancel'))),
            FilledButton(style: FilledButton.styleFrom(backgroundColor: kRed), onPressed: () => Navigator.pop(c, true), child: Text(action)),
          ],
        ),
      ) ==
      true;

  Future<void> _signOut() async {
    if (!await _confirm(context.t('sign_out_q'), context.t('sign_out_body'), context.t('sign_out'))) return;
    await Push.stop();
    await LockService.instance.reset();
    try {
      await GoogleSignIn().signOut();
    } catch (_) {}
    await FirebaseAuth.instance.signOut();
  }

  Future<void> _delete() async {
    final me = context.meNow;
    if (!await _confirm(context.t('delete_q'), Cfg.storeEnabled ? context.t('delete_body', {'n': me.points}) : context.t('delete_body_free'), context.t('delete_confirm'))) return;
    try {
      await Api.call('deleteAccount');
      await LockService.instance.reset();
      try {
        await GoogleSignIn().signOut();
      } catch (_) {}
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final app = context.watch<AppState>();
    final lock = context.watch<LockService>();
    final vip = me.vip;
    Widget section(String title, List<Widget> children, {Widget? badge}) => Card(
          margin: const EdgeInsets.only(bottom: 14),
          clipBehavior: Clip.antiAlias,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
              child: Row(children: [Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)), if (badge != null) ...[const SizedBox(width: 8), badge]]),
            ),
            ...children,
          ]),
        );
    Widget sw(String key, String title, String sub, {bool def = true, bool enabled = true}) => SwitchListTile(
          title: Text(title),
          subtitle: Text(sub),
          value: me.setting(key, def),
          onChanged: enabled ? (v) => _update({'settings': {key: v}}) : null,
        );

    return StreamBuilder<Profile>(
      stream: _profile,
      builder: (context, ps) {
        final p = ps.data;
        if (p != null && !_filled) {
          _filled = true;
          _name.text = p.name == '…' ? me.name : p.name;
          _bio.text = p.bio;
        }
        return ListView(padding: const EdgeInsets.all(16), children: [
          Row(children: [
            GestureDetector(
              onTap: _uploading ? null : _pickPhoto,
              child: Stack(alignment: Alignment.bottomCenter, children: [
                Avatar(name: me.name, url: p?.photoUrl ?? '', size: 92, seed: Api.uid),
                Container(
                  width: 92,
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  decoration: const BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.vertical(bottom: Radius.circular(46))),
                  child: _uploading
                      ? const Center(child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)))
                      : Text(context.t('change'), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 12)),
                ),
              ]),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text(me.name, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis)),
                  if (vip) const Padding(padding: EdgeInsetsDirectional.only(start: 8), child: VipBadge()),
                ]),
                Text(FirebaseAuth.instance.currentUser?.email ?? '', textDirection: TextDirection.ltr, style: Theme.of(context).textTheme.bodySmall),
                Text([me.city, me.countryName].where((e) => e.isNotEmpty).join(', '), style: Theme.of(context).textTheme.bodySmall),
                if (p != null && p.photoUrl.isNotEmpty)
                  TextButton(onPressed: () => _update({'photoUrl': ''}), child: Text(context.t('remove_photo'))),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          section(context.t('profile'), [
            Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 0), child: TextField(controller: _name, maxLength: 30, decoration: InputDecoration(labelText: context.t('display_name')))),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(controller: _bio, maxLength: 120, maxLines: 2, decoration: InputDecoration(labelText: context.t('bio'), hintText: context.t('bio_hint'))),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: DropdownButtonFormField<String>(
                value: Cfg.langs.contains(context.lang) ? context.lang : 'en',
                decoration: InputDecoration(labelText: context.t('your_language'), helperText: context.t('language_help')),
                items: [for (final l in Cfg.langs) DropdownMenuItem(value: l, child: Text(Cfg.langNames[l]!))],
                onChanged: (v) => v == null ? null : _setLang(v),
              ),
            ),
            Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 16), child: FilledButton(onPressed: _saving ? null : _save, child: Text(context.t('save')))),
          ]),
          section(context.t('pigeons_chats'), [
            SwitchListTile(title: Text(context.t('auto_translate')), subtitle: Text(context.t('auto_translate_sub')), value: app.autoTranslate, onChanged: app.setAutoTranslate),
            SwitchListTile(title: Text(context.t('always_original')), subtitle: Text(context.t('always_original_sub')), value: app.showOriginal, onChanged: app.setShowOriginal),
            SwitchListTile(title: Text(context.t('receive_pigeons')), subtitle: Text(context.t('receive_pigeons_sub')), value: me.receiving, onChanged: (v) => _update({'receiving': v})),
            sw('notif', context.t('notifications'), context.t('notifications_sub')),
            sw('sound', context.t('sounds'), context.t('sounds_sub')),
          ]),
          section(context.t('privacy_section'), [
            ListTile(
              title: Text(context.t('who_can_call')),
              trailing: DropdownButton<String>(
                value: me.calls,
                underline: const SizedBox(),
                items: [
                  DropdownMenuItem(value: 'all', child: Text(context.t('calls_all'))),
                  DropdownMenuItem(value: 'ten', child: Text(context.t('calls_ten'))),
                  DropdownMenuItem(value: 'none', child: Text(context.t('calls_none'))),
                ],
                onChanged: (v) => v == null ? null : _update({'settings': {'calls': v}}),
              ),
            ),
            sw('showCity', context.t('show_city'), context.t('show_city_sub')),
            ListTile(
              title: Text(context.t('blocked_users')),
              subtitle: Text(context.t('n_users', {'n': me.blocked.length})),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BlockedScreen())),
            ),
          ]),
          if (Cfg.storeEnabled) section(context.t('vip_features'), badge: vip ? const VipBadge() : null, [
            sw('ghost', context.t('ghost_mode'), context.t('ghost_mode_sub'), def: false, enabled: vip),
            sw('hideRead', context.t('hide_read'), context.t('hide_read_sub'), def: false, enabled: vip),
            sw('badge', context.t('show_badge'), context.t('show_badge_sub'), enabled: vip),
            sw('priority', context.t('priority'), context.t('priority_sub'), def: false, enabled: vip),
            if (!vip)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Text(context.t('vip_locked'), style: Theme.of(context).textTheme.bodySmall),
              ),
          ]),
          section(context.t('security'), [
            SwitchListTile(title: Text(context.t('app_lock')), subtitle: Text(context.t('app_lock_sub')), value: lock.enabled, onChanged: _toggleLock),
            if (lock.enabled) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: SegmentedButton<String>(
                  segments: [
                    ButtonSegment(value: 'pin', icon: const Icon(Icons.pin), label: Text(context.t('method_pin'))),
                    ButtonSegment(value: 'bio', icon: const Icon(Icons.fingerprint), label: Text(context.t('method_bio')), enabled: lock.bioAvailable),
                  ],
                  selected: {lock.method},
                  onSelectionChanged: (s) => _setMethod(s.first),
                ),
              ),
              ListTile(
                title: Text(context.t('auto_lock')),
                trailing: DropdownButton<int>(
                  value: lock.autoSeconds,
                  underline: const SizedBox(),
                  items: [
                    DropdownMenuItem(value: 0, child: Text(context.t('lock_now_opt'))),
                    DropdownMenuItem(value: 60, child: Text(context.t('lock_1m'))),
                    DropdownMenuItem(value: 300, child: Text(context.t('lock_5m'))),
                  ],
                  onChanged: (v) => v == null ? null : lock.setAuto(v),
                ),
              ),
              ListTile(
                title: Text(context.t('change_pin')),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PinSetupScreen(verifyFirst: true))),
              ),
              ListTile(title: Text(context.t('lock_now')), trailing: const Icon(Icons.lock_outline), onTap: lock.lockNow),
            ],
          ]),
          section(context.t('account'), [
            ListTile(title: Text(context.t('privacy')), trailing: const Icon(Icons.open_in_new), onTap: () => launchUrl(Uri.parse(Cfg.privacyUrl))),
            ListTile(title: Text(context.t('terms')), trailing: const Icon(Icons.open_in_new), onTap: () => launchUrl(Uri.parse(Cfg.termsUrl))),
            ListTile(title: Text(context.t('contact_support')), subtitle: Text(Cfg.supportEmail, textDirection: TextDirection.ltr), onTap: () => launchUrl(Uri.parse('mailto:${Cfg.supportEmail}'))),
            ListTile(title: Text(context.t('sign_out'), style: const TextStyle(color: kRed)), leading: const Icon(Icons.logout, color: kRed), onTap: _signOut),
            ListTile(
              title: Text(context.t('delete_account'), style: const TextStyle(color: kRed)),
              subtitle: Text(context.t('delete_account_sub')),
              leading: const Icon(Icons.delete_forever, color: kRed),
              onTap: _delete,
            ),
          ]),
          Center(child: Text('Zajel 1.0.0', style: Theme.of(context).textTheme.bodySmall)),
        ]);
      },
    );
  }
}

class BlockedScreen extends StatelessWidget {
  const BlockedScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final me = context.me;
    return Scaffold(
      appBar: AppBar(title: Text(context.t('blocked_users'))),
      body: me.blocked.isEmpty
          ? Center(child: Text(context.t('no_blocked')))
          : ListView(children: [
              Padding(padding: const EdgeInsets.all(16), child: Text(context.t('blocked_note'))),
              for (final id in me.blocked)
                FutureBuilder<Profile>(
                  future: Api.profileOnce(id),
                  builder: (context, s) {
                    final p = s.data ?? Profile(id, const {});
                    return ListTile(
                      leading: ProfileAvatar(p),
                      title: Text(p.name),
                      subtitle: Text(p.place),
                      trailing: TextButton(
                        onPressed: () async {
                          try {
                            await Api.call('unblockUser', {'uid': id});
                          } catch (e) {
                            if (context.mounted) showError(context, e);
                          }
                        },
                        child: Text(context.t('unblock')),
                      ),
                    );
                  },
                ),
            ]),
    );
  }
}
