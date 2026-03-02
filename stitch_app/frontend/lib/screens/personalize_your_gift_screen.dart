import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';

class PersonalizeYourGiftScreen extends StatefulWidget {
  const PersonalizeYourGiftScreen({super.key});

  @override
  State<PersonalizeYourGiftScreen> createState() =>
      _PersonalizeYourGiftScreenState();
}

class _PersonalizeYourGiftScreenState extends State<PersonalizeYourGiftScreen> {
  String _selectedOccasion = 'Birthday';
  final _recipientController = TextEditingController();
  final _amountController = TextEditingController();
  final _messageController = TextEditingController();
  final _dateController = TextEditingController();
  final _customOccasionController = TextEditingController();
  final _customOccasionFocus = FocusNode();
  bool _isSending = false;

  final List<Map<String, dynamic>> _occasions = [
    {
      'label': 'Birthday',
      'icon': Icons.cake_outlined,
      'gradient': [const Color(0xFFEC4899), const Color(0xFFBE185D)]
    },
    {
      'label': 'Wedding',
      'icon': Icons.favorite_outline,
      'gradient': [const Color(0xFFF97316), const Color(0xFFEA580C)]
    },
    {
      'label': 'Graduation',
      'icon': Icons.school_outlined,
      'gradient': [const Color(0xFF6366F1), const Color(0xFF4338CA)]
    },
    {
      'label': 'Anniversary',
      'icon': Icons.diamond_outlined,
      'gradient': [const Color(0xFFE11D48), const Color(0xFF9F1239)]
    },
    {
      'label': 'Holiday',
      'icon': Icons.celebration_outlined,
      'gradient': [const Color(0xFF10B981), const Color(0xFF047857)]
    },
    {
      'label': 'New Baby',
      'icon': Icons.child_care_outlined,
      'gradient': [const Color(0xFF06B6D4), const Color(0xFF0891B2)]
    },
    {
      'label': 'Farewell',
      'icon': Icons.flight_takeoff_outlined,
      'gradient': [const Color(0xFF8B5CF6), const Color(0xFF6D28D9)]
    },
    {
      'label': 'Congrats',
      'icon': Icons.emoji_events_outlined,
      'gradient': [const Color(0xFFF59E0B), const Color(0xFFD97706)]
    },
    {
      'label': 'Thank You',
      'icon': Icons.volunteer_activism_outlined,
      'gradient': [const Color(0xFF14B8A6), const Color(0xFF0D9488)]
    },
    {
      'label': 'Other',
      'icon': Icons.auto_awesome_outlined,
      'gradient': [const Color(0xFF64748B), const Color(0xFF475569)]
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F8),
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
                    _buildWhoIsItFor(),
                    const SizedBox(height: 28),
                    _buildOccasionSection(),
                    const SizedBox(height: 28),
                    _buildAmountSection(),
                    const SizedBox(height: 28),
                    _buildPersonalTouch(),
                    const SizedBox(height: 28),
                    _buildPersonalMessage(),
                    const SizedBox(height: 28),
                    _buildWhenToDeliver(),
                    const SizedBox(height: 32),
                    _buildContinueButton(context),
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
      padding: const EdgeInsets.fromLTRB(16, 16, 20, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Padding(
              padding: EdgeInsets.all(6),
              child: Icon(Icons.arrow_back_ios,
                  size: 18, color: Color(0xFF0F172A)),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              'Personalize Your Gift',
              style: GoogleFonts.manrope(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A)),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 30),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text('STEP 2 OF 5',
                    style: GoogleFonts.manrope(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF135BEC))),
              ),
              Flexible(
                child: Text('Customize your gifts',
                    style: GoogleFonts.manrope(
                        fontSize: 10, color: const Color(0xFF94A3B8)),
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: const LinearProgressIndicator(
              value: 2 / 5,
              backgroundColor: Color(0xFFE2E8F0),
              valueColor:
                  AlwaysStoppedAnimation<Color>(Color(0xFF135BEC)),
              minHeight: 3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhoIsItFor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Who is it for?',
            style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A))),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _recipientController,
            style: GoogleFonts.manrope(
                fontSize: 14, color: const Color(0xFF0F172A)),
            decoration: InputDecoration(
              hintText: 'e.g. sarah@example.com',
              hintStyle: GoogleFonts.manrope(
                  fontSize: 13, color: const Color(0xFFCBD5E1)),
              prefixIcon: const Icon(Icons.email_outlined,
                  color: Color(0xFF94A3B8), size: 20),
              suffixIcon: const Icon(Icons.contacts_outlined,
                  color: Color(0xFF94A3B8), size: 20),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOccasionSection() {
    final isOther = _selectedOccasion == 'Other';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Choose an Occasion',
                style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A))),
            Text('${_occasions.length} options',
                style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF94A3B8))),
          ],
        ),
        const SizedBox(height: 14),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.05,
          ),
          itemCount: _occasions.length,
          itemBuilder: (context, index) {
            final o = _occasions[index];
            final isSelected = _selectedOccasion == o['label'] as String;
            final gradientColors = o['gradient'] as List<Color>;
            return GestureDetector(
              onTap: () {
                setState(() => _selectedOccasion = o['label'] as String);
                if (o['label'] == 'Other') {
                  Future.delayed(const Duration(milliseconds: 200), () {
                    _customOccasionFocus.requestFocus();
                  });
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: gradientColors,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: isSelected
                      ? Border.all(color: Colors.white, width: 2.5)
                      : null,
                  boxShadow: [
                    BoxShadow(
                      color: gradientColors[0]
                          .withValues(alpha: isSelected ? 0.45 : 0.25),
                      blurRadius: isSelected ? 16 : 8,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(o['icon'] as IconData, color: Colors.white, size: 26),
                    const SizedBox(height: 6),
                    Text(o['label'] as String,
                        style: GoogleFonts.manrope(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center),
                  ],
                ),
              ),
            );
          },
        ),
        // Custom occasion input — slides in when Other is selected
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          child: isOther
              ? Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Name your occasion',
                          style: GoogleFonts.manrope(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF374151))),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: const Color(0xFF135BEC), width: 1.5),
                          boxShadow: const [
                            BoxShadow(
                                color: Color(0x0A135BEC),
                                blurRadius: 8,
                                offset: Offset(0, 4)),
                          ],
                        ),
                        child: TextField(
                          controller: _customOccasionController,
                          focusNode: _customOccasionFocus,
                          style: GoogleFonts.manrope(
                              fontSize: 14, color: const Color(0xFF0F172A)),
                          decoration: InputDecoration(
                            hintText:
                                'e.g. Retirement, Promotion, Anniversary...',
                            hintStyle: GoogleFonts.manrope(
                                fontSize: 13, color: const Color(0xFFCBD5E1)),
                            prefixIcon: const Icon(Icons.edit_note_outlined,
                                color: Color(0xFF135BEC), size: 22),
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
      ],
    );
  }

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Gift Amount (\$)',
            style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A))),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: GoogleFonts.manrope(
                fontSize: 14, color: const Color(0xFF0F172A)),
            decoration: InputDecoration(
              hintText: 'e.g. 25.00',
              hintStyle: GoogleFonts.manrope(
                  fontSize: 13, color: const Color(0xFFCBD5E1)),
              prefixIcon: const Icon(Icons.attach_money,
                  color: Color(0xFF94A3B8), size: 20),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleSendGift() async {
    final recipient = _recipientController.text.trim();
    final amount = double.tryParse(_amountController.text);
    final message = _messageController.text.trim();

    if (recipient.isEmpty || amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter recipient email and a valid amount'),
          backgroundColor: Color(0xFFDC2626),
        ),
      );
      return;
    }

    setState(() => _isSending = true);
    final scaffold = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final occasion = _selectedOccasion == 'Other'
          ? _customOccasionController.text.trim()
          : _selectedOccasion;

      final result = await ApiService.sendGift(
        senderId: appState.userId,
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
          SnackBar(
            content: Text('Gift of \$${amount.toStringAsFixed(2)} sent to $recipient!'),
            backgroundColor: const Color(0xFF16A34A),
          ),
        );
        if (nav.canPop()) nav.pop();
      } else {
        scaffold.showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? 'Failed to send gift'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      scaffold.showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Widget _buildPersonalTouch() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Add a personal touch',
            style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A))),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF135BEC).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.videocam_outlined,
                          color: Color(0xFF135BEC), size: 22),
                    ),
                    const SizedBox(height: 10),
                    Text('Record Video',
                        style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F172A))),
                    Text('Auto-enhance',
                        style: GoogleFonts.manrope(
                            fontSize: 10, color: const Color(0xFF64748B))),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF8B5CF6).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.mic_outlined,
                          color: Color(0xFF8B5CF6), size: 22),
                    ),
                    const SizedBox(height: 10),
                    Text('Upload Audio',
                        style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F172A))),
                    Text('Adjustable',
                        style: GoogleFonts.manrope(
                            fontSize: 10, color: const Color(0xFF64748B))),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPersonalMessage() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Personal Message',
            style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151))),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              TextField(
                controller: _messageController,
                maxLines: 4,
                style: GoogleFonts.manrope(
                    fontSize: 13, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  hintText: 'Write something heartfelt here...',
                  hintStyle: GoogleFonts.manrope(
                      fontSize: 13, color: const Color(0xFFCBD5E1)),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12, bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('0/200 words',
                        style: GoogleFonts.manrope(
                            fontSize: 10, color: const Color(0xFF94A3B8))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWhenToDeliver() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('When to deliver?',
            style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A))),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.calendar_today_outlined,
                    color: Color(0xFF135BEC), size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Schedule Delivery',
                        style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F172A))),
                    Text('Pick a date and time',
                        style: GoogleFonts.manrope(
                            fontSize: 11, color: const Color(0xFF64748B))),
                  ],
                ),
              ),
              SizedBox(
                width: 110,
                child: TextField(
                  controller: _dateController,
                  style: GoogleFonts.manrope(
                      fontSize: 12, color: const Color(0xFF64748B)),
                  decoration: InputDecoration(
                    hintText: 'mm/dd/yyyy',
                    hintStyle: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFFCBD5E1)),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF135BEC)),
                    ),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContinueButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: _isSending ? null : _handleSendGift,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF135BEC),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isSending
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2))
            : Text('Send Gift',
                style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white)),
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
