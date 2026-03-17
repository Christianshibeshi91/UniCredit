import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../components/transaction_item.dart';
import '../components/empty_state.dart';

/// Full paginated transaction list with filters.
class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String _activeFilter = 'All';
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  static const _filters = ['All', 'Credits', 'Debits', 'Conversions', 'Gifts'];

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() => _searchQuery = _searchCtrl.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filterTransactions(
      List<Map<String, dynamic>> txs) {
    var filtered = txs;

    // Apply category filter
    switch (_activeFilter) {
      case 'Credits':
        filtered = filtered
            .where((tx) =>
                tx['type'] == 'credit' &&
                !(tx['description'] ?? '').toString().contains('Conversion'))
            .toList();
        break;
      case 'Debits':
        filtered =
            filtered.where((tx) => tx['type'] == 'debit').toList();
        break;
      case 'Conversions':
        filtered = filtered
            .where((tx) =>
                (tx['description'] ?? '').toString().contains('Conversion'))
            .toList();
        break;
      case 'Gifts':
        filtered = filtered
            .where((tx) =>
                (tx['description'] ?? '').toString().toLowerCase().contains('gift'))
            .toList();
        break;
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((tx) {
        final desc = (tx['description'] ?? '').toString().toLowerCase();
        final type = (tx['type'] ?? '').toString().toLowerCase();
        return desc.contains(_searchQuery) || type.contains(_searchQuery);
      }).toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Consumer<AppState>(
          builder: (context, appState, _) {
            final filteredTxs = _filterTransactions(appState.transactions);

            return Column(
              children: [
                _buildHeader(context),
                _buildSearchBar(),
                _buildFilterChips(),
                const SizedBox(height: 8),
                Expanded(
                  child: filteredTxs.isEmpty
                      ? const EmptyState(
                          icon: Icons.search_off,
                          title: 'No transactions found',
                          subtitle:
                              'Try adjusting your filters or search terms.',
                        )
                      : RefreshIndicator(
                          onRefresh: () => appState.refreshWallet(),
                          color: AppColors.primary,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.pagePadding),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: filteredTxs.length,
                            itemBuilder: (context, index) {
                              final tx = filteredTxs[index];
                              final amount =
                                  (tx['amount'] as num).toDouble();
                              final isCredit = amount >= 0;
                              final type = tx['type'] as String? ?? '';
                              final desc =
                                  tx['description'] as String? ?? type;
                              final createdAt =
                                  tx['created_at'] as String? ?? '';

                              String txType = 'debit';
                              if (type == 'credit' &&
                                  desc.contains('Conversion')) {
                                txType = 'conversion';
                              } else if (type == 'credit') {
                                txType = 'credit';
                              }

                              final amountStr = isCredit
                                  ? '+\$${amount.toStringAsFixed(2)}'
                                  : '-\$${amount.abs().toStringAsFixed(2)}';

                              return TransactionItem(
                                title: desc,
                                subtitle:
                                    type == 'credit' ? 'Credit' : 'Debit',
                                amount: amountStr,
                                time: createdAt.length >= 10
                                    ? createdAt.substring(0, 10)
                                    : createdAt,
                                type: txType,
                              );
                            },
                          ),
                        ),
                ),
              ],
            );
          },
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
            child: Text('Transaction History', style: AppTextStyles.h3),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, 16, AppSpacing.pagePadding, 0),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
        child: TextField(
          controller: _searchCtrl,
          style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'Search transactions...',
            hintStyle:
                GoogleFonts.dmSans(fontSize: 14, color: AppColors.textHint),
            prefixIcon: const Icon(Icons.search,
                color: AppColors.textTertiary, size: 20),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: SizedBox(
        height: 38,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pagePadding),
          itemCount: _filters.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            final filter = _filters[index];
            final isActive = _activeFilter == filter;
            return GestureDetector(
              onTap: () => setState(() => _activeFilter = filter),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  gradient: isActive
                      ? const LinearGradient(colors: AppColors.primaryGradient)
                      : null,
                  color: isActive ? null : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                  border: isActive
                      ? null
                      : Border.all(color: AppColors.border),
                ),
                child: Text(
                  filter,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isActive ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
