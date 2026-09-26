import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import 'motion_tap.dart';

class BottomNavItem {
  final String label;
  final IconData activeIcon;
  final IconData inactiveIcon;

  const BottomNavItem({
    required this.label,
    required this.activeIcon,
    required this.inactiveIcon,
  });
}

class AttendeeBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onIndexChanged;

  const AttendeeBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onIndexChanged,
  });

  static const List<BottomNavItem> items = [
    BottomNavItem(
      label: "Plan",
      activeIcon: Icons.explore_rounded,
      inactiveIcon: Icons.explore_outlined,
    ),
    BottomNavItem(
      label: "Stay",
      activeIcon: Icons.hotel_rounded,
      inactiveIcon: Icons.hotel_outlined,
    ),
    BottomNavItem(
      label: "Home",
      activeIcon: Icons.home_rounded,
      inactiveIcon: Icons.home_outlined,
    ),
    BottomNavItem(
      label: "Food",
      activeIcon: Icons.restaurant_rounded,
      inactiveIcon: Icons.restaurant_outlined,
    ),
    BottomNavItem(
      label: "Event",
      activeIcon: Icons.confirmation_number_rounded,
      inactiveIcon: Icons.confirmation_number_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final double alignX = -1.0 + (currentIndex / (items.length - 1)) * 2.0;

    return Container(
      margin: const EdgeInsets.only(left: 20, right: 20, bottom: 16),
      height: 62,
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: AppTheme.neutralDark.withValues(alpha: 0.6),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Framer Motion style sliding active background indicator
          AnimatedAlign(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            alignment: Alignment(alignX, 0),
            child: FractionallySizedBox(
              widthFactor: 1.0 / items.length,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.paperDark,
                    borderRadius: BorderRadius.circular(22),
                  ),
                ),
              ),
            ),
          ),
          // Interactive tab items
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = index == currentIndex;

              return Expanded(
                child: MotionTap(
                  onTap: () => onIndexChanged(index),
                  scaleDown: 0.88,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Pop up bounce with subtle vertical lift & spring scale
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutBack,
                          transform: Matrix4.translationValues(
                            0,
                            isSelected ? -3.0 : 0.0, // Floating pop-up elevation
                            0,
                          ),
                          child: AnimatedScale(
                            scale: isSelected ? 1.20 : 1.0,
                            duration: const Duration(milliseconds: 260),
                            curve: Curves.easeOutBack,
                            child: Icon(
                              isSelected ? item.activeIcon : item.inactiveIcon,
                              size: 23,
                              color: isSelected ? AppTheme.ink : AppTheme.inkFaint,
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        // Bouncing pop indicator dot
                        AnimatedScale(
                          scale: isSelected ? 1.0 : 0.0,
                          duration: const Duration(milliseconds: 240),
                          curve: Curves.easeOutBack,
                          child: Container(
                            width: 5,
                            height: 5,
                            decoration: const BoxDecoration(
                              color: AppTheme.yellow,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic);
  }
}
