import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/app/app_router.dart';
import 'package:mobile/models/bite_intake_route_args.dart';
import 'package:mobile/models/booking_draft.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/views/bite_intake_view.dart';
import 'package:mobile/views/booking_view.dart';
import 'package:mobile/views/history_view.dart';
import 'package:mobile/views/menu_view.dart';
import 'package:mobile/views/notifications_view.dart';
import 'package:mobile/views/settings_view.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('opens the login view from the welcome view', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());

    expect(find.text('ANIMAL BITE CENTER'), findsOneWidget);

    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    expect(find.text('LOGIN'), findsWidgets);
    expect(find.text('EMAIL'), findsOneWidget);
  });

  testWidgets('login form shows required field validation', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('LOGIN').last);
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('sign up tab opens the registration form', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('SIGN UP'));
    await tester.pumpAndSettle();

    expect(find.text('FIRST NAME'), findsOneWidget);
    expect(find.text('LAST NAME'), findsOneWidget);
    expect(find.text('REGISTER'), findsOneWidget);
    expect(find.text('Have an account?'), findsOneWidget);
    expect(find.text('Log in'), findsOneWidget);
  });

  testWidgets('menu renders at a phone viewport without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(theme: ThemeData(useMaterial3: true), home: const MenuView()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Animal Bite Center'), findsOneWidget);
    expect(find.text('Bite care guide'), findsOneWidget);
    expect(find.text('Upcoming schedules'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('book navigation opens the sample booking page', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/booking': (_) => const BookingView()},
      ),
    );

    await tester.tap(find.text('Book'));
    await tester.pumpAndSettle();

    expect(find.text('Book appointment'), findsOneWidget);
    expect(find.text('Who is this appointment for?'), findsOneWidget);
    expect(find.text('Select a service'), findsOneWidget);
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(find.text('Choose a booking date'), findsOneWidget);
    expect(find.text('Vaccination'), findsWidgets);
  });

  testWidgets('booking requires a reusable patient profile', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        initialRoute: '/booking',
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
    await tester.pumpAndSettle();

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('BOOK APPOINTMENT'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('BOOK APPOINTMENT'));
    await tester.pumpAndSettle();

    expect(find.text('Patient profile'), findsOneWidget);
    expect(find.text('RELATIONSHIP'), findsOneWidget);
    expect(find.text('My child'), findsOneWidget);
    expect(find.text('FIRST NAME *'), findsOneWidget);
    expect(find.text('GENDER *'), findsOneWidget);
    expect(find.text('SAVE PATIENT PROFILE'), findsOneWidget);
  });

  testWidgets('bite intake locks identity and asks incident questions', (
    tester,
  ) async {
    const patient = PatientProfile(
      id: 1,
      name: 'Juan Dela Cruz',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      relationship: 'self',
      status: 'verified',
    );
    final booking = BookingDraft(
      service: BookingService.consultation,
      date: DateTime(2026, 7, 25),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BiteIntakeView(
          args: BiteIntakeRouteArgs(patient: patient, booking: booking),
        ),
      ),
    );

    expect(find.text('Bite incident intake'), findsOneWidget);
    expect(find.text('Juan'), findsOneWidget);
    expect(find.text('Dela Cruz'), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.widgetWithText(TextFormField, 'Juan'))
          .enabled,
      isFalse,
    );
    expect(find.text('TYPE OF EXPOSURE *'), findsOneWidget);
    expect(find.text('WAS THE WOUND WASHED? *'), findsOneWidget);
    expect(find.text('SUBMIT INTAKE AND BOOK'), findsOneWidget);
  });

  testWidgets('history navigation opens demo records', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/history': (_) => const HistoryView()},
      ),
    );

    await tester.tap(find.text('History'));
    await tester.pumpAndSettle();

    expect(find.text('Appointments and vaccination activity.'), findsOneWidget);
    expect(find.text('Bite consultation'), findsOneWidget);
  });

  testWidgets('settings navigation opens demo preferences', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/settings': (_) => const SettingsView()},
      ),
    );

    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    expect(
      find.text('Manage your profile and app preferences.'),
      findsOneWidget,
    );
    expect(find.text('Preferences'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);
  });

  testWidgets('center action opens the demo digital vaccination card', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(theme: ThemeData(useMaterial3: true), home: const MenuView()),
    );

    await tester.tap(find.byTooltip('Patient card'));
    await tester.pumpAndSettle();

    expect(find.text('Digital vaccination card'), findsOneWidget);
    expect(find.text('DEMO QR'), findsOneWidget);
    expect(find.text('2 of 4 doses'), findsOneWidget);
  });

  testWidgets('notification bell opens demo notifications', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/notifications': (_) => const NotificationsView()},
      ),
    );

    await tester.tap(find.byTooltip('Notifications'));
    await tester.pumpAndSettle();

    expect(find.text('Reminders and clinic updates.'), findsOneWidget);
    expect(find.text('Vaccination reminder'), findsOneWidget);
    expect(find.text('Unread (3)'), findsOneWidget);

    await tester.tap(find.text('Vaccination reminder'));
    await tester.pump();
    expect(find.text('Unread (2)'), findsOneWidget);
  });
}
