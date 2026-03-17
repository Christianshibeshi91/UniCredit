import 'api_service.dart';

/// FCM token registration and push notification handling.
/// Graceful degradation: logs warning if FCM is not available.
class NotificationService {
  NotificationService._();

  /// Register an FCM push token with the backend.
  static Future<void> registerPushToken(String fcmToken) async {
    try {
      await ApiService.post(
        '/users/push-token',
        body: {'fcmToken': fcmToken},
      );
    } catch (e) {
      // Non-critical -- log and continue
      // ignore: avoid_print
      print('Failed to register push token: $e');
    }
  }

  /// Request notification permission from the OS (placeholder).
  /// The actual implementation depends on firebase_messaging package
  /// which is owned by Teammate 5 (UI/UX).
  static Future<bool> requestPermission() async {
    // Placeholder: actual implementation uses firebase_messaging
    return false;
  }
}
