import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api.dart';
import '../core/app_state.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';
import 'chat_screen.dart';

/// Pigeons that landed with me: catch and reply, or let them fly on.
class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});
  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  late final Stream<List<Pigeon>> _inbox = Api.inbox();
  final Set<String> _busy = {};
  final Set<String> _orig = {};

  Future<void> _catch(Pigeon p) async {
    setState(() => _busy.add(p.id));
    try {
      final r = await Api.call('catchPigeon', {'id': p.id});
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(chatId: r['chatId'] as String)));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy.remove(p.id));
    }
  }

  Future<void> _release(Pigeon p) async {
    setState(() => _busy.add(p.id));
    try {
      await Api.call('releasePigeon', {'id': p.id});
      if (mounted) showInfo(context, context.t('released'));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy.remove(p.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final app = context.watch<AppState>();
    return StreamBuilder<List<Pigeon>>(
      stream: _inbox,
      builder: (context, s) {
        final list = s.data ?? const <Pigeon>[];
        return ListView(padding: const EdgeInsets.all(16), children: [
          Text(context.t('inbox_title'), style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(context.t('inbox_intro'), style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 12),
          if (!me.receiving)
            Card(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: ListTile(leading: const Icon(Icons.pause_circle_outline), title: Text(context.t('receiving_off')))),
          if (s.connectionState == ConnectionState.waiting && list.isEmpty) const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
          if (s.hasData && list.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(children: [
                Opacity(opacity: .8, child: Image.asset('assets/img/bird.png', width: 120)),
                const SizedBox(height: 8),
                Text(context.t('inbox_empty'), textAlign: TextAlign.center),
              ]),
            ),
          for (final p in list)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Avatar(name: p.fromName, seed: p.from),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(p.fromName, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${[p.fromCity, p.fromCountryName].where((e) => e.isNotEmpty).join(', ')} · ${p.fromLoc.kmTo(me.loc)} ${context.t('km')}',
                            style: Theme.of(context).textTheme.bodySmall),
                      ]),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  Text(app.autoTranslate ? p.textFor(me.lang) : p.text, style: const TextStyle(fontSize: 16)),
                  if (app.showOriginal || _orig.contains(p.id))
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(app.autoTranslate ? p.text : p.textFor(me.lang), style: Theme.of(context).textTheme.bodySmall),
                    ),
                  TextButton(
                    onPressed: () => setState(() => _orig.contains(p.id) ? _orig.remove(p.id) : _orig.add(p.id)),
                    child: Text(context.t(_orig.contains(p.id) ? 'hide_original' : 'show_original')),
                  ),
                  Row(children: [
                    Expanded(child: OutlinedButton(onPressed: _busy.contains(p.id) ? null : () => _release(p), child: Text(context.t('release')))),
                    const SizedBox(width: 10),
                    Expanded(child: FilledButton(onPressed: _busy.contains(p.id) ? null : () => _catch(p), child: Text(context.t('catch_reply')))),
                  ]),
                ]),
              ),
            ),
        ]);
      },
    );
  }
}
