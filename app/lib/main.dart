import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/app_state.dart';
import 'core/billing.dart';
import 'core/errors.dart';
import 'core/lock.dart';
import 'core/models.dart';
import 'core/session.dart';
import 'firebase_options.dart';

@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage m) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);
  ErrorReporter.init();
  final app = AppState();
  await Future.wait([app.init(), LockService.instance.load(), Countries.load()]);
  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider.value(value: app),
      ChangeNotifierProvider(create: (_) => Session()..start()),
      ChangeNotifierProvider.value(value: LockService.instance),
      ChangeNotifierProvider(create: (_) => Billing()),
    ],
    child: const ZajelApp(),
  ));
}
