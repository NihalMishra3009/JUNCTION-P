import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

enum PillVariant {
  live,
  simulated,
  critical,
  high,
  watch,
  yellow,
  predicted,
  grey,
}

class PillBadge extends StatelessWidget {
  final String text;
  final PillVariant variant;
  final double fontSize;
  final EdgeInsetsGeometry padding;

  const PillBadge({
    super.key,
    required this.text,
    this.variant = PillVariant.live,
    this.fontSize = 11,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Border? border;

    switch (variant) {
      case PillVariant.live:
        bg = AppTheme.greenBg;
        fg = AppTheme.green;
        break;
      case PillVariant.simulated:
        bg = AppTheme.paperDark;
        fg = AppTheme.inkMuted;
        border = Border.all(color: AppTheme.neutralDark, width: 0.8);
        break;
      case PillVariant.critical:
        bg = AppTheme.redBg;
        fg = AppTheme.red;
        break;
      case PillVariant.high:
        bg = AppTheme.orangeBg;
        fg = AppTheme.orange;
        break;
      case PillVariant.watch:
        bg = AppTheme.yellowStateBg;
        fg = AppTheme.yellowState;
        break;
      case PillVariant.yellow:
        bg = AppTheme.yellow;
        fg = AppTheme.ink;
        break;
      case PillVariant.predicted:
        bg = AppTheme.blueBg;
        fg = AppTheme.blue;
        break;
      case PillVariant.grey:
        bg = AppTheme.greyBg;
        fg = AppTheme.grey;
        break;
    }

    final badge = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
        border: border,
      ),
      child: Text(
        text,
        style: AppTheme.displayFont(
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.4,
        ),
      ),
    );

    if (variant == PillVariant.live) {
      return badge
          .animate(onPlay: (controller) => controller.repeat(reverse: true))
          .scaleXY(begin: 0.96, end: 1.02, duration: 1200.ms, curve: Curves.easeInOut);
    }

    return badge;
  }
}
