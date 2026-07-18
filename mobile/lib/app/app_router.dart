import 'package:flutter/material.dart';

import '../views/booking_view.dart';
import '../models/bite_intake_route_args.dart';
import '../views/bite_intake_view.dart';
import '../views/appointments_view.dart';
import '../views/history_view.dart';
import '../views/login_view.dart';
import '../views/menu_view.dart';
import '../views/notifications_view.dart';
import '../views/profile_setup_view.dart';
import '../views/settings_view.dart';
import '../views/sign_up_view.dart';
import '../views/welcome_view.dart';
import 'app_routes.dart';

abstract final class AppRouter {
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final page = switch (settings.name) {
      AppRoutes.welcome => const WelcomeView(),
      AppRoutes.login => const LoginView(),
      AppRoutes.signUp => const SignUpView(),
      AppRoutes.menu => const MenuView(),
      AppRoutes.booking => const BookingView(),
      AppRoutes.history => const HistoryView(),
      AppRoutes.settings => const SettingsView(),
      AppRoutes.notifications => const NotificationsView(),
      AppRoutes.profileSetup => ProfileSetupView(
        initialRelationship: settings.arguments == 'add-dependent'
            ? 'child'
            : 'self',
        returnToBooking: settings.arguments == 'add-dependent',
      ),
      AppRoutes.biteIntake => settings.arguments is BiteIntakeRouteArgs
          ? BiteIntakeView(
              args: settings.arguments! as BiteIntakeRouteArgs,
            )
          : const BookingView(),
      AppRoutes.appointments => const AppointmentsView(),
      _ => const WelcomeView(),
    };

    return PageRouteBuilder<dynamic>(
      settings: settings,
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (_, animation, secondaryAnimation) => page,
      transitionsBuilder: (_, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );
        final slideAnimation = Tween<Offset>(
          begin: const Offset(0.045, 0),
          end: Offset.zero,
        ).animate(curvedAnimation);

        return FadeTransition(
          opacity: curvedAnimation,
          child: SlideTransition(position: slideAnimation, child: child),
        );
      },
    );
  }
}
