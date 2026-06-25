import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://192.168.0.17:3000';

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  SharedPreferences? _prefs;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        _prefs ??= await SharedPreferences.getInstance();
        final token = _prefs!.getString('accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            _prefs ??= await SharedPreferences.getInstance();
            final newToken = _prefs!.getString('accessToken');
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final response = await _dio.fetch(error.requestOptions);
            return handler.resolve(response);
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<SharedPreferences> get prefs async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<bool> _refreshToken() async {
    try {
      final p = await prefs;
      final refreshToken = p.getString('refreshToken');
      if (refreshToken == null) return false;

      final response = await Dio().post(
        '$baseUrl/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      await p.setString('accessToken', response.data['accessToken']);
      return true;
    } catch (_) {
      final p = await prefs;
      await p.clear();
      _prefs = null;
      return false;
    }
  }

  // Auth
  Future<Response> login(String email, String password) =>
      _dio.post('/auth/login', data: {'email': email, 'password': password});

  Future<Response> register(Map<String, dynamic> data) =>
      _dio.post('/auth/register', data: data);

  Future<Response> logout() => _dio.post('/auth/logout');

  // Customer
  Future<Response> getMe() => _dio.get('/me');
  Future<Response> getQR() => _dio.get('/me/qr');
  Future<Response> updateProfile(Map<String, dynamic> data) => _dio.put('/me', data: data);
  Future<Response> updatePassword(Map<String, dynamic> data) => _dio.put('/me/password', data: data);

  // Menu
  Future<Response> getMenu() => _dio.get('/menu');
  Future<Response> getFeatured() => _dio.get('/menu/featured');

  // Campaigns
  Future<Response> getCampaigns() => _dio.get('/campaigns');

  // Stores
  Future<Response> getStores({double? lat, double? lng}) {
    final params = <String, dynamic>{};
    if (lat != null && lng != null) {
      params['lat'] = lat;
      params['lng'] = lng;
    }
    return _dio.get('/stores', queryParameters: params);
  }
}
