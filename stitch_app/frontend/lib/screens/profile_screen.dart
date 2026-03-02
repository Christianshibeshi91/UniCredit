import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/app_state.dart';
import '../services/api_service.dart';

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
        const SnackBar(content: Text('Please fill in both fields'), backgroundColor: Color(0xFFDC2626)),
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
          const SnackBar(content: Text('Password updated!'), backgroundColor: Color(0xFF16A34A)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['error'] ?? 'Failed'), backgroundColor: const Color(0xFFDC2626)),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Something went wrong. Please try again.'), backgroundColor: Color(0xFFDC2626)),
      );
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F8),
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
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 38),
          Text('Profile & Settings',
              style: GoogleFonts.manrope(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A))),
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Icon(Icons.more_horiz,
                size: 18, color: Color(0xFF64748B)),
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
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF135BEC),
                  border: Border.all(
                      color: const Color(0xFF135BEC).withValues(alpha: 0.3),
                      width: 3),
                ),
                child: Center(
                  child: Text(
                    appState.userName.isNotEmpty ? appState.userName[0].toUpperCase() : '?',
                    style: GoogleFonts.manrope(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFF135BEC),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.camera_alt_outlined,
                    color: Colors.white, size: 14),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(appState.userName,
              style: GoogleFonts.manrope(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(appState.tier,
                    style: GoogleFonts.manrope(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.5)),
              ),
              const SizedBox(width: 10),
              Text(appState.userEmail,
                  style: GoogleFonts.manrope(
                      fontSize: 11, color: const Color(0xFF64748B))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountInfo() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ACCOUNT INFORMATION',
              style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.8)),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              children: [
                _buildInfoRow(label: 'FULL NAME', value: Provider.of<AppState>(context, listen: false).userName),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                _buildInfoRow(
                    label: 'EMAIL ADDRESS', value: Provider.of<AppState>(context, listen: false).userEmail),
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
              Text(label,
                  style: GoogleFonts.manrope(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 0.5)),
              const SizedBox(height: 4),
              Text(value,
                  style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0F172A))),
            ],
          ),
          const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1), size: 20),
        ],
      ),
    );
  }

  Widget _buildSecuritySection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SECURITY & PRIVACY',
              style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.8)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('UPDATE PASSWORD',
                    style: GoogleFonts.manrope(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF64748B),
                        letterSpacing: 0.5)),
                const SizedBox(height: 12),
                _buildPasswordField(
                    hint: 'Current Password', icon: Icons.lock_outline, controller: _currentPassCtrl),
                const SizedBox(height: 10),
                _buildPasswordField(
                    hint: 'New Password', icon: Icons.lock_reset_outlined, controller: _newPassCtrl),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: _savingPassword ? null : _handleChangePassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: Text('Save Changes',
                        style: GoogleFonts.manrope(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordField({required String hint, required IconData icon, TextEditingController? controller}) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: TextField(
        controller: controller,
        obscureText: true,
        style:
            GoogleFonts.manrope(fontSize: 13, color: const Color(0xFF0F172A)),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 18),
          hintText: hint,
          hintStyle:
              GoogleFonts.manrope(fontSize: 13, color: const Color(0xFFCBD5E1)),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildPreferences() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('PREFERENCES',
              style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.8)),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              children: [
                _buildPreferenceRow(
                  icon: Icons.fingerprint,
                  iconColor: const Color(0xFF135BEC),
                  title: 'Biometric Login',
                  subtitle: 'Facial Passkey',
                  value: _biometricLogin,
                  onChanged: (v) => setState(() => _biometricLogin = v),
                ),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                _buildPreferenceRow(
                  icon: Icons.notifications_outlined,
                  iconColor: const Color(0xFFF59E0B),
                  title: 'Smart Alerts',
                  subtitle: 'Real-time trading updates',
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

  Widget _buildPreferenceRow(
      {required IconData icon,
      required Color iconColor,
      required String title,
      required String subtitle,
      required bool value,
      required ValueChanged<bool> onChanged}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10)),
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
                        color: const Color(0xFF0F172A))),
                Text(subtitle,
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFF64748B))),
              ],
            ),
          ),
          Switch(
              value: value,
              onChanged: onChanged,
              activeThumbColor: const Color(0xFF135BEC),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap),
        ],
      ),
    );
  }

  Widget _buildSignOut(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: () {
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              title: Text('Sign Out',
                  style: GoogleFonts.manrope(fontWeight: FontWeight.bold)),
              content: Text('Are you sure you want to sign out?',
                  style: GoogleFonts.manrope(
                      fontSize: 14, color: const Color(0xFF64748B))),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancel',
                      style:
                          GoogleFonts.manrope(color: const Color(0xFF64748B))),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Provider.of<AppState>(context, listen: false).logout();
                  },
                  child: Text('Sign Out',
                      style: GoogleFonts.manrope(
                          color: const Color(0xFFDC2626),
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        },
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.logout_rounded,
                color: Color(0xFF64748B), size: 17),
            const SizedBox(width: 6),
            Text('Sign Out',
                style: GoogleFonts.manrope(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Text('FINTOUCH ULTIMATE',
            style: GoogleFonts.manrope(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: const Color(0xFFCBD5E1),
                letterSpacing: 1)),
        const SizedBox(height: 4),
        Text('v2.4.1',
            style: GoogleFonts.manrope(
                fontSize: 10, color: const Color(0xFFE2E8F0))),
      ],
    );
  }
}
