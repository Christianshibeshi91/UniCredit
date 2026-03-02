import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import 'add_credit_screen.dart';
import 'convert_gift_card_screen.dart';
import 'personalize_your_gift_screen.dart';


class WalletDashboardScreen extends StatefulWidget {
  const WalletDashboardScreen({super.key});

  @override
  State<WalletDashboardScreen> createState() => _WalletDashboardScreenState();
}

class _WalletDashboardScreenState extends State<WalletDashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh wallet data when screen loads
    final appState = Provider.of<AppState>(context, listen: false);
    Future.microtask(() {
      appState.refreshWallet();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F8),
      body: SafeArea(
        child: Consumer<AppState>(
          builder: (context, appState, _) {
            return RefreshIndicator(
              onRefresh: () => appState.refreshWallet(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTopBar(),
                    _buildGreetingRow(appState),
                    _buildBalanceCard(appState),
                    _buildQuickActions(context),
                    _buildRecentActivity(context, appState),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              'Wallet Dashboard',
              style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
                letterSpacing: -0.3,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeaderIcon(Icons.search),
              const SizedBox(width: 12),
              _buildHeaderIcon(Icons.settings_outlined),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderIcon(IconData icon) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x0C000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Icon(icon, size: 18, color: const Color(0xFF64748B)),
    );
  }

  Widget _buildGreetingRow(AppState appState) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning,' : (hour < 17 ? 'Good afternoon,' : 'Good evening,');
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF135BEC).withValues(alpha: 0.1),
                    border: Border.all(
                        color: const Color(0xFF135BEC).withValues(alpha: 0.2)),
                    shape: BoxShape.circle,
                  ),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF135BEC),
                    child: Text(
                      appState.userName.isNotEmpty ? appState.userName[0].toUpperCase() : '?',
                      style: GoogleFonts.manrope(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        greeting,
                        style: GoogleFonts.manrope(
                            fontSize: 11, color: const Color(0xFF64748B)),
                      ),
                      Text(
                        appState.userName,
                        style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x0C000000),
                    blurRadius: 4,
                    offset: Offset(0, 1))
              ],
            ),
            child: const Icon(Icons.notifications_outlined,
                size: 18, color: Color(0xFF0F172A)),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceCard(AppState appState) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Container(
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF135BEC), Color(0xFF2B6EFF), Color(0xFF0A48CC)],
          ),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF135BEC).withValues(alpha: 0.3),
                blurRadius: 24,
                offset: const Offset(0, 12))
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              top: -50,
              right: -30,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    shape: BoxShape.circle),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('UNICREDIT BALANCE',
                              style: GoogleFonts.manrope(
                                  color: Colors.white.withValues(alpha: 0.75),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text('\$${appState.balance.toStringAsFixed(2)}',
                              style: GoogleFonts.manrope(
                                  color: Colors.white,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20)),
                        child: Text(appState.tier,
                            style: GoogleFonts.manrope(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1)),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        children: [
                          _buildAvatarStack(
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuAz4k0D7lJCY6PDdfW1pj2K83aJpv8MFpQOJpgXg8yWD1wltsRPwNqstMHr8OCZI85Sp8fq5X_3b3CKjbiVt_mOqV-c780UFtwHyWqECeiaiKzfp0eXnOzAHSK3qVeyDoHX4qRYs70y5m6Z_E9VCX_bt7gFNkoo6figy6zXltwraV3oF9lCRDCB9xf6Ap09Wo86F9Ebshqabl-dBABjWAIpxdh19VACCr23z-5mHQqYguEDJi-akRKgbgv47QL-RE283L82F1K_gg'),
                          _buildAvatarStack(
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuAe92FNskFjbNIosU2Jzgc99SyzgJKVmU2XjOglNA0fx5FMaJ8pcTcxktvCyGfc6HKEoI4Q-6erTCetnrDJqIUSAzrBQ-39dZtiXZvIDSBFyushSiH6XLtS8czejkP27ZQ_n78Ph5Vf2zsDOs53rGzTafX-gIi2D_QgTLOKFZA0ZcfALm-fzP0E7Z3rhOyenr_3WGpmnQPpjrBOQbyrb5xTEDStws9PceYn84HoLo2p5vImh7Cvirq5WmhUCCR7TPcJEDOnklFHgw',
                              offset: -10),
                          Transform.translate(
                            offset: const Offset(-20, 0),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF135BEC)
                                    .withValues(alpha: 0.4),
                                shape: BoxShape.circle,
                                border: Border.all(
                                    color: const Color(0xFF135BEC), width: 2),
                              ),
                              alignment: Alignment.center,
                              child: Text('+12',
                                  style: GoogleFonts.manrope(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('CARDHOLDER',
                              style: GoogleFonts.manrope(
                                  color: Colors.white.withValues(alpha: 0.6),
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5)),
                          const SizedBox(height: 2),
                          Text(appState.userName.toUpperCase(),
                              style: GoogleFonts.manrope(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarStack(String url, {double offset = 0}) {
    return Transform.translate(
      offset: Offset(offset, 0),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFF135BEC), width: 2),
          image: DecorationImage(image: NetworkImage(url), fit: BoxFit.cover),
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildActionItem(
              icon: Icons.add,
              label: 'Add Credit',
              isPrimary: true,
              onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AddCreditScreen()))),
          _buildActionItem(
              icon: Icons.swap_horiz_rounded,
              label: 'Convert',
              isPrimary: false,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const ConvertGiftCardScreen()))),
          _buildActionItem(
              icon: Icons.send_rounded,
              label: 'Send Gift',
              isPrimary: false,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const PersonalizeYourGiftScreen()))),
        ],
      ),
    );
  }

  Widget _buildActionItem(
      {required IconData icon,
      required String label,
      required bool isPrimary,
      required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: isPrimary ? const Color(0xFF135BEC) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border:
                  isPrimary ? null : Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: isPrimary
                  ? [
                      BoxShadow(
                          color:
                              const Color(0xFF135BEC).withValues(alpha: 0.25),
                          blurRadius: 10,
                          offset: const Offset(0, 4))
                    ]
                  : [
                      const BoxShadow(
                          color: Color(0x0C000000),
                          blurRadius: 4,
                          offset: Offset(0, 1))
                    ],
            ),
            child: Icon(icon,
                color: isPrimary ? Colors.white : const Color(0xFF135BEC),
                size: 28),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF475569))),
        ],
      ),
    );
  }

  Widget _buildRecentActivity(BuildContext context, AppState appState) {
    final txs = appState.transactions;
    return Padding(
      padding: const EdgeInsets.only(left: 24, right: 24, top: 28, bottom: 24),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Activity',
                  style: GoogleFonts.manrope(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                      color: const Color(0xFF0F172A))),
              Text('View All',
                  style: GoogleFonts.manrope(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF135BEC))),
            ],
          ),
          const SizedBox(height: 16),
          if (txs.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Column(
                children: [
                  const Icon(Icons.receipt_long_outlined,
                      size: 48, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 12),
                  Text('No transactions yet',
                      style: GoogleFonts.manrope(
                          fontSize: 14, color: const Color(0xFF94A3B8))),
                  const SizedBox(height: 4),
                  Text('Add credit or convert a gift card to get started',
                      style: GoogleFonts.manrope(
                          fontSize: 12, color: const Color(0xFFCBD5E1))),
                ],
              ),
            ),
          ...txs.map((tx) {
            final amount = (tx['amount'] as num).toDouble();
            final isCredit = amount >= 0;
            final type = tx['type'] as String? ?? '';
            final desc = tx['description'] as String? ?? type;
            final createdAt = tx['created_at'] as String? ?? '';

            IconData icon;
            Color iconColor;
            Color iconBg;
            if (type == 'credit' && desc.contains('Conversion')) {
              icon = Icons.currency_exchange;
              iconColor = const Color(0xFF135BEC);
              iconBg = const Color(0xFFEFF6FF);
            } else if (type == 'credit') {
              icon = Icons.add_circle_outline;
              iconColor = const Color(0xFF16A34A);
              iconBg = const Color(0xFFDCFCE7);
            } else {
              icon = Icons.outbox_outlined;
              iconColor = const Color(0xFFDC2626);
              iconBg = const Color(0xFFFEE2E2);
            }

            final amountStr = isCredit
                ? '+\$${amount.toStringAsFixed(2)}'
                : '-\$${amount.abs().toStringAsFixed(2)}';

            return _buildActivityItem(
              iconBg: iconBg,
              icon: icon,
              iconColor: iconColor,
              title: desc,
              subtitle: type == 'credit' ? 'Credit' : 'Debit',
              amount: amountStr,
              time: createdAt.length >= 10 ? createdAt.substring(0, 10) : createdAt,
              isCredit: isCredit,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildActivityItem({
    required Color iconBg,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String amount,
    required String time,
    required bool isCredit,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: iconBg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0F172A)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount,
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isCredit
                        ? const Color(0xFF16A34A)
                        : const Color(0xFFDC2626),
                  )),
              const SizedBox(height: 2),
              Text(time,
                  style: GoogleFonts.manrope(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF94A3B8))),
            ],
          ),
        ],
      ),
    );
  }
}
