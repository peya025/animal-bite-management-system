import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/app/app_router.dart';
import 'package:mobile/models/app_notification.dart';
import 'package:mobile/models/appointment_summary.dart';
import 'package:mobile/models/bite_intake_route_args.dart';
import 'package:mobile/models/booking_draft.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/views/bite_intake_view.dart';
import 'package:mobile/views/menu_view.dart';
import 'package:mobile/views/notifications_view.dart';
import 'package:mobile/views/schedule_calendar_view.dart';
import 'package:mobile/views/settings_view.dart';
import 'package:mobile/widgets/appointments/appointment_card.dart';
import 'package:mobile/widgets/menu/search_header.dart';
import 'package:mobile/widgets/notifications/notification_card.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

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
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();
    await tester.tap(find.text('SKIP'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('LOGIN').last);
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('sign up tab opens the registration form', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('SKIP'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('SIGN UP'));
    await tester.pumpAndSettle();

    expect(find.text('FIRST NAME'), findsOneWidget);
    expect(find.text('LAST NAME'), findsOneWidget);
    expect(find.text('CREATE ACCOUNT'), findsOneWidget);
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
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    expect(find.text('Juan Santos Dela Cruz'), findsOneWidget);
    expect(find.text('BITE CARE GUIDE'), findsOneWidget);
    expect(find.text('UPCOMING SCHEDULES'), findsOneWidget);
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

  testWidgets('booking view displays consultation service and date selection', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        initialRoute: '/booking',
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Book appointment'), findsOneWidget);
    expect(find.text('SERVICE TYPE'), findsOneWidget);
    expect(find.text('Bite consultation'), findsWidgets);
  });

  testWidgets('booking continues to bite incident intake', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        initialRoute: '/booking',
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
    await tester.pumpAndSettle();

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Continue to intake'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue to intake'));
    await tester.pumpAndSettle();

    expect(find.text('Bite incident intake'), findsOneWidget);
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
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Bite incident intake'), findsOneWidget);
    expect(find.text('Step 1 of 5 — Patient'), findsOneWidget);
    expect(find.text('Juan'), findsOneWidget);
    expect(find.text('Dela Cruz'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Juan'), findsNothing);
    expect(find.text('Next: Incident details'), findsOneWidget);

    await tester.ensureVisible(find.text('Next: Incident details'));
    await tester.tap(find.text('Next: Incident details'));
    await tester.pumpAndSettle();

    expect(find.text('Step 2 of 5 — Incident details'), findsOneWidget);
    expect(find.text('Mode of exposure *'), findsOneWidget);
    expect(find.text('Referred from another facility?'), findsOneWidget);
  });

  testWidgets('calendar navigation opens schedules', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/calendar': (_) => const ScheduleCalendarView()},
      ),
    );

    await tester.tap(find.text('Calendar').last);
    await tester.pumpAndSettle();

    expect(find.byType(ScheduleCalendarView), findsOneWidget);
  });

  testWidgets('profile navigation opens preferences', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const MenuView(),
        routes: {'/settings': (_) => const SettingsView()},
      ),
    );

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Privacy and security'), findsOneWidget);
  });

  testWidgets('center action opens the demo digital vaccination card', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(theme: ThemeData(useMaterial3: true), home: const MenuView()),
    );

    await tester.tap(find.byIcon(LucideIcons.qrCode));
    await tester.pumpAndSettle();

    expect(find.text('Digital Vaccination Card'), findsOneWidget);
    expect(
      find.text('Official Post-Exposure Prophylaxis (PEP) Certificate'),
      findsOneWidget,
    );
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

    await tester.tap(find.byIcon(LucideIcons.bell));
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
