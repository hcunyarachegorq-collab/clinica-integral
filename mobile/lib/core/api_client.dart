import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic details;

  ApiException({
    required this.statusCode,
    required this.message,
    this.details,
  });

  @override
  String toString() => message;
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  String? get token => _token;

  Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final baseUrl = ApiConfig.baseUrl;
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$normalizedPath';

    if (queryParams != null && queryParams.isNotEmpty) {
      final sanitizedParams = queryParams.map(
        (key, value) => MapEntry(key, value?.toString() ?? ''),
      );
      return Uri.parse(fullUrl).replace(queryParameters: sanitizedParams);
    }
    return Uri.parse(fullUrl);
  }

  dynamic _processResponse(http.Response response) {
    String responseBody;
    try {
      responseBody = utf8.decode(response.bodyBytes);
    } catch (_) {
      responseBody = response.body;
    }

    dynamic data;
    if (responseBody.isNotEmpty) {
      try {
        data = jsonDecode(responseBody);
      } catch (_) {
        data = responseBody;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }

    String errorMessage = 'Error en el servidor (${response.statusCode})';
    dynamic details;

    if (data is Map<String, dynamic>) {
      if (data.containsKey('error')) {
        errorMessage = data['error'].toString();
      } else if (data.containsKey('message')) {
        errorMessage = data['message'].toString();
      }
      details = data['details'];
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: errorMessage,
      details: details,
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    final response = await http.get(uri, headers: _buildHeaders());
    return _processResponse(response);
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    final response = await http.post(
      uri,
      headers: _buildHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _processResponse(response);
  }

  Future<dynamic> patch(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    final response = await http.patch(
      uri,
      headers: _buildHeaders(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _processResponse(response);
  }

  Future<dynamic> delete(String path) async {
    final uri = _buildUri(path);
    final response = await http.delete(uri, headers: _buildHeaders());
    return _processResponse(response);
  }
}
