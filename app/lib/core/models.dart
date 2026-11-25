import 'dart:convert';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart';

import 'config.dart';

class LatLon {
  const LatLon(this.lat, this.lon);
  final double lat;
  final double lon;

  static LatLon? from(dynamic m) {
    if (m is Map && m['lat'] is num && m['lon'] is num) {
      return LatLon((m['lat'] as num).toDouble(), (m['lon'] as num).toDouble());
    }
    return null;
  }

  Map<String, double> toMap() => {'lat': lat, 'lon': lon};

  int kmTo(LatLon b) {
    const r = 6371.0, d = math.pi / 180;
    final dLat = (b.lat - lat) * d, dLon = (b.lon - lon) * d;
    final h = math.pow(math.sin(dLat / 2), 2) + math.cos(lat * d) * math.cos(b.lat * d) * math.pow(math.sin(dLon / 2), 2);
    return (2 * r * math.asin(math.min(1.0, math.sqrt(h)))).round();
  }
}

DateTime? _ts(dynamic v) => v is Timestamp ? v.toDate() : null;
Map<String, String> _sm(dynamic v) =>
    v is Map ? v.map((k, val) => MapEntry(k.toString(), val.toString())) : <String, String>{};
String _s(dynamic v) => v is String ? v : '';

String todayUtc() {
  final n = DateTime.now().toUtc();
  return '${n.year.toString().padLeft(4, '0')}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
}

/// The signed-in user's private account (users/{uid}).
class Me {
  Me(this.d);
  final Map<String, dynamic> d;

  String get name => _s(d['name']);
  String get lang => _s(d['lang']).isEmpty ? 'en' : _s(d['lang']);
  String get country => _s(d['country']);
  String get countryName => _s(d['countryName']);
  String get city => _s(d['city']);
  LatLon get loc => LatLon.from(d['loc']) ?? const LatLon(0, 0);
  int get points => (d['points'] as num?)?.toInt() ?? 0;
  DateTime? get vipUntil => _ts(d['vipUntil']);
  bool get vip => vipUntil != null && vipUntil!.isAfter(DateTime.now());
  int get freeToday =>
      _s(d['freeDate']) == todayUtc() ? ((d['freeLeft'] as num?)?.toInt() ?? 0) : (Cfg.storeEnabled ? Cfg.freePerDay : Cfg.freeModeDailyPigeons);
  bool get receiving => d['receiving'] != false;
  bool get banned => d['banned'] == true;
  List<String> get blocked => (d['blocked'] as List?)?.map((e) => e.toString()).toList() ?? const [];
  Map<String, dynamic> get settings => (d['settings'] as Map?)?.cast<String, dynamic>() ?? const {};
  bool setting(String k, [bool def = true]) => settings[k] is bool ? settings[k] as bool : def;
  String get calls => settings['calls'] is String ? settings['calls'] as String : 'all';
  /// Globe animation level: full, light (fewer particles, no clouds) or off (still picture).
  String get effects => settings['effects'] is String ? settings['effects'] as String : 'full';
  /// Colour of my 3D pigeon (white, black, blue, gold). Gold only while VIP.
  String get pigeonColor {
    final c = settings['pigeonColor'] is String ? settings['pigeonColor'] as String : 'white';
    return c == 'gold' && !vip ? 'white' : c;
  }
  /// Optional, private: used only to match pigeons when [genderMatch] is on.
  String get gender => _s(d['gender']);
  bool get genderMatch => d['genderMatch'] == true;
  int get birthYear => (d['birthYear'] as num?)?.toInt() ?? 0;
  DateTime? get restrictedUntil => _ts(d['restrictedUntil']);
  bool get restricted => restrictedUntil != null && restrictedUntil!.isAfter(DateTime.now());
  /// A moderator's message: {kind: warn|restrict, note, until?, seen?}.
  Map<String, dynamic>? get notice => d['notice'] is Map ? Map<String, dynamic>.from(d['notice'] as Map) : null;
}

/// Public card (profiles/{uid}).
class Profile {
  Profile(this.id, this.d);
  final String id;
  final Map<String, dynamic> d;

  String get name => _s(d['name']).isEmpty ? '…' : _s(d['name']);
  String get photoUrl => _s(d['photoUrl']);
  String get bio => _s(d['bio']);
  String get city => _s(d['city']);
  String get country => _s(d['country']);
  String get countryName => _s(d['countryName']);
  String get lang => _s(d['lang']);
  bool get vip => d['vip'] == true;
  bool get badge => d['badge'] != false;
  String get place => [city, countryName].where((e) => e.isNotEmpty).join(', ');
  /// Minutes from UTC on this person's phone, when known.
  int? get tz => (d['tz'] as num?)?.toInt();
  bool get showAchievements => d['showAchievements'] != false;
}

class Pigeon {
  Pigeon(this.id, this.d);
  final String id;
  final Map<String, dynamic> d;

  String get from => _s(d['from']);
  String get fromName => _s(d['fromName']);
  String get fromCity => _s(d['fromCity']);
  String get fromCountry => _s(d['fromCountry']);
  String get fromCountryName => _s(d['fromCountryName']);
  LatLon get fromLoc => LatLon.from(d['fromLoc']) ?? const LatLon(0, 0);
  LatLon get originLoc => LatLon.from(d['originLoc']) ?? fromLoc;
  String get text => _s(d['text']);
  bool get fast => d['fast'] == true;
  String? get wantCountry => d['wantCountry'] as String?;
  String get status => _s(d['status']);
  String? get toUid => d['toUid'] as String?;
  String get toName => _s(d['toName']);
  String get toCity => _s(d['toCity']);
  String get toCountryName => _s(d['toCountryName']);
  LatLon? get toLoc => LatLon.from(d['toLoc']);
  int get km => (d['km'] as num?)?.toInt() ?? 0;
  DateTime? get departAt => _ts(d['departAt']);
  DateTime? get arriveAt => _ts(d['arriveAt']);
  DateTime? get landedAt => _ts(d['landedAt']);
  DateTime? get createdAt => _ts(d['createdAt']);
  Map<String, String> get tr => _sm(d['tr']);
  String get src => _s(d['src']);
  String? get chatId => d['chatId'] as String?;
  String textFor(String lang) => tr[lang] ?? text;

  double get progress {
    final a = departAt, b = arriveAt;
    if (a == null || b == null) return 0;
    final total = b.difference(a).inMilliseconds;
    if (total <= 0) return 1;
    return (DateTime.now().difference(a).inMilliseconds / total).clamp(0.0, 1.0);
  }
}

class ChatInfo {
  ChatInfo(this.id, this.d);
  final String id;
  final Map<String, dynamic> d;

  List<String> get members => (d['members'] as List?)?.map((e) => e.toString()).toList() ?? const [];
  String other(String me) => members.firstWhere((m) => m != me, orElse: () => '');
  int unread(String uid) => ((d['unread'] as Map?)?[uid] as num?)?.toInt() ?? 0;
  DateTime? readAt(String uid) => _ts((d['readAt'] as Map?)?[uid]);
  DateTime? deliveredAt(String uid) => _ts((d['deliveredAt'] as Map?)?[uid]);
  Map<String, dynamic> get last => (d['last'] as Map?)?.cast<String, dynamic>() ?? const {};
  String lastText(String lang) => _sm(last['tr'])[lang] ?? _s(last['text']);
  String get lastFrom => _s(last['from']);
  DateTime? get lastAt => _ts(last['at']);
  DateTime? get updatedAt => _ts(d['updatedAt']);
  int get messageCount => (d['messageCount'] as num?)?.toInt() ?? 0;
  bool get blocked => d['blocked'] == true;
  int get routeKm => (((d['route'] as Map?)?['km']) as num?)?.toInt() ?? 0;
  /// Disappearing messages: 0 (off), 24 or 168 hours.
  int get ttlH => (d['ttlH'] as num?)?.toInt() ?? 0;
}

class Msg {
  Msg(this.id, this.d);
  final String id;
  final Map<String, dynamic> d;

  String get from => _s(d['from']);
  String get text => _s(d['text']);
  String get src => _s(d['src']);
  Map<String, String> get tr => _sm(d['tr']);
  DateTime? get at => _ts(d['at']);
  bool get pigeon => d['pigeon'] == true;
  bool get deleted => d['deleted'] == true;
  /// System line in the chat, e.g. "ttl" when disappearing messages were changed.
  String get system => _s(d['system']);
  int get hours => (d['hours'] as num?)?.toInt() ?? 0;
  DateTime? get expireAt => _ts(d['expireAt']);
  /// The quoted message when this is a reply: {id, from, text, media?}.
  Map<String, dynamic>? get replyTo => d['replyTo'] is Map ? Map<String, dynamic>.from(d['replyTo'] as Map) : null;

  /// Attachment: null for a plain text message.
  MsgMedia? get media => d['media'] is Map ? MsgMedia(Map<String, dynamic>.from(d['media'] as Map)) : null;
}

class MsgMedia {
  MsgMedia(this.d);
  final Map<String, dynamic> d;
  String get kind => _s(d['kind']);
  String get url => _s(d['url']);
  String get name => _s(d['name']);
  int get size => (d['size'] as num?)?.toInt() ?? 0;
  Duration get dur => Duration(milliseconds: (d['dur'] as num?)?.toInt() ?? 0);
  double? get aspect {
    final w = (d['w'] as num?)?.toDouble(), h = (d['h'] as num?)?.toDouble();
    return w != null && h != null && w > 0 && h > 0 ? w / h : null;
  }
}

class CallInfo {
  CallInfo(this.id, this.d);
  final String id;
  final Map<String, dynamic> d;

  String get from => _s(d['from']);
  String get to => _s(d['to']);
  bool get video => d['type'] == 'video';
  String get status => _s(d['status']);
  DateTime? get createdAt => _ts(d['createdAt']);
}

class Country {
  Country(this.code, this.lat, this.lon, this.names);
  final String code;
  final double lat;
  final double lon;
  final Map<String, String> names;
  String name(String lang) => names[lang] ?? names['en'] ?? code;
  LatLon get loc => LatLon(lat, lon);
}

class Countries {
  static List<Country> all = [];

  static Future<void> load() async {
    final raw = jsonDecode(await rootBundle.loadString('assets/countries.json')) as List;
    all = raw.map((e) {
      final m = e as Map<String, dynamic>;
      return Country(m['c'] as String, (m['lat'] as num).toDouble(), (m['lon'] as num).toDouble(),
          (m['n'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())));
    }).toList();
  }

  static Country? byCode(String c) {
    for (final x in all) {
      if (x.code == c) return x;
    }
    return null;
  }

  static List<Country> sorted(String lang) => [...all]..sort((a, b) => a.name(lang).compareTo(b.name(lang)));
}
