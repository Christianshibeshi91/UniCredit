import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// Data class for an occasion item.
class OccasionData {
  final String label;
  final IconData icon;
  final List<Color> gradient;

  const OccasionData({
    required this.label,
    required this.icon,
    required this.gradient,
  });
}

/// Default occasion list.
const List<OccasionData> kDefaultOccasions = [
  OccasionData(label: 'Birthday', icon: Icons.cake_outlined, gradient: AppColors.occasionBirthday),
  OccasionData(label: 'Wedding', icon: Icons.favorite_outline, gradient: AppColors.occasionWedding),
  OccasionData(label: 'Graduation', icon: Icons.school_outlined, gradient: AppColors.occasionGraduation),
  OccasionData(label: 'Anniversary', icon: Icons.diamond_outlined, gradient: AppColors.occasionAnniversary),
  OccasionData(label: 'Holiday', icon: Icons.celebration_outlined, gradient: AppColors.occasionHoliday),
  OccasionData(label: 'New Baby', icon: Icons.child_care_outlined, gradient: AppColors.occasionBaby),
  OccasionData(label: 'Farewell', icon: Icons.flight_takeoff_outlined, gradient: AppColors.occasionFarewell),
  OccasionData(label: 'Congrats', icon: Icons.emoji_events_outlined, gradient: AppColors.occasionCongrats),
  OccasionData(label: 'Thank You', icon: Icons.volunteer_activism_outlined, gradient: AppColors.occasionThankYou),
  OccasionData(label: 'Other', icon: Icons.auto_awesome_outlined, gradient: [Color(0xFF6B7280), Color(0xFF4B5563)]),
];

/// Selectable occasion grid widget with animated selection.
class OccasionGrid extends StatelessWidget {
  final String selectedOccasion;
  final ValueChanged<String> onSelected;
  final List<OccasionData> occasions;

  const OccasionGrid({
    super.key,
    required this.selectedOccasion,
    required this.onSelected,
    this.occasions = kDefaultOccasions,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.05,
      ),
      itemCount: occasions.length,
      itemBuilder: (context, index) {
        final occasion = occasions[index];
        final isSelected = selectedOccasion == occasion.label;
        return GestureDetector(
          onTap: () => onSelected(occasion.label),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCubic,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: occasion.gradient,
              ),
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: isSelected
                  ? Border.all(color: Colors.white, width: 2.5)
                  : null,
              boxShadow: [
                BoxShadow(
                  color: occasion.gradient[0]
                      .withValues(alpha: isSelected ? 0.5 : 0.25),
                  blurRadius: isSelected ? 18 : 8,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(occasion.icon, color: Colors.white, size: 26),
                const SizedBox(height: 6),
                Text(
                  occasion.label,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
