import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import 'chat_screen.dart';

class ChatsScreen extends StatefulWidget {
  const ChatsScreen({super.key});
  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  late final Stream<List<ChatInfo>> _chats = Api.chats();

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    return StreamBuilder<List<ChatInfo>>(
      stream: _chats,
      builder: (context, s) {
        final list = s.data ?? const <ChatInfo>[];
        if (s.hasData && list.isEmpty) {
          return Center(child: Padding(padding: const EdgeInsets.all(32), child: Text(context.t('chats_empty'), textAlign: TextAlign.center)));
        }
        return ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: list.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
          itemBuilder: (context, i) {
            final c = list[i];
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
                );
              },
            );
          },
        );
      },
    );
  }
}
