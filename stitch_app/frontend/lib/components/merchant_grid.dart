import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// Data class for a merchant item.
class MerchantData {
  final String name;
  final IconData icon;
  final List<Color> gradient;

  const MerchantData({
    required this.name,
    required this.icon,
    required this.gradient,
  });
}

/// Default merchant list.
const List<MerchantData> kDefaultMerchants = [
  MerchantData(
    name: 'Amazon',
    icon: Icons.shopping_bag_outlined,
    gradient: AppColors.merchantAmazon,
  ),
  MerchantData(
    name: 'iTunes',
    icon: Icons.music_note_outlined,
    gradient: AppColors.merchantItunes,
  ),
  MerchantData(
    name: 'Google Play',
    icon: Icons.play_circle_outline,
    gradient: AppColors.merchantGooglePlay,
  ),
  MerchantData(
    name: 'Steam',
    icon: Icons.videogame_asset_outlined,
    gradient: AppColors.merchantSteam,
  ),
  MerchantData(
    name: 'Walmart',
    icon: Icons.store_outlined,
    gradient: AppColors.merchantWalmart,
  ),
  MerchantData(
    name: 'eBay',
    icon: Icons.storefront_outlined,
    gradient: AppColors.merchantEbay,
  ),
];

/// Selectable merchant grid widget.
class MerchantGrid extends StatelessWidget {
  final String selectedMerchant;
  final ValueChanged<String> onSelected;
  final List<MerchantData> merchants;

  const MerchantGrid({
    super.key,
    required this.selectedMerchant,
    required this.onSelected,
    this.merchants = kDefaultMerchants,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final itemWidth = (screenWidth - (AppSpacing.pagePadding * 2) - 20) / 3;

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: merchants.map((merchant) {
        final isSelected = selectedMerchant == merchant.name;
        return GestureDetector(
          onTap: () => onSelected(merchant.name),
          child: AnimatedContainer(
            width: itemWidth,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: merchant.gradient,
                    )
                  : null,
              color: isSelected ? null : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(
                color: isSelected ? Colors.transparent : AppColors.border,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: merchant.gradient[0].withValues(alpha: 0.35),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ]
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  merchant.icon,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                  size: 26,
                ),
                const SizedBox(height: 8),
                Text(
                  merchant.name,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
