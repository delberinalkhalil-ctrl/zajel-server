import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
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

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _markRead(List<Msg> msgs) {
    if (msgs.isEmpty || msgs.first.id == _lastReadFor) return;
    _lastReadFor = msgs.first.id;
    Api.call('markRead', {'chatId': widget.chatId}).ignore();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await Api.call('sendMessage', {'chatId': widget.chatId, 'text': text});
      _input.clear();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
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
                      Text(other.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      Text([other.place, if (otherLang.isNotEmpty) context.t('speaks', {'lang': otherLang})].where((e) => e.isNotEmpty).join(' · '),
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
                      PopupMenuItem(value: 'report', child: Text(c.t('report'))),
                      PopupMenuItem(value: 'block', child: Text(c.t('block'))),
                    ],
                  ),
                ],
              ),
              body: Column(children: [
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
                      final msgs = ms.data ?? const <Msg>[];
                      WidgetsBinding.instance.addPostFrameCallback((_) => _markRead(msgs));
                      final seenAt = chat?.readAt(otherId);
                      return ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.all(12),
                        itemCount: msgs.length,
                        itemBuilder: (context, i) {
                          final m = msgs[i];
                          final mine = m.from == Api.uid;
                          final translated = m.tr[me.lang] ?? m.text;
                          final main = mine ? m.text : (app.autoTranslate ? translated : m.text);
                          final alt = mine ? (m.tr[other.lang] ?? '') : (app.autoTranslate ? m.text : translated);
                          final showAlt = (app.showOriginal || _orig.contains(m.id)) && alt.isNotEmpty && alt != main;
                          final seen = mine && i == 0 && seenAt != null && m.at != null && !seenAt.isBefore(m.at!);
                          return _Bubble(
                            mine: mine,
                            text: main,
                            alt: showAlt ? alt : null,
                            meta: [
                              shortTime(context, m.at),
                              if (m.pigeon) context.t('pigeon_letter'),
                              if (!mine && m.src.isNotEmpty && m.src != me.lang && app.autoTranslate) context.t('translated'),
                              if (seen) context.t('seen'),
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
                      child: Row(children: [
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
                        IconButton.filled(
                          onPressed: _sending ? null : _send,
                          icon: _sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
                        ),
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
  const _Bubble({required this.mine, required this.text, required this.alt, required this.meta, required this.onToggle, required this.toggleLabel});
  final bool mine;
  final String text;
  final String? alt;
  final String meta;
  final VoidCallback onToggle;
  final String toggleLabel;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fg = mine ? cs.onPrimary : cs.onSurface;
    return Align(
      alignment: mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .8),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
          decoration: BoxDecoration(
            color: mine ? cs.primary : cs.surfaceContainerHighest,
            borderRadius: BorderRadiusDirectional.only(
              topStart: const Radius.circular(18), topEnd: const Radius.circular(18),
              bottomStart: Radius.circular(mine ? 18 : 4), bottomEnd: Radius.circular(mine ? 4 : 18),
            ),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SelectableText(text, style: TextStyle(color: fg, fontSize: 16)),
            if (alt != null)
              Container(
                margin: const EdgeInsets.only(top: 6),
                padding: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: fg.withValues(alpha: .25)))),
                child: Text(alt!, style: TextStyle(color: fg.withValues(alpha: .8), fontSize: 14)),
              ),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Flexible(child: Text(meta, style: TextStyle(color: fg.withValues(alpha: .7), fontSize: 12))),
              TextButton(
                onPressed: onToggle,
                style: TextButton.styleFrom(foregroundColor: fg.withValues(alpha: .85), padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32), textStyle: const TextStyle(fontSize: 12)),
                child: Text(toggleLabel),
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}
