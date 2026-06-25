import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Fiziksel cihaz icin bilgisayar IP'si, emulator icin 10.0.2.2 kullanin
  static const String baseUrl = 'http://192.168.0.17:3000';

  static Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<bool> _tryRefresh() async {
    final prefs = await SharedPreferences.getInstance();
    final refresh = prefs.getString('refreshToken');
    if (refresh == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/staff/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      );
      if (res.statusCode != 200) return false;
      final data = jsonDecode(res.body);
      await prefs.setString('accessToken', data['accessToken']);
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<dynamic> get(String path) async {
    var headers = await _headers();
    var res = await http.get(Uri.parse('$baseUrl$path'), headers: headers);

    if (res.statusCode == 401) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        headers = await _headers();
        res = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
      } else {
        throw ApiException('Oturum suresi doldu', 401);
      }
    }

    if (res.statusCode >= 400) {
      final body = _tryParseJson(res.body);
      throw ApiException(body?['error'] ?? 'Sunucu hatasi', res.statusCode);
    }
    return jsonDecode(res.body);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    var headers = await _headers();
    var res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode(body),
    );

    if (res.statusCode == 401) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        headers = await _headers();
        res = await http.post(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: jsonEncode(body),
        );
      } else {
        throw ApiException('Oturum suresi doldu', 401);
      }
    }

    if (res.statusCode >= 400) {
      final parsed = _tryParseJson(res.body);
      throw ApiException(parsed?['error'] ?? 'Sunucu hatasi', res.statusCode);
    }
    return jsonDecode(res.body);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    var headers = await _headers();
    var res = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode(body),
    );

    if (res.statusCode == 401) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        headers = await _headers();
        res = await http.put(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: jsonEncode(body),
        );
      } else {
        throw ApiException('Oturum suresi doldu', 401);
      }
    }

    if (res.statusCode >= 400) {
      final parsed = _tryParseJson(res.body);
      throw ApiException(parsed?['error'] ?? 'Sunucu hatasi', res.statusCode);
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> login(String identifier, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/staff/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'password': password}),
    );
    if (res.statusCode >= 400) {
      final parsed = _tryParseJson(res.body);
      throw ApiException(parsed?['error'] ?? 'Giris basarisiz', res.statusCode);
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', data['accessToken']);
    await prefs.setString('refreshToken', data['refreshToken']);
    await prefs.setString('staff', jsonEncode(data['staff']));
    return data;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  static Map<String, dynamic>? _tryParseJson(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
