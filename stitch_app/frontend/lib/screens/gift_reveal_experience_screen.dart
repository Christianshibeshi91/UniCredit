import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class GiftRevealExperienceScreen extends StatefulWidget {
  const GiftRevealExperienceScreen({super.key});

  @override
  State<GiftRevealExperienceScreen> createState() =>
      _GiftRevealExperienceScreenState();
}

class _GiftRevealExperienceScreenState extends State<GiftRevealExperienceScreen>
    with SingleTickerProviderStateMixin {
  bool _accepted = false;
  late AnimationController _controller;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 500));
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));
    Future.delayed(
        const Duration(milliseconds: 300), () => _controller.forward());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            child: Column(
              children: [
                _buildTopBar(context),
                _buildSurpriseLabel(),
                _buildTitle(),
                _buildQuote(),
                const SizedBox(height: 20),
                _buildGiftImage(),
                const SizedBox(height: 28),
                _buildCreditsRevealed(),
                const SizedBox(height: 32),
                _buildActionButtons(context),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child:
                  const Icon(Icons.close, size: 18, color: Color(0xFF374151)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSurpriseLabel() {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Text('SURPRISE',
          style: GoogleFonts.manrope(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF135BEC),
              letterSpacing: 2)),
    );
  }

  Widget _buildTitle() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 10, 24, 0),
      child: Text("You've received a gift!",
          style: GoogleFonts.manrope(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5),
          textAlign: TextAlign.center),
    );
  }

  Widget _buildQuote() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 10, 32, 0),
      child: Text('"Happy Birthday! Hope you enjoy this\ntreat on me."',
          style: GoogleFonts.manrope(
              fontSize: 13,
              color: const Color(0xFF64748B),
              fontStyle: FontStyle.italic,
              height: 1.5),
          textAlign: TextAlign.center),
    );
  }

  Widget _buildGiftImage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        height: 200,
        decoration: BoxDecoration(
          color: const Color(0xFFF5EDE8),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(Icons.cake,
                size: 80, color: const Color(0xFFD97706).withValues(alpha: 0.6)),
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: const Color(0xFF135BEC),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: const Color(0xFF135BEC).withValues(alpha: 0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 6))
                ],
              ),
              child: const Icon(Icons.play_arrow_rounded,
                  color: Colors.white, size: 28),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreditsRevealed() {
    return Column(
      children: [
        Text('CREDITS REVEALED',
            style: GoogleFonts.manrope(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF94A3B8),
                letterSpacing: 1.5)),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('500 ',
                style: GoogleFonts.manrope(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                    letterSpacing: -2)),
            Text('UniCredit',
                style: GoogleFonts.manrope(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF135BEC))),
          ],
        ),
        const SizedBox(height: 6),
        Text('Sent by Alex Thompson',
            style: GoogleFonts.manrope(
                fontSize: 13, color: const Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton.icon(
              onPressed: () {
                setState(() => _accepted = true);
                final nav = Navigator.of(context);
                Future.delayed(const Duration(milliseconds: 800), () {
                  if (mounted) nav.pop();
                });
              },
              icon: const Icon(Icons.check_circle_outline,
                  color: Colors.white, size: 20),
              label: Text(_accepted ? 'Gift Accepted!' : 'Accept Gift',
                  style: GoogleFonts.manrope(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _accepted
                    ? const Color(0xFF16A34A)
                    : const Color(0xFF135BEC),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
            ),
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () {},
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.reply_rounded,
                    color: Color(0xFF135BEC), size: 18),
                const SizedBox(width: 6),
                Text('Send Thank You',
                    style: GoogleFonts.manrope(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF135BEC))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
