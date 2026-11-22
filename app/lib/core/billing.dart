import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import 'api.dart';
import 'config.dart';
import 'lock.dart';

/// Google Play Billing. Nothing is granted on the device: every purchase is verified by the server first.
class Billing extends ChangeNotifier {
  final _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;
  final Map<String, ProductDetails> products = {};
  bool available = false;
  bool busy = false;
  String? error;
  int lastGranted = 0;
  bool _started = false;

  static String accountId(String uid) => sha256.convert(utf8.encode('zajel:$uid')).toString();

  Future<void> start() async {
    if (_started) return;
    _started = true;
    try {
      available = await _iap.isAvailable();
      if (!available) {
        notifyListeners();
        return;
      }
      _sub = _iap.purchaseStream.listen(_onPurchases, onError: (Object e) {
        error = '$e';
        busy = false;
        notifyListeners();
      });
      final r = await _iap.queryProductDetails({...Cfg.pointProducts.keys, ...Cfg.vipProducts});
      for (final p in r.productDetails) {
        products[p.id] = p;
      }
      notifyListeners();
      // Re-checks active subscriptions so renewals extend VIP, and delivers anything left unconfirmed.
      await _iap.restorePurchases(applicationUserName: accountId(Api.uid));
    } catch (e) {
      error = '$e';
      notifyListeners();
    }
  }

  Future<void> buy(String productId) async {
    final p = products[productId];
    if (p == null) throw StateError('unavailable');
    error = null;
    busy = true;
    notifyListeners();
    final param = PurchaseParam(productDetails: p, applicationUserName: accountId(Api.uid));
    await LockService.instance.guard(() async {
      if (Cfg.pointProducts.containsKey(productId)) {
        await _iap.buyConsumable(purchaseParam: param);
      } else {
        await _iap.buyNonConsumable(purchaseParam: param);
      }
    });
  }

  Future<void> restore() => _iap.restorePurchases(applicationUserName: accountId(Api.uid));

  Future<void> _onPurchases(List<PurchaseDetails> list) async {
    for (final p in list) {
      if (p.status == PurchaseStatus.pending) continue;
      var verified = false;
      if (p.status == PurchaseStatus.purchased || p.status == PurchaseStatus.restored) {
        try {
          final r = await Api.call('verifyPurchase', {
            'productId': p.productID,
            'token': p.verificationData.serverVerificationData,
          });
          lastGranted = (r['granted'] as num?)?.toInt() ?? 0;
          verified = true;
        } catch (e) {
          error = '$e';
        }
      } else if (p.status == PurchaseStatus.error) {
        error = p.error?.message;
      } else if (p.status == PurchaseStatus.canceled) {
        error = null;
      }
      // Only confirm to Google once our server has credited it; unconfirmed purchases are retried on next start.
      if (p.pendingCompletePurchase && (verified || p.status != PurchaseStatus.purchased)) {
        await _iap.completePurchase(p);
      }
    }
    busy = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
