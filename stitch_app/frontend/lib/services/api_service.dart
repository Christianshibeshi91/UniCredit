import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/environment.dart';
import '../models/api_response.dart';

/// Callback type for handling 401 auto-logout.
typedef OnUnauthorized = void Function();

/// Refactored HTTP client with centralized error handling.
/// All API calls go through this service for:
///   - Auth header injection
///   - 401 auto-logout
///   - Structured error parsing
///   - Integer cents currency handling
class ApiService {
  ApiService._();

  /// Auth token stored after login/register.
  static String? _authToken;

  /// Callback triggered on 401 responses for auto-logout.
  static OnUnauthorized? _onUnauthorized;

  static void setToken(String? token) => _authToken = token;
  static String? get token => _authToken;

  /// Register a callback for automatic logout on 401 responses.
  static void setOnUnauthorized(OnUnauthorized callback) {
    _onUnauthorized = callback;
  }

  /// Standard headers including auth token.
  static Map<String, String> _headers({bool requiresAuth = true}) {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (requiresAuth && _authToken != null) {
      h['Authorization'] = 'Bearer $_authToken';
    }
    return h;
  }

  // ─── Generic request methods ────────────────────────────────────────────────

  /// Perform a GET request.
  static Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, String>? queryParams,
    T Function(Map<String, dynamic>)? fromJson,
    bool requiresAuth = true,
  }) async {
    return _request<T>(
      method: 'GET',
      path: path,
      queryParams: queryParams,
      fromJson: fromJson,
      requiresAuth: requiresAuth,
    );
  }

  /// Perform a POST request.
  static Future<ApiResponse<T>> post<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
    bool requiresAuth = true,
  }) async {
    return _request<T>(
      method: 'POST',
      path: path,
      body: body,
      fromJson: fromJson,
      requiresAuth: requiresAuth,
    );
  }

  /// Perform a PUT request.
  static Future<ApiResponse<T>> put<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
    bool requiresAuth = true,
  }) async {
    return _request<T>(
      method: 'PUT',
      path: path,
      body: body,
      fromJson: fromJson,
      requiresAuth: requiresAuth,
    );
  }

  /// Perform a PATCH request.
  static Future<ApiResponse<T>> patch<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
    bool requiresAuth = true,
  }) async {
    return _request<T>(
      method: 'PATCH',
      path: path,
      body: body,
      fromJson: fromJson,
      requiresAuth: requiresAuth,
    );
  }

  // ─── Core request handler ──────────────────────────────────────────────────

  static Future<ApiResponse<T>> _request<T>({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    T Function(Map<String, dynamic>)? fromJson,
    bool requiresAuth = true,
  }) async {
    try {
      // Build URI
      final uri = Uri.parse('${Environment.apiUrl}$path').replace(
        queryParameters: queryParams?.isNotEmpty == true ? queryParams : null,
      );

      if (Environment.enableApiLogging) {
        // ignore: avoid_print
        print('API $method $uri');
      }

      // Build request
      final headers = _headers(requiresAuth: requiresAuth);
      http.Response response;

      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'PUT':
          response = await http.put(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        default:
          return ApiResponse.networkError('Unsupported HTTP method: $method');
      }

      // Handle 401 auto-logout
      if (response.statusCode == 401) {
        _authToken = null;
        _onUnauthorized?.call();

        final errorData = _tryParseJson(response.body);
        return ApiResponse.error(
          errorData != null
              ? ApiError.fromJson(errorData)
              : const ApiError(
                  code: 'AUTHENTICATION_REQUIRED',
                  message: 'Session expired. Please log in again.',
                ),
          401,
        );
      }

      // Parse response
      final responseData = _tryParseJson(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Success
        if (fromJson != null && responseData != null) {
          final data = responseData['data'];
          if (data is Map<String, dynamic>) {
            return ApiResponse.success(fromJson(data), response.statusCode);
          } else if (responseData.containsKey('data')) {
            // data could be a list or other type -- pass the full response
            return ApiResponse.success(
              fromJson(responseData),
              response.statusCode,
            );
          }
          return ApiResponse.success(
            fromJson(responseData),
            response.statusCode,
          );
        }
        return ApiResponse<T>(statusCode: response.statusCode);
      }

      // Error response
      return ApiResponse.error(
        responseData != null
            ? ApiError.fromJson(responseData)
            : ApiError(
                code: 'UNKNOWN',
                message: 'Request failed with status ${response.statusCode}',
              ),
        response.statusCode,
      );
    } catch (e) {
      if (Environment.enableApiLogging) {
        // ignore: avoid_print
        print('API Error: $e');
      }

      return ApiResponse.networkError(
        'Unable to connect to the server. Please check your connection.',
      );
    }
  }

  // ─── Convenience methods for screens ──────────────────────────────────────

  /// Fetch available Stripe prices for wallet top-up.
  static Future<List<Map<String, dynamic>>> getStripePrices() async {
    final resp = await get<Map<String, dynamic>>(
      '/stripe/prices',
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      final prices = resp.data!['prices'];
      if (prices is List) {
        return prices.cast<Map<String, dynamic>>();
      }
    }
    return [];
  }

  /// Create a Stripe checkout session. Returns the checkout URL or null.
  static Future<String?> createCheckoutSession({
    required String priceId,
    required String userEmail,
  }) async {
    final resp = await post<Map<String, dynamic>>(
      '/stripe/checkout',
      body: {'priceId': priceId, 'email': userEmail},
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      return resp.data!['url'] as String?;
    }
    return null;
  }

  /// Convert a gift card to wallet credit.
  static Future<Map<String, dynamic>> convertGiftCard({
    required String merchant,
    required String cardNumber,
    required String pin,
    required double amount,
  }) async {
    final resp = await post<Map<String, dynamic>>(
      '/conversions/convert',
      body: {
        'merchant': merchant,
        'cardNumber': cardNumber,
        'pin': pin,
        'amountCents': (amount * 100).round(),
      },
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      return {'success': true, ...resp.data!};
    }
    return {
      'success': false,
      'error': resp.error?.message ?? 'Conversion failed',
    };
  }

  /// Fetch admin dashboard stats.
  static Future<Map<String, dynamic>> getAdminStats() async {
    final resp = await get<Map<String, dynamic>>(
      '/admin/stats',
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      return resp.data!;
    }
    throw Exception(resp.error?.message ?? 'Failed to load stats');
  }

  /// Send a gift to another user.
  static Future<Map<String, dynamic>> sendGift({
    required String recipientEmail,
    required double amount,
    required String message,
    required String occasion,
  }) async {
    final resp = await post<Map<String, dynamic>>(
      '/gifts/send',
      body: {
        'recipientEmail': recipientEmail,
        'amountCents': (amount * 100).round(),
        'message': message,
        'occasion': occasion,
      },
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      return {'success': true, ...resp.data!};
    }
    return {
      'success': false,
      'error': resp.error?.message ?? 'Failed to send gift',
    };
  }

  /// Change the current user's password.
  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final resp = await put<Map<String, dynamic>>(
      '/auth/change-password',
      body: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
      fromJson: (json) => json,
    );
    if (resp.isSuccess) {
      return {'success': true};
    }
    return {
      'success': false,
      'error': resp.error?.message ?? 'Failed to update password',
    };
  }

  /// Try to parse a JSON string. Returns null if parsing fails.
  static Map<String, dynamic>? _tryParseJson(String body) {
    try {
      final parsed = json.decode(body);
      if (parsed is Map<String, dynamic>) return parsed;
      return null;
    } catch (_) {
      return null;
    }
  }
}
