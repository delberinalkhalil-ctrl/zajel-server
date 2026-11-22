import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_state.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../widgets/common.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _signUp = true;
  bool _busy = false;
  bool _accept = false;
  final _email = TextEditingController();
  final _pass = TextEditingController();
  String? _err;

  @override
  void dispose() {
    _email.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim(), pass = _pass.text;
    setState(() => _err = null);
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) return setState(() => _err = context.t('err_auth_invalid-email'));
    if (_signUp && pass.length < 8) return setState(() => _err = context.t('err_auth_weak-password'));
    if (_signUp && !_accept) return setState(() => _err = context.t('auth_accept_required'));
    setState(() => _busy = true);
    try {
      final a = FirebaseAuth.instance;
      if (_signUp) {
        await a.createUserWithEmailAndPassword(email: email, password: pass);
      } else {
        await a.signInWithEmailAndPassword(email: email, password: pass);
      }
    } catch (e) {
      if (mounted) setState(() => _err = errText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _google() async {
    if (_signUp && !_accept) return setState(() => _err = context.t('auth_accept_required'));
    setState(() => _busy = true);
    try {
      final g = await GoogleSignIn().signIn();
      if (g == null) return;
      final auth = await g.authentication;
      await FirebaseAuth.instance.signInWithCredential(GoogleAuthProvider.credential(idToken: auth.idToken, accessToken: auth.accessToken));
    } catch (e) {
      if (mounted) setState(() => _err = errText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    final email = _email.text.trim();
    if (email.isEmpty) return setState(() => _err = context.t('err_auth_invalid-email'));
    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      if (mounted) showInfo(context, context.t('auth_reset_sent'));
    } catch (e) {
      if (mounted) setState(() => _err = errText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Scaffold(
      body: ListView(padding: EdgeInsets.zero, children: [
        Container(
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [kNavy, kBlue])),
          padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 8, 20, 28),
          child: Column(children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: PopupMenuButton<String>(
                tooltip: context.t('language'),
                icon: const Icon(Icons.translate, color: Colors.white),
                onSelected: app.setLanguage,
                itemBuilder: (_) => [for (final l in Cfg.langs) PopupMenuItem(value: l, child: Text(Cfg.langNames[l]!))],
              ),
            ),
            Image.asset('assets/img/bird.png', width: 150),
            Text(context.t('app_name'), style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(context.t('tagline'), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 16)),
          ]),
        ),
        const AirmailStripe(),
        Padding(
          padding: const EdgeInsets.all(20),
          child: AutofillGroup(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              SegmentedButton<bool>(
                segments: [ButtonSegment(value: true, label: Text(context.t('auth_new'))), ButtonSegment(value: false, label: Text(context.t('auth_signin')))],
                selected: {_signUp},
                onSelectionChanged: (s) => setState(() {
                  _signUp = s.first;
                  _err = null;
                }),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(labelText: context.t('email'), prefixIcon: const Icon(Icons.mail_outline)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pass,
                obscureText: true,
                autofillHints: [_signUp ? AutofillHints.newPassword : AutofillHints.password],
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(labelText: context.t('password'), helperText: _signUp ? context.t('password_hint') : null, prefixIcon: const Icon(Icons.lock_outline)),
                onSubmitted: (_) => _submit(),
              ),
              if (_signUp)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _accept,
                  onChanged: (v) => setState(() => _accept = v ?? false),
                  title: Text(context.t('auth_accept'), style: const TextStyle(fontSize: 14)),
                  subtitle: Wrap(spacing: 12, children: [
                    TextButton(onPressed: () => launchUrl(Uri.parse(Cfg.termsUrl)), child: Text(context.t('terms'))),
                    TextButton(onPressed: () => launchUrl(Uri.parse(Cfg.privacyUrl)), child: Text(context.t('privacy'))),
                  ]),
                )
              else
                Align(alignment: AlignmentDirectional.centerStart, child: TextButton(onPressed: _forgot, child: Text(context.t('auth_forgot')))),
              if (_err != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_err!, style: const TextStyle(color: kRed))),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : Text(context.t(_signUp ? 'auth_create' : 'auth_signin')),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _busy ? null : _google,
                icon: const Icon(Icons.account_circle_outlined),
                label: Text(context.t('auth_google')),
                style: OutlinedButton.styleFrom(minimumSize: const Size(48, 52)),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
