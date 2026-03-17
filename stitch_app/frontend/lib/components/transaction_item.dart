import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// A single transaction row with icon, color coding, and amount.
class TransactionItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final String amount;
  final String time;
  final String type; // 'credit', 'debit', 'gift_sent', 'gift_received', 'conversion'
  final VoidCallback? onTap;

  const TransactionItem({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.time,
    required this.type,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final config = _typeConfig;
    final isCredit = amount.startsWith('+');

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Row(
          children: [
            // Icon container
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: config.bgColor,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(config.icon, color: config.iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            // Title + subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Amount + time
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  amount,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isCredit ? AppColors.success : AppColors.error,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  time,
                  style: GoogleFonts.dmSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  _TransactionTypeConfig get _typeConfig {
    switch (type) {
      case 'conversion':
        return const _TransactionTypeConfig(
          icon: Icons.currency_exchange,
          iconColor: AppColors.primary,
          bgColor: AppColors.primaryLight,
        );
      case 'credit':
        return const _TransactionTypeConfig(
          icon: Icons.add_circle_outline,
          iconColor: AppColors.success,
          bgColor: AppColors.successLight,
        );
      case 'gift_sent':
        return const _TransactionTypeConfig(
          icon: Icons.card_giftcard,
          iconColor: AppColors.secondary,
          bgColor: Color(0xFFFEE2E2),
        );
      case 'gift_received':
        return const _TransactionTypeConfig(
          icon: Icons.redeem,
          iconColor: AppColors.accent,
          bgColor: Color(0xFFE0F7FA),
        );
      case 'debit':
      default:
        return const _TransactionTypeConfig(
          icon: Icons.arrow_outward,
          iconColor: AppColors.error,
          bgColor: AppColors.errorLight,
        );
    }
  }
}

class _TransactionTypeConfig {
  final IconData icon;
  final Color iconColor;
  final Color bgColor;

  const _TransactionTypeConfig({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
  });
}
