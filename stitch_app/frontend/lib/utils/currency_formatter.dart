import 'package:intl/intl.dart';

/// Currency formatting utility.
/// Converts between integer cents and display strings.
/// All internal monetary values are integer cents.
class CurrencyFormatter {
  CurrencyFormatter._();

  static final _formatter = NumberFormat.currency(
    locale: 'en_US',
    symbol: '\$',
    decimalDigits: 2,
  );

  /// Convert integer cents to display string.
  /// 1250 -> "\$12.50"
  /// 0 -> "\$0.00"
  /// -5000 -> "-\$50.00"
  static String centsToDisplay(int cents) {
    final dollars = cents / 100;
    return _formatter.format(dollars);
  }

  /// Convert integer cents to signed display string for transactions.
  /// 1250 -> "+\$12.50"
  /// -5000 -> "-\$50.00"
  static String centsToSignedDisplay(int cents) {
    final abs = cents.abs();
    final formatted = _formatter.format(abs / 100);
    if (cents >= 0) return '+$formatted';
    return '-$formatted';
  }

  /// Convert a user-entered dollar string to integer cents for API calls.
  /// "12.50" -> 1250
  /// "12" -> 1200
  /// Returns null if invalid.
  static int? displayToCents(String input) {
    if (input.isEmpty) return null;

    // Remove currency symbols and commas
    final cleaned = input.replaceAll(RegExp(r'[\$,\s]'), '');
    final parsed = double.tryParse(cleaned);
    if (parsed == null || parsed <= 0) return null;
    return (parsed * 100).round();
  }

  /// Format cents as a compact display (no cents if whole dollar).
  /// 5000 -> "\$50"
  /// 1250 -> "\$12.50"
  static String centsToCompactDisplay(int cents) {
    if (cents % 100 == 0) {
      return '\$${(cents ~/ 100)}';
    }
    return centsToDisplay(cents);
  }
}
