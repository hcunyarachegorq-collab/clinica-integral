import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class ApiConfig {
  static String? _customBaseUrl;

  /// Permite sobrescribir manualmente la URL base si se prueba en dispositivo físico
  static void setBaseUrl(String url) {
    _customBaseUrl = url;
  }

  /// Retorna la URL base adecuada según la plataforma
  static String get baseUrl {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      return _customBaseUrl!;
    }

    if (kIsWeb) {
      return 'http://localhost:4000';
    }

    try {
      if (Platform.isAndroid) {
        // En emulador Android, 10.0.2.2 mapea a localhost de la máquina host
        return 'http://10.0.2.2:4000';
      }
    } catch (_) {
      // Plataforma no estándar o web
    }

    // Windows, macOS, Linux, iOS simulator
    return 'http://localhost:4000';
  }
}
