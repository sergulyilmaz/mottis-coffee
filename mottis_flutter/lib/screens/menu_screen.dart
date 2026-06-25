import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final _api = ApiService();
  List<dynamic> _menu = [];
  int _activeIdx = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchMenu();
  }

  Future<void> _fetchMenu() async {
    try {
      final res = await _api.getMenu();
      setState(() => _menu = res.data['menu'] ?? []);
    } catch (e) {
      debugPrint('Menu error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    final activeCategory = _menu.isNotEmpty ? _menu[_activeIdx] : null;
    final items = (activeCategory?['items'] as List?) ?? [];

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Text('MENU', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.text, letterSpacing: 2)),
          ),

          // Kategori pilleri
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _menu.length,
              itemBuilder: (_, i) {
                final active = _activeIdx == i;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _activeIdx = i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: active ? AppColors.primary : AppColors.border),
                      ),
                      child: Text(
                        _menu[i]['name'] ?? '',
                        style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600,
                          color: active ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: items.isEmpty
                ? const Center(child: Text('Bu kategoride henuz urun yok.', style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: items.length,
                    itemBuilder: (_, i) => _MenuItem(item: items[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final Map<String, dynamic> item;
  const _MenuItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Row(
        children: [
          // Gorsel placeholder — buraya urun gorsellerini koy
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(child: Text('☕', style: TextStyle(fontSize: 28))),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['name'] ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.text)),
                if (item['description'] != null) ...[
                  const SizedBox(height: 3),
                  Text(item['description'], maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.3)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${double.tryParse(item['price'].toString())?.toStringAsFixed(0) ?? '0'} TL',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
              if (item['is_featured'] == true) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Onerilen', style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w700)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
