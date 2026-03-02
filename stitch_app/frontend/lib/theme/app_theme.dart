import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Centralized design system for the UniCredit / Stitch app.
/// All colors, typography, spacing, and component styles in one place.
class AppColors {
  // ─── Brand ──────────────────────────────────────────────────────────────
  static const primary = Color(0xFF135BEC);
  static const primaryLight = Color(0xFFE8F0FE);
  static const accent = Color(0xFF7C3AED);

  // ─── Text ───────────────────────────────────────────────────────────────
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textTertiary = Color(0xFF94A3B8);
  static const textHint = Color(0xFFCBD5E1);

  // ─── Surface / Background ──────────────────────────────────────────────
  static const background = Color(0xFFF6F6F8);
  static const surface = Colors.white;
  static const surfaceBorder = Color(0xFFF1F5F9);
  static const border = Color(0xFFE2E8F0);

  // ─── Semantic ──────────────────────────────────────────────────────────
  static const success = Color(0xFF16A34A);
  static const error = Color(0xFFDC2626);
  static const warning = Color(0xFFF59E0B);

  // ─── Gradient ──────────────────────────────────────────────────────────
  static const loginGradient = [Color(0xFF0A1628), Color(0xFF135BEC), Color(0xFF0A1628)];
  static const cardGradient = [Color(0xFF135BEC), Color(0xFF0D47A1)];
  static const tierGradient = [Color(0xFF7C3AED), Color(0xFF4F46E5)];
}

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;

  /// Standard horizontal page padding
  static const double pagePadding = 24;

  /// Standard header top padding
  static const double headerTop = 16;
}

class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double card = 16;
  static const double button = 16;
  static const double input = 12;
  static const double chip = 20;
}

class AppSizes {
  static const double buttonHeight = 54;
  static const double inputHeight = 50;
  static const double iconButton = 40;
  static const double touchTarget = 48;
}

class AppTextStyles {
  // ─── Headings ──────────────────────────────────────────────────────────
  static TextStyle screenTitle = GoogleFonts.manrope(
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static TextStyle sectionHeader = GoogleFonts.manrope(
    fontSize: 16,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static TextStyle sectionLabel = GoogleFonts.manrope(
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: AppColors.textTertiary,
    letterSpacing: 0.8,
  );

  // ─── Body ──────────────────────────────────────────────────────────────
  static TextStyle bodyLarge = GoogleFonts.manrope(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static TextStyle bodyMedium = GoogleFonts.manrope(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  static TextStyle bodySmall = GoogleFonts.manrope(
    fontSize: 13,
    color: AppColors.textSecondary,
  );

  static TextStyle caption = GoogleFonts.manrope(
    fontSize: 11,
    color: AppColors.textSecondary,
  );

  // ─── Labels ────────────────────────────────────────────────────────────
  static TextStyle fieldLabel = GoogleFonts.manrope(
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  );

  static TextStyle buttonText = GoogleFonts.manrope(
    fontSize: 15,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  );

  static TextStyle navLabel = GoogleFonts.manrope(
    fontSize: 10,
    fontWeight: FontWeight.w500,
    color: AppColors.textTertiary,
  );

  // ─── Special ───────────────────────────────────────────────────────────
  static TextStyle balance = GoogleFonts.manrope(
    fontSize: 34,
    fontWeight: FontWeight.w800,
    color: Colors.white,
    letterSpacing: -1,
  );
}

/// Common widget builders for consistent UI
class AppWidgets {
  /// Standard primary button
  static ButtonStyle primaryButton = ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.button),
    ),
    elevation: 0,
    minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
  );

  /// Standard accent button (purple)
  static ButtonStyle accentButton = ElevatedButton.styleFrom(
    backgroundColor: AppColors.accent,
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.button),
    ),
    elevation: 0,
    minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
  );

  /// Standard card decoration
  static BoxDecoration cardDecoration = BoxDecoration(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(AppRadius.card),
    border: Border.all(color: AppColors.surfaceBorder),
  );

  /// Success snackbar
  static SnackBar successSnackBar(String message) => SnackBar(
        content: Text(message),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
      );

  /// Error snackbar — sanitized message
  static SnackBar errorSnackBar(String message) => SnackBar(
        content: Text(_sanitizeErrorMessage(message)),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
      );

  /// Strip raw exception details from error messages shown to users
  static String _sanitizeErrorMessage(String message) {
    if (message.startsWith('Exception:') ||
        message.startsWith('Error:') ||
        message.contains('SocketException') ||
        message.contains('FormatException') ||
        message.contains('ClientException')) {
      return 'Something went wrong. Please try again.';
    }
    return message;
  }
}
