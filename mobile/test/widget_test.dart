import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/app/app_router.dart';
import 'package:mobile/models/app_notification.dart';
import 'package:mobile/models/appointment_summary.dart';
import 'package:mobile/models/bite_intake_route_args.dart';
import 'package:mobile/models/booking_draft.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/views/bite_intake_view.dart';
import 'package:mobile/views/booking_view.dart';
import 'package:mobile/views/history_view.dart';
import 'package:mobile/views/menu_view.dart';
import 'package:mobile/views/notifications_view.dart';
import 'package:mobile/views/settings_view.dart';
import 'package:mobile/widgets/appointments/appointment_card.dart';
import 'package:mobile/widgets/menu/search_header.dart';
import 'package:mobile/widgets/notifications/notification_card.dart';
import 'package:flutter/material.dart';

void main() {
  test('parses the mobile notification API payload', () {
    final notification = AppNotification.fromJson({
      'notification_id': 7,
      'type': 'booking_confirmation',
      'message': 'Your appointment is confirmed.',
      'status': 'pending',
      'created_at': '2026-07-19T12:00:00.000000Z',
      'patient': {'name': 'Maria Dela Cruz'},
    });

    expect(notification.title, 'Appointment confirmed');
    expect(notification.patientName, 'Maria Dela Cruz');
    expect(notification.isRead, isFalse);
  });

  testWidgets('opens the login view from the welcome view', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const AnimalCareApp());

    expect(find.text('ANIMAL BITE CENTER'), findsOneWidget);
    expect(find.text('Welcome to Animal Bite Center'), findsOneWidget);

    await tester.tap(find.text('NEXT'));
    await tester.pumpAndSettle();
    expect(find.text('Keep your care in one place'), findsOneWidget);

    await tester.tap(find.text('NEXT'));
    await tester.pumpAndSettle();
    expect(find.text('Set up your patient profiles'), findsOneWidget);

    await tester.tap(find.text('NEXT'));
    await tester.pumpAndSettle();
    expect(find.text('Book the visit you need'), findsOneWidget);

    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    expect(find.text('LOGIN'), findsWidgets);
    expect(find.text('EMAIL'), findsOneWidget);
  });

  testWidgets('login form shows required field validation', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('SKIP'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('LOGIN').last);
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('sign up tab opens the registration form', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('SKIP'));
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

    expect(find.text('User'), findsOneWidget);
    expect(find.text('Bite care guide'), findsOneWidget);
    expect(find.text('Upcoming schedules'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home upcoming schedules redirects to appointment list', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {
          '/appointments': (_) =>
              const Scaffold(body: Text('Appointment list destination')),
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('View all'));
    await tester.tap(find.text('View all'));
    await tester.pumpAndSettle();

    expect(find.text('Appointment list destination'), findsOneWidget);
  });

  testWidgets('scheduled appointment exposes cancellation action', (
    tester,
  ) async {
    var cancelled = false;
    final appointment = AppointmentSummary(
      id: 1,
      patientId: 1,
      patientName: 'Juan Dela Cruz',
      type: 'vaccination',
      scheduledDate: DateTime(2026, 7, 25),
      status: 'scheduled',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppointmentCard(
            appointment: appointment,
            onCancel: () => cancelled = true,
          ),
        ),
      ),
    );

    await tester.tap(find.text('CANCEL APPOINTMENT'));
    expect(cancelled, isTrue);
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

  testWidgets('notification bell opens the live notifications page', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/notifications': (_) => const NotificationsView()},
      ),
    );

    await tester.tap(find.byTooltip('Notifications'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Reminders and clinic updates.'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Unread (0)'), findsOneWidget);
  });

  testWidgets('notification card marks a live item as read', (tester) async {
    var tapped = false;
    final notification = AppNotification(
      id: 1,
      type: 'vaccination_reminder',
      message: 'Your next vaccination dose is due tomorrow.',
      status: 'pending',
      createdAt: DateTime.now(),
      patientName: 'Juan Dela Cruz',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NotificationCard(
            notification: notification,
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    await tester.tap(find.text('Vaccination reminder'));
    expect(tapped, isTrue);
    expect(find.textContaining('Juan Dela Cruz'), findsOneWidget);
  });

  testWidgets('MenuSearchHeader displays user name and default fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuSearchHeader(
            userName: 'Maria Santos',
            greeting: 'Good morning',
            onSearchPressed: () {},
            onNotificationsPressed: () {},
          ),
        ),
      ),
    );

    expect(find.text('Maria Santos'), findsOneWidget);
    expect(find.text('Good morning'), findsOneWidget);
    expect(find.text('Animal Bite Center'), findsNothing);

    // Test with default/fallback
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuSearchHeader(
            onSearchPressed: () {},
            onNotificationsPressed: () {},
          ),
        ),
      ),
    );

    expect(find.text('User'), findsOneWidget);
    expect(find.text('Animal Bite Center'), findsNothing);
  });
}
