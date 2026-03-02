import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AppState extends ChangeNotifier {
  String _userId = '';
  String _userName = '';
  String _userEmail = '';
  String _tier = 'STANDARD';
  double _balance = 0.0;
  bool _isLoggedIn = false;
  bool _isAdmin = false;
  List<Map<String, dynamic>> _transactions = [];

  String get userId => _userId;
  String get userName => _userName;
  String get userEmail => _userEmail;
  String get tier => _tier;
  double get balance => _balance;
  bool get isLoggedIn => _isLoggedIn;
  bool get isAdmin => _isAdmin;
  List<Map<String, dynamic>> get transactions => _transactions;

  /// Try to restore session from saved token on app startup.
  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null) return;

    ApiService.setToken(token);
    final user = await ApiService.getCurrentUser();
    if (user != null) {
      _userId = user['id'] ?? '';
      _userName = user['name'] ?? '';
      _userEmail = user['email'] ?? '';
      _tier = user['tier'] ?? 'STANDARD';
      _balance = (user['balance'] as num?)?.toDouble() ?? 0.0;
      _isAdmin = user['role'] == 'admin';
      _isLoggedIn = true;
      await _loadTransactions();
      notifyListeners();
    } else {
      // Token expired or invalid
      ApiService.setToken(null);
      await prefs.remove('auth_token');
    }
  }

  /// Log in with email + password via the backend.
  Future<String?> login({
    required String email,
    required String password,
  }) async {
    final result = await ApiService.login(email: email, password: password);

    if (result['statusCode'] == 200 && result['token'] != null) {
      final user = result['user'] as Map<String, dynamic>;
      _userId = user['id'] ?? '';
      _userName = user['name'] ?? '';
      _userEmail = user['email'] ?? '';
      _tier = user['tier'] ?? 'STANDARD';
      _balance = (user['balance'] as num?)?.toDouble() ?? 0.0;
      _isAdmin = user['role'] == 'admin';
      _isLoggedIn = true;

      // Persist token
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', result['token']);

      await _loadTransactions();
      notifyListeners();
      return null; // No error
    }

    return result['error'] ?? 'Login failed';
  }

  /// Register a new account via the backend.
  Future<String?> register({
    required String email,
    required String password,
    String? name,
  }) async {
    final result = await ApiService.register(
      email: email,
      password: password,
      name: name,
    );

    if ((result['statusCode'] == 201 || result['statusCode'] == 200) &&
        result['token'] != null) {
      final user = result['user'] as Map<String, dynamic>;
      _userId = user['id'] ?? '';
      _userName = user['name'] ?? '';
      _userEmail = user['email'] ?? '';
      _tier = user['tier'] ?? 'STANDARD';
      _balance = (user['balance'] as num?)?.toDouble() ?? 0.0;
      _isAdmin = user['role'] == 'admin';
      _isLoggedIn = true;

      // Persist token
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', result['token']);

      notifyListeners();
      return null; // No error
    }

    return result['error'] ?? 'Registration failed';
  }

  void setUser({
    required String userId,
    required String userName,
    required String userEmail,
    String tier = 'STANDARD',
    bool isAdmin = false,
  }) {
    _userId = userId;
    _userName = userName;
    _userEmail = userEmail;
    _tier = tier;
    _isLoggedIn = true;
    _isAdmin = isAdmin;
    notifyListeners();
  }

  void setBalance(double balance) {
    _balance = balance;
    notifyListeners();
  }

  void setTransactions(List<Map<String, dynamic>> txs) {
    _transactions = txs;
    notifyListeners();
  }

  Future<void> _loadTransactions() async {
    if (_userId.isEmpty) return;
    final txs = await ApiService.getTransactions(_userId);
    _transactions = txs;
  }

  /// Refresh balance and transactions from the backend.
  Future<void> refreshWallet() async {
    if (_userId.isEmpty) return;
    final balance = await ApiService.getBalance(_userId);
    _balance = balance;
    final txs = await ApiService.getTransactions(_userId);
    _transactions = txs;
    notifyListeners();
  }

  Future<void> logout() async {
    _userId = '';
    _userName = '';
    _userEmail = '';
    _tier = 'STANDARD';
    _balance = 0;
    _isLoggedIn = false;
    _isAdmin = false;
    _transactions = [];
    ApiService.setToken(null);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');

    notifyListeners();
  }
}
