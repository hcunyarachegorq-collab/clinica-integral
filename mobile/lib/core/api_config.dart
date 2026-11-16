import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _prefKey = 'custom_api_url';

  /// Dirección IP LAN detectada de la máquina host
  static const String defaultLanUrl = 'http://192.168.1.33:4000';

  /// Dirección para emulador Android estándar
  static const String defaultEmulatorUrl = 'http://10.0.2.2:4000';

  static String? _customBaseUrl;

  /// Inicializa la configuración cargando cualquier URL guardada previamente
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(_prefKey);
      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        _customBaseUrl = savedUrl.trim();
      }
    } catch (_) {}
  }

  /// Guarda una nueva URL base tanto en memoria como en SharedPreferences
  static Future<void> setBaseUrl(String url) async {
    final cleanUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    _customBaseUrl = cleanUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, cleanUrl);
    } catch (_) {}
  }

  /// Restaura la URL por defecto eliminando la preferencia
  static Future<void> resetToDefault() async {
    _customBaseUrl = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefKey);
    } catch (_) {}
  }

  /// Retorna si hay una URL personalizada activa
  static bool get hasCustomUrl =>
      _customBaseUrl != null && _customBaseUrl!.isNotEmpty;

  /// Retorna la URL base adecuada según la plataforma o la configurada
  static String get baseUrl {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      return _customBaseUrl!;
    }

    if (kIsWeb) {
      return 'http://localhost:4000';
    }

    try {
      if (Platform.isAndroid) {
        // En Android (teléfono físico en Wi-Fi o emulador), se usa por defecto la IP LAN detectada
        return defaultLanUrl;
      }
    } catch (_) {}

    // Windows, macOS, Linux, iOS simulator
    return 'http://localhost:4000';
  }
}
