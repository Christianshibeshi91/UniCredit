import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'auth_service.dart';
import 'storage_service.dart';
import '../models/user.dart';
import '../models/transaction.dart';
import '../utils/currency_formatter.dart';

/// Authentication status enum.
enum AuthStatus { unknown, authenticated, unauthenticated }

/// Provider-based state management.
/// All monetary values are integer cents.
class AppState extends ChangeNotifier {
  // ─── Auth state ────────────────────────────────────────────────────────────
  AuthStatus _authStatus = AuthStatus.unknown;
  String _userId = '';
  String _userName = '';
  String _userEmail = '';
  String _userRole = 'user';
  String _tier = 'STANDARD';
  String? _photoUrl;

  // ─── Wallet state (INTEGER CENTS) ─────────────────────────────────────────
  int _balanceCents = 0;
  List<Transaction> _recentTransactions = [];

  // ─── Getters ──────────────────────────────────────────────────────────────
  AuthStatus get authStatus => _authStatus;
  String get userId => _userId;
  String get userName => _userName;
  String get userEmail => _userEmail;
  String get userRole => _userRole;
  String get tier => _tier;
  String? get photoUrl => _photoUrl;
  int get balanceCents => _balanceCents;
  List<Transaction> get recentTransactions => _recentTransactions;

  // Computed
  bool get isLoggedIn => _authStatus == AuthStatus.authenticated;
  bool get isAdmin => _userRole == 'admin';
  String get balanceDisplay => CurrencyFormatter.centsToDisplay(_balanceCents);

  /// Balance in dollars (for UI components that expect double).
  double get balance => _balanceCents / 100.0;

  /// Transactions as raw maps (for screens using map-based access).
  List<Map<String, dynamic>> get transactions =>
      _recentTransactions.map((tx) => {
            'amount': tx.amountCents / 100.0,
            'type': tx.type,
            'description': tx.description,
            'created_at': tx.createdAt,
            'category': tx.category,
          }).toList();

  /// Initialize: register 401 handler and try auto-login.
  Future<void> initialize() async {
    ApiService.setOnUnauthorized(() {
      _performLogout();
      notifyListeners();
    });
    await tryAutoLogin();
  }

  /// Try to restore session from saved token on app startup.
  Future<void> tryAutoLogin() async {
    final token = await StorageService.getToken();
    if (token == null) {
      _authStatus = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    ApiService.setToken(token);
    final response = await AuthService.getMe();

    if (response.isSuccess && response.data != null) {
      _setUserFromModel(response.data!);
      _authStatus = AuthStatus.authenticated;
      await _loadTransactions();
      notifyListeners();
    } else {
      // Token expired or invalid
      ApiService.setToken(null);
      await StorageService.clearToken();
      _authStatus = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  /// Log in with email + password via the backend.
  /// Returns null on success, error message on failure.
  Future<String?> login({
    required String email,
    required String password,
  }) async {
    final response = await AuthService.login(email: email, password: password);

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      final token = data['token'] as String?;
      final userData = data['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        ApiService.setToken(token);
        await StorageService.saveToken(token);
        _setUserFromJson(userData);
        _authStatus = AuthStatus.authenticated;
        await _loadTransactions();
        notifyListeners();
        return null; // No error
      }
    }

    return response.error?.message ?? 'Login failed';
  }

  /// Register a new account via the backend.
  Future<String?> register({
    required String email,
    required String password,
    String? name,
  }) async {
    final response = await AuthService.register(
      email: email,
      password: password,
      name: name,
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      final token = data['token'] as String?;
      final userData = data['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        ApiService.setToken(token);
        await StorageService.saveToken(token);
        _setUserFromJson(userData);
        _authStatus = AuthStatus.authenticated;
        notifyListeners();
        return null;
      }
    }

    return response.error?.message ?? 'Registration failed';
  }

  /// Log in with Google ID token via the backend.
  Future<String?> loginWithGoogle({
    required String idToken,
    required String email,
    String? displayName,
    String? photoUrl,
  }) async {
    final response = await AuthService.googleSignIn(
      idToken: idToken,
      email: email,
      displayName: displayName,
      photoUrl: photoUrl,
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      final token = data['token'] as String?;
      final userData = data['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        ApiService.setToken(token);
        await StorageService.saveToken(token);
        _setUserFromJson(userData);
        _authStatus = AuthStatus.authenticated;
        await _loadTransactions();
        notifyListeners();
        return null;
      }
    }

    return response.error?.message ?? 'Google sign-in failed';
  }

  /// Refresh balance and transactions from the backend.
  Future<void> refreshWallet() async {
    if (_userId.isEmpty) return;

    // Fetch balance
    final balanceResp = await ApiService.get<Map<String, dynamic>>(
      '/wallet/balance',
      fromJson: (json) => json,
    );
    if (balanceResp.isSuccess && balanceResp.data != null) {
      _balanceCents = (balanceResp.data!['balanceCents'] as num?)?.toInt() ?? _balanceCents;
      _tier = balanceResp.data!['tier'] as String? ?? _tier;
    }

    // Fetch transactions
    await _loadTransactions();
    notifyListeners();
  }

  /// Log out and clear all state.
  Future<void> logout() async {
    _performLogout();
    await StorageService.clearToken();
    notifyListeners();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  void _performLogout() {
    _authStatus = AuthStatus.unauthenticated;
    _userId = '';
    _userName = '';
    _userEmail = '';
    _userRole = 'user';
    _tier = 'STANDARD';
    _photoUrl = null;
    _balanceCents = 0;
    _recentTransactions = [];
    ApiService.setToken(null);
  }

  void _setUserFromJson(Map<String, dynamic> json) {
    _userId = json['id'] as String? ?? '';
    _userName = json['name'] as String? ?? '';
    _userEmail = json['email'] as String? ?? '';
    _userRole = json['role'] as String? ?? 'user';
    _tier = json['tier'] as String? ?? 'STANDARD';
    _photoUrl = json['photoUrl'] as String?;
    _balanceCents = (json['balanceCents'] as num?)?.toInt() ?? 0;
  }

  void _setUserFromModel(User user) {
    _userId = user.id;
    _userName = user.name;
    _userEmail = user.email;
    _userRole = user.role;
    _tier = user.tier;
    _photoUrl = user.photoUrl;
    _balanceCents = user.balanceCents;
  }

  Future<void> _loadTransactions() async {
    if (_userId.isEmpty) return;
    final resp = await ApiService.get<Map<String, dynamic>>(
      '/wallet/transactions',
      queryParams: {'limit': '20'},
      fromJson: (json) => json,
    );
    if (resp.isSuccess && resp.data != null) {
      final dataList = resp.data!['data'];
      if (dataList is List) {
        _recentTransactions = dataList
            .whereType<Map<String, dynamic>>()
            .map((tx) => Transaction.fromJson(tx))
            .toList();
      }
    }
  }
}
