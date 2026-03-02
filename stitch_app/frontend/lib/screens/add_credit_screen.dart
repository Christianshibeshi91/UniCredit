import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';

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

  /// Find the Stripe price ID that matches the selected amount, or fall back
  /// to the first available price.
  String? _matchingPriceId() {
    for (final p in _stripePrices) {
      if ((p['amount'] as num).toInt() == _selectedAmount) return p['id'] as String;
    }
    return _stripePrices.isNotEmpty ? _stripePrices.first['id'] as String : null;
  }

  Future<void> _handleAddCredit() async {
    setState(() => _isLoading = true);
    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final priceId = _matchingPriceId();

      if (priceId != null) {
        // Try Stripe checkout
        final url = await ApiService.createCheckoutSession(
          priceId: priceId,
          userId: appState.userId,
          userEmail: appState.userEmail,
        );
        if (url != null && mounted) {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
            // Refresh balance after returning from payment
            await Future.delayed(const Duration(seconds: 2));
            await appState.refreshWallet();
            if (mounted && Navigator.canPop(context)) Navigator.pop(context);
            return;
          }
        }
      }

      // Fallback: direct in-memory credit via convert endpoint
      await ApiService.convertGiftCard(
        userId: appState.userId,
        merchant: 'Wallet Top-Up',
        cardNumber: 'TOPUP',
        pin: '',
        amount: _selectedAmount.toDouble(),
      );
      await appState.refreshWallet();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('\$$_selectedAmount added to your wallet!'),
          backgroundColor: const Color(0xFF16A34A),
        ),
      );
      if (Navigator.canPop(context)) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F8),
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
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Icon(Icons.arrow_back_ios,
                  size: 18, color: Color(0xFF0F172A)),
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add Credit',
                style: GoogleFonts.manrope(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Top up your Stitch wallet',
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedAmountDisplay() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF135BEC), Color(0xFF2B6EFF)],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF135BEC).withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
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
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.75),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '\$$_selectedAmount',
                  style: GoogleFonts.manrope(
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
                borderRadius: BorderRadius.circular(18),
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
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Amount',
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ),
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
                    color: isSelected ? const Color(0xFF135BEC) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF135BEC)
                          : const Color(0xFFE2E8F0),
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                                color: const Color(0xFF135BEC).withValues(alpha: 0.2),
                                blurRadius: 8,
                                offset: const Offset(0, 4))
                          ]
                        : [],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '\$${item['value']}',
                        style: GoogleFonts.manrope(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF0F172A),
                        ),
                      ),
                      if (item['bonus'] != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          item['bonus'] as String,
                          style: GoogleFonts.manrope(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: isSelected
                                ? Colors.white.withValues(alpha: 0.9)
                                : const Color(0xFF10B981),
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
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Method',
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ),
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
          color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color:
                isSelected ? const Color(0xFF135BEC) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF135BEC).withValues(alpha: 0.1)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon,
                  color: isSelected
                      ? const Color(0xFF135BEC)
                      : const Color(0xFF64748B),
                  size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  Text(
                    sublabel,
                    style: GoogleFonts.manrope(
                      fontSize: 11,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: Color(0xFF135BEC),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 14),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: _isLoading ? null : _handleAddCredit,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF135BEC),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            elevation: 0,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2))
              : Text(
                  'Add \$$_selectedAmount to Wallet',
                  style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }
}
