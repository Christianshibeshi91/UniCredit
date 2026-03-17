import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../components/loading_button.dart';

class AddCreditScreen extends StatefulWidget {
  const AddCreditScreen({super.key});

  @override
  State<AddCreditScreen> createState() => _AddCreditScreenState();
}

class _AddCreditScreenState extends State<AddCreditScreen> {
  int _selectedAmount = 50;
  String _selectedMethod = 'card';
  bool _isLoading = false;
  List<Map<String, dynamic>> _stripePrices = [];

  final List<Map<String, dynamic>> _amounts = [
    {'value': 10, 'bonus': null},
    {'value': 25, 'bonus': null},
    {'value': 50, 'bonus': '+\$2 bonus'},
    {'value': 100, 'bonus': '+\$5 bonus'},
    {'value': 200, 'bonus': '+\$15 bonus'},
    {'value': 500, 'bonus': '+\$50 bonus'},
  ];

  @override
  void initState() {
    super.initState();
    _loadPrices();
  }

  Future<void> _loadPrices() async {
    final prices = await ApiService.getStripePrices();
    if (mounted) {
      setState(() => _stripePrices = prices);
    }
  }

  String? _matchingPriceId() {
    for (final p in _stripePrices) {
      if ((p['amount'] as num).toInt() == _selectedAmount) {
        return p['id'] as String;
      }
    }
    return _stripePrices.isNotEmpty
        ? _stripePrices.first['id'] as String
        : null;
  }

  Future<void> _handleAddCredit() async {
    setState(() => _isLoading = true);
    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final priceId = _matchingPriceId();

      if (priceId != null) {
        final url = await ApiService.createCheckoutSession(
          priceId: priceId,
          userEmail: appState.userEmail,
        );
        if (url != null && mounted) {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
            await Future.delayed(const Duration(seconds: 2));
            await appState.refreshWallet();
            if (mounted && Navigator.canPop(context)) Navigator.pop(context);
            return;
          }
        }
      }

      // Fallback: direct in-memory credit
      await ApiService.convertGiftCard(
        merchant: 'Wallet Top-Up',
        cardNumber: 'TOPUP',
        pin: '',
        amount: _selectedAmount.toDouble(),
      );
      await appState.refreshWallet();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.successSnackBar('\$$_selectedAmount added to your wallet!'),
      );
      if (Navigator.canPop(context)) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.errorSnackBar('Something went wrong. Please try again.'),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context),
              _buildSelectedAmountDisplay(),
              _buildAmountGrid(),
              _buildPaymentMethods(),
              _buildAddButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, AppSpacing.headerTop + 4, AppSpacing.pagePadding, 8),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add Credit', style: AppTextStyles.h2),
              Text('Top up your Stitch wallet',
                  style: AppTextStyles.caption),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedAmountDisplay() {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.pagePadding, vertical: 16),
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: AppColors.cardGradient,
          ),
          borderRadius: BorderRadius.circular(AppRadius.xxl),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.35),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You are adding',
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.75),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '\$$_selectedAmount',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 44,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -2,
                  ),
                ),
              ],
            ),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.xl),
              ),
              child: const Icon(Icons.account_balance_wallet,
                  color: Colors.white, size: 30),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select Amount', style: AppTextStyles.sectionHeader),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.2,
            ),
            itemCount: _amounts.length,
            itemBuilder: (context, index) {
              final item = _amounts[index];
              final isSelected = _selectedAmount == item['value'];
              return GestureDetector(
                onTap: () =>
                    setState(() => _selectedAmount = item['value'] as int),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    gradient: isSelected
                        ? const LinearGradient(
                            colors: AppColors.primaryGradient)
                        : null,
                    color: isSelected ? null : AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: isSelected
                        ? null
                        : Border.all(color: AppColors.border),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color:
                                  AppColors.primary.withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '\$${item['value']}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: isSelected
                              ? Colors.white
                              : AppColors.textPrimary,
                        ),
                      ),
                      if (item['bonus'] != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          item['bonus'] as String,
                          style: GoogleFonts.dmSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white.withValues(alpha: 0.9)
                                : AppColors.success,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethods() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 24, AppSpacing.pagePadding, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Payment Method', style: AppTextStyles.sectionHeader),
          const SizedBox(height: 14),
          _buildMethodTile(
            id: 'card',
            icon: Icons.credit_card,
            label: 'Credit / Debit Card',
            sublabel: 'Visa, Mastercard, Amex',
          ),
          const SizedBox(height: 10),
          _buildMethodTile(
            id: 'apple',
            icon: Icons.phone_iphone,
            label: 'Apple Pay',
            sublabel: 'Instant, Touch ID',
          ),
          const SizedBox(height: 10),
          _buildMethodTile(
            id: 'bank',
            icon: Icons.account_balance,
            label: 'Bank Transfer',
            sublabel: '1-2 business days',
          ),
        ],
      ),
    );
  }

  Widget _buildMethodTile({
    required String id,
    required IconData icon,
    required String label,
    required String sublabel,
  }) {
    final isSelected = _selectedMethod == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.12)
                    : AppColors.surfaceBorder,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(icon,
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.textSecondary,
                  size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(sublabel, style: AppTextStyles.caption),
                ],
              ),
            ),
            if (isSelected)
              Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: AppColors.primaryGradient),
                  shape: BoxShape.circle,
                ),
                child:
                    const Icon(Icons.check, color: Colors.white, size: 14),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 24, AppSpacing.pagePadding, 40),
      child: LoadingButton.primary(
        label: 'Add \$$_selectedAmount to Wallet',
        onPressed: _handleAddCredit,
        isLoading: _isLoading,
        icon: Icons.account_balance_wallet_outlined,
      ),
    );
  }
}
