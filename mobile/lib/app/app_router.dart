import 'package:flutter/material.dart';

import '../views/booking_view.dart';
import '../models/bite_intake_route_args.dart';
import '../models/patient_profile.dart';
import '../models/patient_profile_form_args.dart';
import '../views/bite_intake_view.dart';
import '../views/appointments_view.dart';
import '../views/history_view.dart';
import '../views/login_view.dart';
import '../views/menu_view.dart';
import '../views/notifications_view.dart';
import '../views/patient_activation_view.dart';
import '../views/patient_profile_view.dart';
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
      AppRoutes.patientActivation => PatientActivationView(
        initialToken: settings.arguments is String ? settings.arguments as String : null,
      ),
      AppRoutes.menu => const MenuView(),
      AppRoutes.booking => const BookingView(),
      AppRoutes.history => const HistoryView(),
      AppRoutes.settings => const SettingsView(),
      AppRoutes.notifications => const NotificationsView(),
      AppRoutes.profileSetup => switch (settings.arguments) {
        PatientProfileFormArgs args => ProfileSetupView(
          initialRelationship:
              args.initialRelationship ?? args.patient?.relationship ?? 'self',
          returnToBooking: args.returnToBooking,
          existingPatient: args.patient,
        ),
        PatientProfile patient => ProfileSetupView(
          initialRelationship: patient.relationship,
          existingPatient: patient,
        ),
        'add-dependent' => const ProfileSetupView(
          initialRelationship: 'child',
          returnToBooking: true,
        ),
        _ => const ProfileSetupView(),
      },
      AppRoutes.patientProfile =>
        settings.arguments is PatientProfile
            ? PatientProfileView(patient: settings.arguments! as PatientProfile)
            : const SettingsView(),
      AppRoutes.biteIntake =>
        settings.arguments is BiteIntakeRouteArgs
            ? BiteIntakeView(args: settings.arguments! as BiteIntakeRouteArgs)
            : const BookingView(),
      AppRoutes.appointments => const AppointmentsView(),
      _ => const WelcomeView(),
    };

    return PageRouteBuilder<dynamic>(
      settings: settings,
      transitionDuration: const Duration(milliseconds: 180),
      reverseTransitionDuration: const Duration(milliseconds: 150),
      pageBuilder: (_, animation, secondaryAnimation) => page,
      transitionsBuilder: (_, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOut,
          reverseCurve: Curves.easeIn,
        );
        return FadeTransition(opacity: curvedAnimation, child: child);
      },
    );
  }
}
