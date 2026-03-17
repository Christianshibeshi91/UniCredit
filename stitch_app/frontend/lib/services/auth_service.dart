import 'api_service.dart';
import '../models/api_response.dart';
import '../models/user.dart';

/// Auth-specific API calls.
/// Separated from ApiService for cleaner code organization.
class AuthService {
  AuthService._();

  /// Log in with email and password.
  /// Returns user data on success, error message on failure.
  static Future<ApiResponse<Map<String, dynamic>>> login({
    required String email,
    required String password,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/login',
      body: {'email': email, 'password': password},
      requiresAuth: false,
      fromJson: (json) => json,
    );
  }

  /// Register a new account.
  static Future<ApiResponse<Map<String, dynamic>>> register({
    required String email,
    required String password,
    String? name,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/register',
      body: {'email': email, 'password': password, 'name': name},
      requiresAuth: false,
      fromJson: (json) => json,
    );
  }

  /// Google OAuth sign-in.
  static Future<ApiResponse<Map<String, dynamic>>> googleSignIn({
    required String idToken,
    required String email,
    String? displayName,
    String? photoUrl,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/google',
      body: {
        'idToken': idToken,
        'email': email,
        'displayName': displayName,
        'photoUrl': photoUrl,
      },
      requiresAuth: false,
      fromJson: (json) => json,
    );
  }

  /// Get current user profile.
  static Future<ApiResponse<User>> getMe() async {
    return ApiService.get<User>(
      '/auth/me',
      fromJson: (json) => User.fromJson(json),
    );
  }

  /// Change password.
  static Future<ApiResponse<Map<String, dynamic>>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/change-password',
      body: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
      fromJson: (json) => json,
    );
  }

  /// Request password reset email.
  static Future<ApiResponse<Map<String, dynamic>>> forgotPassword({
    required String email,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/forgot-password',
      body: {'email': email},
      requiresAuth: false,
      fromJson: (json) => json,
    );
  }

  /// Reset password using token from email.
  static Future<ApiResponse<Map<String, dynamic>>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    return ApiService.post<Map<String, dynamic>>(
      '/auth/reset-password',
      body: {'token': token, 'newPassword': newPassword},
      requiresAuth: false,
      fromJson: (json) => json,
    );
  }
}
