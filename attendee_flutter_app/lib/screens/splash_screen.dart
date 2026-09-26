import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/pill_badge.dart';
import 'package:flutter/services.dart';
import 'main_shell.dart';
import 'auth_screen.dart';

import '../widgets/junction_brand_emblem.dart';

class SplashScreen extends StatefulWidget {
  final AppState appState;

  const SplashScreen({super.key, required this.appState});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  void _navigateToNext() async {
    // Fetch authoritative backend scenario & live state before navigating
    await widget.appState.syncWithBackend();

    await Future.delayed(const Duration(milliseconds: 1400));
    if (mounted) {
      final targetWidget = widget.appState.isAuthenticated
          ? MainShell(appState: widget.appState)
          : AuthScreen(appState: widget.appState);

      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => targetWidget,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.0, 0.04),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 450),
        ),
      );
    }
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
          child: Stack(
            children: [
            // Center Logo & Title Block
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Brand Icon / Node Emblem
                    const JunctionBrandEmblem(size: 68, borderRadius: 18)
                        .animate()
                        .scaleXY(begin: 0.7, end: 1.0, duration: 600.ms, curve: Curves.easeOutBack)
                        .fadeIn(duration: 400.ms),

                    const SizedBox(height: 20),

                    // JUNCTION Logo
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "JUNCTION",
                          style: AppTheme.displayFont(
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1.0,
                            color: AppTheme.ink,
                          ),
                        ),
                        Container(
                          margin: const EdgeInsets.only(left: 4, top: 8),
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.yellow,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    )
                        .animate()
                        .fadeIn(duration: 500.ms, delay: 200.ms)
                        .slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic),

                    const SizedBox(height: 6),

                    // Tagline
                    Text(
                      "Mega-Event Hospitality & Crowd Orchestration",
                      style: AppTheme.bodyFont(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.inkMuted,
                        letterSpacing: 0.2,
                      ),
                      textAlign: TextAlign.center,
                    )
                        .animate()
                        .fadeIn(duration: 500.ms, delay: 350.ms),

                    const SizedBox(height: 28),

                    // Status Pill
                    const PillBadge(
                      text: "● DIGITAL TWIN ACTIVE",
                      variant: PillVariant.live,
                      fontSize: 10,
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    )
                        .animate()
                        .fadeIn(duration: 400.ms, delay: 500.ms)
                        .scaleXY(begin: 0.9, end: 1.0, curve: Curves.easeOutBack),

                    const SizedBox(height: 36),

                    // Animated Progress Bar
                    Container(
                      width: 140,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.neutral,
                        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                      ),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          return Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: AppTheme.yellow,
                                borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              ),
                            )
                                .animate(onPlay: (controller) => controller.forward())
                                .custom(
                                  duration: 1600.ms,
                                  curve: Curves.easeInOutCubic,
                                  builder: (context, value, child) {
                                    return SizedBox(
                                      width: constraints.maxWidth * value,
                                      child: child,
                                    );
                                  },
                                ),
                          );
                        },
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 550.ms),
                  ],
                ),
              ),
            ),

            // Footer info
            Positioned(
              bottom: 24,
              left: 0,
              right: 0,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "MUMBAI DESTINATION ORCHESTRATION",
                      style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkFaint),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Wankhede Stadium Edition · PS ID: 8",
                      style: AppTheme.bodyFont(
                        fontSize: 10,
                        color: AppTheme.inkFaint,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 500.ms, delay: 700.ms),
            ),
          ],
        ),
      ),
    ),
    );
  }
}
