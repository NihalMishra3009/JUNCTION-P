import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class PressureBar extends StatelessWidget {
  final int percentage;
  final double height;

  const PressureBar({
    super.key,
    required this.percentage,
    this.height = 6.0,
  });

  Color get _fillColor {
    if (percentage >= 85) return AppTheme.red;
    if (percentage >= 70) return AppTheme.orange;
    return AppTheme.green;
  }

  @override
  Widget build(BuildContext context) {
    final clamped = (percentage.clamp(0, 100) / 100.0);

    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppTheme.neutral,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Stack(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeOutCubic,
                width: constraints.maxWidth * clamped,
                decoration: BoxDecoration(
                  color: _fillColor,
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
