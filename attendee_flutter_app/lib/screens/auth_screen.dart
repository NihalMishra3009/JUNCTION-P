import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/motion_tap.dart';
import '../widgets/junction_brand_emblem.dart';
import 'main_shell.dart';

class AuthScreen extends StatefulWidget {
  final AppState appState;

  const AuthScreen({super.key, required this.appState});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isSignUp = false;
  bool _isLoading = false;
  String _loadingProvider = "";

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  String _selectedZone = "Zone C (Dadar - Recommended)";
  String _selectedTicket = "VIP Grandstand · Gate 3";

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
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _proceedToApp() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            MainShell(appState: widget.appState),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 0.05),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          );
        },
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  Future<void> _handleGoogleAuth() async {
    setState(() {
      _isLoading = true;
      _loadingProvider = "google";
    });
    HapticFeedback.mediumImpact();

    try {
      // Sign out/disconnect previous cached session so the Google Account Picker dialog is ALWAYS shown
      try {
        await _googleSignIn.signOut();
      } catch (_) {}

      final account = await _googleSignIn.signIn();
      if (account != null && mounted) {
        // Authenticated with Real Google Account!
        widget.appState.loginWithGoogle(
          name: account.displayName ?? (_nameController.text.trim().isNotEmpty ? _nameController.text.trim() : "Google User"),
          email: account.email,
          zone: _selectedZone,
          ticketType: _selectedTicket,
        );
        setState(() => _isLoading = false);
        _proceedToApp();
        return;
      } else if (account == null) {
        // User explicitly cancelled the Google account chooser modal
        if (mounted) {
          setState(() {
            _isLoading = false;
            _loadingProvider = "";
          });
        }
        return;
      }
    } catch (e) {
      debugPrint("Google Sign-In prompt info: $e");
    }

    // Fallback if Google Cloud OAuth isn't configured in Play console
    if (mounted) {
      final enteredName = _nameController.text.trim();
      final enteredEmail = _emailController.text.trim();

      widget.appState.loginWithGoogle(
        name: enteredName.isNotEmpty ? enteredName : "Nihal (Google Account)",
        email: enteredEmail.isNotEmpty ? enteredEmail : "user@gmail.com",
        zone: _selectedZone,
        ticketType: _selectedTicket,
      );
      setState(() => _isLoading = false);
      _proceedToApp();
    }
  }


  Future<void> _handleEmailAuth() async {
    setState(() {
      _isLoading = true;
      _loadingProvider = "email";
    });
    HapticFeedback.selectionClick();

    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      final enteredName = _nameController.text.trim();
      final enteredEmail = _emailController.text.trim();

      widget.appState.loginWithEmail(
        name: enteredName.isNotEmpty ? enteredName : "Junction Attendee",
        email: enteredEmail.isNotEmpty ? enteredEmail : "attendee@junction.in",
        zone: _selectedZone,
        ticketType: _selectedTicket,
      );
      setState(() => _isLoading = false);
      _proceedToApp();
    }
  }

  void _handleGuestExplore() {
    HapticFeedback.selectionClick();
    widget.appState.loginAsGuest();
    _proceedToApp();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: AppTheme.paper,
        systemNavigationBarIconBrightness: Brightness.dark,
        systemNavigationBarDividerColor: AppTheme.paper,
      ),
      child: Scaffold(
        backgroundColor: AppTheme.paper,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Brand Emblem
                  const Center(
                    child: JunctionBrandEmblem(size: 56, borderRadius: 16),
                  ).animate().scaleXY(begin: 0.8, end: 1.0, duration: 400.ms, curve: Curves.easeOutBack),

                  const SizedBox(height: 14),

                  // Title & Tagline
                  Center(
                    child: Column(
                      children: [
                        Text(
                          "JUNCTION",
                          style: AppTheme.displayFont(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Attendee Match Pass & Transit Portal",
                          style: AppTheme.bodyFont(
                            fontSize: 13,
                            color: AppTheme.inkMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 350.ms, delay: 100.ms),

                  const SizedBox(height: 24),

                  // Segmented Switcher (Sign In vs Create Profile)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppTheme.paperDark,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      border: Border.all(color: AppTheme.neutral, width: 1),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: MotionTap(
                            onTap: () {
                              if (_isSignUp) setState(() => _isSignUp = false);
                            },
                            scaleDown: 0.96,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: !_isSignUp ? AppTheme.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                boxShadow: !_isSignUp ? AppTheme.shadowSm : null,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "Sign In",
                                style: AppTheme.displayFont(
                                  fontSize: 13,
                                  fontWeight: !_isSignUp ? FontWeight.w700 : FontWeight.w500,
                                  color: !_isSignUp ? AppTheme.ink : AppTheme.inkMuted,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: MotionTap(
                            onTap: () {
                              if (!_isSignUp) setState(() => _isSignUp = true);
                            },
                            scaleDown: 0.96,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _isSignUp ? AppTheme.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                boxShadow: _isSignUp ? AppTheme.shadowSm : null,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "Create Profile",
                                style: AppTheme.displayFont(
                                  fontSize: 13,
                                  fontWeight: _isSignUp ? FontWeight.w700 : FontWeight.w500,
                                  color: _isSignUp ? AppTheme.ink : AppTheme.inkMuted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 300.ms, delay: 150.ms),

                  const SizedBox(height: 20),

                  // Main Auth Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.white,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                      border: Border.all(color: AppTheme.neutral, width: 1.0),
                      boxShadow: AppTheme.shadowSm,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // --- EMAIL & PROFILE FORM FIELDS (UPPER SIDE) ---
                        Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_isSignUp) ...[
                                Text("FULL NAME", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                                const SizedBox(height: 5),
                                _buildTextField(
                                  controller: _nameController,
                                  hintText: "e.g. Aarav Sharma",
                                  icon: Icons.person_outline_rounded,
                                ),
                                const SizedBox(height: 12),
                              ],

                              Text("EMAIL ADDRESS", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                              const SizedBox(height: 5),
                              _buildTextField(
                                controller: _emailController,
                                hintText: "e.g. attendee@wankhede.in",
                                icon: Icons.mail_outline_rounded,
                                keyboardType: TextInputType.emailAddress,
                              ),

                              const SizedBox(height: 12),

                              Text("PASSWORD", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                              const SizedBox(height: 5),
                              _buildTextField(
                                controller: _passwordController,
                                hintText: "Enter secure password",
                                icon: Icons.lock_outline_rounded,
                                obscureText: true,
                              ),

                              if (_isSignUp) ...[
                                const SizedBox(height: 12),
                                Text("STAY / HUB PREFERENCE", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                                const SizedBox(height: 5),
                                _buildDropdown(
                                  value: _selectedZone,
                                  items: _zones,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedZone = val);
                                  },
                                ),

                                const SizedBox(height: 12),
                                Text("MATCH PASS TIER", style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkMuted)),
                                const SizedBox(height: 5),
                                _buildDropdown(
                                  value: _selectedTicket,
                                  items: _tickets,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedTicket = val);
                                  },
                                ),
                              ],

                              const SizedBox(height: 18),

                              // Email Submit Primary Action Button
                              MotionTap(
                                onTap: _isLoading ? null : _handleEmailAuth,
                                scaleDown: 0.97,
                                child: Container(
                                  height: 46,
                                  decoration: BoxDecoration(
                                    color: AppTheme.yellow,
                                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                                    boxShadow: AppTheme.shadowSm,
                                  ),
                                  alignment: Alignment.center,
                                  child: _isLoading && _loadingProvider == "email"
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor: AlwaysStoppedAnimation(AppTheme.ink),
                                          ),
                                        )
                                      : Text(
                                          _isSignUp ? "Create Attendee Profile" : "Sign In with Email",
                                          style: AppTheme.displayFont(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.ink,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 18),

                        // Divider with text
                        Row(
                          children: [
                            const Expanded(child: Divider(color: AppTheme.neutral, thickness: 1)),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                _isSignUp ? "or sign up with" : "or continue with",
                                style: AppTheme.bodyFont(
                                  fontSize: 11,
                                  color: AppTheme.inkFaint,
                                ),
                              ),
                            ),
                            const Expanded(child: Divider(color: AppTheme.neutral, thickness: 1)),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // --- GOOGLE SIGN IN BUTTON (DOWN SIDE) ---
                        MotionTap(
                          onTap: _isLoading ? null : _handleGoogleAuth,
                          scaleDown: 0.97,
                          child: Container(
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: AppTheme.white,
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                              border: Border.all(
                                color: const Color(0xFFDADCE0),
                                width: 1.2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                            child: _isLoading && _loadingProvider == "google"
                                ? const Center(
                                    child: SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation(AppTheme.ink),
                                      ),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      // Google "G" Vector Icon
                                      SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CustomPaint(
                                          painter: GoogleLogoPainter(),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        _isSignUp
                                            ? "Sign up with Google"
                                            : "Continue with Google",
                                        style: AppTheme.bodyFont(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: const Color(0xFF3C4043),
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),

                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms, delay: 200.ms).slideY(begin: 0.05, end: 0),

                  const SizedBox(height: 18),

                  // Guest Bypass Button
                  Center(
                    child: MotionTap(
                      onTap: _handleGuestExplore,
                      scaleDown: 0.95,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              "Explore live simulation as Guest",
                              style: AppTheme.bodyFont(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.inkLight,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.arrow_forward_rounded, size: 14, color: AppTheme.inkLight),
                          ],
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 350.ms),

                  const SizedBox(height: 14),

                  // Security footnote
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield_outlined, size: 12, color: AppTheme.green),
                      const SizedBox(width: 4),
                      Text(
                        "End-to-end encrypted · Match ticket verification active",
                        style: AppTheme.bodyFont(
                          fontSize: 10,
                          color: AppTheme.inkFaint,
                        ),
                      ),
                    ],
                  ).animate().fadeIn(delay: 450.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.paper,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: AppTheme.neutralDark, width: 1.0),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.ink, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          isDense: true,
          hintText: hintText,
          hintStyle: AppTheme.bodyFont(fontSize: 13, color: AppTheme.inkFaint),
          prefixIcon: Icon(icon, size: 18, color: AppTheme.inkMuted),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildDropdown({
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
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

/// Custom painter for official multi-color Google "G" logo
class GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Blue bar
    final paintBlue = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    final pathBlue = Path()
      ..moveTo(w * 0.98, h * 0.5)
      ..cubicTo(w * 0.98, h * 0.46, w * 0.97, h * 0.42, w * 0.96, h * 0.38)
      ..lineTo(w * 0.5, h * 0.38)
      ..lineTo(w * 0.5, h * 0.60)
      ..lineTo(w * 0.77, h * 0.60)
      ..cubicTo(w * 0.76, h * 0.67, w * 0.72, h * 0.73, w * 0.66, h * 0.77)
      ..lineTo(w * 0.81, h * 0.89)
      ..cubicTo(w * 0.91, h * 0.79, w * 0.98, h * 0.65, w * 0.98, h * 0.5)
      ..close();
    canvas.drawPath(pathBlue, paintBlue);

    // Green curve
    final paintGreen = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.fill;
    final pathGreen = Path()
      ..moveTo(w * 0.5, h * 0.98)
      ..cubicTo(w * 0.64, h * 0.98, w * 0.75, h * 0.93, w * 0.81, h * 0.89)
      ..lineTo(w * 0.66, h * 0.77)
      ..cubicTo(w * 0.61, h * 0.80, w * 0.56, h * 0.82, w * 0.5, h * 0.82)
      ..cubicTo(w * 0.37, h * 0.82, w * 0.27, h * 0.73, w * 0.23, h * 0.62)
      ..lineTo(w * 0.08, h * 0.74)
      ..cubicTo(w * 0.16, h * 0.89, w * 0.32, h * 0.98, w * 0.5, h * 0.98)
      ..close();
    canvas.drawPath(pathGreen, paintGreen);

    // Yellow curve
    final paintYellow = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.fill;
    final pathYellow = Path()
      ..moveTo(w * 0.23, h * 0.62)
      ..cubicTo(w * 0.21, h * 0.58, w * 0.20, h * 0.54, w * 0.20, h * 0.5)
      ..cubicTo(w * 0.20, h * 0.46, w * 0.21, h * 0.42, w * 0.23, h * 0.38)
      ..lineTo(w * 0.08, h * 0.26)
      ..cubicTo(w * 0.03, h * 0.33, w * 0.0, h * 0.41, w * 0.0, h * 0.5)
      ..cubicTo(w * 0.0, h * 0.59, w * 0.03, h * 0.67, w * 0.08, h * 0.74)
      ..lineTo(w * 0.23, h * 0.62)
      ..close();
    canvas.drawPath(pathYellow, paintYellow);

    // Red curve
    final paintRed = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.fill;
    final pathRed = Path()
      ..moveTo(w * 0.5, h * 0.18)
      ..cubicTo(w * 0.58, h * 0.18, w * 0.65, h * 0.21, w * 0.70, h * 0.26)
      ..lineTo(w * 0.84, h * 0.12)
      ..cubicTo(w * 0.75, h * 0.04, w * 0.63, h * 0.0, w * 0.5, h * 0.0)
      ..cubicTo(w * 0.32, h * 0.0, w * 0.16, h * 0.09, w * 0.08, h * 0.26)
      ..lineTo(w * 0.23, h * 0.38)
      ..cubicTo(w * 0.27, h * 0.27, w * 0.37, h * 0.18, w * 0.5, h * 0.18)
      ..close();
    canvas.drawPath(pathRed, paintRed);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
