import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';

class ConvertGiftCardScreen extends StatefulWidget {
  const ConvertGiftCardScreen({super.key});

  @override
  State<ConvertGiftCardScreen> createState() => _ConvertGiftCardScreenState();
}

class _ConvertGiftCardScreenState extends State<ConvertGiftCardScreen> {
  String _selectedMerchant = 'Amazon';
  final _cardNumberController = TextEditingController();
  final _pinController = TextEditingController();
  final _amountController = TextEditingController();
  bool _isConverting = false;

  final List<Map<String, dynamic>> _merchants = [
    {
      'name': 'Amazon',
      'icon': Icons.shopping_bag_outlined,
      'gradient': [const Color(0xFFF97316), const Color(0xFFEF4444)]
    },
    {
      'name': 'iTunes',
      'icon': Icons.music_note_outlined,
      'gradient': [const Color(0xFFEC4899), const Color(0xFFBE185D)]
    },
    {
      'name': 'Google Play',
      'icon': Icons.play_circle_outline,
      'gradient': [const Color(0xFF10B981), const Color(0xFF059669)]
    },
    {
      'name': 'Steam',
      'icon': Icons.videogame_asset_outlined,
      'gradient': [const Color(0xFF6366F1), const Color(0xFF4338CA)]
    },
    {
      'name': 'Walmart',
      'icon': Icons.store_outlined,
      'gradient': [const Color(0xFF0EA5E9), const Color(0xFF0284C7)]
    },
    {
      'name': 'eBay',
      'icon': Icons.storefront_outlined,
      'gradient': [const Color(0xFFF59E0B), const Color(0xFFD97706)]
    },
  ];

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

  Future<void> _handleConvert() async {
    final amount = double.tryParse(_amountController.text);
    if (_cardNumberController.text.isEmpty || amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in card number and a valid amount'),
          backgroundColor: Color(0xFFDC2626),
        ),
      );
      return;
    }

    setState(() => _isConverting = true);
    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final result = await ApiService.convertGiftCard(
        userId: appState.userId,
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
          SnackBar(
            content: Text(
                '\$${result['addedValue']} UniCredit added to your wallet!'),
            backgroundColor: const Color(0xFF16A34A),
          ),
        );
        _cardNumberController.clear();
        _pinController.clear();
        _amountController.clear();
        if (Navigator.canPop(context)) Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? 'Conversion failed'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isConverting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            _buildProgressBar(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),
                    _buildMerchantSection(),
                    const SizedBox(height: 28),
                    _buildCardDetailsSection(),
                    const SizedBox(height: 28),
                    _buildEstimatedValueSection(),
                    const SizedBox(height: 28),
                    _buildExchangeRateNote(),
                    const SizedBox(height: 32),
                    _buildConvertButton(),
                    const SizedBox(height: 12),
                    _buildDisclaimer(),
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
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (Navigator.canPop(context))
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 20),
              onPressed: () => Navigator.pop(context),
            )
          else
            const SizedBox(width: 38),
          Text(
            'Convert Gift Card',
            style: GoogleFonts.manrope(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0F172A),
            ),
          ),
          Text('STEP 1 OF 3',
              style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF135BEC))),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select your gift card',
              style: GoogleFonts.manrope(
                  fontSize: 11, color: const Color(0xFF94A3B8))),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: const LinearProgressIndicator(
              value: 1 / 3,
              backgroundColor: Color(0xFFE2E8F0),
              valueColor:
                  AlwaysStoppedAnimation<Color>(Color(0xFF135BEC)),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMerchantSection() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Choose a Merchant',
                style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A))),
            Text('See All',
                style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF135BEC))),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: 14),
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _merchants.map((merchant) {
              final isSelected =
                  _selectedMerchant == merchant['name'] as String;
              final gradientColors = merchant['gradient'] as List<Color>;
              return GestureDetector(
                onTap: () => setState(
                    () => _selectedMerchant = merchant['name'] as String),
                child: AnimatedContainer(
                  width: (MediaQuery.of(context).size.width - 48 - 20) / 3,
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: isSelected
                        ? LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: gradientColors,
                          )
                        : null,
                    color: isSelected ? null : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? Colors.transparent
                          : const Color(0xFFE2E8F0),
                      width: 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                                color: gradientColors[0].withValues(alpha: 0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 6))
                          ]
                        : [],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        merchant['icon'] as IconData,
                        color:
                            isSelected ? Colors.white : const Color(0xFF64748B),
                        size: 26,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        merchant['name'] as String,
                        style: GoogleFonts.manrope(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildCardDetailsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Enter Card Details',
            style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A))),
        const SizedBox(height: 14),
        _buildInputField(
          label: 'Card Number',
          hint: 'e.g. XXXX-XXXX-XXXX-XXXX',
          icon: Icons.credit_card_outlined,
          controller: _cardNumberController,
          suffixIcon: Icons.content_paste_outlined,
        ),
        const SizedBox(height: 14),
        _buildInputField(
          label: 'PIN / Security Code',
          hint: 'Enter PIN',
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
      ],
    );
  }

  Widget _buildInputField({
    required String label,
    required String hint,
    required IconData icon,
    required TextEditingController controller,
    IconData? suffixIcon,
    bool obscure = false,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: GoogleFonts.manrope(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151))),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            keyboardType: keyboardType,
            style: GoogleFonts.manrope(
                fontSize: 14, color: const Color(0xFF0F172A)),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 20),
              suffixIcon: suffixIcon != null
                  ? Icon(suffixIcon, color: const Color(0xFF94A3B8), size: 18)
                  : null,
              hintText: hint,
              hintStyle: GoogleFonts.manrope(
                  fontSize: 13, color: const Color(0xFFCBD5E1)),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  double get _estimatedValue {
    final parsed = double.tryParse(_amountController.text) ?? 0;
    return parsed * 0.9;
  }

  Widget _buildEstimatedValueSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Estimated Value',
            style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151))),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('You will receive',
                      style: GoogleFonts.manrope(
                          fontSize: 11, color: const Color(0xFF16A34A))),
                  const SizedBox(height: 4),
                  Text('\$${_estimatedValue.toStringAsFixed(2)} UniCredit',
                      style: GoogleFonts.manrope(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF15803D))),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_balance_wallet_outlined,
                    color: Color(0xFF16A34A), size: 26),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildExchangeRateNote() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDFE8FF)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFF135BEC).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.currency_exchange,
                color: Color(0xFF135BEC), size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Today's Exchange Rate",
                    style: GoogleFonts.manrope(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0F172A))),
                Text('1 GC = 0.90 UniCredit  •  90% rate',
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConvertButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: _isConverting ? null : _handleConvert,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF135BEC),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isConverting
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2))
            : Text(
                'Convert Gift Card',
                style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white),
              ),
      ),
    );
  }

  Widget _buildDisclaimer() {
    return Center(
      child: Text(
        'By continuing, you agree to our Terms of Service\nand Privacy Policy',
        style:
            GoogleFonts.manrope(fontSize: 10, color: const Color(0xFF94A3B8)),
        textAlign: TextAlign.center,
      ),
    );
  }
}
