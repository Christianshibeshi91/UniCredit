import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'services/app_state.dart';
import 'screens/login_screen.dart';
import 'screens/wallet_dashboard_screen.dart';
import 'screens/admin_overview_screen.dart';
import 'screens/convert_gift_card_screen.dart';
import 'screens/gift_reveal_experience_screen.dart';
import 'screens/personalize_your_gift_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/add_credit_screen.dart';

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
      title: 'Stitch App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF135BEC),
        scaffoldBackgroundColor: const Color(0xFFF6F6F8),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF135BEC),
          primary: const Color(0xFF135BEC),
          surface: const Color(0xFFF6F6F8),
        ),
        textTheme: GoogleFonts.manropeTextTheme(),
      ),
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

/// Each tab gets its own navigator key so sub-screens (Personalize, Reveal,
/// AddCredit) are pushed *inside* the tab — the bottom nav stays visible.
class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  /// One navigator key per tab.
  final List<GlobalKey<NavigatorState>> _navKeys = List.generate(
    4,
    (_) => GlobalKey<NavigatorState>(),
  );

  /// Root screen for each tab.
  final List<Widget> _rootScreens = [
    const WalletDashboardScreen(),
    const ConvertGiftCardScreen(),
    const AdminOverviewScreen(),
    const ProfileScreen(),
  ];

  /// Sub-routes available inside any tab.
  static Route<dynamic> _generateRoute(RouteSettings settings) {
    Widget page;
    switch (settings.name) {
      case '/personalize':
        page = const PersonalizeYourGiftScreen();
        break;
      case '/reveal':
        page = const GiftRevealExperienceScreen();
        break;
      case '/add_credit':
        page = const AddCreditScreen();
        break;
      case '/convert':
        page = const ConvertGiftCardScreen();
        break;
      default:
        page = const SizedBox.shrink();
    }
    return MaterialPageRoute(builder: (_) => page, settings: settings);
  }

  /// Handle Android back button — pop within the current tab's navigator first.
  Future<bool> _onWillPop() async {
    final nav = _navKeys[_currentIndex].currentState;
    if (nav != null && nav.canPop()) {
      nav.pop();
      return false; // don't pop the root
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) await _onWillPop();
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: List.generate(4, (tabIndex) {
            return Navigator(
              key: _navKeys[tabIndex],
              onGenerateRoute: (settings) {
                if (settings.name == Navigator.defaultRouteName ||
                    settings.name == null) {
                  return MaterialPageRoute(
                    builder: (_) => _rootScreens[tabIndex],
                  );
                }
                return _generateRoute(settings);
              },
            );
          }),
        ),
        bottomNavigationBar: _buildBottomNav(),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.only(top: 12, bottom: 24, left: 24, right: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        boxShadow: [
          BoxShadow(
              color: Color(0x08000000), blurRadius: 12, offset: Offset(0, -4)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildNavItem(0, Icons.account_balance_wallet_outlined,
              Icons.account_balance_wallet, 'Wallet'),
          _buildNavItem(
              1, Icons.swap_horiz_outlined, Icons.swap_horiz, 'Convert'),
          _buildNavItem(
              2, Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, 'Admin'),
          _buildNavItem(3, Icons.person_outline, Icons.person, 'Profile'),
        ],
      ),
    );
  }

  Widget _buildNavItem(
      int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;
    final color =
        isSelected ? const Color(0xFF135BEC) : const Color(0xFF94A3B8);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (_currentIndex == index) {
          // Tap the active tab → pop to root of that tab
          _navKeys[index].currentState?.popUntil((r) => r.isFirst);
        } else {
          setState(() => _currentIndex = index);
        }
      },
      child: SizedBox(
        width: 72,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                isSelected ? activeIcon : icon,
                key: ValueKey(isSelected),
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.manrope(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
