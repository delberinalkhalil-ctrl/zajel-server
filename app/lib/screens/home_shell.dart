import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/billing.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/push.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import 'call_screen.dart';
import 'chat_screen.dart';
import 'chats_screen.dart';
import 'inbox_screen.dart';
import 'settings_screen.dart';
import 'sky_screen.dart';
import 'store_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  late final Stream<List<Pigeon>> _inbox = Api.inbox();
  late final Stream<List<ChatInfo>> _chats = Api.chats();
  late final Stream<Profile> _myProfile = Api.profile(Api.uid);
  late final Stream<Map<String, dynamic>?> _announce = Api.announcement();
  String _hiddenAnnouncement = '';
  Object? _shownNotice;
  StreamSubscription<CallInfo?>? _calls;
  StreamSubscription<List<ChatInfo>>? _delivered;
  final _deliveredFor = <String, DateTime>{};
  String? _ringing;

  @override
  void initState() {
    super.initState();
    Push.start();
    if (Cfg.storeEnabled) context.read<Billing>().start();
    _listenCalls();
    _delivered = Api.chats().listen(_markDelivered, onError: (_) {});
    Push.pending.addListener(_onPush);
    // Lets the people I chat with see my local time.
    Api.call('updateProfile', {'tz': DateTime.now().timeZoneOffset.inMinutes}).ignore();
  }

  @override
  void dispose() {
    _calls?.cancel();
    _delivered?.cancel();
    Push.pending.removeListener(_onPush);
    super.dispose();
  }

  /// Double grey tick: the other person's new messages have reached this phone.
  void _markDelivered(List<ChatInfo> chats) {
    for (final c in chats) {
      final at = c.lastAt;
      if (at == null || c.lastFrom == Api.uid || c.unread(Api.uid) == 0) continue;
      final done = c.deliveredAt(Api.uid);
      if (done != null && !done.isBefore(at)) continue;
      if (_deliveredFor[c.id] == at) continue;
      _deliveredFor[c.id] = at;
      Api.call('markDelivered', {'chatId': c.id}).ignore();
    }
  }

  /// Listens for calls ringing for me, and listens again if the stream fails (a network drop, for example).
  void _listenCalls() {
    _calls?.cancel();
    _calls = Api.incomingCall().listen(_onCall, onError: (Object e) {
      debugPrint('incoming calls: $e');
      Future.delayed(const Duration(seconds: 10), () {
        if (mounted) _listenCalls();
      });
    });
  }

  void _onCall(CallInfo? c) {
    if (c == null || c.id == _ringing || !mounted) return;
    final created = c.createdAt;
    if (created != null && DateTime.now().difference(created).inSeconds > 90) return; // lenient: phone clocks drift
    _ringing = c.id;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => IncomingCallScreen(call: c)));
  }

  void _onPush() {
    final d = Push.pending.value;
    if (d == null || !mounted) return;
    Push.pending.value = null;
    switch (d['type']) {
      case 'chat':
        final id = d['chatId']?.toString();
        if (id != null) Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(chatId: id)));
      case 'pigeon':
        setState(() => _tab = 1);
      default:
        break;
    }
  }

  static int get storeTab => Cfg.storeEnabled ? 3 : 0;
  static int get meTab => Cfg.storeEnabled ? 4 : 3;
  void go(int i) => setState(() => _tab = i);

  /// Shows a moderator's warning once, then tells the server it was seen.
  void _maybeShowNotice(Me me) {
    final n = me.notice;
    if (n == null || n['seen'] == true || identical(_shownNotice, n['at']) || _shownNotice == n['at']) return;
    _shownNotice = n['at'];
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final note = '${n['note'] ?? ''}';
      await showDialog<void>(
        context: context,
        builder: (c) => AlertDialog(
          icon: const Icon(Icons.gpp_maybe_outlined, color: kGold, size: 40),
          title: Text(c.t(n['kind'] == 'restrict' ? 'notice_restrict_t' : 'notice_warn_t')),
          content: Text([c.t('notice_body'), if (note.isNotEmpty) '«$note»'].join('\n\n')),
          actions: [FilledButton(onPressed: () => Navigator.pop(c), child: Text(c.t('ok')))],
        ),
      );
      Api.call('ackNotice').ignore();
    });
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    _maybeShowNotice(me);
    final pages = [
      SkyScreen(onStore: () => go(storeTab)),
      const InboxScreen(),
      const ChatsScreen(),
      if (Cfg.storeEnabled) const StoreScreen(),
      const SettingsScreen(),
    ];
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Row(children: [
          Image.asset('assets/img/bird.png', width: 44),
          const SizedBox(width: 6),
          Text(context.t('app_name'), style: const TextStyle(fontFamily: kTitleFont, fontWeight: FontWeight.w800, fontSize: 24, color: kParchment)),
        ]),
        actions: [
          if (Cfg.storeEnabled) ...[PointsChip(points: me.points, vip: me.vip, onTap: () => go(storeTab)), const SizedBox(width: 6)],
          InkWell(
            customBorder: const CircleBorder(),
            onTap: () => go(meTab),
            child: StreamBuilder<Profile>(
              stream: _myProfile,
              builder: (_, s) => Avatar(name: me.name, url: s.data?.photoUrl ?? '', size: 38, seed: Api.uid),
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(children: [
        StreamBuilder<Map<String, dynamic>?>(
          stream: _announce,
          builder: (_, s) {
            final d = s.data;
            if (d == null) return const SizedBox.shrink();
            final tr = d['tr'] is Map ? Map<String, dynamic>.from(d['tr'] as Map) : const <String, dynamic>{};
            final text = '${tr[context.lang] ?? d['text'] ?? ''}';
            if (text.isEmpty || text == _hiddenAnnouncement) return const SizedBox.shrink();
            return NoticeBanner(icon: Icons.campaign_outlined, text: text, onClose: () => setState(() => _hiddenAnnouncement = text));
          },
        ),
        if (me.restricted)
          NoticeBanner(icon: Icons.lock_clock_outlined, color: kRed, text: context.t('restricted_until', {'date': shortDate(context, me.restrictedUntil!)})),
        Expanded(child: IndexedStack(index: _tab, children: pages)),
      ]),
      bottomNavigationBar: StreamBuilder<List<Pigeon>>(
        stream: _inbox,
        builder: (_, inbox) => StreamBuilder<List<ChatInfo>>(
          stream: _chats,
          builder: (_, chats) {
            final nIn = inbox.data?.length ?? 0;
            final nCh = (chats.data ?? const <ChatInfo>[]).fold<int>(0, (a, c) => a + c.unread(Api.uid));
            return FloatingNav(
              index: _tab,
              onTap: go,
              items: [
                FloatingNavItem(Icons.send_outlined, Icons.send, context.t('tab_send')),
                FloatingNavItem(Icons.mail_outline, Icons.mail, context.t('tab_inbox'), badge: nIn),
                FloatingNavItem(Icons.chat_bubble_outline, Icons.chat_bubble, context.t('tab_chats'), badge: nCh),
                if (Cfg.storeEnabled) FloatingNavItem(Icons.star_outline, Icons.star, context.t('tab_store')),
                FloatingNavItem(Icons.person_outline, Icons.person, context.t('tab_me')),
              ],
            );
          },
        ),
      ),
    );
  }
}
