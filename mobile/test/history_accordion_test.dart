import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/history/history_filters.dart';
import 'package:mobile/widgets/history/history_record_card.dart';

void main() {
  test('parses scheduled appointment with intake payload correctly', () {
    final record = HistoryRecord.fromJson({
      'id': 'app-42',
      'appointment_id': 42,
      'type': 'appointments',
      'title': 'Bite consultation',
      'date_time': 'November 14, 2026 · 9:30 AM',
      'scheduled_date': '2026-11-14',
      'time_slot': 'morning',
      'status': 'scheduled',
      'patient_name': 'Raz Olape',
      'relationship': 'child',
      'intake': {
        'intake_id': 10,
        'date_of_exposure': '2026-11-13',
        'place_of_exposure': 'Poblacion, Tagoloan',
        'reported_mode_of_exposure': 'bite',
        'animal_species': 'dog',
        'animal_ownership': 'owned',
        'body_part_group': 'lower_extremities',
        'body_part_detail': 'Right leg',
        'site_washed': true,
        'incident_narrative': 'Dog bite while walking home',
      },
    });

    expect(record.type, HistoryFilter.appointments);
    expect(record.status, HistoryStatus.scheduled);
    expect(record.appointmentId, 42);
    expect(record.patientName, 'Raz Olape');
    expect(record.relationship, 'child');
    expect(record.intake, isNotNull);
    expect(record.intake!['reported_mode_of_exposure'], 'bite');
    expect(record.intake!['animal_species'], 'dog');
  });

  testWidgets('renders accordion toggle on scheduled appointment and expands on tap', (tester) async {
    final record = HistoryRecord.fromJson({
      'id': 'app-42',
      'appointment_id': 42,
      'type': 'appointments',
      'title': 'Bite consultation',
      'date_time': 'November 14, 2026 · 9:30 AM',
      'scheduled_date': '2026-11-14',
      'time_slot': 'morning',
      'status': 'scheduled',
      'patient_name': 'Raz Olape',
      'relationship': 'child',
      'intake': {
        'intake_id': 10,
        'date_of_exposure': '2026-11-13',
        'place_of_exposure': 'Poblacion, Tagoloan',
        'reported_mode_of_exposure': 'bite',
        'animal_species': 'dog',
        'animal_ownership': 'owned',
        'body_part_group': 'lower_extremities',
        'body_part_detail': 'Right leg',
        'site_washed': true,
        'incident_narrative': 'Dog bite while walking home',
      },
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: HistoryTimelineItem(
              record: record,
              isLast: true,
            ),
          ),
        ),
      ),
    );

    // Initial state: card shows title, status, and compact accordion header
    expect(find.text('Bite consultation'), findsOneWidget);
    expect(find.text('Scheduled'), findsOneWidget);
    expect(find.text('Raz Olape (Child)'), findsOneWidget);
    expect(find.text('Bite intake & patient details'), findsOneWidget);
    expect(find.text('Editable'), findsOneWidget);

    // Intake body details are collapsed
    expect(find.text('Dog bite while walking home'), findsNothing);
    expect(find.text('Edit bite intake details'), findsNothing);

    // Tap to expand the accordion
    await tester.tap(find.text('Bite intake & patient details'));
    await tester.pumpAndSettle();

    // Now expanded: shows details and edit button
    expect(find.text('Dog bite while walking home'), findsOneWidget);
    expect(find.text('Poblacion, Tagoloan'), findsOneWidget);
    expect(find.text('Edit bite intake details'), findsOneWidget);
  });
}
