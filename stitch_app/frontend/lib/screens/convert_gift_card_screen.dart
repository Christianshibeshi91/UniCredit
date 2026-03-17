import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../components/merchant_grid.dart';
import '../components/loading_button.dart';
import '../components/error_banner.dart';

class ConvertGiftCardScreen extends StatefulWidget {
  const ConvertGiftCardScreen({super.key});

  @override
  State<ConvertGiftCardScreen> createState() => _ConvertGiftCardScreenState();
}

class _ConvertGiftCardScreenState extends State<ConvertGiftCardScreen> {
  int _step = 0; // 0: merchant, 1: details, 2: preview
  String _selectedMerchant = 'Amazon';
  final _cardNumberController = TextEditingController();
  final _pinController = TextEditingController();
  final _amountController = TextEditingController();
  bool _isConverting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _cardNumberController.dispose();
    _pinController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  double get _estimatedValue {
    final parsed = double.tryParse(_amountController.text) ?? 0;
    return parsed * 0.9;
  }

  bool get _canProceedToStep1 => _selectedMerchant.isNotEmpty;

  bool get _canProceedToStep2 =>
      _cardNumberController.text.isNotEmpty &&
      (double.tryParse(_amountController.text) ?? 0) > 0;

  void _nextStep() {
    if (_step == 0 && _canProceedToStep1) {
      setState(() => _step = 1);
    } else if (_step == 1 && _canProceedToStep2) {
      setState(() => _step = 2);
    }
  }

  void _prevStep() {
    if (_step > 0) {
      setState(() => _step--);
    } else if (Navigator.canPop(context)) {
      Navigator.pop(context);
    }
  }

  Future<void> _handleConvert() async {
    final amount = double.tryParse(_amountController.text);
    if (_cardNumberController.text.isEmpty || amount == null || amount <= 0) {
      setState(
          () => _error = 'Please fill in card number and a valid amount');
      return;
    }

    setState(() {
      _isConverting = true;
      _error = null;
    });

    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final result = await ApiService.convertGiftCard(
        merchant: _selectedMerchant,
        cardNumber: _cardNumberController.text,
        pin: _pinController.text,
        amount: amount,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        await appState.refreshWallet();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          AppWidgets.successSnackBar(
              '\$${result['addedValue']} added to your wallet!'),
        );
        _cardNumberController.clear();
        _pinController.clear();
        _amountController.clear();
        if (Navigator.canPop(context)) Navigator.pop(context);
      } else {
        setState(
            () => _error = result['error'] ?? 'Conversion failed');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isConverting = false);
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
                    AppSpacing.pagePadding, 16, AppSpacing.pagePadding, 0),
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
                    if (_step == 0) _buildStep0Merchant(),
                    if (_step == 1) _buildStep1Details(),
                    if (_step == 2) _buildStep2Preview(),
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
          Text('Convert Gift Card', style: AppTextStyles.screenTitle),
          Text(
            'STEP ${_step + 1} OF 3',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    final labels = ['Select merchant', 'Enter card details', 'Preview & confirm'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 12, AppSpacing.pagePadding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(labels[_step], style: AppTextStyles.caption),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_step + 1) / 3,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Step 0: Merchant Selection ──────────────────────────────────────────

  Widget _buildStep0Merchant() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Choose a Merchant', style: AppTextStyles.sectionHeader),
            Text('See All', style: AppTextStyles.link.copyWith(fontSize: 12)),
          ],
        ),
        const SizedBox(height: 16),
        MerchantGrid(
          selectedMerchant: _selectedMerchant,
          onSelected: (m) => setState(() => _selectedMerchant = m),
        ),
        const SizedBox(height: 28),
        _buildExchangeRateNote(),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Continue',
          onPressed: _nextStep,
          enabled: _canProceedToStep1,
          icon: Icons.arrow_forward,
        ),
      ],
    );
  }

  // ─── Step 1: Card Details ────────────────────────────────────────────────

  Widget _buildStep1Details() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Enter Card Details', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 16),
        _buildInputField(
          label: 'Card Number',
          hint: 'e.g. XXXX-XXXX-XXXX-XXXX',
          icon: Icons.credit_card_outlined,
          controller: _cardNumberController,
        ),
        const SizedBox(height: 14),
        _buildInputField(
          label: 'PIN / Security Code',
          hint: 'Enter PIN (optional)',
          icon: Icons.lock_outline,
          controller: _pinController,
          obscure: true,
        ),
        const SizedBox(height: 14),
        _buildInputField(
          label: 'Card Value (\$)',
          hint: 'e.g. 50.00',
          icon: Icons.attach_money,
          controller: _amountController,
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 24),
        _buildEstimatedValueCard(),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Preview Conversion',
          onPressed: _nextStep,
          enabled: _canProceedToStep2,
          icon: Icons.arrow_forward,
        ),
      ],
    );
  }

  // ─── Step 2: Preview & Confirm ───────────────────────────────────────────

  Widget _buildStep2Preview() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Conversion Preview', style: AppTextStyles.sectionHeader),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.surfaceBorder),
          ),
          child: Column(
            children: [
              _buildPreviewRow('Merchant', _selectedMerchant),
              const Divider(height: 24, color: AppColors.surfaceBorder),
              _buildPreviewRow('Card Number',
                  _cardNumberController.text.replaceRange(
                    0, (_cardNumberController.text.length > 4)
                        ? _cardNumberController.text.length - 4
                        : 0,
                    '*' * ((_cardNumberController.text.length > 4)
                        ? _cardNumberController.text.length - 4
                        : 0),
                  )),
              const Divider(height: 24, color: AppColors.surfaceBorder),
              _buildPreviewRow('Card Value', '\$${amount.toStringAsFixed(2)}'),
              const Divider(height: 24, color: AppColors.surfaceBorder),
              _buildPreviewRow('Exchange Rate', '90%'),
              const Divider(height: 24, color: AppColors.surfaceBorder),
              _buildPreviewRow(
                'You Receive',
                '\$${_estimatedValue.toStringAsFixed(2)}',
                valueColor: AppColors.success,
                isBold: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        LoadingButton.primary(
          label: 'Convert Gift Card',
          onPressed: _handleConvert,
          isLoading: _isConverting,
          icon: Icons.check_circle_outline,
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

  // ─── Shared Widgets ──────────────────────────────────────────────────────

  Widget _buildInputField({
    required String label,
    required String hint,
    required IconData icon,
    required TextEditingController controller,
    bool obscure = false,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.fieldLabel),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            keyboardType: keyboardType,
            style: GoogleFonts.dmSans(
                fontSize: 14, color: AppColors.textPrimary),
            decoration: InputDecoration(
              prefixIcon:
                  Icon(icon, color: AppColors.textTertiary, size: 20),
              hintText: hint,
              hintStyle:
                  GoogleFonts.dmSans(fontSize: 13, color: AppColors.textHint),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEstimatedValueCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.successLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You will receive',
                style: GoogleFonts.dmSans(
                    fontSize: 12, color: AppColors.success),
              ),
              const SizedBox(height: 4),
              Text(
                '\$${_estimatedValue.toStringAsFixed(2)} Stitch Credit',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF15803D),
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.account_balance_wallet_outlined,
                color: AppColors.success, size: 26),
          ),
        ],
      ),
    );
  }

  Widget _buildExchangeRateNote() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primaryLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: const Icon(Icons.currency_exchange,
                color: AppColors.primary, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Today's Exchange Rate",
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  '1 GC = 0.90 Stitch Credit  |  90% rate',
                  style: AppTextStyles.caption,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewRow(String label, String value,
      {Color? valueColor, bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.bodySmall),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
