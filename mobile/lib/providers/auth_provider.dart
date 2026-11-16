import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  static const String _tokenKey = 'clinica_auth_token';

  User? _user;
  String? _token;
  bool _isLoading = true;
  String? _errorMessage;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null && _user != null;

  final ApiClient _apiClient = ApiClient();

  AuthProvider() {
    initAuth();
  }

  /// Inicializa y valida la sesión existente guardada en SharedPreferences
  Future<void> initAuth() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final savedToken = prefs.getString(_tokenKey);

      if (savedToken != null && savedToken.isNotEmpty) {
        _token = savedToken;
        _apiClient.setToken(savedToken);

        final response = await _apiClient.get('/api/auth/me');
        if (response is Map<String, dynamic> && response['user'] != null) {
          _user = User.fromJson(response['user'] as Map<String, dynamic>);
        } else {
          await _clearStorage();
        }
      } else {
        await _clearStorage();
      }
    } catch (e) {
      // Si el token expiró o falló la verificación, limpiar credenciales
      await _clearStorage();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Inicio de sesión con correo y contraseña
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.post('/api/auth/login', body: {
        'email': email.trim(),
        'password': password,
      });

      if (response is Map<String, dynamic> && response['token'] != null) {
        final token = response['token'] as String;
        final userData = response['user'] as Map<String, dynamic>;

        _token = token;
        _user = User.fromJson(userData);
        _apiClient.setToken(token);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, token);

        _isLoading = false;
        notifyListeners();
        return true;
      }

      throw Exception('Respuesta inesperada del servidor');
    } catch (e) {
      _errorMessage = e is ApiException ? e.message : e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Registro de un nuevo paciente
  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final body = <String, dynamic>{
        'email': email.trim(),
        'password': password,
        'fullName': fullName.trim(),
      };
      if (phone != null && phone.trim().isNotEmpty) {
        body['phone'] = phone.trim();
      }

      final response = await _apiClient.post('/api/auth/register', body: body);

      if (response is Map<String, dynamic> && response['token'] != null) {
        final token = response['token'] as String;
        final userData = response['user'] as Map<String, dynamic>;

        _token = token;
        _user = User.fromJson(userData);
        _apiClient.setToken(token);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, token);

        _isLoading = false;
        notifyListeners();
        return true;
      }

      throw Exception('Respuesta inesperada al registrar el usuario');
    } catch (e) {
      _errorMessage = e is ApiException ? e.message : e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Cierre de sesión seguro
  Future<void> logout() async {
    await _clearStorage();
    notifyListeners();
  }

  /// Actualización de perfil (Nombre completo y Teléfono)
  Future<bool> updateProfile({
    required String fullName,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final body = <String, dynamic>{
        'fullName': fullName.trim(),
        'phone': phone?.trim(),
      };

      final response = await _apiClient.patch('/api/auth/profile', body: body);

      if (response is Map<String, dynamic> && response['user'] != null) {
        final updatedUser = User.fromJson(response['user'] as Map<String, dynamic>);
        _user = updatedUser;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Respuesta inesperada al actualizar el perfil');
    } catch (e) {
      _errorMessage = e is ApiException ? e.message : e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Cambio de contraseña de la cuenta
  Future<bool> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiClient.patch('/api/auth/password', body: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e is ApiException ? e.message : e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _clearStorage() async {
    _user = null;
    _token = null;
    _apiClient.setToken(null);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    } catch (_) {}
  }
}
