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
  StreamSubscription<CallInfo?>? _calls;
  String? _ringing;

  @override
  void initState() {
    super.initState();
    Push.start();
    if (Cfg.storeEnabled) context.read<Billing>().start();
    _calls = Api.incomingCall().listen(_onCall);
    Push.pending.addListener(_onPush);
  }

  @override
  void dispose() {
    _calls?.cancel();
    Push.pending.removeListener(_onPush);
    super.dispose();
  }

  void _onCall(CallInfo? c) {
    if (c == null || c.id == _ringing || !mounted) return;
    final created = c.createdAt;
    if (created != null && DateTime.now().difference(created).inSeconds > 45) return;
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

  @override
  Widget build(BuildContext context) {
    final me = context.me;
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
          Text(context.t('app_name'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 24)),
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
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: StreamBuilder<List<Pigeon>>(
        stream: _inbox,
        builder: (_, inbox) => StreamBuilder<List<ChatInfo>>(
          stream: _chats,
          builder: (_, chats) {
            final nIn = inbox.data?.length ?? 0;
            final nCh = (chats.data ?? const <ChatInfo>[]).fold<int>(0, (a, c) => a + c.unread(Api.uid));
            return NavigationBar(
              selectedIndex: _tab,
              onDestinationSelected: go,
              destinations: [
                NavigationDestination(icon: const Icon(Icons.flight_takeoff_outlined), selectedIcon: const Icon(Icons.flight_takeoff), label: context.t('tab_send')),
                NavigationDestination(icon: Badge(isLabelVisible: nIn > 0, label: Text('$nIn'), child: const Icon(Icons.mail_outline)), selectedIcon: const Icon(Icons.mail), label: context.t('tab_inbox')),
                NavigationDestination(icon: Badge(isLabelVisible: nCh > 0, label: Text('$nCh'), child: const Icon(Icons.chat_bubble_outline)), selectedIcon: const Icon(Icons.chat_bubble), label: context.t('tab_chats')),
                if (Cfg.storeEnabled)
                  NavigationDestination(icon: const Icon(Icons.storefront_outlined), selectedIcon: const Icon(Icons.storefront), label: context.t('tab_store')),
                NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: context.t('tab_me')),
              ],
            );
          },
        ),
      ),
    );
  }
}
