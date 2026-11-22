import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

import 'models.dart';

class Place {
  Place(this.loc, this.city, this.country);
  final LatLon loc;
  final String city;
  final String country; // ISO alpha-2, may be empty
}

/// Approximate location (city level). Returns null if the user declines; they can then pick a country by hand.
Future<Place?> currentPlace(String lang) async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return null;
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 20)),
    );
    var city = '', cc = '';
    try {
      await setLocaleIdentifier(lang);
      final pm = await placemarkFromCoordinates(pos.latitude, pos.longitude);
      if (pm.isNotEmpty) {
        final p = pm.first;
        city = [p.locality, p.subAdministrativeArea, p.administrativeArea]
            .firstWhere((e) => e != null && e.isNotEmpty, orElse: () => '')!;
        cc = (p.isoCountryCode ?? '').toUpperCase();
      }
    } catch (_) {}
    return Place(LatLon(pos.latitude, pos.longitude), city, cc);
  } catch (_) {
    return null;
  }
}
