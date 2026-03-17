import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../components/balance_card.dart';
import '../components/transaction_item.dart';
import '../components/empty_state.dart';
import 'add_credit_screen.dart';
import 'convert_gift_card_screen.dart';
import 'personalize_your_gift_screen.dart';
import 'transaction_history_screen.dart';

class WalletDashboardScreen extends StatefulWidget {
  const WalletDashboardScreen({super.key});

  @override
  State<WalletDashboardScreen> createState() => _WalletDashboardScreenState();
}

class _WalletDashboardScreenState extends State<WalletDashboardScreen>
    with SingleTickerProviderStateMixin {
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

    final appState = Provider.of<AppState>(context, listen: false);
    Future.microtask(() => appState.refreshWallet());
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Consumer<AppState>(
          builder: (context, appState, _) {
            return RefreshIndicator(
              onRefresh: () => appState.refreshWallet(),
              color: AppColors.primary,
              child: FadeTransition(
                opacity: _fadeAnim,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildTopBar(),
                      _buildGreetingRow(appState),
                      const SizedBox(height: 8),
                      _buildBalanceSection(appState),
                      const SizedBox(height: 8),
                      _buildQuickActions(context),
                      const SizedBox(height: AppSpacing.sectionGap),
                      _buildRecentActivity(context, appState),
                      const SizedBox(height: 24),
                    ],
                  ),
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
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.pagePadding, vertical: AppSpacing.headerTop),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Wallet', style: AppTextStyles.h2),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeaderIcon(Icons.search_rounded),
              const SizedBox(width: 10),
              _buildHeaderIcon(Icons.notifications_outlined),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderIcon(IconData icon) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Icon(icon, size: 20, color: AppColors.textSecondary),
    );
  }

  Widget _buildGreetingRow(AppState appState) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning,'
        : (hour < 17 ? 'Good afternoon,' : 'Good evening,');
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.pagePadding, vertical: 4),
      child: Row(
        children: [
          // Avatar
          Container(
            padding: const EdgeInsets.all(2),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: AppColors.heroGradient),
              shape: BoxShape.circle,
            ),
            child: CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.primary,
              child: Text(
                appState.userName.isNotEmpty
                    ? appState.userName[0].toUpperCase()
                    : '?',
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(greeting, style: AppTextStyles.caption),
                Text(
                  appState.userName,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceSection(AppState appState) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.pagePadding),
      child: BalanceCard(
        balance: appState.balance,
        tier: appState.tier,
        cardholderName: appState.userName,
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildActionItem(
            icon: Icons.add_rounded,
            label: 'Add Credit',
            gradient: AppColors.primaryGradient,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AddCreditScreen()),
            ),
          ),
          _buildActionItem(
            icon: Icons.swap_horiz_rounded,
            label: 'Convert',
            gradient: AppColors.accentGradient,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                  builder: (_) => const ConvertGiftCardScreen()),
            ),
          ),
          _buildActionItem(
            icon: Icons.card_giftcard,
            label: 'Send Gift',
            gradient: AppColors.warmGradient,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                  builder: (_) => const PersonalizeYourGiftScreen()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: gradient,
              ),
              borderRadius: BorderRadius.circular(AppRadius.xl),
              boxShadow: [
                BoxShadow(
                  color: gradient[0].withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivity(BuildContext context, AppState appState) {
    final txs = appState.transactions;
    final recentTxs = txs.take(5).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Activity', style: AppTextStyles.sectionHeader),
              GestureDetector(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => const TransactionHistoryScreen()),
                ),
                child: Text('View All', style: AppTextStyles.link),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (recentTxs.isEmpty)
            const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No transactions yet',
              subtitle: 'Add credit or convert a gift card to get started.',
            ),
          ...recentTxs.map((tx) {
            final amount = (tx['amount'] as num).toDouble();
            final isCredit = amount >= 0;
            final type = tx['type'] as String? ?? '';
            final desc = tx['description'] as String? ?? type;
            final createdAt = tx['created_at'] as String? ?? '';

            String txType = 'debit';
            if (type == 'credit' && desc.contains('Conversion')) {
              txType = 'conversion';
            } else if (type == 'credit') {
              txType = 'credit';
            }

            final amountStr = isCredit
                ? '+\$${amount.toStringAsFixed(2)}'
                : '-\$${amount.abs().toStringAsFixed(2)}';

            return TransactionItem(
              title: desc,
              subtitle: type == 'credit' ? 'Credit' : 'Debit',
              amount: amountStr,
              time: createdAt.length >= 10
                  ? createdAt.substring(0, 10)
                  : createdAt,
              type: txType,
            );
          }),
        ],
      ),
    );
  }
}
