import 'package:flutter/material.dart';

import '../views/login_view.dart';
import '../views/booking_view.dart';
import '../views/history_view.dart';
import '../views/menu_view.dart';
import '../views/notifications_view.dart';
import '../views/sign_up_view.dart';
import '../views/settings_view.dart';
import '../views/welcome_view.dart';
import 'app_routes.dart';
import 'app_theme.dart';

class AnimalCareApp extends StatelessWidget {
  const AnimalCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Animal Bite Management System',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: AppRoutes.welcome,
      routes: {
        AppRoutes.welcome: (_) => const WelcomeView(),
        AppRoutes.login: (_) => const LoginView(),
        AppRoutes.signUp: (_) => const SignUpView(),
        AppRoutes.menu: (_) => const MenuView(),
        AppRoutes.booking: (_) => const BookingView(),
        AppRoutes.history: (_) => const HistoryView(),
        AppRoutes.settings: (_) => const SettingsView(),
        AppRoutes.notifications: (_) => const NotificationsView(),
      },
    );
  }
}
