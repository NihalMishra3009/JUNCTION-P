import 'package:flutter/material.dart';
import '../models/types.dart';
import '../theme/app_theme.dart';
import 'motion_tap.dart';

class TravelModeSelector extends StatelessWidget {
  final TravelMode activeMode;
  final ValueChanged<TravelMode> onModeChanged;
  final List<TravelMode>? modes;

  const TravelModeSelector({
    super.key,
    required this.activeMode,
    required this.onModeChanged,
    this.modes,
  });

  List<TravelMode> get _displayModes =>
      modes ??
      const [
        TravelMode.multimodal,
        TravelMode.walking,
        TravelMode.driving,
        TravelMode.train,
      ];

  @override
  Widget build(BuildContext context) {
    final list = _displayModes;

    return Container(
      width: double.infinity,
      height: 44,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.neutralDark, width: 1.0),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: list.map((mode) {
          final isSelected = activeMode == mode;
          return Expanded(
            child: MotionTap(
              onTap: () => onModeChanged(mode),
              scaleDown: 0.96,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.ink : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      mode.iconData,
                      size: 15,
                      color: isSelected ? AppTheme.yellow : AppTheme.inkMuted,
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        mode.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppTheme.inkMuted,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
