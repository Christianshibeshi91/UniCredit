import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../components/occasion_grid.dart';
import '../components/media_capture.dart';
import '../components/loading_button.dart';
import '../components/error_banner.dart';

class PersonalizeYourGiftScreen extends StatefulWidget {
  const PersonalizeYourGiftScreen({super.key});

  @override
  State<PersonalizeYourGiftScreen> createState() =>
      _PersonalizeYourGiftScreenState();
}

class _PersonalizeYourGiftScreenState extends State<PersonalizeYourGiftScreen> {
  int _step = 0; // 0-4: recipient, occasion, amount, media, message
  String _selectedOccasion = 'Birthday';
  final _recipientController = TextEditingController();
  final _amountController = TextEditingController();
  final _messageController = TextEditingController();
  final _dateController = TextEditingController();
  final _customOccasionController = TextEditingController();
  final _customOccasionFocus = FocusNode();
  bool _isSending = false;
  String? _error;

  static const _stepLabels = [
    'Who is it for?',
    'Choose an occasion',
    'Set the amount',
    'Add a personal touch',
    'Write your message',
  ];

  @override
  void dispose() {
    _recipientController.dispose();
    _amountController.dispose();
    _messageController.dispose();
    _dateController.dispose();
    _customOccasionController.dispose();
    _customOccasionFocus.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_step < 4) {
      setState(() {
        _step++;
        _error = null;
      });
    }
  }

  void _prevStep() {
    if (_step > 0) {
      setState(() {
        _step--;
        _error = null;
      });
    } else {
      Navigator.pop(context);
    }
  }

  bool get _canProceed {
    switch (_step) {
      case 0:
        return _recipientController.text.trim().isNotEmpty &&
            _recipientController.text.contains('@');
      case 1:
        return _selectedOccasion.isNotEmpty;
      case 2:
        return (double.tryParse(_amountController.text) ?? 0) > 0;
      case 3:
        return true; // media is optional
      case 4:
        return true;
      default:
        return false;
    }
  }

  Future<void> _handleSendGift() async {
    final recipient = _recipientController.text.trim();
    final amount = double.tryParse(_amountController.text);
    final message = _messageController.text.trim();

    if (recipient.isEmpty || amount == null || amount <= 0) {
      setState(
          () => _error = 'Please enter recipient email and a valid amount');
      return;
    }

    setState(() {
      _isSending = true;
      _error = null;
    });

    final scaffold = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final occasion = _selectedOccasion == 'Other'
          ? _customOccasionController.text.trim()
          : _selectedOccasion;

      final result = await ApiService.sendGift(
        recipientEmail: recipient,
        amount: amount,
        message: message.isNotEmpty ? message : 'Enjoy your gift!',
        occasion: occasion,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        await appState.refreshWallet();
        if (!mounted) return;
        scaffold.showSnackBar(
          AppWidgets.successSnackBar(
              'Gift of \$${amount.toStringAsFixed(2)} sent to $recipient!'),
        );
        if (nav.canPop()) nav.pop();
      } else {
        setState(() => _error = result['error'] ?? 'Failed to send gift');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            _buildProgressBar(),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSpacing.pagePadding, 12, AppSpacing.pagePadding, 0),
                child: ErrorBanner(
                  message: _error!,
                  onDismiss: () => setState(() => _error = null),
                ),
              ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.pagePadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),
                    _buildCurrentStep(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
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
            onTap: _prevStep,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: Icon(
                _step > 0 ? Icons.arrow_back_ios_new : Icons.close,
                size: 18,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Personalize Your Gift',
              style: AppTextStyles.screenTitle,
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 52), // balance the back button
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 12, AppSpacing.pagePadding, 0),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'STEP ${_step + 1} OF 5',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  letterSpacing: 0.5,
                ),
              ),
              Flexible(
                child: Text(
                  _stepLabels[_step],
                  style: AppTextStyles.caption,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_step + 1) / 5,
              backgroundColor: AppColors.border,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_step) {
      case 0:
        return _buildStepRecipient();
      case 1:
        return _buildStepOccasion();
      case 2:
        return _buildStepAmount();
      case 3:
        return _buildStepMedia();
      case 4:
        return _buildStepMessage();
      default:
        return const SizedBox.shrink();
    }
  }

  // ─── Step 0: Recipient ───────────────────────────────────────────────────

  Widget _buildStepRecipient() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Who is it for?', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 8),
        Text(
          'Enter the recipient\'s email address.',
          style: AppTextStyles.bodySmall,
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: _recipientController,
            keyboardType: TextInputType.emailAddress,
            style: GoogleFonts.dmSans(
                fontSize: 14, color: AppColors.textPrimary),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'e.g. sarah@example.com',
              hintStyle:
                  GoogleFonts.dmSans(fontSize: 13, color: AppColors.textHint),
              prefixIcon: const Icon(Icons.email_outlined,
                  color: AppColors.textTertiary, size: 20),
              suffixIcon: const Icon(Icons.contacts_outlined,
                  color: AppColors.textTertiary, size: 20),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Continue',
          onPressed: _nextStep,
          enabled: _canProceed,
          icon: Icons.arrow_forward,
        ),
      ],
    );
  }

  // ─── Step 1: Occasion ────────────────────────────────────────────────────

  Widget _buildStepOccasion() {
    final isOther = _selectedOccasion == 'Other';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Choose an Occasion', style: AppTextStyles.sectionHeader),
            Text(
              '${kDefaultOccasions.length} options',
              style: AppTextStyles.caption.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        OccasionGrid(
          selectedOccasion: _selectedOccasion,
          onSelected: (o) {
            setState(() => _selectedOccasion = o);
            if (o == 'Other') {
              Future.delayed(const Duration(milliseconds: 200), () {
                _customOccasionFocus.requestFocus();
              });
            }
          },
        ),
        // Custom occasion input
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          child: isOther
              ? Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Name your occasion',
                          style: AppTextStyles.fieldLabel),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.input),
                          border: Border.all(
                              color: AppColors.primary, width: 1.5),
                        ),
                        child: TextField(
                          controller: _customOccasionController,
                          focusNode: _customOccasionFocus,
                          style: GoogleFonts.dmSans(
                              fontSize: 14, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'e.g. Retirement, Promotion...',
                            hintStyle: GoogleFonts.dmSans(
                                fontSize: 13, color: AppColors.textHint),
                            prefixIcon: const Icon(Icons.edit_note_outlined,
                                color: AppColors.primary, size: 22),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
        ),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Continue',
          onPressed: _nextStep,
          enabled: _canProceed,
          icon: Icons.arrow_forward,
        ),
      ],
    );
  }

  // ─── Step 2: Amount ──────────────────────────────────────────────────────

  Widget _buildStepAmount() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Gift Amount', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 8),
        Text(
          'How much would you like to gift?',
          style: AppTextStyles.bodySmall,
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: '0.00',
              hintStyle: GoogleFonts.plusJakartaSans(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: AppColors.textHint,
              ),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 20),
                child: Text(
                  '\$',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
              prefixIconConstraints:
                  const BoxConstraints(minWidth: 40, minHeight: 48),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Quick amount chips
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [10, 25, 50, 100, 200].map((amt) {
            final isSelected = _amountController.text == amt.toString();
            return GestureDetector(
              onTap: () {
                _amountController.text = amt.toString();
                setState(() {});
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 18, vertical: 10),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? const LinearGradient(
                          colors: AppColors.primaryGradient)
                      : null,
                  color: isSelected ? null : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                  border: isSelected
                      ? null
                      : Border.all(color: AppColors.border),
                ),
                child: Text(
                  '\$$amt',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Continue',
          onPressed: _nextStep,
          enabled: _canProceed,
          icon: Icons.arrow_forward,
        ),
      ],
    );
  }

  // ─── Step 3: Media ───────────────────────────────────────────────────────

  Widget _buildStepMedia() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Add a Personal Touch', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 8),
        Text(
          'Record a short video or audio message (optional).',
          style: AppTextStyles.bodySmall,
        ),
        const SizedBox(height: 20),
        const MediaCapture(),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Continue',
          onPressed: _nextStep,
          icon: Icons.arrow_forward,
        ),
        const SizedBox(height: 12),
        Center(
          child: GestureDetector(
            onTap: _nextStep,
            child: Text('Skip this step', style: AppTextStyles.link),
          ),
        ),
      ],
    );
  }

  // ─── Step 4: Message & Delivery ──────────────────────────────────────────

  Widget _buildStepMessage() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Personal Message', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              TextField(
                controller: _messageController,
                maxLines: 4,
                style: GoogleFonts.dmSans(
                    fontSize: 14, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Write something heartfelt here...',
                  hintStyle: GoogleFonts.dmSans(
                      fontSize: 13, color: AppColors.textHint),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12, bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('0/200 words', style: AppTextStyles.caption),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Delivery scheduling
        Text('When to Deliver?', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(Icons.calendar_today_outlined,
                    color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Schedule Delivery',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text('Pick a date and time',
                        style: AppTextStyles.caption),
                  ],
                ),
              ),
              SizedBox(
                width: 110,
                child: TextField(
                  controller: _dateController,
                  style: GoogleFonts.dmSans(
                      fontSize: 12, color: AppColors.textSecondary),
                  decoration: InputDecoration(
                    hintText: 'mm/dd/yyyy',
                    hintStyle: GoogleFonts.dmSans(
                        fontSize: 11, color: AppColors.textHint),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          const BorderSide(color: AppColors.primary),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 8),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        LoadingButton(
          label: 'Send Gift',
          onPressed: _handleSendGift,
          isLoading: _isSending,
          gradient: AppColors.warmGradient,
          icon: Icons.card_giftcard,
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            'By continuing, you agree to our Terms of Service\nand Privacy Policy',
            style: AppTextStyles.caption,
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}
