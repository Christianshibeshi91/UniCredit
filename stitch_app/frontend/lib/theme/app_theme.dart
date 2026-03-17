import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─────────────────────────────────────────────────────────────────────────────
// STITCH DESIGN SYSTEM v3.0
// Bold, modern, distinctive — NOT generic Material defaults.
// Typography: Plus Jakarta Sans (headings) + DM Sans (body)
// ─────────────────────────────────────────────────────────────────────────────

class AppColors {
  AppColors._();

  // ─── Brand ────────────────────────────────────────────────────────────────
  static const primary = Color(0xFF6C5CE7);
  static const primaryLight = Color(0xFFE8E5FC);
  static const primaryDark = Color(0xFF4834D4);
  static const accent = Color(0xFF00D2FF);
  static const accentDark = Color(0xFF00B4D8);
  static const secondary = Color(0xFFFF6B6B);

  // ─── Text — Light Mode ────────────────────────────────────────────────────
  static const textPrimary = Color(0xFF1A1B2E);
  static const textSecondary = Color(0xFF6B7280);
  static const textTertiary = Color(0xFF9CA3AF);
  static const textHint = Color(0xFFD1D5DB);

  // ─── Text — Dark Mode ────────────────────────────────────────────────────
  static const textPrimaryDark = Color(0xFFF3F4F6);
  static const textSecondaryDark = Color(0xFF9CA3AF);
  static const textTertiaryDark = Color(0xFF6B7280);

  // ─── Surfaces — Light ────────────────────────────────────────────────────
  static const background = Color(0xFFF8F9FC);
  static const surface = Colors.white;
  static const surfaceElevated = Color(0xFFFDFDFE);
  static const surfaceBorder = Color(0xFFF0F1F5);
  static const border = Color(0xFFE5E7EB);
  static const borderLight = Color(0xFFF3F4F6);

  // ─── Surfaces — Dark ────────────────────────────────────────────────────
  static const backgroundDark = Color(0xFF0F0F1A);
  static const surfaceDark = Color(0xFF1A1B2E);
  static const surfaceElevatedDark = Color(0xFF252640);
  static const borderDark = Color(0xFF2D2E45);

  // ─── Semantic ────────────────────────────────────────────────────────────
  static const success = Color(0xFF10B981);
  static const successLight = Color(0xFFD1FAE5);
  static const error = Color(0xFFEF4444);
  static const errorLight = Color(0xFFFEE2E2);
  static const warning = Color(0xFFF59E0B);
  static const warningLight = Color(0xFFFEF3C7);
  static const info = Color(0xFF3B82F6);
  static const infoLight = Color(0xFFDBEAFE);

  // ─── Gradients ───────────────────────────────────────────────────────────
  static const primaryGradient = [Color(0xFF6C5CE7), Color(0xFF4834D4)];
  static const accentGradient = [Color(0xFF00D2FF), Color(0xFF0090FF)];
  static const heroGradient = [Color(0xFF6C5CE7), Color(0xFF00D2FF)];
  static const warmGradient = [Color(0xFFFF6B6B), Color(0xFFFF8E53)];
  static const darkGradient = [Color(0xFF1A1B2E), Color(0xFF2D2E45)];
  static const glassGradient = [Color(0x26FFFFFF), Color(0x0DFFFFFF)];
  static const cardGradient = [Color(0xFF6C5CE7), Color(0xFF8B5CF6), Color(0xFF4834D4)];
  static const loginGradient = [Color(0xFF0F0F1A), Color(0xFF1A1B2E), Color(0xFF2D2E45)];

  // ─── Occasion Colors (for gift categories) ───────────────────────────────
  static const occasionBirthday = [Color(0xFFEC4899), Color(0xFFDB2777)];
  static const occasionWedding = [Color(0xFFF97316), Color(0xFFEA580C)];
  static const occasionGraduation = [Color(0xFF8B5CF6), Color(0xFF6D28D9)];
  static const occasionAnniversary = [Color(0xFFE11D48), Color(0xFFBE123C)];
  static const occasionHoliday = [Color(0xFF10B981), Color(0xFF059669)];
  static const occasionBaby = [Color(0xFF06B6D4), Color(0xFF0891B2)];
  static const occasionFarewell = [Color(0xFF8B5CF6), Color(0xFF7C3AED)];
  static const occasionCongrats = [Color(0xFFF59E0B), Color(0xFFD97706)];
  static const occasionThankYou = [Color(0xFF14B8A6), Color(0xFF0D9488)];

  // ─── Merchant Colors ─────────────────────────────────────────────────────
  static const merchantAmazon = [Color(0xFFF97316), Color(0xFFEF4444)];
  static const merchantItunes = [Color(0xFFEC4899), Color(0xFFBE185D)];
  static const merchantGooglePlay = [Color(0xFF10B981), Color(0xFF059669)];
  static const merchantSteam = [Color(0xFF6366F1), Color(0xFF4338CA)];
  static const merchantWalmart = [Color(0xFF0EA5E9), Color(0xFF0284C7)];
  static const merchantEbay = [Color(0xFFF59E0B), Color(0xFFD97706)];

  // ─── Navigation ──────────────────────────────────────────────────────────
  static const navActive = Color(0xFF6C5CE7);
  static const navInactive = Color(0xFF9CA3AF);
  static const navBackground = Colors.white;
  static const navBackgroundDark = Color(0xFF1A1B2E);
}

class AppSpacing {
  AppSpacing._();
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double xxxxl = 48;

  /// Standard horizontal page padding.
  static const double pagePadding = 24;

  /// Standard header top padding.
  static const double headerTop = 16;

  /// Gap between sections on a screen.
  static const double sectionGap = 28;
}

class AppRadius {
  AppRadius._();
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double card = 20;
  static const double button = 16;
  static const double input = 14;
  static const double chip = 24;
  static const double full = 999;
}

class AppSizes {
  AppSizes._();
  static const double buttonHeight = 56;
  static const double buttonHeightSmall = 44;
  static const double inputHeight = 52;
  static const double iconButton = 44;
  static const double touchTarget = 48;
  static const double navBarHeight = 80;
  static const double avatarSmall = 36;
  static const double avatarMedium = 48;
  static const double avatarLarge = 88;
  static const double balanceCardHeight = 200;
}

class AppTextStyles {
  AppTextStyles._();

  // ─── Display / Hero ─────────────────────────────────────────────────────
  static TextStyle displayLarge = GoogleFonts.plusJakartaSans(
    fontSize: 48,
    fontWeight: FontWeight.w900,
    color: AppColors.textPrimary,
    letterSpacing: -2,
    height: 1.1,
  );

  static TextStyle displayMedium = GoogleFonts.plusJakartaSans(
    fontSize: 36,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    letterSpacing: -1.5,
    height: 1.15,
  );

  // ─── Headings ───────────────────────────────────────────────────────────
  static TextStyle h1 = GoogleFonts.plusJakartaSans(
    fontSize: 28,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    letterSpacing: -0.8,
    height: 1.2,
  );

  static TextStyle h2 = GoogleFonts.plusJakartaSans(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
    height: 1.25,
  );

  static TextStyle h3 = GoogleFonts.plusJakartaSans(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  );

  static TextStyle screenTitle = GoogleFonts.plusJakartaSans(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  );

  static TextStyle sectionHeader = GoogleFonts.plusJakartaSans(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static TextStyle sectionLabel = GoogleFonts.plusJakartaSans(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    color: AppColors.textTertiary,
    letterSpacing: 1.0,
  );

  // ─── Body ───────────────────────────────────────────────────────────────
  static TextStyle bodyLarge = GoogleFonts.dmSans(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    height: 1.5,
  );

  static TextStyle bodyMedium = GoogleFonts.dmSans(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    height: 1.5,
  );

  static TextStyle bodySmall = GoogleFonts.dmSans(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );

  static TextStyle caption = GoogleFonts.dmSans(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );

  // ─── Labels ─────────────────────────────────────────────────────────────
  static TextStyle fieldLabel = GoogleFonts.plusJakartaSans(
    fontSize: 12,
    fontWeight: FontWeight.w700,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  );

  static TextStyle buttonText = GoogleFonts.plusJakartaSans(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: Colors.white,
  );

  static TextStyle buttonTextSmall = GoogleFonts.plusJakartaSans(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: Colors.white,
  );

  static TextStyle navLabel = GoogleFonts.dmSans(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.textTertiary,
  );

  static TextStyle chipLabel = GoogleFonts.dmSans(
    fontSize: 12,
    fontWeight: FontWeight.w600,
  );

  // ─── Special ────────────────────────────────────────────────────────────
  static TextStyle balance = GoogleFonts.plusJakartaSans(
    fontSize: 38,
    fontWeight: FontWeight.w900,
    color: Colors.white,
    letterSpacing: -1.5,
  );

  static TextStyle balanceLabel = GoogleFonts.plusJakartaSans(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: Colors.white70,
    letterSpacing: 1.0,
  );

  static TextStyle tierBadge = GoogleFonts.plusJakartaSans(
    fontSize: 10,
    fontWeight: FontWeight.w800,
    color: Colors.white,
    letterSpacing: 1.2,
  );

  static TextStyle amount = GoogleFonts.plusJakartaSans(
    fontSize: 14,
    fontWeight: FontWeight.w700,
  );

  static TextStyle errorText = GoogleFonts.dmSans(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.error,
  );

  static TextStyle link = GoogleFonts.plusJakartaSans(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.primary,
  );
}

// ─── Glassmorphism Helpers ──────────────────────────────────────────────────

class GlassDecoration {
  GlassDecoration._();

  /// Standard glass card — use on balance cards, featured sections.
  static BoxDecoration card({
    double borderRadius = AppRadius.card,
    Color? borderColor,
    double opacity = 0.12,
  }) {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(borderRadius),
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: opacity),
          Colors.white.withValues(alpha: opacity * 0.4),
        ],
      ),
      border: Border.all(
        color: borderColor ?? Colors.white.withValues(alpha: 0.2),
      ),
    );
  }

  /// Frosted glass effect — wraps a child with blur.
  static Widget frosted({
    required Widget child,
    double blurX = 20,
    double blurY = 20,
    double borderRadius = AppRadius.card,
    Color? tint,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurX, sigmaY: blurY),
        child: Container(
          decoration: BoxDecoration(
            color: tint ?? Colors.white.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.15),
            ),
          ),
          child: child,
        ),
      ),
    );
  }

  /// Dark frosted glass (for dark sections).
  static Widget darkFrosted({
    required Widget child,
    double blurX = 24,
    double blurY = 24,
    double borderRadius = AppRadius.card,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurX, sigmaY: blurY),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

class SkeletonBox extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = AppRadius.sm,
  });

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.04, end: 0.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: AppColors.textPrimary.withValues(alpha: _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}

/// Animated builder helper (since AnimatedBuilder is just AnimatedWidget).
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext, Widget?) builder;

  const AnimatedBuilder({
    super.key,
    required Animation<double> animation,
    required this.builder,
  }) : super(listenable: animation);

  @override
  Widget build(BuildContext context) {
    return builder(context, null);
  }
}

// ─── Common Widget Helpers ──────────────────────────────────────────────────

class AppWidgets {
  AppWidgets._();

  /// Primary elevated button style.
  static ButtonStyle primaryButton = ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.button),
    ),
    elevation: 0,
    minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
    textStyle: AppTextStyles.buttonText,
  );

  /// Accent / secondary button style.
  static ButtonStyle accentButton = ElevatedButton.styleFrom(
    backgroundColor: AppColors.secondary,
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.button),
    ),
    elevation: 0,
    minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
    textStyle: AppTextStyles.buttonText,
  );

  /// Outlined button style.
  static ButtonStyle outlinedButton = OutlinedButton.styleFrom(
    foregroundColor: AppColors.primary,
    side: const BorderSide(color: AppColors.border),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.button),
    ),
    minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
    textStyle: AppTextStyles.buttonText.copyWith(color: AppColors.primary),
  );

  /// Standard card decoration.
  static BoxDecoration cardDecoration = BoxDecoration(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(AppRadius.card),
    border: Border.all(color: AppColors.surfaceBorder),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.04),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ],
  );

  /// Input decoration for text fields.
  static InputDecoration inputDecoration({
    required String hint,
    IconData? prefixIcon,
    IconData? suffixIcon,
    VoidCallback? onSuffixTap,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.dmSans(
        fontSize: 14,
        color: AppColors.textHint,
      ),
      prefixIcon: prefixIcon != null
          ? Padding(
              padding: const EdgeInsets.only(left: 16, right: 12),
              child: Icon(prefixIcon, color: AppColors.textTertiary, size: 20),
            )
          : null,
      prefixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      suffixIcon: suffixIcon != null
          ? IconButton(
              icon: Icon(suffixIcon, color: AppColors.textTertiary, size: 20),
              onPressed: onSuffixTap,
            )
          : null,
      filled: true,
      fillColor: AppColors.surfaceElevated,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  /// Success snackbar.
  static SnackBar successSnackBar(String message) => SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(message,
                  style: GoogleFonts.dmSans(color: Colors.white, fontSize: 14)),
            ),
          ],
        ),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md)),
        margin: const EdgeInsets.all(AppSpacing.lg),
      );

  /// Error snackbar — sanitized message.
  static SnackBar errorSnackBar(String message) => SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(_sanitizeErrorMessage(message),
                  style: GoogleFonts.dmSans(color: Colors.white, fontSize: 14)),
            ),
          ],
        ),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md)),
        margin: const EdgeInsets.all(AppSpacing.lg),
      );

  /// Strip raw exception details from error messages shown to users.
  static String _sanitizeErrorMessage(String message) {
    if (message.startsWith('Exception:') ||
        message.startsWith('Error:') ||
        message.contains('SocketException') ||
        message.contains('FormatException') ||
        message.contains('ClientException') ||
        message.contains('HandshakeException') ||
        message.contains('TimeoutException')) {
      return 'Something went wrong. Please try again.';
    }
    return message;
  }
}

// ─── Theme Data Builders ────────────────────────────────────────────────────

class AppTheme {
  AppTheme._();

  /// Light theme.
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme().copyWith(
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: AppTextStyles.screenTitle,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: AppWidgets.primaryButton,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceElevated,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary;
          return AppColors.textTertiary;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryLight;
          }
          return AppColors.borderLight;
        }),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.surfaceBorder,
        thickness: 1,
        space: 1,
      ),
    );
  }

  /// Dark theme.
  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceDark,
        error: AppColors.error,
        brightness: Brightness.dark,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData.dark().textTheme,
      ).copyWith(
        bodyMedium: AppTextStyles.bodyMedium.copyWith(
          color: AppColors.textPrimaryDark,
        ),
        bodySmall: AppTextStyles.bodySmall.copyWith(
          color: AppColors.textSecondaryDark,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: AppTextStyles.screenTitle.copyWith(
          color: AppColors.textPrimaryDark,
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimaryDark),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: AppWidgets.primaryButton,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary;
          return AppColors.textTertiaryDark;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryDark;
          }
          return AppColors.borderDark;
        }),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderDark,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
