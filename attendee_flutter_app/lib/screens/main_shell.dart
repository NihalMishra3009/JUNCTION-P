import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';
import '../widgets/bottom_nav_bar.dart';
import 'home_screen.dart';
import 'plan_screen.dart';
import 'stay_screen.dart';
import 'food_screen.dart';
import 'event_screen.dart';

class MainShell extends StatelessWidget {
  final AppState appState;

  const MainShell({super.key, required this.appState});

  Widget _getScreen(int index) {
    switch (index) {
      case 0:
        return PlanScreen(key: const ValueKey(0), appState: appState);
      case 1:
        return StayScreen(key: const ValueKey(1), appState: appState);
      case 2:
        return HomeScreen(key: const ValueKey(2), appState: appState);
      case 3:
        return FoodScreen(key: const ValueKey(3), appState: appState);
      case 4:
        return EventScreen(key: const ValueKey(4), appState: appState);
      default:
        return HomeScreen(key: const ValueKey(2), appState: appState);
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
          bottom: false,
          child: Stack(
            children: [
              // Full-screen scrollable body that extends beneath the floating bottom bar
              Positioned.fill(
                child: Column(
                  children: [
                    AppHeader(appState: appState),
                    Expanded(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        transitionBuilder: (child, animation) {
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0.0, 0.03),
                                end: Offset.zero,
                              ).animate(animation),
                              child: child,
                            ),
                          );
                        },
                        child: _getScreen(appState.currentTabIndex),
                      ),
                    ),
                  ],
                ),
              ),

              // Floating Bottom Nav Bar positioned above scrolling content
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: AttendeeBottomNavBar(
                    currentIndex: appState.currentTabIndex,
                    onIndexChanged: (index) => appState.setTabIndex(index),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
