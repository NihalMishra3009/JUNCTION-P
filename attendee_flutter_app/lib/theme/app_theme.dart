import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // === DESIGN TOKENS ===
  static const Color yellow = Color(0xFFF5C400);
  static const Color yellowLight = Color(0xFFFDF3C0);
  static const Color ink = Color(0xFF111111);
  static const Color inkLight = Color(0xFF333333);
  static const Color inkMuted = Color(0xFF666666);
  static const Color inkFaint = Color(0xFF999999);
  static const Color paper = Color(0xFFF6F5F1);
  static const Color paperDark = Color(0xFFEEECE6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color neutral = Color(0xFFE7E5DE);
  static const Color neutralDark = Color(0xFFCCCAB8);

  // Operational states
  static const Color green = Color(0xFF16A34A);
  static const Color greenBg = Color(0xFFDCFCE7);
  static const Color yellowState = Color(0xFFCA8A04);
  static const Color yellowStateBg = Color(0xFFFEF9C3);
  static const Color orange = Color(0xFFEA580C);
  static const Color orangeBg = Color(0xFFFFEDD5);
  static const Color red = Color(0xFFDC2626);
  static const Color redBg = Color(0xFFFEE2E2);
  static const Color grey = Color(0xFF6B7280);
  static const Color greyBg = Color(0xFFF3F4F6);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueBg = Color(0xFFDBEAFE);

  // Border Radius
  static const double radiusLg = 20.0;
  static const double radiusMd = 14.0;
  static const double radiusSm = 10.0;
  static const double radiusXs = 8.0;
  static const double radiusPill = 999.0;

  // Box Shadows
  static List<BoxShadow> get shadowSm => [
        const BoxShadow(
          color: Color.fromRGBO(0, 0, 0, 0.06),
          blurRadius: 3,
          offset: Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get shadowMd => [
        const BoxShadow(
          color: Color.fromRGBO(0, 0, 0, 0.08),
          blurRadius: 12,
          offset: Offset(0, 4),
        ),
        const BoxShadow(
          color: Color.fromRGBO(0, 0, 0, 0.04),
          blurRadius: 4,
          offset: Offset(0, 2),
        ),
      ];

  // Typography with robust offline fallback
  static TextStyle displayFont({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w600,
    Color color = ink,
    double? letterSpacing = -0.2,
    double? height,
  }) {
    try {
      return GoogleFonts.spaceGrotesk(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    } catch (_) {
      return TextStyle(
        fontFamily: 'sans-serif',
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    }
  }

  static TextStyle bodyFont({
    double fontSize = 14,
    FontWeight fontWeight = FontWeight.w400,
    Color color = inkLight,
    double? letterSpacing,
    double? height = 1.4,
  }) {
    try {
      return GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    } catch (_) {
      return TextStyle(
        fontFamily: 'sans-serif',
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    }
  }

  static TextStyle metaText({
    double fontSize = 11,
    FontWeight fontWeight = FontWeight.w600,
    Color color = inkMuted,
  }) {
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: 0.8,
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: paper,
      colorScheme: const ColorScheme.light(
        primary: ink,
        secondary: yellow,
        surface: paper,
        error: red,
      ),
      textTheme: TextTheme(
        headlineLarge: displayFont(fontSize: 28, fontWeight: FontWeight.w700),
        headlineMedium: displayFont(fontSize: 22, fontWeight: FontWeight.w700),
        headlineSmall: displayFont(fontSize: 18, fontWeight: FontWeight.w600),
        bodyLarge: bodyFont(fontSize: 15),
        bodyMedium: bodyFont(fontSize: 13),
      ),
    );
  }
}
