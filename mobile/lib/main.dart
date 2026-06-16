import 'package:flutter/material.dart';
import 'screens/landing_page.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Yellow-Green Color Palette
    const Color primaryGreen = Color(0xFF84cc16);
    const Color primaryLight = Color(0xFFdcfce7);
    const Color primaryDark = Color(0xFF65a30d);

    return MaterialApp(
      title: 'Animal Bite Management System',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryGreen,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        primaryColor: primaryGreen,
        appBarTheme: const AppBarTheme(
          backgroundColor: primaryGreen,
          elevation: 0,
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primaryGreen,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: 24,
              vertical: 12,
            ),
          ),
        ),
      ),
      home: const LandingPage(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const LandingPage(),
      },
    );
  }
}
