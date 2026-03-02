import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class AdminOverviewScreen extends StatefulWidget {
  const AdminOverviewScreen({super.key});

  @override
  State<AdminOverviewScreen> createState() => _AdminOverviewScreenState();
}

class _AdminOverviewScreenState extends State<AdminOverviewScreen> {
  bool _globalRateLock = true;
  Map<String, dynamic> _stats = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final stats = await ApiService.getAdminStats();
    if (mounted) {
      setState(() {
        _stats = stats;
        _loading = false;
      });
    }
  }

  String _formatVolume(dynamic vol) {
    if (vol == null) return '\$0';
    final v = (vol as num).toDouble();
    if (v >= 1000000) return '\$${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '\$${(v / 1000).toStringAsFixed(1)}k';
    return '\$${v.toStringAsFixed(0)}';
  }

  String _formatUsers(dynamic users) {
    if (users == null) return '0';
    final u = (users as num).toDouble();
    if (u >= 1000) return '${(u / 1000).toStringAsFixed(1)}k';
    return u.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F8),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildVolumeCard(),
                    const SizedBox(height: 14),
                    _buildStatsRow(),
                    const SizedBox(height: 20),
                    _buildControlsSection(),
                    const SizedBox(height: 20),
                    _buildFraudFlags(),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFFFACC15),
        shape: const CircleBorder(),
        elevation: 4,
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFF135BEC).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.admin_panel_settings_outlined,
                color: Color(0xFF135BEC), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Admin Overview',
                    style: GoogleFonts.manrope(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.3)),
                Text('Related Systems Monitor',
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFF64748B))),
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
            ),
            child: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildVolumeCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x06000000), blurRadius: 8, offset: Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('TOTAL VOLUME',
                  style: GoogleFonts.manrope(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 0.5)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.arrow_downward,
                        size: 10, color: Color(0xFFDC2626)),
                    Text('5.2%',
                        style: GoogleFonts.manrope(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFDC2626))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(_loading ? '...' : _formatVolume(_stats['totalVolume']),
              style: GoogleFonts.manrope(
                  fontSize: 38,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -1)),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    final usersGrowth = (_stats['usersGrowth'] as num?)?.toDouble() ?? 0;
    final convGrowth = (_stats['activeConvGrowth'] as num?)?.toDouble() ?? 0;
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            label: 'USERS',
            value: _loading ? '...' : _formatUsers(_stats['users']),
            change: '${usersGrowth >= 0 ? '+' : ''}${usersGrowth.toStringAsFixed(0)}%',
            isPositive: usersGrowth >= 0,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            label: 'ACTIVE CONV',
            value: _loading ? '...' : '${_stats['activeConversations'] ?? 0}',
            change: '${convGrowth >= 0 ? '+' : ''}${convGrowth.toStringAsFixed(0)}%',
            isPositive: convGrowth >= 0,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
      {required String label,
      required String value,
      required String change,
      required bool isPositive}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(value,
                  style: GoogleFonts.manrope(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5)),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isPositive
                        ? const Color(0xFFDCFCE7)
                        : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(change,
                      style: GoogleFonts.manrope(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isPositive
                              ? const Color(0xFF16A34A)
                              : const Color(0xFFDC2626))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildControlsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('CONTROLS',
            style: GoogleFonts.manrope(
                fontSize: 11,
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
              _buildControlRow(
                title: 'Global Rate Lock',
                subtitle: 'Currently 2 peg to all gates',
                value: _globalRateLock,
                onChanged: (v) => setState(() => _globalRateLock = v),
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              _buildControlRowWithButton(
                title: 'Standard Spread',
                subtitle: 'Currently 291b',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildControlRow(
      {required String title,
      required String subtitle,
      required bool value,
      required ValueChanged<bool> onChanged}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A))),
              Text(subtitle,
                  style: GoogleFonts.manrope(
                      fontSize: 11, color: const Color(0xFF64748B))),
            ],
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: const Color(0xFF135BEC),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }

  Widget _buildControlRowWithButton(
      {required String title, required String subtitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A))),
              Text(subtitle,
                  style: GoogleFonts.manrope(
                      fontSize: 11, color: const Color(0xFF64748B))),
            ],
          ),
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF135BEC),
              side: const BorderSide(color: Color(0xFF135BEC)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text('Adjust',
                style: GoogleFonts.manrope(
                    fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildFraudFlags() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('FRAUD FLAGS',
                style: GoogleFonts.manrope(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF94A3B8),
                    letterSpacing: 0.8)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEDE9FE),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('Filtered',
                  style: GoogleFonts.manrope(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF7C3AED))),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Column(
            children: [
              _buildFraudRow(
                  initials: 'AJ',
                  color: const Color(0xFF8B5CF6),
                  name: 'Alex Johnson',
                  detail: 'Multiple logins',
                  amount: '\$2,430.83',
                  action: 'Review',
                  actionColor: const Color(0xFF135BEC)),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              _buildFraudRow(
                  initials: 'SW',
                  color: const Color(0xFF0EA5E9),
                  name: 'Sarah Williams',
                  detail: 'Bulk claim',
                  amount: 'Flagged',
                  action: 'Block',
                  actionColor: const Color(0xFFDC2626)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFraudRow(
      {required String initials,
      required Color color,
      required String name,
      required String detail,
      required String amount,
      required String action,
      required Color actionColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: color.withValues(alpha: 0.15),
            child: Text(initials,
                style: GoogleFonts.manrope(
                    fontSize: 13, fontWeight: FontWeight.bold, color: color)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0F172A))),
                Text(detail,
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: const Color(0xFF64748B))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount,
                  style: GoogleFonts.manrope(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A))),
              const SizedBox(height: 2),
              GestureDetector(
                onTap: () {},
                child: Text(action,
                    style: GoogleFonts.manrope(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: actionColor)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
