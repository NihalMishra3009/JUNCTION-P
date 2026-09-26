import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Pixel-perfect vector reproduction of the Junction Diamond & Orbit Node Logo
class JunctionBrandEmblem extends StatelessWidget {
  final double size;
  final double borderRadius;
  final bool hasShadow;

  const JunctionBrandEmblem({
    super.key,
    this.size = 64,
    this.borderRadius = 18,
    this.hasShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTheme.ink,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: hasShadow ? AppTheme.shadowMd : null,
      ),
      child: CustomPaint(
        size: Size(size, size),
        painter: JunctionLogoPainter(),
      ),
    );
  }
}

class JunctionLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // 1. Center hollow yellow diamond
    final diamondPaint = Paint()
      ..color = AppTheme.yellow
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.082
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.miter;

    final centerX = w * 0.46;
    final centerY = h * 0.54;
    final radius = w * 0.18;

    final diamondPath = Path()
      ..moveTo(centerX, centerY - radius) // top
      ..lineTo(centerX + radius, centerY) // right
      ..lineTo(centerX, centerY + radius) // bottom
      ..lineTo(centerX - radius, centerY) // left
      ..close();

    canvas.drawPath(diamondPath, diamondPaint);

    // 2. Upper-right solid yellow circle dot (orbit node)
    final dotPaint = Paint()
      ..color = AppTheme.yellow
      ..style = PaintingStyle.fill;

    final dotX = w * 0.72;
    final dotY = h * 0.26;
    final dotRadius = w * 0.082;

    canvas.drawCircle(Offset(dotX, dotY), dotRadius, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
