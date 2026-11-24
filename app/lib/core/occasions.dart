/// Days the app suggests a letter for. Fixed-date days repeat every year; Eid dates follow the lunar
/// calendar, so they are listed per year (an estimate: they can move by a day with the moon sighting).
class Occasion {
  const Occasion(this.id, this.month, this.day, {this.year});
  final String id;
  final int month;
  final int day;
  final int? year;

  /// i18n keys: occ_<id> is the name, occ_<id>_msg a ready letter for the day.
  String get nameKey => 'occ_$id';
  String get msgKey => 'occ_${id}_msg';
}

class Occasions {
  static const all = [
    Occasion('new_year', 1, 1),
    Occasion('fraternity', 2, 4),
    Occasion('mother_lang', 2, 21),
    Occasion('nowruz', 3, 21),
    Occasion('earth', 4, 22),
    Occasion('friendship', 7, 30),
    Occasion('peace', 9, 21),
    Occasion('post', 10, 9),
    Occasion('kindness', 11, 13),
    Occasion('christmas', 12, 25),
    Occasion('eid_fitr', 3, 20, year: 2026),
    Occasion('eid_adha', 5, 27, year: 2026),
    Occasion('eid_fitr', 3, 10, year: 2027),
    Occasion('eid_adha', 5, 16, year: 2027),
  ];

  /// Occasions from [before] days ago to [after] days ahead of [now], nearest first.
  static List<Occasion> near(DateTime now, {int before = 1, int after = 5}) {
    final today = DateTime(now.year, now.month, now.day);
    final out = <(int, Occasion)>[];
    for (final o in all) {
      for (final y in o.year != null ? [o.year!] : [now.year - 1, now.year, now.year + 1]) {
        final d = DateTime(y, o.month, o.day).difference(today).inDays;
        if (d >= -before && d <= after) out.add((d.abs(), o));
      }
    }
    out.sort((a, b) => a.$1.compareTo(b.$1));
    return [for (final e in out) e.$2];
  }

  /// Ready-made opening letters (i18n keys ready_1 … ready_8).
  static const ready = ['ready_1', 'ready_2', 'ready_3', 'ready_4', 'ready_5', 'ready_6', 'ready_7', 'ready_8'];
}

/// World regions, the same codes as the server (regions.ts).
const kRegions = ['AF', 'AS', 'EU', 'NA', 'SA', 'OC'];
