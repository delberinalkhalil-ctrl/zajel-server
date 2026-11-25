import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import 'chat_screen.dart';
import 'support_screen.dart';

class ChatsScreen extends StatefulWidget {
  const ChatsScreen({super.key});
  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  late final Stream<List<ChatInfo>> _chats = Api.chats();
  late final Stream<int> _support = Api.supportUnread();

  Future<void> _delete(ChatInfo c, String name) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: Text(d.t('delete_chat_q', {'name': name})),
        content: Text(d.t('delete_chat_body')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: Text(d.t('cancel'))),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: kRed), onPressed: () => Navigator.pop(d, true), child: Text(d.t('delete'))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.call('deleteChat', {'chatId': c.id});
      if (mounted) showInfo(context, context.t('chat_deleted'));
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  /// Pinned at the top of every list; it cannot be deleted.
  Widget _teamTile() => StreamBuilder<int>(
        stream: _support,
        builder: (context, s) {
          final n = s.data ?? 0;
          return ListTile(
            leading: const CircleAvatar(radius: 24, backgroundColor: kGold, child: Icon(Icons.support_agent, color: kNight)),
            title: Row(children: [
              Text(context.t('team_chat'), style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(width: 6),
              const Icon(Icons.verified, size: 16, color: kGold),
            ]),
            subtitle: Text(context.t('team_chat_sub'), maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.push_pin, size: 16, color: kMuted),
              if (n > 0) ...[const SizedBox(height: 4), Badge(label: Text('$n'))],
            ]),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportScreen())),
          );
        },
      );

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    return StreamBuilder<List<ChatInfo>>(
      stream: _chats,
      builder: (context, s) {
        final list = s.data ?? const <ChatInfo>[];
        return ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: list.length + 1 + (s.hasData && list.isEmpty ? 1 : 0),
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
          itemBuilder: (context, i) {
            if (i == 0) return _teamTile();
            if (list.isEmpty) {
              return Padding(padding: const EdgeInsets.all(32), child: Text(context.t('chats_empty'), textAlign: TextAlign.center));
            }
            final c = list[i - 1];
            final other = c.other(Api.uid);
            final unread = c.unread(Api.uid);
            return FutureBuilder<Profile>(
              future: Api.profileOnce(other),
              builder: (context, ps) {
                final p = ps.data ?? Profile(other, const {});
                return ListTile(
                  leading: ProfileAvatar(p, size: 48),
                  title: Row(children: [
                    Flexible(child: Text(p.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                    if (p.vip && p.badge) const Padding(padding: EdgeInsetsDirectional.only(start: 6), child: VipBadge()),
                  ]),
                  subtitle: Text(
                    c.blocked ? context.t('chat_blocked') : '${c.lastFrom == Api.uid ? '${context.t('you')}: ' : ''}${c.lastText(me.lang)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(shortTime(context, c.updatedAt), style: Theme.of(context).textTheme.labelSmall),
                    if (unread > 0) ...[const SizedBox(height: 4), Badge(label: Text('$unread'))],
                  ]),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(chatId: c.id))),
                  onLongPress: () => _delete(c, p.name),
                );
              },
            );
          },
        );
      },
    );
  }
}
