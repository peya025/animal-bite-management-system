import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/appointment_summary.dart';
import 'package:mobile/widgets/appointments/appointment_card.dart';

void main() {
  group('AppointmentSummary - Follow-up and Booster Cancellation Policy', () {
    test('Day 0 initial consultation can be cancelled', () {
      final app = AppointmentSummary(
        id: 1,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'consultation',
        scheduledDate: DateTime.now().add(const Duration(days: 1)),
        status: 'scheduled',
        doseNumber: null,
        doseName: null,
      );

      expect(app.isFollowUpOrBooster, isFalse);
      expect(app.canCancel, isTrue);
      expect(app.isNonCancellableFollowUp, isFalse);
    });

    test('Day 3 scheduled vaccination cannot be cancelled', () {
      final app = AppointmentSummary(
        id: 2,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'vaccination',
        scheduledDate: DateTime.now().add(const Duration(days: 3)),
        status: 'scheduled',
        doseNumber: 3,
        doseName: 'Day 3',
      );

      expect(app.isFollowUpOrBooster, isTrue);
      expect(app.canCancel, isFalse);
      expect(app.isNonCancellableFollowUp, isTrue);
    });

    test('Day 7 scheduled vaccination cannot be cancelled', () {
      final app = AppointmentSummary(
        id: 3,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'vaccination',
        scheduledDate: DateTime.now().add(const Duration(days: 7)),
        status: 'scheduled',
        doseNumber: 7,
        doseName: 'Day 7',
      );

      expect(app.isFollowUpOrBooster, isTrue);
      expect(app.canCancel, isFalse);
      expect(app.isNonCancellableFollowUp, isTrue);
    });

    test('Booster scheduled vaccination cannot be cancelled', () {
      final appBooster1 = AppointmentSummary(
        id: 4,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'booster',
        scheduledDate: DateTime.now().add(const Duration(days: 1)),
        status: 'scheduled',
        doseNumber: 90,
        doseName: 'Booster 1',
        notes: '[BOOSTER RE-EXPOSURE: Day 0]',
      );

      expect(appBooster1.isFollowUpOrBooster, isTrue);
      expect(appBooster1.canCancel, isFalse);
      expect(appBooster1.isNonCancellableFollowUp, isTrue);

      final appBooster2 = AppointmentSummary(
        id: 5,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'booster',
        scheduledDate: DateTime.now().add(const Duration(days: 4)),
        status: 'scheduled',
        doseNumber: 365,
        doseName: 'Booster 2',
        notes: '[BOOSTER RE-EXPOSURE: Day 3 follow-up]',
      );

      expect(appBooster2.isFollowUpOrBooster, isTrue);
      expect(appBooster2.canCancel, isFalse);
      expect(appBooster2.isNonCancellableFollowUp, isTrue);
    });
  });

  group('AppointmentCard - UI Rendering of Cancellation & Important Note', () {
    testWidgets('Displays cancel button for initial consultation', (tester) async {
      final app = AppointmentSummary(
        id: 1,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'consultation',
        scheduledDate: DateTime.now().add(const Duration(days: 1)),
        status: 'scheduled',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppointmentCard(
              appointment: app,
              onCancel: () {},
            ),
          ),
        ),
      );

      expect(find.text('CANCEL APPOINTMENT'), findsOneWidget);
      expect(find.textContaining('Important Note: Follow-up doses'), findsNothing);
    });

    testWidgets('Displays Important Note and hides cancel button for Day 3 dose', (tester) async {
      final app = AppointmentSummary(
        id: 2,
        patientId: 10,
        patientName: 'Juan Dela Cruz',
        type: 'vaccination',
        scheduledDate: DateTime.now().add(const Duration(days: 3)),
        status: 'scheduled',
        doseNumber: 3,
        doseName: 'Day 3',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppointmentCard(
              appointment: app,
              onCancel: () {},
            ),
          ),
        ),
      );

      expect(find.text('CANCEL APPOINTMENT'), findsNothing);
      expect(
        find.textContaining('Important Note: Follow-up doses (Day 3 to booster) cannot be cancelled online'),
        findsOneWidget,
      );
    });
  });
}
