import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../components/loading_button.dart';
import 'password_reset_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _biometricLogin = true;
  bool _smartAlerts = false;
  final _currentPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  bool _savingPassword = false;

  @override
  void dispose() {
    _currentPassCtrl.dispose();
    _newPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleChangePassword() async {
    if (_currentPassCtrl.text.isEmpty || _newPassCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.errorSnackBar('Please fill in both password fields'),
      );
      return;
    }
    if (_newPassCtrl.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.errorSnackBar(
            'New password must be at least 8 characters'),
      );
      return;
    }

    setState(() => _savingPassword = true);
    try {
      final result = await ApiService.changePassword(
        currentPassword: _currentPassCtrl.text,
        newPassword: _newPassCtrl.text,
      );
      if (!mounted) return;
      if (result['success'] == true) {
        _currentPassCtrl.clear();
        _newPassCtrl.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          AppWidgets.successSnackBar('Password updated successfully!'),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          AppWidgets.errorSnackBar(result['error'] ?? 'Failed to update'),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        AppWidgets.errorSnackBar('Something went wrong. Please try again.'),
      );
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(context),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    _buildProfileHeader(),
                    const SizedBox(height: 24),
                    _buildAccountInfo(),
                    const SizedBox(height: 20),
                    _buildSecuritySection(),
                    const SizedBox(height: 20),
                    _buildPreferences(),
                    const SizedBox(height: 24),
                    _buildSignOut(context),
                    const SizedBox(height: 24),
                    _buildFooter(),
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

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.pagePadding, AppSpacing.headerTop, AppSpacing.pagePadding, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 38),
          Text('Profile & Settings', style: AppTextStyles.screenTitle),
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.more_horiz,
                size: 18, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    final appState = Provider.of<AppState>(context, listen: false);
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: AppSizes.avatarLarge,
                height: AppSizes.avatarLarge,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                      colors: AppColors.primaryGradient),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    width: 3,
                  ),
                ),
                child: Center(
                  child: Text(
                    appState.userName.isNotEmpty
                        ? appState.userName[0].toUpperCase()
                        : '?',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: AppColors.accentGradient),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.camera_alt_outlined,
                    color: Colors.white, size: 14),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(appState.userName, style: AppTextStyles.h2),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: AppColors.primaryGradient),
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                ),
                child: Text(appState.tier, style: AppTextStyles.tierBadge),
              ),
              const SizedBox(width: 10),
              Text(appState.userEmail, style: AppTextStyles.caption),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountInfo() {
    final appState = Provider.of<AppState>(context, listen: false);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ACCOUNT INFORMATION', style: AppTextStyles.sectionLabel),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              children: [
                _buildInfoRow(label: 'FULL NAME', value: appState.userName),
                const Divider(height: 1, color: AppColors.surfaceBorder),
                _buildInfoRow(
                    label: 'EMAIL ADDRESS', value: appState.userEmail),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({required String label, required String value}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTextStyles.sectionLabel),
              const SizedBox(height: 4),
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Icon(Icons.chevron_right,
              color: AppColors.textHint, size: 20),
        ],
      ),
    );
  }

  Widget _buildSecuritySection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SECURITY & PRIVACY', style: AppTextStyles.sectionLabel),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'UPDATE PASSWORD',
                  style: AppTextStyles.sectionLabel.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                _buildPasswordField(
                  hint: 'Current Password',
                  icon: Icons.lock_outline,
                  controller: _currentPassCtrl,
                ),
                const SizedBox(height: 10),
                _buildPasswordField(
                  hint: 'New Password',
                  icon: Icons.lock_reset_outlined,
                  controller: _newPassCtrl,
                ),
                const SizedBox(height: 16),
                LoadingButton(
                  label: 'Save Changes',
                  onPressed: _handleChangePassword,
                  isLoading: _savingPassword,
                  gradient: AppColors.primaryGradient,
                  height: 46,
                ),
                const SizedBox(height: 12),
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const PasswordResetScreen()),
                    ),
                    child: Text(
                      'Forgot your password?',
                      style: AppTextStyles.link.copyWith(fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordField({
    required String hint,
    required IconData icon,
    TextEditingController? controller,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: TextField(
        controller: controller,
        obscureText: true,
        style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.textPrimary),
        decoration: InputDecoration(
          prefixIcon:
              Icon(icon, color: AppColors.textTertiary, size: 18),
          hintText: hint,
          hintStyle:
              GoogleFonts.dmSans(fontSize: 13, color: AppColors.textHint),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildPreferences() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('PREFERENCES', style: AppTextStyles.sectionLabel),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              children: [
                _buildPreferenceRow(
                  icon: Icons.fingerprint,
                  iconColor: AppColors.primary,
                  title: 'Biometric Login',
                  subtitle: 'Facial Passkey',
                  value: _biometricLogin,
                  onChanged: (v) => setState(() => _biometricLogin = v),
                ),
                const Divider(height: 1, color: AppColors.surfaceBorder),
                _buildPreferenceRow(
                  icon: Icons.notifications_outlined,
                  iconColor: AppColors.warning,
                  title: 'Smart Alerts',
                  subtitle: 'Real-time updates',
                  value: _smartAlerts,
                  onChanged: (v) => setState(() => _smartAlerts = v),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferenceRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(subtitle, style: AppTextStyles.caption),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }

  Widget _buildSignOut(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
      child: GestureDetector(
        onTap: () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.xl)),
              title: Text('Sign Out', style: AppTextStyles.h3),
              content: Text(
                'Are you sure you want to sign out?',
                style: AppTextStyles.bodySmall,
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Cancel',
                      style: AppTextStyles.bodyMedium
                          .copyWith(color: AppColors.textSecondary)),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Provider.of<AppState>(context, listen: false).logout();
                  },
                  child: Text(
                    'Sign Out',
                    style: GoogleFonts.plusJakartaSans(
                      color: AppColors.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.logout_rounded,
                color: AppColors.textSecondary, size: 18),
            const SizedBox(width: 6),
            Text(
              'Sign Out',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Text(
          'STITCH',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: AppColors.textHint,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'v3.0.0',
          style: GoogleFonts.dmSans(
            fontSize: 10,
            color: AppColors.textHint,
          ),
        ),
      ],
    );
  }
}
