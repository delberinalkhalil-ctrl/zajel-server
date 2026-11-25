import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../core/session.dart';
import '../widgets/common.dart';

/// The conversation with the Zajel team. Always there, cannot be deleted; the team answers from the admin page,
/// and both sides read each other in their own language.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  late final Stream<List<SupportMsg>> _msgs = Api.supportMessages();
  final _input = TextEditingController();
  bool _sending = false;
  int _lastSeen = -1;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await Api.call('supportSend', {'text': text});
      _input.clear();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _markRead(List<SupportMsg> list) {
    final team = list.where((m) => !m.mine).length;
    if (team == _lastSeen) return;
    _lastSeen = team;
    Api.call('supportRead').ignore();
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(children: [
          const CircleAvatar(radius: 18, backgroundColor: kGold, child: Icon(Icons.support_agent, color: kNight, size: 20)),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(context.t('team_chat'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            Text(context.t('team_chat_hint'), style: const TextStyle(fontSize: 11, color: kMuted)),
          ]),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: StreamBuilder<List<SupportMsg>>(
            stream: _msgs,
            builder: (context, s) {
              final list = s.data ?? const <SupportMsg>[];
              WidgetsBinding.instance.addPostFrameCallback((_) => _markRead(list));
              if (s.hasData && list.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.support_agent, size: 64, color: kGold),
                      const SizedBox(height: 12),
                      Text(context.t('team_chat_empty'), textAlign: TextAlign.center, style: const TextStyle(height: 1.6)),
                    ]),
                  ),
                );
              }
              return ListView.builder(
                reverse: true,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final m = list[i];
                  return Align(
                    alignment: m.mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .8),
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                        decoration: BoxDecoration(
                          color: m.mine ? kBlue : kPanel2,
                          border: m.mine ? null : Border.all(color: kGold.withValues(alpha: .5)),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          if (!m.mine)
                            Text(context.t('team_chat'), style: const TextStyle(color: kGold, fontSize: 12, fontWeight: FontWeight.w700)),
                          SelectableText(m.mine ? m.text : m.textFor(me.lang), style: const TextStyle(color: kParchment, fontSize: 16, height: 1.5)),
                          Text(shortTime(context, m.at), style: const TextStyle(color: kMuted, fontSize: 11)),
                        ]),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
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
                  maxLength: 2000,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText: context.t('team_chat_write'),
                    counterText: '',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _sending
                  ? const SizedBox(width: 48, height: 48, child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                  : IconButton.filled(style: IconButton.styleFrom(backgroundColor: kRed), onPressed: _send, icon: const Icon(Icons.send)),
            ]),
          ),
        ),
      ]),
    );
  }
}
