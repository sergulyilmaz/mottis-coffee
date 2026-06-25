import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  Map<String, dynamic>? _staff;
  bool _initialized = false;

  Map<String, dynamic>? get staff => _staff;
  bool get isAuthenticated => _staff != null;
  bool get initialized => _initialized;
  String get staffName => _staff?['name'] ?? '';
  String get staffRole => _staff?['role'] ?? '';

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    final staffJson = prefs.getString('staff');
    if (token != null && staffJson != null) {
      _staff = jsonDecode(staffJson) as Map<String, dynamic>;
    }
    _initialized = true;
    notifyListeners();
  }

  Future<void> login(String identifier, String password) async {
    final data = await ApiService.login(identifier, password);
    _staff = data['staff'] as Map<String, dynamic>;
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiService.logout();
    _staff = null;
    notifyListeners();
  }
}
