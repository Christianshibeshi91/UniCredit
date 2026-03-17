import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// Error display banner with dismiss action.
/// Shows inline error messages with an icon and optional dismiss button.
class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;
  final ErrorBannerType type;

  const ErrorBanner({
    super.key,
    required this.message,
    this.onDismiss,
    this.type = ErrorBannerType.error,
  });

  @override
  Widget build(BuildContext context) {
    final config = _typeConfig;

    return AnimatedSize(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: config.bgColor,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: config.borderColor),
        ),
        child: Row(
          children: [
            Icon(config.icon, color: config.iconColor, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: config.textColor,
                ),
              ),
            ),
            if (onDismiss != null) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onDismiss,
                child: Icon(Icons.close, color: config.iconColor, size: 18),
              ),
            ],
          ],
        ),
      ),
    );
  }

  _BannerConfig get _typeConfig {
    switch (type) {
      case ErrorBannerType.error:
        return const _BannerConfig(
          bgColor: AppColors.errorLight,
          borderColor: Color(0xFFFCA5A5),
          iconColor: AppColors.error,
          textColor: Color(0xFF991B1B),
          icon: Icons.error_outline,
        );
      case ErrorBannerType.warning:
        return const _BannerConfig(
          bgColor: AppColors.warningLight,
          borderColor: Color(0xFFFCD34D),
          iconColor: AppColors.warning,
          textColor: Color(0xFF92400E),
          icon: Icons.warning_amber_outlined,
        );
      case ErrorBannerType.info:
        return const _BannerConfig(
          bgColor: AppColors.infoLight,
          borderColor: Color(0xFF93C5FD),
          iconColor: AppColors.info,
          textColor: Color(0xFF1E40AF),
          icon: Icons.info_outline,
        );
      case ErrorBannerType.success:
        return const _BannerConfig(
          bgColor: AppColors.successLight,
          borderColor: Color(0xFF6EE7B7),
          iconColor: AppColors.success,
          textColor: Color(0xFF065F46),
          icon: Icons.check_circle_outline,
        );
    }
  }
}

enum ErrorBannerType { error, warning, info, success }

class _BannerConfig {
  final Color bgColor;
  final Color borderColor;
  final Color iconColor;
  final Color textColor;
  final IconData icon;

  const _BannerConfig({
    required this.bgColor,
    required this.borderColor,
    required this.iconColor,
    required this.textColor,
    required this.icon,
  });
}
