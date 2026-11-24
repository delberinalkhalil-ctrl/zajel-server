import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/i18n.dart';
import '../core/models.dart';

/// The attachment part of a chat bubble: a photo, a voice message or a file.
class MessageMedia extends StatelessWidget {
  const MessageMedia({super.key, required this.media, required this.fg});
  final MsgMedia media;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    switch (media.kind) {
      case 'image':
        return _Photo(media: media);
      case 'audio':
        return VoicePlayer(url: media.url, length: media.dur, fg: fg);
      default:
        return _FileTile(media: media, fg: fg);
    }
  }
}

class _Photo extends StatelessWidget {
  const _Photo({required this.media});
  final MsgMedia media;

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width * .62;
    final aspect = (media.aspect ?? 1).clamp(.6, 1.8);
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PhotoViewer(url: media.url))),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: w,
          height: w / aspect,
          child: Image.network(
            media.url,
            fit: BoxFit.cover,
            cacheWidth: 900,
            loadingBuilder: (c, child, p) => p == null ? child : const ColoredBox(color: Colors.black12, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
            errorBuilder: (c, e, s) => const ColoredBox(color: Colors.black12, child: Center(child: Icon(Icons.broken_image_outlined))),
          ),
        ),
      ),
    );
  }
}

/// Full-screen photo with pinch-to-zoom.
class PhotoViewer extends StatelessWidget {
  const PhotoViewer({super.key, required this.url});
  final String url;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: InteractiveViewer(maxScale: 5, child: Center(child: Image.network(url, fit: BoxFit.contain))),
    );
  }
}

class _FileTile extends StatelessWidget {
  const _FileTile({required this.media, required this.fg});
  final MsgMedia media;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    final ext = media.name.contains('.') ? media.name.split('.').last.toUpperCase() : '';
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => launchUrl(Uri.parse(media.url), mode: LaunchMode.externalApplication),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: fg.withValues(alpha: .15), borderRadius: BorderRadius.circular(10)),
            child: Center(child: ext.isEmpty || ext.length > 4 ? Icon(Icons.insert_drive_file_outlined, color: fg) : Text(ext, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 11))),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(media.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: fg, fontWeight: FontWeight.w600)),
              Text('${fileSize(media.size)} · ${context.t('open_file')}', style: TextStyle(color: fg.withValues(alpha: .75), fontSize: 12)),
            ]),
          ),
        ]),
      ),
    );
  }
}

String fileSize(int b) {
  if (b <= 0) return '';
  if (b < 1024) return '$b B';
  if (b < 1024 * 1024) return '${(b / 1024).toStringAsFixed(0)} KB';
  return '${(b / 1024 / 1024).toStringAsFixed(1)} MB';
}

String clock(Duration d) {
  final s = d.inSeconds;
  return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
}

/// Play / pause button with a progress bar for a voice message.
class VoicePlayer extends StatefulWidget {
  const VoicePlayer({super.key, required this.url, required this.length, required this.fg});
  final String url;
  final Duration length;
  final Color fg;
  @override
  State<VoicePlayer> createState() => _VoicePlayerState();
}

class _VoicePlayerState extends State<VoicePlayer> {
  AudioPlayer? _p;
  final List<StreamSubscription<Object?>> _subs = [];
  bool _playing = false;
  Duration _pos = Duration.zero;
  late Duration _len = widget.length;

  AudioPlayer _player() {
    final p = _p;
    if (p != null) return p;
    final n = _p = AudioPlayer();
    _subs.add(n.onPositionChanged.listen((d) => setState(() => _pos = d)));
    _subs.add(n.onDurationChanged.listen((d) => setState(() => _len = d)));
    _subs.add(n.onPlayerStateChanged.listen((s) => setState(() => _playing = s == PlayerState.playing)));
    _subs.add(n.onPlayerComplete.listen((_) => setState(() { _playing = false; _pos = Duration.zero; })));
    return n;
  }

  Future<void> _toggle() async {
    final p = _player();
    if (_playing) {
      await p.pause();
    } else if (_pos > Duration.zero) {
      await p.resume();
    } else {
      await p.play(UrlSource(widget.url));
    }
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    _p?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fg = widget.fg;
    final total = _len.inMilliseconds > 0 ? _len : const Duration(seconds: 1);
    final v = (_pos.inMilliseconds / total.inMilliseconds).clamp(0.0, 1.0);
    return SizedBox(
      width: 220,
      child: Row(children: [
        IconButton(
          onPressed: _toggle,
          icon: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_fill, color: fg, size: 38),
          padding: EdgeInsets.zero,
        ),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            SliderTheme(
              data: SliderThemeData(trackHeight: 3, thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6), overlayShape: SliderComponentShape.noOverlay),
              child: Slider(
                value: v,
                activeColor: fg,
                inactiveColor: fg.withValues(alpha: .3),
                onChanged: _p == null ? null : (x) => _p!.seek(Duration(milliseconds: (x * total.inMilliseconds).round())),
              ),
            ),
            const SizedBox(height: 4),
            Text(clock(_playing || _pos > Duration.zero ? _pos : _len), style: TextStyle(color: fg.withValues(alpha: .8), fontSize: 12)),
          ]),
        ),
      ]),
    );
  }
}
