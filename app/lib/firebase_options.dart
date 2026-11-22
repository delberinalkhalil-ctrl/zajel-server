// Firebase project zajel-9766b. Re-run `flutterfire configure` to regenerate (for example after adding iOS).
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError('Only Android is configured. Run `flutterfire configure` to add iOS.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBROvxHfUPHuFepxC6UzuWwRq0IHk-TId8',
    appId: '1:419463403470:android:e66c80c92a7484174fbd9f',
    messagingSenderId: '419463403470',
    projectId: 'zajel-9766b',
    storageBucket: 'zajel-9766b.firebasestorage.app',
  );
}
