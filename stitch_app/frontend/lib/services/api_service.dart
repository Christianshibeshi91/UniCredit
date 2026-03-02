import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000';

  /// Auth token stored after login/register.
  static String? _authToken;

  static void setToken(String? token) => _authToken = token;
  static String? get token => _authToken;

  /// Standard headers including auth token.
  static Map<String, String> get _headers {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (_authToken != null) {
      h['Authorization'] = 'Bearer $_authToken';
    }
    return h;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password}),
    );
    final data = json.decode(resp.body);
    if (resp.statusCode == 200 && data['token'] != null) {
      _authToken = data['token'];
    }
    return {'statusCode': resp.statusCode, ...data};
  }

  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    String? name,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'email': email, 'password': password, 'name': name}),
    );
    final data = json.decode(resp.body);
    if (resp.statusCode == 201 && data['token'] != null) {
      _authToken = data['token'];
    }
    return {'statusCode': resp.statusCode, ...data};
  }

  /// Google Sign-In: send Google ID token to backend for verification + login/register
  static Future<Map<String, dynamic>> googleSignIn({
    required String idToken,
    required String email,
    String? displayName,
    String? photoUrl,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/auth/google'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'idToken': idToken,
        'email': email,
        'displayName': displayName,
        'photoUrl': photoUrl,
      }),
    );
    final data = json.decode(resp.body);
    if (resp.statusCode == 200 && data['token'] != null) {
      _authToken = data['token'];
    }
    return {'statusCode': resp.statusCode, ...data};
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    if (_authToken == null) return null;
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: _headers,
      );
      if (resp.statusCode == 200) return json.decode(resp.body);
      if (resp.statusCode == 401) _authToken = null; // Token expired
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/auth/change-password'),
      headers: _headers,
      body: json.encode({
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      }),
    );
    return json.decode(resp.body);
  }

  // ─── User ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>?> getUser(String userId) async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/users/$userId'),
        headers: _headers,
      );
      if (resp.statusCode == 200) return json.decode(resp.body);
    } catch (_) {}
    return null;
  }

  // ─── Wallet ────────────────────────────────────────────────────────────────

  static Future<double> getBalance(String userId) async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/wallet/balance/$userId'),
        headers: _headers,
      );
      if (resp.statusCode == 200) {
        final data = json.decode(resp.body);
        return (data['balance'] as num).toDouble();
      }
    } catch (_) {}
    return 0.0;
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getTransactions(
      String userId) async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/transactions/$userId'),
        headers: _headers,
      );
      if (resp.statusCode == 200) {
        final List data = json.decode(resp.body);
        return data.cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }

  // ─── Convert Gift Card ─────────────────────────────────────────────────────
  // Backend now uses authenticated user from JWT token (no userId in body)

  static Future<Map<String, dynamic>> convertGiftCard({
    required String merchant,
    required String cardNumber,
    required String pin,
    required double amount,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/convert'),
      headers: _headers,
      body: json.encode({
        'merchant': merchant,
        'cardNumber': cardNumber,
        'pin': pin,
        'amount': amount,
      }),
    );
    return json.decode(resp.body);
  }

  // ─── Send Gift ─────────────────────────────────────────────────────────────
  // Backend now uses authenticated user as sender from JWT token

  static Future<Map<String, dynamic>> sendGift({
    required String recipientEmail,
    required double amount,
    required String message,
    String? occasion,
  }) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/api/gifts/send'),
      headers: _headers,
      body: json.encode({
        'recipientEmail': recipientEmail,
        'amount': amount,
        'message': message,
        'occasion': occasion,
      }),
    );
    return json.decode(resp.body);
  }

  // ─── Admin Stats ───────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getAdminStats() async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/admin/stats'),
        headers: _headers,
      );
      if (resp.statusCode == 200) return json.decode(resp.body);
    } catch (_) {}
    return {};
  }

  // ─── Stripe ────────────────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getStripePrices() async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/api/stripe/prices'),
        headers: _headers,
      );
      if (resp.statusCode == 200) {
        final List data = json.decode(resp.body);
        return data.cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }

  static Future<String?> createCheckoutSession({
    required String priceId,
    String? userEmail,
  }) async {
    try {
      final resp = await http.post(
        Uri.parse('$baseUrl/api/stripe/create-checkout-session'),
        headers: _headers,
        body: json.encode({'priceId': priceId, 'userEmail': userEmail}),
      );
      if (resp.statusCode == 200) {
        final data = json.decode(resp.body);
        return data['url'];
      }
    } catch (_) {}
    return null;
  }
}
