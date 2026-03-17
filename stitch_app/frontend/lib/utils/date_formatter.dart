import 'package:intl/intl.dart';

/// Date display utilities.
class DateFormatter {
  DateFormatter._();

  /// Format an ISO 8601 date string for display.
  /// "2026-03-17T14:30:00.000Z" -> "Mar 17, 2026"
  static String formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString);
      return DateFormat.yMMMd().format(date.toLocal());
    } catch (_) {
      return '';
    }
  }

  /// Format an ISO 8601 date-time string for display.
  /// "2026-03-17T14:30:00.000Z" -> "Mar 17, 2026 2:30 PM"
  static String formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString);
      return DateFormat.yMMMd().add_jm().format(date.toLocal());
    } catch (_) {
      return '';
    }
  }

  /// Format a date as relative time.
  /// Returns "Just now", "5 min ago", "2 hours ago", "Yesterday", "Mar 17"
  static String formatRelative(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inSeconds < 60) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
      if (diff.inHours < 24) return '${diff.inHours} hours ago';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays} days ago';

      return DateFormat.MMMd().format(date);
    } catch (_) {
      return '';
    }
  }

  /// Format a date for transaction display.
  /// Shows time for today, date for older.
  static String formatTransactionDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final dateDay = DateTime(date.year, date.month, date.day);

      if (dateDay == today) {
        return DateFormat.jm().format(date); // "2:30 PM"
      }
      if (dateDay == today.subtract(const Duration(days: 1))) {
        return 'Yesterday';
      }
      if (date.year == now.year) {
        return DateFormat.MMMd().format(date); // "Mar 17"
      }
      return DateFormat.yMMMd().format(date); // "Mar 17, 2026"
    } catch (_) {
      return '';
    }
  }
}
