import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import 'models.dart';

/// Signed-in user and their live account document, available to every screen and route.
class Session extends ChangeNotifier {
  User? user;
  Me? me;
  bool authLoading = true;
  bool meLoading = false;
  Object? error;
  StreamSubscription<User?>? _auth;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _doc;

  void start() {
    _auth = FirebaseAuth.instance.authStateChanges().listen((u) {
      user = u;
      authLoading = false;
      _doc?.cancel();
      me = null;
      error = null;
      meLoading = u != null;
      if (u != null) {
        _doc = FirebaseFirestore.instance.doc('users/${u.uid}').snapshots().listen((s) {
          me = s.exists ? Me(s.data()!) : null;
          meLoading = false;
          notifyListeners();
        }, onError: (Object e) {
          error = e;
          meLoading = false;
          notifyListeners();
        });
      }
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _auth?.cancel();
    _doc?.cancel();
    super.dispose();
  }
}

extension MeX on BuildContext {
  /// The current account; an empty placeholder during sign-out transitions.
  Me get me => this.watch<Session>().me ?? Me(const {});
  Me get meNow => this.read<Session>().me ?? Me(const {});
}
