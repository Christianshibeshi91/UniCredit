/// Environment configuration.
/// API base URL is loaded from compile-time environment or defaults to localhost.
class Environment {
  Environment._();

  /// API base URL. Override at build time:
  /// flutter run --dart-define=API_BASE_URL=https://api.unicredit.app
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// API version prefix.
  static const String apiVersion = '/api/v1';

  /// Full API URL prefix.
  static String get apiUrl => '$apiBaseUrl$apiVersion';

  /// Whether to enable debug logging for API calls.
  static const bool enableApiLogging = bool.fromEnvironment(
    'ENABLE_API_LOGGING',
    defaultValue: true,
  );
}
