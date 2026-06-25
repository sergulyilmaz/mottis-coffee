import 'package:flutter/material.dart';
import '../theme.dart';

class ScanResultScreen extends StatelessWidget {
  final Map<String, dynamic> result;

  const ScanResultScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final message = result['message'] ?? 'Islem tamamlandi';
    final customerName = result['customerName'] ?? 'Musteri';
    final stampsOnCard = result['stampsOnCard'] ?? 0;
    final stampsNeeded = result['stampsNeeded'] ?? 8;
    final availableRewards = result['availableRewards'] ?? 0;
    final isRewardEarned = result['newRewardEarned'] == true;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(flex: 2),
              _buildResultIcon(isRewardEarned),
              const SizedBox(height: 28),
              Text(
                isRewardEarned ? 'Odul Kazanildi!' : 'Damga Eklendi!',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: isRewardEarned ? AppColors.success : AppColors.primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 36),
              _buildInfoCard(customerName, stampsOnCard, stampsNeeded, availableRewards, isRewardEarned),
              const Spacer(flex: 3),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text(
                        'Ana Sayfaya Don',
                        style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Tekrar Tara'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultIcon(bool isReward) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        color: (isReward ? AppColors.success : AppColors.primary).withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        isReward ? Icons.emoji_events_rounded : Icons.check_circle_rounded,
        size: 52,
        color: isReward ? AppColors.success : AppColors.primary,
      ),
    );
  }

  Widget _buildInfoCard(String name, dynamic stampsOnCard, dynamic stampsNeeded, dynamic rewards, bool isReward) {
    final int current = (stampsOnCard is int) ? stampsOnCard : 0;
    final int needed = (stampsNeeded is int) ? stampsNeeded : 8;
    final int remaining = needed - current;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          _infoRow(Icons.person_rounded, 'Musteri', name),
          _divider(),
          _infoRow(Icons.coffee_rounded, 'Mevcut Damga', '$current / $needed'),
          if (remaining > 0) ...[
            _divider(),
            _infoRow(
              Icons.arrow_forward_rounded,
              'Odule Kalan',
              '$remaining damga',
            ),
          ],
          if (isReward || (rewards is int && rewards > 0)) ...[
            _divider(),
            _infoRow(
              Icons.card_giftcard_rounded,
              'Kullanilabilir Odul',
              '$rewards adet',
              valueColor: AppColors.success,
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() {
    return Divider(height: 20, color: AppColors.background.withValues(alpha: 0.8));
  }
}
