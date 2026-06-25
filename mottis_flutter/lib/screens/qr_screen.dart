import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api.dart';
import '../theme.dart';

class QRScreen extends StatefulWidget {
  const QRScreen({super.key});
  @override
  State<QRScreen> createState() => _QRScreenState();
}

class _QRScreenState extends State<QRScreen> {
  final _api = ApiService();
  static const _ttl = 60;
  String? _token;
  int _countdown = _ttl;
  bool _loading = true;
  Timer? _timer;

  // Loyalty bilgileri
  int _stampsOnCard = 0;
  int _stampsNeeded = 8;
  int _availableRewards = 0;

  @override
  void initState() {
    super.initState();
    _fetchAll();
  }

  Future<void> _fetchAll() async {
    setState(() => _loading = true);
    await Future.wait([
      _fetchQR(),
      _fetchLoyalty(),
    ]);
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _fetchQR() async {
    try {
      final res = await _api.getQR();
      if (mounted) {
        setState(() {
          _token = res.data['token'];
          _countdown = _ttl;
        });
        _startTimer();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QR kodu yuklenemedi.'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _fetchLoyalty() async {
    try {
      final res = await _api.getMe();
      final loyalty = res.data['loyalty'];
      if (loyalty != null && mounted) {
        setState(() {
          _stampsOnCard = loyalty['stampsOnCurrentCard'] ?? 0;
          _stampsNeeded = loyalty['stampsNeeded'] ?? 8;
          _availableRewards = loyalty['availableRewards'] ?? 0;
        });
      }
    } catch (_) {}
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _countdown--;
        if (_countdown <= 0) {
          _fetchQR();
          _fetchLoyalty();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _countdown / _ttl;
    final isUrgent = _countdown <= 10;
    final remaining = _stampsNeeded - _stampsOnCard;

    return SafeArea(
      child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  const Text('QR KODUN', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.text, letterSpacing: 2)),
                  const SizedBox(height: 6),
                  const Text('Baristaya goster, kahveni kaydettir', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                  const SizedBox(height: 24),

                  // QR Kod
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: QrImageView(
                      data: _token ?? 'error',
                      version: QrVersions.auto,
                      size: 200,
                      eyeStyle: const QrEyeStyle(color: Color(0xFF1A1A1A)),
                      dataModuleStyle: const QrDataModuleStyle(color: Color(0xFF1A1A1A)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Geri sayim
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 4,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation(isUrgent ? AppColors.error : AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${isUrgent ? '⚠️ ' : ''}Kod $_countdown saniyede yenileniyor',
                    style: TextStyle(
                      fontSize: 13,
                      color: isUrgent ? AppColors.error : AppColors.textMuted,
                      fontWeight: isUrgent ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Cekirdek ilerleme karti
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.border, width: 0.5),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'CEKIRDEK ILERLEMEN',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textSecondary, letterSpacing: 0.5),
                            ),
                            if (_availableRewards > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.gold,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '🎁 $_availableRewards BEDAVA',
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.textDark),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        // Cekirdek ikonlari
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: List.generate(_stampsNeeded, (i) {
                            final filled = i < _stampsOnCard;
                            return Text(
                              '🫘',
                              style: TextStyle(
                                fontSize: 24,
                                color: filled ? null : Colors.white.withValues(alpha: 0.15),
                              ),
                            );
                          }),
                        ),
                        const SizedBox(height: 12),
                        // Ilerleme cubugu
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: _stampsNeeded > 0 ? _stampsOnCard / _stampsNeeded : 0,
                            minHeight: 6,
                            backgroundColor: AppColors.border,
                            valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          remaining > 0
                              ? '$_stampsOnCard / $_stampsNeeded  •  $remaining cekirdek daha!'
                              : 'Bedava kahve hakkin var! ☕',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: remaining > 0 ? AppColors.textSecondary : AppColors.gold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Yenile butonu
                  OutlinedButton(
                    onPressed: _fetchAll,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                    ),
                    child: const Text('↻ Hemen Yenile', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Her kullanimda yeni bir kod olusturulur.\nEkran goruntusu calismaz.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}
