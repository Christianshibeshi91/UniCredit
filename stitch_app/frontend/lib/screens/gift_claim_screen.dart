import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../components/loading_button.dart';
import '../components/error_banner.dart';

/// Gift claim flow for gift recipients.
/// Allows a user to claim a gift via a claim code or deep link.
class GiftClaimScreen extends StatefulWidget {
  final String? claimCode;

  const GiftClaimScreen({super.key, this.claimCode});

  @override
  State<GiftClaimScreen> createState() => _GiftClaimScreenState();
}

class _GiftClaimScreenState extends State<GiftClaimScreen>
    with SingleTickerProviderStateMixin {
  final _claimCodeCtrl = TextEditingController();
  bool _isLoading = false;
  bool _claimed = false;
  String? _error;
  String? _senderName;
  double? _amount;
  String? _occasion;

  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();

    if (widget.claimCode != null && widget.claimCode!.isNotEmpty) {
      _claimCodeCtrl.text = widget.claimCode!;
      Future.microtask(_lookupGift);
    }
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _claimCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _lookupGift() async {
    final code = _claimCodeCtrl.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Please enter a claim code');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Simulate API call — in production this calls ApiService.lookupGift(code)
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    // For now, show a placeholder result.
    // Replace with actual API integration.
    setState(() {
      _isLoading = false;
      _senderName = 'Gift Sender';
      _amount = 25.0;
      _occasion = 'Birthday';
    });
  }

  Future<void> _claimGift() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Simulate claim — in production this calls ApiService.claimGift(code)
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    setState(() {
      _isLoading = false;
      _claimed = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      AppWidgets.successSnackBar(
          'Gift claimed! \$${_amount?.toStringAsFixed(2) ?? "0"} added to your wallet.'),
    );

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted && Navigator.canPop(context)) Navigator.pop(context);
    });
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
                _buildHeader(context),
                const SizedBox(height: 32),
                _buildIcon(),
                const SizedBox(height: 24),
                _buildTitle(),
                const SizedBox(height: 8),
                _buildSubtitle(),
                const SizedBox(height: 32),
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.pagePadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_error != null) ...[
                        ErrorBanner(
                          message: _error!,
                          onDismiss: () => setState(() => _error = null),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (!_claimed && _senderName == null) ...[
                        _buildClaimCodeInput(),
                        const SizedBox(height: 24),
                        LoadingButton.primary(
                          label: 'Look Up Gift',
                          onPressed: _lookupGift,
                          isLoading: _isLoading,
                          icon: Icons.search,
                        ),
                      ],
                      if (_senderName != null && !_claimed) ...[
                        _buildGiftPreview(),
                        const SizedBox(height: 24),
                        LoadingButton(
                          label: 'Claim This Gift',
                          onPressed: _claimGift,
                          isLoading: _isLoading,
                          gradient: AppColors.heroGradient,
                          icon: Icons.redeem,
                        ),
                      ],
                      if (_claimed) _buildClaimedState(),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, AppSpacing.headerTop, AppSpacing.pagePadding, 0),
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
              child: const Icon(Icons.arrow_back_ios_new,
                  size: 18, color: AppColors.textPrimary),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text('Claim Gift', style: AppTextStyles.screenTitle),
          ),
        ],
      ),
    );
  }

  Widget _buildIcon() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: AppColors.warmGradient,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.secondary.withValues(alpha: 0.3),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(Icons.redeem, color: Colors.white, size: 44),
    );
  }

  Widget _buildTitle() {
    return Text(
      _claimed ? 'Gift Claimed!' : 'Have a Claim Code?',
      style: AppTextStyles.h1,
    );
  }

  Widget _buildSubtitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Text(
        _claimed
            ? 'The credits have been added to your wallet.'
            : 'Enter the code from your gift notification to claim your credits.',
        style: AppTextStyles.bodySmall.copyWith(fontSize: 14),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildClaimCodeInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('CLAIM CODE', style: AppTextStyles.sectionLabel),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: _claimCodeCtrl,
            textCapitalization: TextCapitalization.characters,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: 4,
            ),
            textAlign: TextAlign.center,
            decoration: InputDecoration(
              hintText: 'XXXX-XXXX',
              hintStyle: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textHint,
                letterSpacing: 4,
              ),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGiftPreview() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withValues(alpha: 0.06),
            AppColors.accent.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.12),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: AppColors.primaryGradient),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(Icons.card_giftcard,
                    color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Gift from $_senderName',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _occasion ?? '',
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Column(
              children: [
                Text('Amount', style: AppTextStyles.caption),
                const SizedBox(height: 4),
                Text(
                  '\$${_amount?.toStringAsFixed(2) ?? "0.00"}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClaimedState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 24),
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.successLight,
              shape: BoxShape.circle,
            ),
            child:
                const Icon(Icons.check_circle, size: 48, color: AppColors.success),
          ),
          const SizedBox(height: 20),
          Text(
            '\$${_amount?.toStringAsFixed(2) ?? "0.00"} added!',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}
