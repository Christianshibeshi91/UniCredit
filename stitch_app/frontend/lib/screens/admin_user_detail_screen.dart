import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../components/loading_button.dart';
import '../components/error_banner.dart';

/// Admin user management detail view.
/// Shows user info, account status, transaction history, and admin actions.
class AdminUserDetailScreen extends StatefulWidget {
  final String userId;
  final String userName;

  const AdminUserDetailScreen({
    super.key,
    required this.userId,
    required this.userName,
  });

  @override
  State<AdminUserDetailScreen> createState() => _AdminUserDetailScreenState();
}

class _AdminUserDetailScreenState extends State<AdminUserDetailScreen> {
  bool _loading = true;
  String? _error;
  bool _accountLocked = false;
  String _userTier = 'STANDARD';
  double _userBalance = 0;
  String _userEmail = '';
  String _joinDate = '';
  List<Map<String, dynamic>> _userTransactions = [];

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    // Simulate API call — replace with ApiService.getAdminUserDetail(widget.userId)
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;
    setState(() {
      _loading = false;
      _userEmail = '${widget.userName.toLowerCase().replaceAll(' ', '.')}@email.com';
      _userTier = 'STANDARD';
      _userBalance = 2430.83;
      _joinDate = '2025-08-15';
      _userTransactions = [
        {
          'description': 'Gift Card Conversion',
          'amount': 50.0,
          'type': 'credit',
          'created_at': '2026-03-15'
        },
        {
          'description': 'Gift Sent',
          'amount': -25.0,
          'type': 'debit',
          'created_at': '2026-03-14'
        },
        {
          'description': 'Wallet Top-Up',
          'amount': 100.0,
          'type': 'credit',
          'created_at': '2026-03-12'
        },
      ];
    });
  }

  Future<void> _toggleAccountLock() async {
    final newState = !_accountLocked;
    final action = newState ? 'lock' : 'unlock';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.xl)),
        title: Text(
          '${newState ? "Lock" : "Unlock"} Account',
          style: AppTextStyles.h3,
        ),
        content: Text(
          'Are you sure you want to $action ${widget.userName}\'s account?',
          style: AppTextStyles.bodySmall,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel',
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: newState ? AppColors.error : AppColors.success,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md)),
            ),
            child: Text(
              newState ? 'Lock Account' : 'Unlock Account',
              style: GoogleFonts.plusJakartaSans(
                  color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _accountLocked = newState);
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.successSnackBar(
            'Account ${newState ? "locked" : "unlocked"} successfully'),
      );
    }
  }

  Future<void> _changeTier() async {
    final tiers = ['STANDARD', 'GOLD', 'PLATINUM', 'VIP'];
    final selected = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.xl)),
        title: Text('Change Tier', style: AppTextStyles.h3),
        children: tiers.map((tier) {
          final isActive = tier == _userTier;
          return SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, tier),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primaryLight : Colors.transparent,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Row(
                children: [
                  Icon(
                    isActive ? Icons.check_circle : Icons.circle_outlined,
                    color: isActive ? AppColors.primary : AppColors.textTertiary,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    tier,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? AppColors.primary : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );

    if (selected != null && selected != _userTier && mounted) {
      setState(() => _userTier = selected);
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.successSnackBar('Tier updated to $selected'),
      );
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
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: AppColors.primary, strokeWidth: 2.5),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadUserData,
                      color: AppColors.primary,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding:
                            const EdgeInsets.all(AppSpacing.pagePadding),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_error != null) ...[
                              ErrorBanner(
                                message: _error!,
                                onDismiss: () =>
                                    setState(() => _error = null),
                              ),
                              const SizedBox(height: 16),
                            ],
                            _buildUserProfile(),
                            const SizedBox(height: 24),
                            _buildAccountDetails(),
                            const SizedBox(height: 24),
                            _buildAdminActions(),
                            const SizedBox(height: 24),
                            _buildRecentTransactions(),
                            const SizedBox(height: 32),
                          ],
                        ),
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
            child: Text('User Detail', style: AppTextStyles.screenTitle),
          ),
          if (_accountLocked)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.errorLight,
                borderRadius: BorderRadius.circular(AppRadius.chip),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock, size: 12, color: AppColors.error),
                  const SizedBox(width: 4),
                  Text(
                    'LOCKED',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.error,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildUserProfile() {
    return Center(
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient:
                  const LinearGradient(colors: AppColors.primaryGradient),
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.2),
                width: 3,
              ),
            ),
            child: Center(
              child: Text(
                widget.userName.isNotEmpty
                    ? widget.userName[0].toUpperCase()
                    : '?',
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(widget.userName, style: AppTextStyles.h2),
          const SizedBox(height: 4),
          Text(_userEmail, style: AppTextStyles.bodySmall),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _changeTier,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                gradient:
                    const LinearGradient(colors: AppColors.primaryGradient),
                borderRadius: BorderRadius.circular(AppRadius.chip),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_userTier, style: AppTextStyles.tierBadge),
                  const SizedBox(width: 4),
                  const Icon(Icons.edit, size: 10, color: Colors.white),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('ACCOUNT DETAILS', style: AppTextStyles.sectionLabel),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.surfaceBorder),
          ),
          child: Column(
            children: [
              _buildDetailRow('User ID', widget.userId),
              const Divider(height: 1, color: AppColors.surfaceBorder),
              _buildDetailRow(
                  'Balance', '\$${_userBalance.toStringAsFixed(2)}'),
              const Divider(height: 1, color: AppColors.surfaceBorder),
              _buildDetailRow('Joined', _joinDate),
              const Divider(height: 1, color: AppColors.surfaceBorder),
              _buildDetailRow(
                'Status',
                _accountLocked ? 'Locked' : 'Active',
                valueColor:
                    _accountLocked ? AppColors.error : AppColors.success,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTextStyles.bodySmall),
          Flexible(
            child: Text(
              value,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: valueColor ?? AppColors.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('ADMIN ACTIONS', style: AppTextStyles.sectionLabel),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: LoadingButton(
                label: _accountLocked ? 'Unlock' : 'Lock Account',
                onPressed: _toggleAccountLock,
                backgroundColor:
                    _accountLocked ? AppColors.success : AppColors.error,
                icon: _accountLocked ? Icons.lock_open : Icons.lock,
                height: AppSizes.buttonHeightSmall,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: LoadingButton(
                label: 'Change Tier',
                onPressed: _changeTier,
                backgroundColor: AppColors.primary,
                icon: Icons.workspace_premium,
                height: AppSizes.buttonHeightSmall,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('RECENT TRANSACTIONS', style: AppTextStyles.sectionLabel),
        const SizedBox(height: 10),
        if (_userTransactions.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('No transactions found',
                  style: AppTextStyles.bodySmall),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              children: _userTransactions.asMap().entries.map((entry) {
                final index = entry.key;
                final tx = entry.value;
                final amount = (tx['amount'] as num).toDouble();
                final isCredit = amount >= 0;
                final desc = tx['description'] as String? ?? '';
                final date = tx['created_at'] as String? ?? '';

                return Column(
                  children: [
                    if (index > 0)
                      const Divider(
                          height: 1, color: AppColors.surfaceBorder),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: isCredit
                                  ? AppColors.successLight
                                  : AppColors.errorLight,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Icon(
                              isCredit
                                  ? Icons.add_circle_outline
                                  : Icons.remove_circle_outline,
                              color: isCredit
                                  ? AppColors.success
                                  : AppColors.error,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  desc,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                Text(date, style: AppTextStyles.caption),
                              ],
                            ),
                          ),
                          Text(
                            isCredit
                                ? '+\$${amount.toStringAsFixed(2)}'
                                : '-\$${amount.abs().toStringAsFixed(2)}',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isCredit
                                  ? AppColors.success
                                  : AppColors.error,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}
