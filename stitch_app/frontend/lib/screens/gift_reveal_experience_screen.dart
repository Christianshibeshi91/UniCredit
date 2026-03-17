import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../components/loading_button.dart';

/// Gift reveal experience screen.
/// Uses REAL data passed via constructor — no hardcoded names/amounts.
class GiftRevealExperienceScreen extends StatefulWidget {
  final String senderName;
  final String occasion;
  final String message;
  final double amount;

  const GiftRevealExperienceScreen({
    super.key,
    this.senderName = 'Someone',
    this.occasion = 'Birthday',
    this.message = 'Enjoy your gift!',
    this.amount = 0,
  });

  @override
  State<GiftRevealExperienceScreen> createState() =>
      _GiftRevealExperienceScreenState();
}

class _GiftRevealExperienceScreenState
    extends State<GiftRevealExperienceScreen>
    with TickerProviderStateMixin {
  bool _revealed = false;
  bool _accepted = false;

  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late AnimationController _scaleCtrl;
  late Animation<double> _scaleAnim;
  late AnimationController _amountCtrl;
  late Animation<double> _amountAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _scaleAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.elasticOut),
    );

    _amountCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _amountAnim = Tween<double>(begin: 0, end: widget.amount).animate(
      CurvedAnimation(parent: _amountCtrl, curve: Curves.easeOutCubic),
    );

    _fadeCtrl.forward();
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _scaleCtrl.forward();
    });
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _scaleCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  void _revealGift() {
    setState(() => _revealed = true);
    _amountCtrl.forward();
  }

  void _acceptGift() {
    setState(() => _accepted = true);
    final nav = Navigator.of(context);
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted && nav.canPop()) nav.pop();
    });
  }

  IconData get _occasionIcon {
    switch (widget.occasion.toLowerCase()) {
      case 'birthday':
        return Icons.cake;
      case 'wedding':
        return Icons.favorite;
      case 'graduation':
        return Icons.school;
      case 'anniversary':
        return Icons.diamond;
      case 'holiday':
        return Icons.celebration;
      case 'new baby':
        return Icons.child_care;
      case 'farewell':
        return Icons.flight_takeoff;
      case 'congrats':
        return Icons.emoji_events;
      case 'thank you':
        return Icons.volunteer_activism;
      default:
        return Icons.auto_awesome;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            child: Column(
              children: [
                _buildTopBar(context),
                const SizedBox(height: 16),
                _buildSurpriseLabel(),
                const SizedBox(height: 12),
                _buildTitle(),
                const SizedBox(height: 12),
                _buildQuote(),
                const SizedBox(height: 28),
                _buildGiftVisual(),
                const SizedBox(height: 32),
                if (_revealed) ...[
                  _buildCreditsRevealed(),
                  const SizedBox(height: 32),
                  _buildActionButtons(context),
                ] else ...[
                  _buildRevealButton(),
                ],
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 12, AppSpacing.pagePadding, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(Icons.close,
                  size: 18, color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSurpriseLabel() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.heroGradient),
        borderRadius: BorderRadius.circular(AppRadius.chip),
      ),
      child: Text(
        'SURPRISE',
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.white,
          letterSpacing: 2.5,
        ),
      ),
    );
  }

  Widget _buildTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Text(
        "You've received a gift!",
        style: AppTextStyles.h1.copyWith(fontSize: 26),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildQuote() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 36),
      child: Text(
        '"${widget.message}"',
        style: GoogleFonts.dmSans(
          fontSize: 14,
          color: AppColors.textSecondary,
          fontStyle: FontStyle.italic,
          height: 1.5,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildGiftVisual() {
    return ScaleTransition(
      scale: _scaleAnim,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
        child: Container(
          height: 220,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.primary.withValues(alpha: 0.08),
                AppColors.accent.withValues(alpha: 0.06),
              ],
            ),
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.12),
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background occasion icon
              Icon(
                _occasionIcon,
                size: 100,
                color: AppColors.primary.withValues(alpha: 0.08),
              ),
              // Play/Reveal button
              if (!_revealed)
                GestureDetector(
                  onTap: _revealGift,
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: AppColors.primaryGradient),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.play_arrow_rounded,
                        color: Colors.white, size: 32),
                  ),
                )
              else
                const Icon(Icons.auto_awesome,
                    size: 64, color: AppColors.primary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCreditsRevealed() {
    return AnimatedBuilder(
      animation: _amountAnim,
      builder: (context, _) {
        return Column(
          children: [
            Text(
              'CREDITS REVEALED',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textTertiary,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  _amountAnim.value.toStringAsFixed(0),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 52,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -2,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Stitch Credits',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Sent by ${widget.senderName}',
              style: AppTextStyles.bodySmall,
            ),
          ],
        );
      },
    );
  }

  Widget _buildRevealButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: LoadingButton(
        label: 'Reveal Your Gift',
        onPressed: _revealGift,
        gradient: AppColors.heroGradient,
        icon: Icons.auto_awesome,
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        children: [
          LoadingButton(
            label: _accepted ? 'Gift Accepted!' : 'Accept Gift',
            onPressed: _accepted ? () {} : _acceptGift,
            gradient:
                _accepted ? [AppColors.success, AppColors.success] : AppColors.primaryGradient,
            icon: Icons.check_circle_outline,
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () {},
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.reply_rounded,
                    color: AppColors.primary, size: 18),
                const SizedBox(width: 6),
                Text('Send Thank You', style: AppTextStyles.link),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Animated builder helper.
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
