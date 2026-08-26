import 'package:flutter/material.dart';

abstract final class AppColors {
  // Minimalist design system colors
  static const primary = Color(0xFF1D9E75); // Exact teal
  static const primaryDark = Color(0xFF085041); // Deep teal text
  static const primaryLight = Color(0xFFE1F5EE); // Light teal surface background
  
  static const white = Color(0xFFFFFFFF);
  static const pageBackground = Color(0xFFF5F5F5); // Light gray background
  
  // Text hierarchy
  static const textPrimary = Color(0xFF1A1A1A); // Near-black body text
  static const textSecondary = Color(0xFF6B6B6B); // Medium gray supporting text
  static const textMuted = Color(0xFFA8A8A8); // Light gray muted/disabled text
  
  // Legacy aliases for compatibility
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray500 = textSecondary;
  static const gray600 = Color(0xFF4B5563);
  static const gray700 = textPrimary;
  static const gray900 = textPrimary;
  
  // Dividers and borders
  static const divider = Color(0xFFEBEBEB); // Hairline dividers
  static const border = Color(0xFFEBEBEB); // Very light gray
  
  static const surfaceMuted = Color(0xFFF4F6F5);
  static const error = Color(0xFFEF4444);
  static const errorLight = Color(0xFFFEE2E2);
  static const errorDark = Color(0xFFB91C1C);
  static const success = Color(0xFF159A68);
  static const warning = Color(0xFFE58A2B);

  // Guide Card Palette
  static const guideTeal = Color(0xFF52B6B4); // Artwork matching teal
  static const guideTealDark = Color(0xFF0C3837); // High-contrast deep teal for text and backdrops
}

abstract final class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    );

    return ThemeData(
      colorScheme: colorScheme,
      useMaterial3: true,
      fontFamily: 'Poppins',
      scaffoldBackgroundColor: AppColors.white,
      
      // Minimalist dividers
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 0.5,
        space: 1,
      ),
      
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: AppColors.white,
        elevation: 0,
      ),
      
      // Primary CTA button - deep teal, no shadow
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primaryDark,
          foregroundColor: AppColors.white,
          minimumSize: const Size(44, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500, // Medium weight only
            letterSpacing: 0,
          ),
        ),
      ),
      
      // Minimalist input fields - hairline borders
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        border: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.divider, width: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.divider, width: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.primary, width: 1),
          borderRadius: BorderRadius.circular(8),
        ),
        errorBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.error, width: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.error, width: 1),
          borderRadius: BorderRadius.circular(8),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintStyle: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
        errorStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w400,
          color: AppColors.error,
        ),
      ),
      
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}
