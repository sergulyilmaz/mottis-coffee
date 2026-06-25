import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api.dart';
import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService();
  late TextEditingController _nameCtrl;
  final _curPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  bool _saving = false;
  bool _passLoading = false;

  @override
  void initState() {
    super.initState();
    final customer = context.read<AuthProvider>().customer;
    _nameCtrl = TextEditingController(text: customer?['name'] ?? '');
  }

  Future<void> _saveProfile() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await _api.updateProfile({'name': _nameCtrl.text.trim()});
      if (mounted) _showMsg('Profil guncellendi.', false);
    } catch (e) {
      if (mounted) _showMsg('Profil guncellenemedi.', true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    if (_curPassCtrl.text.isEmpty || _newPassCtrl.text.isEmpty) {
      _showMsg('Her iki alani da doldurun.', true);
      return;
    }
    if (_newPassCtrl.text.length < 6) {
      _showMsg('Yeni sifre en az 6 karakter olmali.', true);
      return;
    }
    setState(() => _passLoading = true);
    try {
      await _api.updatePassword({'currentPassword': _curPassCtrl.text, 'newPassword': _newPassCtrl.text});
      _curPassCtrl.clear();
      _newPassCtrl.clear();
      if (mounted) _showMsg('Sifre degistirildi.', false);
    } catch (e) {
      if (mounted) _showMsg('Sifre degistirilemedi.', true);
    } finally {
      if (mounted) setState(() => _passLoading = false);
    }
  }

  void _showMsg(String msg, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: isError ? AppColors.error : AppColors.success),
    );
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Cikis Yap', style: TextStyle(color: AppColors.text)),
        content: const Text('Hesabindan cikmak istedigine emin misin?', style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Iptal', style: TextStyle(color: AppColors.textMuted))),
          TextButton(
            onPressed: () { Navigator.pop(ctx); context.read<AuthProvider>().logout(); },
            child: const Text('Cikis Yap', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final customer = context.watch<AuthProvider>().customer;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 20),
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    customer?['name']?.toString().isNotEmpty == true ? customer!['name'][0].toUpperCase() : '?',
                    style: const TextStyle(fontSize: 34, color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 14),
                Text(customer?['name'] ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.text)),
                const SizedBox(height: 4),
                Text(customer?['email'] ?? '', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 28),

          _section('Profil Bilgileri', [
            _label('Ad Soyad'),
            _input(_nameCtrl),
            const SizedBox(height: 14),
            _btn('Kaydet', _saving, _saveProfile),
          ]),
          const SizedBox(height: 14),

          _section('Sifre Degistir', [
            _label('Mevcut Sifre'),
            _input(_curPassCtrl, obscure: true, hint: '••••••'),
            const SizedBox(height: 10),
            _label('Yeni Sifre'),
            _input(_newPassCtrl, obscure: true, hint: 'En az 6 karakter'),
            const SizedBox(height: 14),
            _btn('Sifreyi Degistir', _passLoading, _changePassword),
          ]),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton(
              onPressed: _confirmLogout,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Cikis Yap', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.text)),
          ...children,
        ]),
      );

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6, top: 14),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
      );

  Widget _input(TextEditingController ctrl, {bool obscure = false, String? hint}) => TextField(
        controller: ctrl,
        obscureText: obscure,
        style: const TextStyle(color: AppColors.text, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: AppColors.textMuted),
          filled: true,
          fillColor: AppColors.bg,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.primary)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        ),
      );

  Widget _btn(String label, bool loading, VoidCallback onPressed) => SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: loading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        ),
      );

  @override
  void dispose() {
    _nameCtrl.dispose();
    _curPassCtrl.dispose();
    _newPassCtrl.dispose();
    super.dispose();
  }
}
