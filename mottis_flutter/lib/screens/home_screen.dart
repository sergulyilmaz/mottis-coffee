import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _data;
  List<dynamic> _featured = [];
  List<dynamic> _campaigns = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchAll();
  }

  Future<void> _fetchAll() async {
    // Paralel cagir, biri hata verse diger ikisi yine calissin
    final results = await Future.wait([
      _api.getMe().catchError((_) => Response(requestOptions: RequestOptions(), statusCode: 0)),
      _api.getFeatured().catchError((_) => Response(requestOptions: RequestOptions(), statusCode: 0)),
      _api.getCampaigns().catchError((_) => Response(requestOptions: RequestOptions(), statusCode: 0)),
    ]);

    if (mounted) {
      setState(() {
        if (results[0].statusCode == 200) _data = results[0].data;
        if (results[1].statusCode == 200) _featured = results[1].data['featured'] ?? [];
        if (results[2].statusCode == 200) _campaigns = results[2].data['campaigns'] ?? [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    final loyalty = _data?['loyalty'];

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      onRefresh: _fetchAll,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Mermer header + logo
          _MarbleHeader(),
          const SizedBox(height: 24),

          // Sadakat karti
          if (loyalty != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _BeanStampCard(loyalty: loyalty),
            ),

          // Oneriler
          if (_featured.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'SANA OZEL TAVSIYELER',
                style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800,
                  color: AppColors.text, letterSpacing: 1,
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 230,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _featured.length,
                itemBuilder: (_, i) => _ProductCard(item: _featured[i]),
              ),
            ),
          ],

          // Kampanyalar
          if (_campaigns.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'OZEL KAMPANYALAR & FIRSATLAR',
                style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800,
                  color: AppColors.text, letterSpacing: 1,
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 160,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _campaigns.length,
                itemBuilder: (_, i) => _CampaignCard(campaign: _campaigns[i]),
              ),
            ),
          ],

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

// ─── Mermer Header ──────────────────────────────────────────────────────────

class _MarbleHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 20, bottom: 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.marbleStart, AppColors.marbleEnd],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Logo placeholder — buraya kendi logonu koy
          // Image.asset('assets/logo.png', height: 80) gibi
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: AppColors.gold,
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Center(
              child: Text('☕', style: TextStyle(fontSize: 36)),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'GOOD COFFEE TRUE ALGORITHM',
            style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w700,
              color: AppColors.textDark.withValues(alpha: 0.6),
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Cekirdek Sadakat Karti ─────────────────────────────────────────────────

class _BeanStampCard extends StatelessWidget {
  final Map<String, dynamic> loyalty;
  const _BeanStampCard({required this.loyalty});

  @override
  Widget build(BuildContext context) {
    final current = (loyalty['stampsOnCurrentCard'] ?? 0) as int;
    final needed = (loyalty['stampsNeeded'] ?? 8) as int;
    final rewards = (loyalty['availableRewards'] ?? 0) as int;
    final remaining = needed - current;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        children: [
          // Baslik + rozet
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'KAZANDIGIN CEKIRDEKLER',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.text, letterSpacing: 0.5),
              ),
              if (rewards > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.gold,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '🎁 BEDAVA\nKAHVE HAZIR!',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppColors.textDark, height: 1.3),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '$remaining Cekirdek Daha ve Bedava Kahve Senin!',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 20),

          // Cekirdek satirlari
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(needed, (i) {
              final filled = i < current;
              return Column(
                children: [
                  // Cekirdek ikonu
                  Text(
                    '🫘',
                    style: TextStyle(
                      fontSize: 28,
                      color: filled ? null : null,
                    ),
                  ),
                  // Eger bos ise soluk goster
                  if (!filled)
                    Opacity(
                      opacity: 0.3,
                      child: Container(
                        width: 28, height: 28,
                        margin: const EdgeInsets.only(top: 0),
                        child: const Text('🫘', style: TextStyle(fontSize: 28)),
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    '${i + 1}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: filled ? AppColors.primary : AppColors.textMuted,
                    ),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}

// ─── Urun Karti ─────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _ProductCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 155,
      margin: const EdgeInsets.only(right: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Urun gorseli placeholder — buraya kendi gorsellerini koy
          // Image.asset('assets/products/${item['id']}.jpg') gibi
          Container(
            height: 120,
            decoration: const BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: const Center(child: Text('☕', style: TextStyle(fontSize: 40))),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name'] ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text, height: 1.3),
                ),
                const SizedBox(height: 6),
                Text(
                  '${double.tryParse(item['price'].toString())?.toStringAsFixed(0) ?? '0'} TL',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary),
                ),
                const SizedBox(height: 6),
                // Sepete ekle butonu
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'sepete ekle',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Kampanya Karti ─────────────────────────────────────────────────────────

class _CampaignCard extends StatelessWidget {
  final Map<String, dynamic> campaign;
  const _CampaignCard({required this.campaign});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 14),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              (campaign['title'] ?? '').toString().toUpperCase(),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18, fontWeight: FontWeight.w900,
                color: Colors.white, height: 1.2,
              ),
            ),
            if (campaign['description'] != null)
              Text(
                campaign['description'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.8)),
              ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'SIMDI KULLAN',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
