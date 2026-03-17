/// Client-side validation helpers.
/// These mirror the backend Joi schemas for early user feedback.
/// Server-side validation remains the authoritative check.
class Validators {
  Validators._();

  static final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Validate email format.
  /// Returns null if valid, error message string if invalid.
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    if (value.length > 254) {
      return 'Email is too long';
    }
    if (!_emailRegex.hasMatch(value)) {
      return 'Invalid email format';
    }
    return null;
  }

  /// Validate password.
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (value.length > 128) {
      return 'Password is too long';
    }
    return null;
  }

  /// Validate display name.
  static String? validateName(String? value) {
    if (value != null && value.length > 100) {
      return 'Name is too long (max 100 characters)';
    }
    return null;
  }

  /// Validate an amount in cents.
  static String? validateAmountCents(int? cents, {int maxCents = 5000000}) {
    if (cents == null || cents <= 0) {
      return 'Amount must be greater than \$0.00';
    }
    if (cents > maxCents) {
      return 'Amount must be \$${(maxCents / 100).toStringAsFixed(2)} or less';
    }
    return null;
  }

  /// Validate an amount entered as a dollar string.
  static String? validateDollarAmount(String? value, {double maxDollars = 50000}) {
    if (value == null || value.isEmpty) {
      return 'Amount is required';
    }
    final cleaned = value.replaceAll(RegExp(r'[\$,\s]'), '');
    final parsed = double.tryParse(cleaned);
    if (parsed == null || parsed <= 0) {
      return 'Invalid amount';
    }
    if (parsed > maxDollars) {
      return 'Amount must be \$${maxDollars.toStringAsFixed(2)} or less';
    }
    return null;
  }

  /// Validate gift message.
  static String? validateGiftMessage(String? value) {
    if (value != null && value.length > 2000) {
      return 'Message is too long (max 2000 characters)';
    }
    return null;
  }

  /// Validate card number format.
  static String? validateCardNumber(String? value) {
    if (value == null || value.isEmpty) {
      return 'Card number is required';
    }
    if (value.length < 4 || value.length > 50) {
      return 'Card number must be 4-50 characters';
    }
    if (!RegExp(r'^[a-zA-Z0-9\-]+$').hasMatch(value)) {
      return 'Card number must be alphanumeric (dashes allowed)';
    }
    return null;
  }

  /// Validate a required non-empty string.
  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }
}
