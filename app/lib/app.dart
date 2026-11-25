import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/app_state.dart';
import 'core/i18n.dart';
import 'core/lock.dart';
import 'core/session.dart';
import 'screens/auth_screen.dart';
import 'screens/home_shell.dart';
import 'screens/lock_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_setup_screen.dart';
import 'widgets/common.dart';

class ZajelApp extends StatelessWidget {
  const ZajelApp({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return MaterialApp(
      title: 'Zajel',
      debugShowCheckedModeBanner: false,
      theme: zajelTheme(),
      darkTheme: zajelTheme(),
      themeMode: ThemeMode.dark,
      locale: app.locale,
      supportedLocales: L10n.supported,
      localizationsDelegates: L10n.delegates,
      localeResolutionCallback: (device, supported) {
        if (app.locale != null) return app.locale;
        for (final l in supported) {
          if (l.languageCode == device?.languageCode) return l;
        }
        return const Locale('en');
      },
      builder: (context, child) => _LockGate(child: child ?? const SizedBox()),
      home: const _AuthGate(),
    );
  }
}

class _LockGate extends StatelessWidget {
  const _LockGate({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    final lock = context.watch<LockService>();
    final signedIn = FirebaseAuth.instance.currentUser != null;
    return Stack(children: [
      child,
      if (lock.locked && signedIn) const Positioned.fill(child: LockScreen()),
    ]);
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();
  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  String? _adoptedFor;

  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    if (s.authLoading) return const _Splash();
    if (s.user == null) return const AuthScreen();
    if (s.error != null) return _Splash(error: s.error.toString());
    if (s.meLoading) return const _Splash();
    final me = s.me;
    if (me == null) return const ProfileSetupScreen();
    if (me.banned) return const _Banned();
    final app = context.read<AppState>();
    if (_adoptedFor != s.user!.uid) {
      _adoptedFor = s.user!.uid;
      if (!app.hasChosenLanguage) WidgetsBinding.instance.addPostFrameCallback((_) => app.setLanguage(me.lang));
    }
    // Welcome pages for new accounts only (existing users updating the app are not shown them).
    final isNew = me.createdAt == null || DateTime.now().difference(me.createdAt!).inDays < 2;
    if (isNew && !context.watch<AppState>().onboarded) return OnboardingScreen(onDone: app.setOnboarded);
    return HomeShell(key: ValueKey(s.user!.uid));
  }
}

class _Splash extends StatelessWidget {
  const _Splash({this.error});
  final String? error;
  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: kNight,
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Image.asset('assets/img/bird.png', width: 150),
            const SizedBox(height: 16),
            if (error == null)
              const CircularProgressIndicator(color: Colors.white)
            else
              Padding(padding: const EdgeInsets.all(24), child: Text(error!, style: const TextStyle(color: Colors.white70), textAlign: TextAlign.center)),
          ]),
        ),
      );
}

class _Banned extends StatelessWidget {
  const _Banned();
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.block, size: 56, color: kRed),
              const SizedBox(height: 16),
              Text(context.t('banned_title'), style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(context.t('banned_body'), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton(onPressed: () => FirebaseAuth.instance.signOut(), child: Text(context.t('sign_out'))),
            ]),
          ),
        ),
      );
}
