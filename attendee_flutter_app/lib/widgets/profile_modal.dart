import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/types.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'motion_tap.dart';
import '../screens/auth_screen.dart';

class ProfileModal extends StatefulWidget {
  final AppState appState;

  const ProfileModal({super.key, required this.appState});

  static void show(BuildContext context, AppState appState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProfileModal(appState: appState),
    );
  }

  @override
  State<ProfileModal> createState() => _ProfileModalState();
}

class _ProfileModalState extends State<ProfileModal> {
  bool _isEditing = false;
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late String _selectedZone;
  late String _selectedTicket;

  final List<String> _zones = [
    "Zone C (Dadar - Recommended)",
    "Zone A (Churchgate & Marine Lines)",
    "Zone B (CSMT & Fort)",
  ];

  final List<String> _tickets = [
    "VIP Grandstand · Gate 3",
    "Pavilion Club · Gate 1",
    "North Stand · Gate 2",
    "General Admission · Gate 4",
  ];

  @override
  void initState() {
    super.initState();
    final user = widget.appState.currentUser;
    _nameController = TextEditingController(text: user?.name ?? "Aarav Sharma");
    _emailController = TextEditingController(text: user?.email ?? "aarav.sharma@junction.in");
    _phoneController = TextEditingController(text: user?.phone ?? "+91 98201 44520");
    _selectedZone = user?.preferredZone ?? _zones.first;
    _selectedTicket = user?.ticketCategory ?? _tickets.first;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _saveProfile() {
    HapticFeedback.selectionClick();
    widget.appState.updateProfile(
      name: _nameController.text,
      email: _emailController.text,
      preferredZone: _selectedZone,
      ticketCategory: _selectedTicket,
      phone: _phoneController.text,
    );
    setState(() => _isEditing = false);
  }

  void _handleLogout() async {
    HapticFeedback.mediumImpact();
    final nav = Navigator.of(context);
    nav.pop(); // close modal
    try {
      final googleSignIn = GoogleSignIn();
      await googleSignIn.signOut();
    } catch (_) {}
    widget.appState.logout();
    if (mounted) {
      nav.pushAndRemoveUntil(
        PageRouteBuilder(
          pageBuilder: (context, anim, secAnim) => AuthScreen(appState: widget.appState),
          transitionsBuilder: (context, anim, secAnim, child) => FadeTransition(opacity: anim, child: child),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.appState.currentUser;
    final selectedRoute = widget.appState.attendeeSelectedRouteId;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Pull Bar
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.neutralDark,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Modal Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "ATTENDEE PROFILE & PASS",
                    style: AppTheme.displayFont(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20, color: AppTheme.ink),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Digital Pass Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.ink,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  boxShadow: AppTheme.shadowMd,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Avatar Circle with Provider Badge
                        Stack(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppTheme.yellow,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppTheme.white, width: 2),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                (user?.name.isNotEmpty == true)
                                    ? user!.name.substring(0, 1).toUpperCase()
                                    : "A",
                                style: AppTheme.displayFont(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.ink,
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 16,
                                height: 16,
                                decoration: const BoxDecoration(
                                  color: AppTheme.green,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: const Icon(Icons.check, size: 10, color: AppTheme.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.name ?? "Aarav Sharma",
                                style: AppTheme.displayFont(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.white,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user?.email ?? "aarav.sharma@junction.in",
                                style: AppTheme.bodyFont(
                                  fontSize: 12,
                                  color: const Color(0xFFCCCCCC),
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Auth Provider badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                user?.authProvider == AuthProvider.apple
                                    ? Icons.apple
                                    : Icons.verified_user_outlined,
                                size: 12,
                                color: AppTheme.yellow,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                user?.authProvider.name.toUpperCase() ?? "GOOGLE",
                                style: AppTheme.metaText(fontSize: 9, color: AppTheme.yellow),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),
                    const Divider(color: Color(0xFF333333), height: 1),
                    const SizedBox(height: 14),

                    // Ticket Pass Details
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 5,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("MATCH PASS", style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkFaint)),
                              const SizedBox(height: 2),
                              Text(
                                user?.ticketCategory ?? "VIP Grandstand · Gate 3",
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTheme.bodyFont(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.white),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 6,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text("SEAT ALLOCATION", style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkFaint)),
                              const SizedBox(height: 2),
                              Text(
                                user?.seatNumber ?? "Block B · Row 8 · Seat 24",
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTheme.bodyFont(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.yellow),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05, end: 0),

              const SizedBox(height: 16),

              // Active Route Sync Status
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(color: AppTheme.neutral, width: 1.0),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.navigation_outlined, size: 20, color: AppTheme.green),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "ACTIVE ROUTE COORDINATION",
                            style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkMuted),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            selectedRoute != null
                                ? "Corridor [$selectedRoute] synced with Digital Twin"
                                : "No corridor chosen yet · Recommended: Dadar",
                            style: AppTheme.bodyFont(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Edit Profile or View Mode
              if (!_isEditing) ...[
                Row(
                  children: [
                    Expanded(
                      child: MotionTap(
                        onTap: () => setState(() => _isEditing = true),
                        scaleDown: 0.96,
                        child: Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            border: Border.all(color: AppTheme.neutralDark, width: 1.0),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.edit_outlined, size: 16, color: AppTheme.ink),
                              const SizedBox(width: 6),
                              Text(
                                "Edit Details",
                                style: AppTheme.displayFont(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: MotionTap(
                        onTap: _handleLogout,
                        scaleDown: 0.96,
                        child: Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.redBg,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            border: Border.all(color: AppTheme.red.withValues(alpha: 0.3), width: 1.0),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.logout_rounded, size: 16, color: AppTheme.red),
                              const SizedBox(width: 6),
                              Text(
                                "Sign Out",
                                style: AppTheme.displayFont(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.red,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // Edit Form
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(color: AppTheme.neutral, width: 1.0),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("FULL NAME", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                      const SizedBox(height: 5),
                      _buildTextField(_nameController, "Name"),
                      const SizedBox(height: 12),

                      Text("EMAIL ADDRESS", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                      const SizedBox(height: 5),
                      _buildTextField(_emailController, "Email"),
                      const SizedBox(height: 12),

                      Text("PHONE (FOR TRANSIT SMS)", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                      const SizedBox(height: 5),
                      _buildTextField(_phoneController, "Phone"),
                      const SizedBox(height: 12),

                      Text("STAY / HUB PREFERENCE", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                      const SizedBox(height: 5),
                      _buildDropdown(_selectedZone, _zones, (val) {
                        if (val != null) setState(() => _selectedZone = val);
                      }),
                      const SizedBox(height: 12),

                      Text("MATCH PASS TIER", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                      const SizedBox(height: 5),
                      _buildDropdown(_selectedTicket, _tickets, (val) {
                        if (val != null) setState(() => _selectedTicket = val);
                      }),

                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: MotionTap(
                              onTap: () => setState(() => _isEditing = false),
                              scaleDown: 0.96,
                              child: Container(
                                height: 42,
                                decoration: BoxDecoration(
                                  color: AppTheme.paper,
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                alignment: Alignment.center,
                                child: Text("Cancel", style: AppTheme.bodyFont(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.inkMuted)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: MotionTap(
                              onTap: _saveProfile,
                              scaleDown: 0.96,
                              child: Container(
                                height: 42,
                                decoration: BoxDecoration(
                                  color: AppTheme.yellow,
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                alignment: Alignment.center,
                                child: Text("Save Changes", style: AppTheme.displayFont(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.ink)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: AppTheme.neutralDark, width: 1.0),
      ),
      child: TextField(
        controller: controller,
        style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.ink, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          isDense: true,
          hintText: hint,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
    );
  }

  Widget _buildDropdown(String value, List<String> items, ValueChanged<String?> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: AppTheme.neutralDark, width: 1.0),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: AppTheme.inkMuted),
          style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.ink, fontWeight: FontWeight.w600),
          items: items.map((item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item, overflow: TextOverflow.ellipsis),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
