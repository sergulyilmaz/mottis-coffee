import 'package:flutter/material.dart';

class AppColors {
  // Dark tema — premium kahveci
  static const bg = Color(0xFF1A1A1A);
  static const surface = Color(0xFF242424);
  static const card = Color(0xFF2A2A2A);
  static const cardLight = Color(0xFF333333);

  static const primary = Color(0xFFF4812A);      // Turuncu accent
  static const gold = Color(0xFFD4A043);          // Altin ton
  static const goldLight = Color(0xFFE8C96A);

  static const text = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFFB0B0B0);
  static const textMuted = Color(0xFF808080);
  static const textDark = Color(0xFF1A1A1A);

  static const border = Color(0xFF3A3A3A);
  static const success = Color(0xFF4CAF50);
  static const error = Color(0xFFE0362A);

  static const marbleStart = Color(0xFFE8E0D8);
  static const marbleEnd = Color(0xFFF5F0EB);
}

class AppTheme {
  static ThemeData get theme => ThemeData(
        scaffoldBackgroundColor: AppColors.bg,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          secondary: AppColors.gold,
          surface: AppColors.surface,
          error: AppColors.error,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.bg,
          foregroundColor: AppColors.text,
          elevation: 0,
        ),
      );
}
