import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _handleLogin() async {
    final email = _emailCtrl.text.trim();
    final password = _passCtrl.text;
    if (email.isEmpty || password.isEmpty) {
      _showError('E-posta ve sifre girin.');
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().login(email, password);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.message ?? 'Baglanti hatasi';
      debugPrint('Login DioException: ${e.type} - ${e.message} - ${e.response?.statusCode}');
      _showError(msg.toString());
    } catch (e, stack) {
      debugPrint('Login error: $e\n$stack');
      _showError('Hata: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Container(
                width: 90, height: 90,
                decoration: BoxDecoration(
                  color: AppColors.gold,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Center(child: Text('☕', style: TextStyle(fontSize: 40))),
              ),
              const SizedBox(height: 16),
              const Text(
                "MOTTIS CAFFEE",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 6, color: AppColors.text),
              ),
              const SizedBox(height: 4),
              Text(
                'Good Coffee · True Algorithm',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted, letterSpacing: 1),
              ),
              const SizedBox(height: 48),

              _label('E-posta'),
              _input(_emailCtrl, 'ornek@email.com', keyboard: TextInputType.emailAddress),
              const SizedBox(height: 16),

              _label('Sifre'),
              _input(_passCtrl, '••••••', obscure: true),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Giris Yap', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 28),

              GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                child: RichText(
                  text: const TextSpan(
                    text: 'Hesabin yok mu? ',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    children: [
                      TextSpan(text: 'Kayit Ol', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        ),
      );

  Widget _input(TextEditingController ctrl, String hint, {bool obscure = false, TextInputType? keyboard}) =>
      TextField(
        controller: ctrl,
        obscureText: obscure,
        keyboardType: keyboard,
        style: const TextStyle(color: AppColors.text, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: AppColors.textMuted),
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.primary)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        ),
      );

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }
}
