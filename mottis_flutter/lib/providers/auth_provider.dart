import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _customer;
  bool _loading = true;

  Map<String, dynamic>? get customer => _customer;
  bool get loading => _loading;
  bool get isLoggedIn => _customer != null;

  AuthProvider() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString('customer');
      if (stored != null) {
        _customer = jsonDecode(stored);
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    final response = await _api.login(email, password);
    final data = response.data;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', data['accessToken']);
    await prefs.setString('refreshToken', data['refreshToken']);
    await prefs.setString('customer', jsonEncode(data['customer']));
    _customer = Map<String, dynamic>.from(data['customer']);
    notifyListeners();
  }

  Future<void> register(Map<String, dynamic> formData) async {
    final response = await _api.register(formData);
    final data = response.data;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', data['accessToken']);
    await prefs.setString('refreshToken', data['refreshToken']);
    await prefs.setString('customer', jsonEncode(data['customer']));
    _customer = Map<String, dynamic>.from(data['customer']);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _customer = null;
    notifyListeners();
  }
}
