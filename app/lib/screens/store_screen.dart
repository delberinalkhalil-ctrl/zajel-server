import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/billing.dart';
import '../core/config.dart';
import '../core/i18n.dart';
import '../core/session.dart';
import '../widgets/common.dart';

class StoreScreen extends StatelessWidget {
  const StoreScreen({super.key});

  Future<void> _buy(BuildContext context, String id) async {
    try {
      await context.read<Billing>().buy(id);
    } catch (e) {
      if (context.mounted) showInfo(context, context.t('store_unavailable'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.me;
    final b = context.watch<Billing>();
    final th = Theme.of(context).textTheme;
    String price(String id) => b.products[id]?.price ?? '—';
    return ListView(padding: const EdgeInsets.all(16), children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(gradient: const LinearGradient(colors: [kBlue, kNavy]), borderRadius: BorderRadius.circular(20)),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(context.t('balance'), style: const TextStyle(color: Colors.white70)),
              Text('${me.points}', style: const TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w800)),
              Text(context.t('points'), style: const TextStyle(color: Colors.white70)),
            ]),
          ),
          const Coin(size: 76),
        ]),
      ),
      if (!b.available)
        Padding(padding: const EdgeInsets.only(top: 12), child: Text(context.t('store_unavailable'), style: const TextStyle(color: kRed))),
      if (b.error != null && b.error!.isNotEmpty)
        Padding(padding: const EdgeInsets.only(top: 12), child: Text(context.t('purchase_problem'), style: const TextStyle(color: kRed))),
      const SizedBox(height: 18),
      Text(context.t('buy_points'), style: th.titleLarge),
      const SizedBox(height: 10),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.05,
        children: [
          for (final e in Cfg.pointProducts.entries)
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  if (Cfg.pointBonus[e.key] != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: kRed, borderRadius: BorderRadius.circular(99)),
                      child: Text(Cfg.pointBonus[e.key] == 'best' ? context.t('best_value') : Cfg.pointBonus[e.key]!, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                    )
                  else
                    const SizedBox(height: 20),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Coin(size: 26),
                    const SizedBox(width: 6),
                    Text('${e.value}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                  ]),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 42)),
                      onPressed: b.busy || !b.products.containsKey(e.key) ? null : () => _buy(context, e.key),
                      child: Text(price(e.key)),
                    ),
                  ),
                ]),
              ),
            ),
        ],
      ),
      const SizedBox(height: 18),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF2A1D00), Color(0xFF5A3D00)]), borderRadius: BorderRadius.circular(20)),
        child: Column(children: [
          Image.asset('assets/img/crown.png', width: 110),
          Text(context.t('vip_title'), style: const TextStyle(color: Color(0xFFFFD75E), fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          for (final k in ['vip_b1', 'vip_b2', 'vip_b3', 'vip_b4', 'vip_b5'])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(children: [
                const Icon(Icons.check_circle, color: Color(0xFFFFD75E), size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(context.t(k), style: const TextStyle(color: Color(0xFFFFF4D6)))),
              ]),
            ),
          const SizedBox(height: 10),
          if (me.vip)
            Text(context.t('vip_active_until', {'date': MaterialLocalizations.of(context).formatMediumDate(me.vipUntil!)}), style: const TextStyle(color: Color(0xFFFFD75E), fontWeight: FontWeight.w700))
          else
            for (final id in Cfg.vipProducts)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFFF4D6), side: const BorderSide(color: Color(0x88FFD75E)), minimumSize: const Size(double.infinity, 52),
                  ),
                  onPressed: b.busy || !b.products.containsKey(id) ? null : () => _buy(context, id),
                  child: Row(children: [
                    Expanded(child: Text(context.t(id), style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text(price(id), style: const TextStyle(color: Color(0xFFFFD75E), fontWeight: FontWeight.w700)),
                  ]),
                ),
              ),
        ]),
      ),
      const SizedBox(height: 18),
      Text(context.t('what_points_do'), style: th.titleLarge),
      const SizedBox(height: 6),
      for (final r in [
        ['cost_extra', Cfg.costExtra],
        ['cost_dest', Cfg.costDest],
        ['cost_fast', Cfg.costFast],
        ['cost_voice', Cfg.costVoice],
        ['cost_video', Cfg.costVideo],
      ])
        ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: Text(context.t(r[0] as String)),
          trailing: Text(context.t('n_points', {'n': r[1]}), style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      const SizedBox(height: 8),
      TextButton(onPressed: b.available ? () => b.restore() : null, child: Text(context.t('restore_purchases'))),
      Text(context.t('store_note'), style: th.bodySmall, textAlign: TextAlign.center),
    ]);
  }
}
