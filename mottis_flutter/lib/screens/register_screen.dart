import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  DateTime? _birthDate;
  String? _gender;
  bool _loading = false;

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1940),
      lastDate: now,
      helpText: 'Dogum tarihinizi secin',
      cancelText: 'Iptal',
      confirmText: 'Tamam',
      fieldLabelText: 'Tarih girin',
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            onPrimary: Colors.white,
            surface: AppColors.card,
            onSurface: AppColors.text,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _birthDate = picked);
  }

  Future<void> _handleRegister() async {
    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final password = _passCtrl.text;

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      _showError('Ad, e-posta ve sifre zorunlu.');
      return;
    }
    if (password.length < 6) {
      _showError('Sifre en az 6 karakter olmali.');
      return;
    }

    setState(() => _loading = true);
    try {
      final data = <String, dynamic>{
        'name': name,
        'email': email,
        'password': password,
      };
      if (phone.isNotEmpty) data['phone'] = phone;
      if (_birthDate != null) {
        data['birthDate'] = '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}';
      }
      if (_gender != null) data['gender'] = _gender;

      await context.read<AuthProvider>().register(data);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.message ?? 'Baglanti hatasi';
      debugPrint('DioException: ${e.type} - ${e.message} - ${e.response?.statusCode} - ${e.response?.data}');
      _showError(msg.toString());
    } catch (e, stack) {
      debugPrint('Register error: $e\n$stack');
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Text('← Geri', style: TextStyle(color: AppColors.primary, fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 28),
              const Text('Hesap Olustur', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.text)),
              const SizedBox(height: 6),
              Text("Mottis Coffee sadakat kartina hos geldin", style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const SizedBox(height: 32),

              _label('Ad Soyad *'),
              _input(_nameCtrl, 'Adin Soyadin', capitalize: true),
              const SizedBox(height: 14),

              _label('E-posta *'),
              _input(_emailCtrl, 'ornek@email.com', keyboard: TextInputType.emailAddress),
              const SizedBox(height: 14),

              _label('Telefon'),
              _input(_phoneCtrl, '05XX XXX XX XX', keyboard: TextInputType.phone),
              const SizedBox(height: 14),

              _label('Dogum Tarihi'),
              GestureDetector(
                onTap: _pickBirthDate,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    _birthDate != null
                        ? '${_birthDate!.day.toString().padLeft(2, '0')}.${_birthDate!.month.toString().padLeft(2, '0')}.${_birthDate!.year}'
                        : 'Secmek icin dokun',
                    style: TextStyle(
                      fontSize: 15,
                      color: _birthDate != null ? AppColors.text : AppColors.textMuted,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              _label('Cinsiyet'),
              Row(
                children: [
                  _genderChip('Erkek', 'male'),
                  const SizedBox(width: 10),
                  _genderChip('Kadin', 'female'),
                  const SizedBox(width: 10),
                  _genderChip('Diger', 'other'),
                ],
              ),
              const SizedBox(height: 14),

              _label('Sifre *'),
              _input(_passCtrl, 'En az 6 karakter', obscure: true),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Kayit Ol', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: RichText(
                    text: const TextSpan(
                      text: 'Zaten hesabin var mi? ',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                      children: [TextSpan(text: 'Giris Yap', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _genderChip(String label, String value) {
    final selected = _gender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _gender = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? AppColors.primary : AppColors.border),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
      );

  Widget _input(TextEditingController ctrl, String hint, {bool obscure = false, TextInputType? keyboard, bool capitalize = false}) =>
      TextField(
        controller: ctrl,
        obscureText: obscure,
        keyboardType: keyboard,
        textCapitalization: capitalize ? TextCapitalization.words : TextCapitalization.none,
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
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }
}
