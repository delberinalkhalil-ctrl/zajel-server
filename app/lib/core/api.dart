import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'config.dart';
import 'models.dart';

/// Error returned by the Zajel server: [code] is the category, [message] the reason (e.g. "no_points").
class ApiException implements Exception {
  ApiException(this.code, this.message);
  final String code;
  final String message;
  @override
  String toString() => 'ApiException($code, $message)';
}

/// Reads come straight from Firestore (protected by firestore.rules). Every write goes through the Zajel server.
class Api {
  static FirebaseFirestore get fs => FirebaseFirestore.instance;
  static String get uid => FirebaseAuth.instance.currentUser?.uid ?? '';
  static final _http = HttpClient()..connectionTimeout = const Duration(seconds: 15);

  static Future<Map<String, dynamic>> _send(String path, List<int> body, String contentType, {Duration timeout = const Duration(seconds: 40)}) async {
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    try {
      final req = await _http.postUrl(Uri.parse('${Cfg.apiBase}$path'));
      req.headers.set(HttpHeaders.contentTypeHeader, contentType);
      if (token != null) req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      req.add(body);
      final res = await req.close().timeout(timeout);
      final text = await res.transform(utf8.decoder).join();
      final json = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
      final err = json['error'];
      if (res.statusCode >= 400 || err != null) {
        final e = err is Map ? err : const {};
        throw ApiException('${e['code'] ?? 'internal'}', '${e['message'] ?? 'generic'}');
      }
      final r = json['result'];
      return r is Map ? Map<String, dynamic>.from(r) : <String, dynamic>{};
    } on ApiException {
      rethrow;
    } on Exception {
      throw ApiException('unavailable', 'unavailable');
    }
  }

  static Future<Map<String, dynamic>> call(String name, [Map<String, dynamic>? data]) =>
      _send('/call/$name', utf8.encode(jsonEncode({'data': data ?? <String, dynamic>{}})), 'application/json');

  /// Uploads a profile photo; the server stores it and updates the profile. Returns the new URL.
  /// Uploads a chat attachment (kind: image, audio or file) and returns its URL for sendMessage.
  static Future<String> uploadMedia(String chatId, String kind, Uint8List bytes, String mimeType, {String name = ''}) async {
    final q = Uri(queryParameters: {'chatId': chatId, 'kind': kind, 'name': name}).query;
    final r = await _send('/media?$q', bytes, mimeType.isEmpty ? 'application/octet-stream' : mimeType, timeout: const Duration(minutes: 3));
    return '${r['url'] ?? ''}';
  }

  static Future<String> uploadAvatar(Uint8List bytes, String mimeType) async {
    final r = await _send('/avatar', bytes, mimeType);
    return '${r['url'] ?? ''}';
  }

  static Stream<Me?> me() =>
      fs.doc('users/$uid').snapshots().map((s) => s.exists ? Me(s.data()!) : null);

  static final Map<String, Profile> _profiles = {};

  static Stream<Profile> profile(String id) => fs.doc('profiles/$id').snapshots().map((s) {
        final p = Profile(id, s.data() ?? {});
        _profiles[id] = p;
        return p;
      });

  static Future<Profile> profileOnce(String id) async {
    final hit = _profiles[id];
    if (hit != null) return hit;
    final s = await fs.doc('profiles/$id').get();
    return _profiles[id] = Profile(id, s.data() ?? {});
  }

  static Stream<List<Pigeon>> myPigeons() => fs
      .collection('pigeons')
      .where('from', isEqualTo: uid)
      .orderBy('createdAt', descending: true)
      .limit(20)
      .snapshots()
      .map((q) => q.docs.map((d) => Pigeon(d.id, d.data())).toList());

  static Stream<List<Pigeon>> inbox() => fs
      .collection('pigeons')
      .where('toUid', isEqualTo: uid)
      .where('status', isEqualTo: 'landed')
      .orderBy('landedAt', descending: true)
      .limit(30)
      .snapshots()
      .map((q) => q.docs.map((d) => Pigeon(d.id, d.data())).toList());

  static Stream<List<ChatInfo>> chats() => fs
      .collection('chats')
      .where('members', arrayContains: uid)
      .orderBy('updatedAt', descending: true)
      .limit(60)
      .snapshots()
      .map((q) => q.docs.map((d) => ChatInfo(d.id, d.data())).where((c) => !c.hiddenFor(uid)).toList());

  /// My conversation with the Zajel team: unread replies count, and the messages.
  static Stream<int> supportUnread() =>
      fs.doc('support/$uid').snapshots().map((s) => (s.data()?['unreadUser'] as num?)?.toInt() ?? 0);
  static Stream<List<SupportMsg>> supportMessages() => fs
      .collection('support/$uid/messages')
      .orderBy('at', descending: true)
      .limit(150)
      .snapshots()
      .map((q) => q.docs.map((d) => SupportMsg(d.id, d.data())).toList());

  static Stream<ChatInfo?> chat(String id) =>
      fs.doc('chats/$id').snapshots().map((s) => s.exists ? ChatInfo(s.id, s.data()!) : null);

  static Stream<List<Msg>> messages(String chatId) => fs
      .collection('chats/$chatId/messages')
      .orderBy('at', descending: true)
      .limit(150)
      .snapshots()
      .map((q) => q.docs.map((d) => Msg(d.id, d.data())).toList());

  /// The newest call ringing for me. Equality filters only, so no composite index is needed,
  /// and calls older than the ring window are ignored.
  static Stream<CallInfo?> incomingCall() => fs
      .collection('calls')
      .where('to', isEqualTo: uid)
      .where('status', isEqualTo: 'ringing')
      .snapshots()
      .map((q) {
        final fresh = DateTime.now().subtract(const Duration(seconds: 90));
        final calls = q.docs.map((d) => CallInfo(d.id, d.data())).where((c) => c.createdAt != null && c.createdAt!.isAfter(fresh)).toList()
          ..sort((a, b) => b.createdAt!.compareTo(a.createdAt!));
        return calls.isEmpty ? null : calls.first;
      });

  /// Banner set on the admin page: {text, tr, until} or null when there is none.
  static Stream<Map<String, dynamic>?> announcement() => fs.doc('config/announcement').snapshots().map((s) {
        final d = s.data();
        if (d == null || d['active'] != true) return null;
        final until = d['until'];
        if (until is Timestamp && until.toDate().isBefore(DateTime.now())) return null;
        return d;
      });

  static Stream<CallInfo?> callDoc(String id) =>
      fs.doc('calls/$id').snapshots().map((s) => s.exists ? CallInfo(s.id, s.data()!) : null);
}
