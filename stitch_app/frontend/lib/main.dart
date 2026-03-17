import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'services/app_state.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/wallet_dashboard_screen.dart';
import 'screens/admin_overview_screen.dart';
import 'screens/convert_gift_card_screen.dart';
import 'screens/gift_reveal_experience_screen.dart';
import 'screens/personalize_your_gift_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/add_credit_screen.dart';
import 'screens/transaction_history_screen.dart';
import 'screens/gift_claim_screen.dart';
import 'screens/admin_user_detail_screen.dart';
import 'screens/password_reset_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState()..tryAutoLogin(),
      child: const StitchApp(),
    ),
  );
}

class StitchApp extends StatelessWidget {
  const StitchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Stitch',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.light,
      // Named routes for deep linking
      routes: {
        '/login': (_) => const LoginScreen(),
        '/convert': (_) => const ConvertGiftCardScreen(),
        '/personalize': (_) => const PersonalizeYourGiftScreen(),
        '/reveal': (_) => const GiftRevealExperienceScreen(),
        '/add_credit': (_) => const AddCreditScreen(),
        '/transactions': (_) => const TransactionHistoryScreen(),
        '/claim': (_) => const GiftClaimScreen(),
        '/admin/users': (_) => const AdminUserDetailScreen(
              userId: '',
              userName: '',
            ),
        '/reset_password': (_) => const PasswordResetScreen(),
      },
      home: Consumer<AppState>(
        builder: (context, appState, _) {
          if (!appState.isLoggedIn) {
            return const LoginScreen();
          }
          return const MainNavigationScreen();
        },
      ),
    );
  }
}

/// Main navigation shell with bottom tab bar.
/// Admin tab is ONLY visible when the user has admin role.
class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  /// Navigator keys — 4 for admin users, 3 for regular.
  late List<GlobalKey<NavigatorState>> _navKeys;

  @override
  void initState() {
    super.initState();
    _navKeys = List.generate(4, (_) => GlobalKey<NavigatorState>());
  }

  /// Tab config changes based on admin role.
  List<_TabConfig> _tabs(bool isAdmin) {
    final tabs = <_TabConfig>[
      const _TabConfig(
        icon: Icons.account_balance_wallet_outlined,
        activeIcon: Icons.account_balance_wallet,
        label: 'Wallet',
        screen: WalletDashboardScreen(),
      ),
      const _TabConfig(
        icon: Icons.swap_horiz_outlined,
        activeIcon: Icons.swap_horiz,
        label: 'Convert',
        screen: ConvertGiftCardScreen(),
      ),
    ];

    if (isAdmin) {
      tabs.add(const _TabConfig(
        icon: Icons.admin_panel_settings_outlined,
        activeIcon: Icons.admin_panel_settings,
        label: 'Admin',
        screen: AdminOverviewScreen(),
      ));
    }

    tabs.add(const _TabConfig(
      icon: Icons.person_outline,
      activeIcon: Icons.person,
      label: 'Profile',
      screen: ProfileScreen(),
    ));

    return tabs;
  }

  /// Sub-route generator for nested navigators.
  static Route<dynamic> _generateRoute(RouteSettings settings) {
    Widget page;
    switch (settings.name) {
      case '/personalize':
        page = const PersonalizeYourGiftScreen();
        break;
      case '/reveal':
        final args = settings.arguments as Map<String, dynamic>?;
        page = GiftRevealExperienceScreen(
          senderName: args?['senderName'] ?? 'Someone',
          occasion: args?['occasion'] ?? 'Birthday',
          message: args?['message'] ?? 'Enjoy your gift!',
          amount: (args?['amount'] as num?)?.toDouble() ?? 0,
        );
        break;
      case '/add_credit':
        page = const AddCreditScreen();
        break;
      case '/convert':
        page = const ConvertGiftCardScreen();
        break;
      case '/transactions':
        page = const TransactionHistoryScreen();
        break;
      case '/claim':
        final code = settings.arguments as String?;
        page = GiftClaimScreen(claimCode: code);
        break;
      case '/reset_password':
        page = const PasswordResetScreen();
        break;
      default:
        page = const SizedBox.shrink();
    }
    return MaterialPageRoute(builder: (_) => page, settings: settings);
  }

  /// Handle Android back button — pop within current tab first.
  Future<bool> _onWillPop() async {
    final nav = _navKeys[_currentIndex].currentState;
    if (nav != null && nav.canPop()) {
      nav.pop();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = Provider.of<AppState>(context).isAdmin;
    final tabs = _tabs(isAdmin);

    // Clamp index if user loses admin role while on admin tab
    if (_currentIndex >= tabs.length) {
      _currentIndex = 0;
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) await _onWillPop();
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: List.generate(tabs.length, (tabIndex) {
            return Navigator(
              key: _navKeys[tabIndex],
              onGenerateRoute: (settings) {
                if (settings.name == Navigator.defaultRouteName ||
                    settings.name == null) {
                  return MaterialPageRoute(
                    builder: (_) => tabs[tabIndex].screen,
                  );
                }
                return _generateRoute(settings);
              },
            );
          }),
        ),
        bottomNavigationBar: _buildBottomNav(tabs),
      ),
    );
  }

  Widget _buildBottomNav(List<_TabConfig> tabs) {
    return Container(
      padding: const EdgeInsets.only(top: 10, bottom: 28, left: 16, right: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(
            top: BorderSide(color: AppColors.surfaceBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: tabs.asMap().entries.map((entry) {
          final index = entry.key;
          final tab = entry.value;
          return _buildNavItem(
            index: index,
            icon: tab.icon,
            activeIcon: tab.activeIcon,
            label: tab.label,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (_currentIndex == index) {
          _navKeys[index].currentState?.popUntil((r) => r.isFirst);
        } else {
          setState(() => _currentIndex = index);
        }
      },
      child: SizedBox(
        width: 68,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Active indicator dot
            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: isSelected ? 24 : 0,
              height: 3,
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(
                gradient: isSelected
                    ? const LinearGradient(colors: AppColors.heroGradient)
                    : null,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                isSelected ? activeIcon : icon,
                key: ValueKey(isSelected),
                color: isSelected ? AppColors.primary : AppColors.navInactive,
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color:
                    isSelected ? AppColors.primary : AppColors.navInactive,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Configuration for a bottom navigation tab.
class _TabConfig {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final Widget screen;

  const _TabConfig({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.screen,
  });
}
