import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'empty_state.dart';

/// Callback to fetch a page of data. Returns a [PageResult].
typedef PageFetcher<T> = Future<PageResult<T>> Function(String? cursor);

/// Result from a page fetch containing items and next cursor.
class PageResult<T> {
  final List<T> items;
  final String? nextCursor;
  final bool hasMore;

  const PageResult({
    required this.items,
    this.nextCursor,
    this.hasMore = true,
  });
}

/// Infinite scroll list with cursor-based pagination.
/// Loads more items as the user scrolls near the bottom.
class PaginatedList<T> extends StatefulWidget {
  final PageFetcher<T> fetcher;
  final Widget Function(BuildContext, T, int) itemBuilder;
  final Widget Function(BuildContext)? separatorBuilder;
  final Widget? header;
  final EmptyState? emptyState;
  final EdgeInsetsGeometry padding;
  final double loadMoreThreshold;

  const PaginatedList({
    super.key,
    required this.fetcher,
    required this.itemBuilder,
    this.separatorBuilder,
    this.header,
    this.emptyState,
    this.padding = const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
    this.loadMoreThreshold = 200,
  });

  @override
  State<PaginatedList<T>> createState() => _PaginatedListState<T>();
}

class _PaginatedListState<T> extends State<PaginatedList<T>> {
  final List<T> _items = [];
  String? _nextCursor;
  bool _isLoading = false;
  bool _hasMore = true;
  bool _initialLoad = true;
  String? _error;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadPage();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _isLoading) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    if (maxScroll - currentScroll <= widget.loadMoreThreshold) {
      _loadPage();
    }
  }

  Future<void> _loadPage() async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await widget.fetcher(_nextCursor);
      if (!mounted) return;
      setState(() {
        _items.addAll(result.items);
        _nextCursor = result.nextCursor;
        _hasMore = result.hasMore && result.items.isNotEmpty;
        _isLoading = false;
        _initialLoad = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load data';
        _isLoading = false;
        _initialLoad = false;
      });
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _items.clear();
      _nextCursor = null;
      _hasMore = true;
      _initialLoad = true;
    });
    await _loadPage();
  }

  @override
  Widget build(BuildContext context) {
    if (_initialLoad && _isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48),
          child: CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 2.5,
          ),
        ),
      );
    }

    if (_error != null && _items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48, color: AppColors.textTertiary),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: _refresh,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_items.isEmpty) {
      return widget.emptyState ??
          const EmptyState(
            icon: Icons.inbox_outlined,
            title: 'Nothing here yet',
            subtitle: 'Check back later for new items.',
          );
    }

    return RefreshIndicator(
      onRefresh: _refresh,
      color: AppColors.primary,
      child: ListView.builder(
        controller: _scrollController,
        padding: widget.padding,
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _items.length +
            (_hasMore ? 1 : 0) +
            (widget.header != null ? 1 : 0),
        itemBuilder: (context, index) {
          // Header
          if (widget.header != null && index == 0) {
            return widget.header!;
          }

          final itemIndex = widget.header != null ? index - 1 : index;

          // Loading indicator at the bottom
          if (itemIndex >= _items.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: AppColors.primary,
                    strokeWidth: 2,
                  ),
                ),
              ),
            );
          }

          return widget.itemBuilder(context, _items[itemIndex], itemIndex);
        },
      ),
    );
  }
}
