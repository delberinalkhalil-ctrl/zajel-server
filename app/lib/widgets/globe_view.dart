import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../core/models.dart';

/// One pigeon on the globe. Times are epoch milliseconds.
class GlobeFlight {
  GlobeFlight({required this.id, required this.from, required this.to, required this.toLabel, required this.reveal, required this.km, required this.t0, required this.t1});
  final String id;
  final LatLon from;
  final LatLon to;
  final String toLabel;
  final bool reveal;
  final int km;
  final int t0;
  final int t1;
  Map<String, dynamic> toJson() => {
        'id': id, 'from': from.toMap(), 'to': {...to.toMap(), 'city': toLabel}, 'reveal': reveal, 'km': km, 't0': t0, 't1': t1,
      };
}

class GlobeLanding {
  GlobeLanding(this.id, this.at, this.label, this.t, {this.name = '', this.photo = ''});
  final String id;
  final LatLon at;
  final String label;
  final int t;

  /// The person the pigeon landed with, shown above the landing point.
  final String name;
  final String photo;
  Map<String, dynamic> toJson() => {'id': id, 'lat': at.lat, 'lon': at.lon, 'label': label, 't': t, 'name': name, 'photo': photo};
}

/// The WebGL globe (assets/globe/globe.html) rendered in a WebView. Drag rotates the globe.
class GlobeView extends StatefulWidget {
  const GlobeView({super.key, required this.home, required this.homeLabel, required this.flights, required this.landed});
  final LatLon home;
  final String homeLabel;
  final List<GlobeFlight> flights;
  final List<GlobeLanding> landed;

  @override
  State<GlobeView> createState() => _GlobeViewState();
}

class _GlobeViewState extends State<GlobeView> {
  late final WebViewController _c;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF02060F))
      ..addJavaScriptChannel('Bridge', onMessageReceived: (m) {
        if (m.message == 'ready') {
          _ready = true;
          _push();
        }
      })
      ..loadFlutterAsset('assets/globe/globe.html');
    // Let the globe play the pigeon's sounds (take-off, flight, landing) without waiting for a tap.
    final p = _c.platform;
    if (p is AndroidWebViewController) p.setMediaPlaybackRequiresUserGesture(false);
  }

  @override
  void didUpdateWidget(covariant GlobeView old) {
    super.didUpdateWidget(old);
    _push();
  }

  void _push() {
    if (!_ready) return;
    final state = {
      'home': {'lat': widget.home.lat, 'lon': widget.home.lon, 'label': widget.homeLabel},
      'flights': widget.flights.map((f) => f.toJson()).toList(),
      'landed': widget.landed.map((l) => l.toJson()).toList(),
    };
    _c.runJavaScript('window.zajel && zajel.set(${jsonEncode(state)})');
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(
        controller: _c,
        gestureRecognizers: {Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer())},
      );
}
