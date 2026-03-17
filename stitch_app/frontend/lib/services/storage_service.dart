import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure storage abstraction.
/// Uses FlutterSecureStorage for tokens and sensitive data.
class StorageService {
  StorageService._();

  static const _storage = FlutterSecureStorage();

  static const _tokenKey = 'auth_token';
  static const _biometricKey = 'biometric_enabled';

  /// Save JWT auth token securely.
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  /// Get stored JWT auth token.
  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /// Clear stored JWT auth token.
  static Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  /// Save biometric preference.
  static Future<void> saveBiometricPreference(bool enabled) async {
    await _storage.write(key: _biometricKey, value: enabled.toString());
  }

  /// Get biometric preference.
  static Future<bool> getBiometricPreference() async {
    final value = await _storage.read(key: _biometricKey);
    return value == 'true';
  }

  /// Clear all stored data (logout).
  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
