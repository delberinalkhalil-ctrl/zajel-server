import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:zajel/core/config.dart';

/// Every language file has exactly the English keys and the same {placeholders}.
void main() {
  Map<String, String> load(String l) =>
      (jsonDecode(File('assets/i18n/$l.json').readAsStringSync()) as Map<String, dynamic>).map((k, v) => MapEntry(k, '$v'));
  final ph = RegExp(r'\{(\w+)\}');
  List<String> holders(String s) => ph.allMatches(s).map((m) => m.group(1)!).toList()..sort();

  final en = load('en');
  for (final l in Cfg.langs) {
    test('i18n $l', () {
      final m = load(l);
      expect(m.keys.toSet(), en.keys.toSet());
      for (final k in en.keys) {
        expect(holders(m[k]!), holders(en[k]!), reason: '$l.$k');
      }
    });
  }

  test('every key used in the code exists', () {
    final used = <String>{};
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'))) {
      used.addAll(RegExp(r"\bt\(\s*'([a-z0-9_\-]+)'").allMatches(f.readAsStringSync()).map((m) => m.group(1)!));
    }
    expect(used.difference(en.keys.toSet()), isEmpty);
  });

  test('countries have names in every language', () {
    final list = jsonDecode(File('assets/countries.json').readAsStringSync()) as List;
    expect(list.length, greaterThan(150));
    for (final c in list) {
      for (final l in Cfg.langs) {
        expect((c['n'] as Map)[l], isNotNull, reason: '${c['c']} $l');
      }
    }
  });
}
