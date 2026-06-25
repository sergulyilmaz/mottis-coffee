import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api.dart';
import '../theme.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  final _api = ApiService();
  List<dynamic> _stores = [];
  bool _loading = true;
  bool _locErr = false;

  @override
  void initState() {
    super.initState();
    _fetchStores();
  }

  Future<void> _fetchStores() async {
    double? lat, lng;
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (serviceEnabled) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
          final pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.medium,
            timeLimit: const Duration(seconds: 5),
          );
          lat = pos.latitude;
          lng = pos.longitude;
        } else {
          setState(() => _locErr = true);
        }
      } else {
        setState(() => _locErr = true);
      }
    } catch (_) {
      setState(() => _locErr = true);
    }

    try {
      final res = await _api.getStores(lat: lat, lng: lng);
      setState(() => _stores = res.data['stores'] ?? []);
    } catch (e) {
      debugPrint('Stores fetch error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _openDirections(Map<String, dynamic> store) async {
    final lat = store['lat'];
    final lng = store['lng'];
    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sube konum bilgisi bulunamadi.'), backgroundColor: AppColors.error),
      );
      return;
    }
    final geoUri = Uri.parse('geo:0,0?q=$lat,$lng(${Uri.encodeComponent(store['name'] ?? 'La\'Veria')})');
    final mapsUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');

    try {
      // Oncelikle geo: ile ac (Google Maps / varsayilan harita uygulamasi)
      if (await canLaunchUrl(geoUri)) {
        await launchUrl(geoUri, mode: LaunchMode.externalApplication);
      } else {
        // Fallback: browser'da Google Maps ac
        await launchUrl(mapsUrl, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Harita uygulamasi acilamadi.'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Text('SUBELER', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.text, letterSpacing: 2)),
          ),
          if (_locErr)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text('📍 Konum izni verilmedi', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ),
          const SizedBox(height: 12),
          Expanded(
            child: _stores.isEmpty
                ? const Center(child: Text('Henuz sube eklenmemis.', style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _stores.length,
                    itemBuilder: (_, i) => _StoreCard(store: _stores[i], onDirections: () => _openDirections(_stores[i])),
                  ),
          ),
        ],
      ),
    );
  }
}

class _StoreCard extends StatelessWidget {
  final Map<String, dynamic> store;
  final VoidCallback onDirections;
  const _StoreCard({required this.store, required this.onDirections});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(store['name'] ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.text)),
                const SizedBox(height: 4),
                Text(store['address'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4)),
                if (store['working_hours'] != null) ...[
                  const SizedBox(height: 6),
                  Text('🕐 ${store['working_hours']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                ],
                if (store['phone'] != null) ...[
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: () => launchUrl(Uri.parse('tel:${store['phone']}')),
                    child: Text('📞 ${store['phone']}', style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (store['distance_km'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('${store['distance_km']} km', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
              ElevatedButton(
                onPressed: onDirections,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  elevation: 0,
                ),
                child: const Text('Yol Tarifi', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
