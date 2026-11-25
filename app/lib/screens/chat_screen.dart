import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/chat_media.dart';
import '../widgets/common.dart';
import 'call_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.chatId});
  final String chatId;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final Stream<ChatInfo?> _chat = Api.chat(widget.chatId);
  late final Stream<List<Msg>> _msgs = Api.messages(widget.chatId);
  final _input = TextEditingController();
  final Set<String> _orig = {};
  bool _sending = false;
  String? _lastReadFor;
  ChatInfo? _chatNow;

  /// The message being replied to, shown above the input.
  Msg? _replyTo;
  /// Messages that could not be sent, kept so they can be retried.
  final List<String> _failed = [];
  /// Search inside the loaded conversation.
  bool _searching = false;
  final _search = TextEditingController();

  // voice message recording
  final AudioRecorder _rec = AudioRecorder();
  bool _recording = false;
  DateTime? _recStart;
  Timer? _recTick;
  Duration _recLen = Duration.zero;

  @override
  void dispose() {
    _recTick?.cancel();
    _rec.dispose();
    _input.dispose();
    _search.dispose();
    super.dispose();
  }

  /// Photos, voice messages and files unlock after a few messages, so strangers cannot open with them.
  bool _mediaReady() {
    if ((_chatNow?.messageCount ?? 0) >= Cfg.mediaAfterMessages) return true;
    showInfo(context, context.t('err_media_need_messages'));
    return false;
  }

  Future<void> _attach() async {
    if (_sending || !_mediaReady()) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(c.t('attach_photo')), onTap: () => Navigator.pop(c, 'gallery')),
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(c.t('attach_camera')), onTap: () => Navigator.pop(c, 'camera')),
          ListTile(leading: const Icon(Icons.attach_file), title: Text(c.t('attach_file')), onTap: () => Navigator.pop(c, 'file')),
        ]),
      ),
    );
    if (choice == null || !mounted) return;
    if (choice == 'file') {
      await _pickFile();
    } else {
      await _pickPhoto(choice == 'camera' ? ImageSource.camera : ImageSource.gallery);
    }
  }

  Future<void> _pickPhoto(ImageSource src) async {
    final x = await ImagePicker().pickImage(source: src, maxWidth: 2048, maxHeight: 2048, imageQuality: 82);
    if (x == null) return;
    final bytes = await x.readAsBytes();
    final extra = <String, Object>{};
    try {
      final img = await decodeImageFromList(bytes);
      extra['w'] = img.width;
      extra['h'] = img.height;
      img.dispose();
    } catch (_) {/* the size is optional */}
    final mime = x.mimeType ?? (x.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    await _sendMedia('image', bytes, mime, extra: extra);
  }

  Future<void> _pickFile() async {
    final r = await FilePicker.platform.pickFiles(withData: true);
    final f = r?.files.single;
    if (f == null || !mounted) return;
    if (f.size > Cfg.maxMediaBytes) {
      showInfo(context, context.t('err_file_too_big'));
      return;
    }
    final bytes = f.bytes ?? (f.path != null ? await File(f.path!).readAsBytes() : null);
    if (bytes == null) return;
    await _sendMedia('file', bytes, '', name: f.name);
  }

  Future<void> _sendMedia(String kind, Uint8List bytes, String mime, {String name = '', Map<String, Object> extra = const {}}) async {
    setState(() => _sending = true);
    try {
      final url = await Api.uploadMedia(widget.chatId, kind, bytes, mime, name: name);
      final caption = kind == 'audio' ? '' : _input.text.trim();
      await Api.call('sendMessage', {
        'chatId': widget.chatId,
        'text': caption,
        'media': {'kind': kind, 'url': url, 'size': bytes.length, if (name.isNotEmpty) 'name': name, ...extra},
      });
      if (caption.isNotEmpty) _input.clear();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _startVoice() async {
    if (_sending || _recording || !_mediaReady()) return;
    if (!await _rec.hasPermission()) {
      if (mounted) showInfo(context, context.t('mic_denied'));
      return;
    }
    final dir = await getTemporaryDirectory();
    await _rec.start(
      const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000, sampleRate: 44100, numChannels: 1),
      path: '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a',
    );
    _recStart = DateTime.now();
    _recTick = Timer.periodic(const Duration(milliseconds: 250), (_) {
      final d = DateTime.now().difference(_recStart!);
      if (mounted) setState(() => _recLen = d);
      if (d >= const Duration(minutes: 5)) _stopVoice(send: true);
    });
    setState(() => _recording = true);
  }

  Future<void> _stopVoice({required bool send}) async {
    if (!_recording) return;
    _recTick?.cancel();
    _recTick = null;
    final len = _recStart == null ? Duration.zero : DateTime.now().difference(_recStart!);
    final path = await _rec.stop();
    if (mounted) {
      setState(() {
        _recording = false;
        _recLen = Duration.zero;
      });
    }
    if (path == null) return;
    final f = File(path);
    try {
      if (send && len >= const Duration(milliseconds: 800)) {
        await _sendMedia('audio', await f.readAsBytes(), 'audio/mp4', name: 'voice.m4a', extra: {'dur': len.inMilliseconds});
      }
    } finally {
      if (await f.exists()) await f.delete();
    }
  }

  void _markRead(List<Msg> msgs) {
    if (msgs.isEmpty || msgs.first.id == _lastReadFor) return;
    _lastReadFor = msgs.first.id;
    Api.call('markRead', {'chatId': widget.chatId}).ignore();
  }

  Future<void> _send([String? retry]) async {
    final text = retry ?? _input.text.trim();
    if (text.isEmpty || _sending) return;
    final reply = retry == null ? _replyTo : null;
    setState(() {
      _sending = true;
      if (retry != null) _failed.remove(retry);
    });
    try {
      await Api.call('sendMessage', {'chatId': widget.chatId, 'text': text, if (reply != null) 'replyTo': reply.id});
      if (retry == null) {
        _input.clear();
        _replyTo = null;
      }
    } catch (e) {
      // A network problem keeps the message so it can be sent again; a refusal (blocked, moderation) is shown.
      if (e is ApiException && e.code == 'unavailable') {
        if (retry == null) _input.clear();
        _failed.add(text);
      } else if (mounted) {
        showError(context, e);
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Long press on a message: reply, copy, delete (own messages only).
  Future<void> _messageMenu(Msg m, String shown) async {
    if (m.deleted || m.system.isNotEmpty) return;
    final mine = m.from == Api.uid;
    final a = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.reply), title: Text(c.t('reply')), onTap: () => Navigator.pop(c, 'reply')),
          if (shown.isNotEmpty) ListTile(leading: const Icon(Icons.copy), title: Text(c.t('copy')), onTap: () => Navigator.pop(c, 'copy')),
          if (mine && !m.pigeon)
            ListTile(leading: const Icon(Icons.delete_outline, color: kRed), title: Text(c.t('delete_for_both')), onTap: () => Navigator.pop(c, 'delete')),
        ]),
      ),
    );
    if (!mounted || a == null) return;
    switch (a) {
      case 'reply':
        setState(() => _replyTo = m);
      case 'copy':
        await Clipboard.setData(ClipboardData(text: shown));
        if (mounted) showInfo(context, context.t('copied'));
      case 'delete':
        final ok = await _confirm(context.t('delmsg_q'), context.t('delmsg_body'));
        if (ok != true) return;
        try {
          await Api.call('deleteMessage', {'chatId': widget.chatId, 'id': m.id});
        } catch (e) {
          if (mounted) showError(context, e);
        }
    }
  }

  Future<void> _setTtl(int current) async {
    final h = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 8), child: Text(c.t('ttl_body'), style: Theme.of(c).textTheme.bodySmall)),
          for (final v in [0, 24, 168])
            ListTile(
              leading: Icon(v == current ? Icons.radio_button_checked : Icons.radio_button_off, color: kGold),
              title: Text(c.t('ttl_$v')),
              onTap: () => Navigator.pop(c, v),
            ),
        ]),
      ),
    );
    if (h == null || h == current) return;
    try {
      await Api.call('setChatTtl', {'chatId': widget.chatId, 'hours': h});
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _call(Profile other, bool video) async {
    final me = context.meNow;
    final cost = video ? Cfg.costVideo : Cfg.costVoice;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(c.t(video ? 'video_call_with' : 'voice_call_with', {'name': other.name})),
        content: Text(!Cfg.storeEnabled
            ? c.t('call_translation_note')
            : '${c.t('call_translation_note')}\n\n${me.vip ? c.t('call_free_vip') : c.t('call_cost', {'n': cost, 'have': me.points})}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(c.t('cancel'))),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(c.t('call_now'))),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final r = await Api.call('startCall', {'chatId': widget.chatId, 'type': video ? 'video' : 'voice'});
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => CallScreen(
          callId: r['callId'] as String, channel: r['channel'] as String, token: r['token'] as String,
          appId: r['appId'] as String, uid: (r['uid'] as num).toInt(), video: video, other: other, outgoing: true,
        ),
      ));
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _menu(String action, Profile other) async {
    if (action == 'block') {
      final ok = await _confirm(context.t('block_q', {'name': other.name}), context.t('block_body'));
      if (ok != true) return;
      try {
        await Api.call('blockUser', {'uid': other.id});
        if (mounted) showInfo(context, context.t('blocked_done'));
      } catch (e) {
        if (mounted) showError(context, e);
      }
    } else if (action == 'delete_chat') {
      final ok = await _confirm(context.t('delete_chat_q', {'name': other.name}), context.t('delete_chat_body'));
      if (ok != true) return;
      try {
        await Api.call('deleteChat', {'chatId': widget.chatId});
        if (!mounted) return;
        showInfo(context, context.t('chat_deleted'));
        Navigator.of(context).maybePop();
      } catch (e) {
        if (mounted) showError(context, e);
      }
    } else if (action == 'ttl') {
      await _setTtl(_chatNow?.ttlH ?? 0);
    } else if (action == 'search') {
      setState(() => _searching = true);
    } else if (action == 'report') {
      if (!mounted) return;
      final reason = await showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        builder: (c) => SafeArea(
          child: ListView(shrinkWrap: true, children: [
            Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(c.t('report_why'), style: Theme.of(c).textTheme.titleMedium)),
            for (final r in ['spam', 'scam', 'sexual', 'harassment', 'underage', 'fake', 'other'])
              ListTile(title: Text(c.t('reason_$r')), onTap: () => Navigator.pop(c, r)),
          ]),
        ),
      );
      if (reason == null) return;
      try {
        await Api.call('reportUser', {'uid': other.id, 'reason': reason, 'chatId': widget.chatId});
        if (mounted) showInfo(context, context.t('report_done'));
      } catch (e) {
        if (mounted) showError(context, e);
      }
    }
  }

  Future<bool?> _confirm(String title, String body) => showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: Text(c.t('cancel'))),
            FilledButton(style: FilledButton.styleFrom(backgroundColor: kRed), onPressed: () => Navigator.pop(c, true), child: Text(c.t('confirm'))),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final app = context.watch<AppState>();
    return StreamBuilder<ChatInfo?>(
      stream: _chat,
      builder: (context, cs) {
        final chat = cs.data;
        _chatNow = chat;
        final otherId = chat?.other(Api.uid) ?? '';
        return FutureBuilder<Profile>(
          future: otherId.isEmpty ? null : Api.profileOnce(otherId),
          builder: (context, ps) {
            final other = ps.data ?? Profile(otherId, const {});
            final otherLang = Cfg.langNames[other.lang] ?? '';
            return Scaffold(
              appBar: AppBar(
                titleSpacing: 0,
                title: Row(children: [
                  ProfileAvatar(other, size: 38),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(other.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: kTitleFont, fontSize: 17, fontWeight: FontWeight.w700)),
                      Text([other.place, if (other.tz != null) context.t('local_time', {'time': localTime(context, other.tz!)}), if (otherLang.isNotEmpty) context.t('speaks', {'lang': otherLang})].where((e) => e.isNotEmpty).join(' · '),
                          overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
                    ]),
                  ),
                ]),
                actions: [
                  IconButton(tooltip: context.t('voice_call'), onPressed: chat == null || chat.blocked ? null : () => _call(other, false), icon: const Icon(Icons.call_outlined)),
                  IconButton(tooltip: context.t('video_call'), onPressed: chat == null || chat.blocked ? null : () => _call(other, true), icon: const Icon(Icons.videocam_outlined)),
                  PopupMenuButton<String>(
                    onSelected: (a) => _menu(a, other),
                    itemBuilder: (c) => [
                      PopupMenuItem(value: 'search', child: Text(c.t('search_chat'))),
                      PopupMenuItem(value: 'ttl', child: Text(c.t('ttl_title'))),
                      PopupMenuItem(value: 'report', child: Text(c.t('report'))),
                      PopupMenuItem(value: 'delete_chat', child: Text(c.t('delete_chat'), style: const TextStyle(color: kRed))),
                      PopupMenuItem(value: 'block', child: Text(c.t('block'))),
                    ],
                  ),
                ],
              ),
              body: Column(children: [
                if (_searching)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 6, 12, 2),
                    child: TextField(
                      controller: _search,
                      autofocus: true,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: context.t('search_chat'),
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() {
                          _searching = false;
                          _search.clear();
                        })),
                        isDense: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                      ),
                    ),
                  ),
                if (chat != null && chat.ttlH > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.timer_outlined, size: 15, color: kGold),
                      const SizedBox(width: 4),
                      Text(context.t('ttl_on', {'when': context.t('ttl_${chat.ttlH}')}), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kGold)),
                    ]),
                  ),
                if (chat != null && chat.routeKm > 0)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: Text(context.t('route_note', {'km': chat.routeKm}), textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
                  ),
                Expanded(
                  child: StreamBuilder<List<Msg>>(
                    stream: _msgs,
                    builder: (context, ms) {
                      final cleared = _chatNow?.clearedAt(Api.uid);
                      final all = (ms.data ?? const <Msg>[]).where((m) => cleared == null || (m.at ?? DateTime.now()).isAfter(cleared)).toList();
                      WidgetsBinding.instance.addPostFrameCallback((_) => _markRead(all));
                      final q = _search.text.trim().toLowerCase();
                      final msgs = !_searching || q.isEmpty
                          ? all
                          : all.where((m) => !m.deleted && (m.text.toLowerCase().contains(q) || m.tr.values.any((v) => v.toLowerCase().contains(q)))).toList();
                      final failed = _searching ? const <String>[] : _failed.reversed.toList();
                      final seenAt = chat?.readAt(otherId);
                      final gotAt = chat?.deliveredAt(otherId);
                      return ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.all(12),
                        itemCount: failed.length + msgs.length,
                        itemBuilder: (context, i) {
                          if (i < failed.length) {
                            final f = failed[i];
                            return _FailedBubble(text: f, onRetry: _sending ? null : () => _send(f), onDrop: () => setState(() => _failed.remove(f)));
                          }
                          final m = msgs[i - failed.length];
                          if (m.system == 'ttl') {
                            final who = m.from == Api.uid ? context.t('you') : other.name;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Text(
                                context.t(m.hours == 0 ? 'ttl_changed_off' : 'ttl_changed', {'name': who, 'when': context.t('ttl_${m.hours}')}),
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kMuted),
                              ),
                            );
                          }
                          final mine = m.from == Api.uid;
                          final translated = m.tr[me.lang] ?? m.text;
                          final main = mine ? m.text : (app.autoTranslate ? translated : m.text);
                          final alt = mine ? (m.tr[other.lang] ?? '') : (app.autoTranslate ? m.text : translated);
                          final showAlt = (app.showOriginal || _orig.contains(m.id)) && alt.isNotEmpty && alt != main;
                          final tick = !mine || m.at == null
                              ? Tick.none
                              : (seenAt != null && !seenAt.isBefore(m.at!))
                                  ? Tick.read
                                  : (gotAt != null && !gotAt.isBefore(m.at!))
                                      ? Tick.delivered
                                      : Tick.sent;
                          final quote = m.replyTo;
                          return _Bubble(
                            mine: mine,
                            letter: m.pigeon,
                            media: m.deleted ? null : m.media,
                            deleted: m.deleted,
                            quoteName: quote == null ? null : (quote['from'] == Api.uid ? context.t('you') : other.name),
                            quoteText: quote == null ? null : ('${quote['text'] ?? ''}'.isEmpty ? context.t('attachment') : '${quote['text']}'),
                            onLongPress: () => _messageMenu(m, main),
                            text: m.deleted ? context.t('msg_deleted') : main,
                            alt: showAlt ? alt : null,
                            tick: tick,
                            meta: [
                              shortTime(context, m.at),
                              if (m.pigeon) context.t('pigeon_letter'),
                              if (m.expireAt != null) '⏱',
                              if (!mine && m.src.isNotEmpty && m.src != me.lang && app.autoTranslate) context.t('translated'),
                            ].where((e) => e.isNotEmpty).join(' · '),
                            onToggle: () => setState(() => _orig.contains(m.id) ? _orig.remove(m.id) : _orig.add(m.id)),
                            toggleLabel: context.t(showAlt ? 'hide_original' : 'show_original'),
                          );
                        },
                      );
                    },
                  ),
                ),
                if (chat?.blocked == true)
                  SafeArea(top: false, child: Padding(padding: const EdgeInsets.all(16), child: Text(context.t('chat_blocked'))))
                else
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                       if (_replyTo != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsetsDirectional.fromSTEB(12, 6, 4, 6),
                          decoration: BoxDecoration(
                            color: kPanel2,
                            borderRadius: BorderRadius.circular(12),
                            border: const BorderDirectional(start: BorderSide(color: kGold, width: 3)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.reply, size: 18, color: kGold),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _replyTo!.text.isNotEmpty ? (_replyTo!.tr[me.lang] ?? _replyTo!.text) : context.t('attachment'),
                                maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ),
                            IconButton(visualDensity: VisualDensity.compact, icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => _replyTo = null)),
                          ]),
                        ),
                       _recording
                          ? Row(children: [
                              IconButton(tooltip: context.t('cancel'), onPressed: () => _stopVoice(send: false), icon: const Icon(Icons.delete_outline)),
                              const Icon(Icons.fiber_manual_record, color: kRed, size: 14),
                              const SizedBox(width: 6),
                              Expanded(child: Text(context.t('voice_recording', {'time': clock(_recLen)}))),
                              IconButton.filled(style: IconButton.styleFrom(backgroundColor: kRed), onPressed: () => _stopVoice(send: true), icon: const Icon(Icons.send)),
                            ])
                          : Row(children: [
                              IconButton(tooltip: context.t('attach'), onPressed: _sending ? null : _attach, icon: const Icon(Icons.add_circle_outline)),
                              Expanded(
                                child: TextField(
                                  controller: _input,
                                  minLines: 1,
                                  maxLines: 5,
                                  maxLength: Cfg.maxMessageLen,
                                  textInputAction: TextInputAction.newline,
                                  decoration: InputDecoration(
                                    hintText: context.t('message_hint', {'lang': otherLang.isEmpty ? '…' : otherLang}),
                                    counterText: '',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ValueListenableBuilder<TextEditingValue>(
                                valueListenable: _input,
                                builder: (context, v, _) => _sending
                                    ? const IconButton.filled(onPressed: null, icon: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                                    : v.text.trim().isEmpty
                                        ? IconButton.filled(style: IconButton.styleFrom(backgroundColor: kRed), tooltip: context.t('voice_record'), onPressed: _startVoice, icon: const Icon(Icons.mic))
                                        : IconButton.filled(style: IconButton.styleFrom(backgroundColor: kRed), onPressed: () => _send(), icon: const Icon(Icons.send)),
                              ),
                            ]),
                      ]),
                    ),
                  ),
              ]),
            );
          },
        );
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.mine, this.letter = false, this.media, required this.text, required this.alt, required this.meta, this.tick = Tick.none,
    required this.onToggle, required this.toggleLabel, this.deleted = false, this.quoteName, this.quoteText, this.onLongPress,
  });
  final bool mine;
  final bool deleted;
  final String? quoteName;
  final String? quoteText;
  final VoidCallback? onLongPress;
  final bool letter;
  final Tick tick;
  final MsgMedia? media;
  final String text;
  final String? alt;
  final String meta;
  final VoidCallback onToggle;
  final String toggleLabel;

  @override
  Widget build(BuildContext context) {
    final fg = letter ? kInk : kParchment;
    final bg = letter ? kParchment : mine ? kBlue : kPanel2;
    return Align(
      alignment: mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: GestureDetector(
       onLongPress: onLongPress,
       child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .8),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          clipBehavior: Clip.antiAlias,
          padding: EdgeInsets.fromLTRB(media == null ? 12 : 6, letter ? 0 : media == null ? 10 : 6, media == null ? 12 : 6, 4),
          decoration: BoxDecoration(
            color: bg,
            border: mine || letter ? null : Border.all(color: const Color(0x1AFFFFFF)),
            borderRadius: BorderRadiusDirectional.only(
              topStart: const Radius.circular(18), topEnd: const Radius.circular(18),
              bottomStart: Radius.circular(mine ? 18 : 4), bottomEnd: Radius.circular(mine ? 4 : 18),
            ),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (letter) ...[
              const SizedBox(height: 5, width: double.infinity, child: AirmailStripe(height: 5)),
              const SizedBox(height: 8),
            ],
            if (quoteText != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 8, 4),
                decoration: BoxDecoration(
                  color: fg.withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(8),
                  border: BorderDirectional(start: BorderSide(color: letter ? kRed : kGold, width: 3)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(quoteName ?? '', style: TextStyle(color: letter ? kRed : kGold, fontSize: 12, fontWeight: FontWeight.w700)),
                  Text(quoteText!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: fg.withValues(alpha: .8), fontSize: 13)),
                ]),
              ),
            if (media != null) MessageMedia(media: media!, fg: fg),
            if (media != null && text.isNotEmpty) const SizedBox(height: 6),
            if (text.isNotEmpty)
              Text(text, style: TextStyle(color: deleted ? fg.withValues(alpha: .6) : fg, fontSize: deleted ? 14 : 16, height: 1.5, fontStyle: deleted ? FontStyle.italic : null)),
            if (alt != null && !deleted)
              Container(
                margin: const EdgeInsets.only(top: 6),
                padding: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: fg.withValues(alpha: .25)))),
                child: Text(alt!, style: TextStyle(color: fg.withValues(alpha: .8), fontSize: 14)),
              ),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Flexible(child: Text(meta, style: TextStyle(color: fg.withValues(alpha: .7), fontSize: 12))),
              if (tick != Tick.none) Padding(padding: const EdgeInsetsDirectional.only(start: 4), child: TickIcon(tick: tick, color: fg)),
              if (text.isNotEmpty && !deleted) TextButton(
                onPressed: onToggle,
                style: TextButton.styleFrom(foregroundColor: fg.withValues(alpha: .85), padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32), textStyle: const TextStyle(fontSize: 12)),
                child: Text(toggleLabel),
              ),
            ]),
          ]),
        ),
       ),
      ),
    );
  }
}

/// A message that did not reach the server (no connection). Tap to try again.
class _FailedBubble extends StatelessWidget {
  const _FailedBubble({required this.text, required this.onRetry, required this.onDrop});
  final String text;
  final VoidCallback? onRetry;
  final VoidCallback onDrop;
  @override
  Widget build(BuildContext context) => Align(
        alignment: AlignmentDirectional.centerEnd,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .8),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.fromLTRB(12, 10, 6, 4),
            decoration: BoxDecoration(color: kBlue.withValues(alpha: .45), borderRadius: BorderRadius.circular(18), border: Border.all(color: kRed)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(text, style: const TextStyle(color: kParchment, fontSize: 16, height: 1.5)),
              Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.error_outline, size: 16, color: Color(0xFFFF8A94)),
                const SizedBox(width: 4),
                Text(context.t('not_sent'), style: const TextStyle(color: Color(0xFFFF8A94), fontSize: 12)),
                TextButton(onPressed: onRetry, child: Text(context.t('retry'))),
                IconButton(visualDensity: VisualDensity.compact, icon: const Icon(Icons.close, size: 16, color: kMuted), onPressed: onDrop),
              ]),
            ]),
          ),
        ),
      );
}

/// Message state for my own messages: sent (one tick), delivered (two grey ticks), read (two gold ticks).
enum Tick { none, sent, delivered, read }

class TickIcon extends StatelessWidget {
  const TickIcon({super.key, required this.tick, required this.color});
  final Tick tick;
  final Color color;
  @override
  Widget build(BuildContext context) {
    final label = context.t(tick == Tick.read ? 'tick_read' : tick == Tick.delivered ? 'tick_delivered' : 'tick_sent');
    return Semantics(
      label: label,
      child: Icon(
        tick == Tick.sent ? Icons.done : Icons.done_all,
        size: 16,
        color: tick == Tick.read ? const Color(0xFFFFD77A) : color.withValues(alpha: .7),
      ),
    );
  }
}
