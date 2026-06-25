import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _dashboard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.get('/barista/dashboard');
      if (mounted) setState(() => _dashboard = (data as Map<String, dynamic>)['dashboard'] as Map<String, dynamic>?);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffName = context.read<AuthService>().staffName;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text("Mottis Coffee", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            Text(
              'Barista Paneli',
              style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6)),
            ),
          ],
        ),
        toolbarHeight: 60,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildGreeting(staffName),
                      const SizedBox(height: 20),
                      _buildStatCards(),
                      const SizedBox(height: 24),
                      _buildActiveCampaigns(),
                      const SizedBox(height: 24),
                      _buildRecentTransactions(),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Tekrar Dene')),
          ],
        ),
      ),
    );
  }

  Widget _buildGreeting(String name) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Gunaydin';
    } else if (hour < 18) {
      greeting = 'Iyi gunler';
    } else {
      greeting = 'Iyi aksamlar';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$greeting,',
          style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        Text(
          name,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
      ],
    );
  }

  Widget _buildStatCards() {
    final todayStamps = _dashboard?['todayStamps'] ?? 0;
    final todayCustomers = _dashboard?['todayCustomers'] ?? 0;

    return Row(
      children: [
        Expanded(child: _statCard('Bugunun\nDamgalari', '$todayStamps', Icons.coffee_rounded, AppColors.primary)),
        const SizedBox(width: 12),
        Expanded(child: _statCard('Bugunun\nMusterileri', '$todayCustomers', Icons.people_rounded, AppColors.success)),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 14),
          Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3)),
        ],
      ),
    );
  }

  Widget _buildActiveCampaigns() {
    final campaigns = (_dashboard?['activeCampaigns'] as List?) ?? [];
    if (campaigns.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Aktif Kampanyalar',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        ...campaigns.map((c) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.campaign_rounded, color: AppColors.warning, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c['title'] ?? '',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                    ),
                    if (c['description'] != null)
                      Text(
                        c['description'],
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    final transactions = (_dashboard?['recentTransactions'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Son Islemler',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        if (transactions.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text('Henuz islem yok', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 2)),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: transactions.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: AppColors.background.withValues(alpha: 0.8)),
              itemBuilder: (_, i) {
                final t = transactions[i] as Map<String, dynamic>;
                final isStamp = t['type'] == 'stamp';
                final date = DateTime.tryParse(t['created_at'] ?? '');
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  leading: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      color: (isStamp ? AppColors.primary : AppColors.success).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isStamp ? Icons.coffee_rounded : Icons.card_giftcard_rounded,
                      color: isStamp ? AppColors.primary : AppColors.success,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    t['customer_name'] ?? 'Musteri',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  subtitle: Text(
                    date != null ? DateFormat('dd MMM HH:mm', 'tr').format(date) : '',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isStamp ? AppColors.primary : AppColors.success).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isStamp ? 'Damga' : 'Odul',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isStamp ? AppColors.primary : AppColors.success,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
