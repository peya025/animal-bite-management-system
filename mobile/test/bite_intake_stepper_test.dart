import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/bite_intake_route_args.dart';
import 'package:mobile/models/booking_draft.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/views/bite_intake_view.dart';

void main() {
  final samplePatient = PatientProfile(
    id: 1,
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    dateOfBirth: '1995-05-15',
    gender: 'Male',
    contactNumber: '09123456789',
    address: 'Poblacion, Tagoloan',
    relationship: 'self',
    status: 'verified',
  );

  final sampleBooking = BookingDraft(
    service: BookingService.consultation,
    date: DateTime(2026, 9, 25),
    timeSlot: BookingTimeSlot.morning,
  );

  Widget buildIntakeView() {
    return MaterialApp(
      home: BiteIntakeView(
        args: BiteIntakeRouteArgs(
          patient: samplePatient,
          booking: sampleBooking,
        ),
      ),
    );
  }

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  testWidgets('BiteIntakeView renders Step 1 (Patient) as read-only Form 1 info', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(500, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(buildIntakeView());
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Bite incident intake'), findsOneWidget);
    expect(find.text('Step 1 of 5 — Patient'), findsOneWidget);
    expect(find.text('20%'), findsOneWidget);
    expect(find.text('Juan'), findsOneWidget);
    expect(find.text('Dela Cruz'), findsOneWidget);
    expect(find.text('1995-05-15'), findsOneWidget);
    expect(find.text('Male'), findsOneWidget);
    expect(find.text('09123456789'), findsOneWidget);
    expect(find.text('Poblacion, Tagoloan'), findsOneWidget);

    // Form 1 fields are read-only (not TextFormFields)
    expect(find.widgetWithText(TextFormField, 'Juan'), findsNothing);
    expect(find.text('Next: Incident details'), findsOneWidget);
  });

  testWidgets(
    'BiteIntakeView Step 2 (Incident) validates required fields before advancing',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildIntakeView());
      await tester.pump(const Duration(milliseconds: 300));

      // Advance from Step 1 to Step 2
      await tapVisible(tester, find.text('Next: Incident details'));

      expect(find.text('Step 2 of 5 — Incident details'), findsOneWidget);
      expect(find.text('40%'), findsOneWidget);

      // Attempting to advance without filling required fields shows error
      await tapVisible(tester, find.text('Next: Animal details'));

      expect(
        find.text('Please select the mode of exposure.'),
        findsOneWidget,
      );
      // Still on Step 2
      expect(find.text('Step 2 of 5 — Incident details'), findsOneWidget);
    },
  );

  testWidgets(
    'BiteIntakeView Step 3 (Animal) provides Dog, Cat, Other with required textbox for Other',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildIntakeView());
      await tester.pump(const Duration(milliseconds: 300));

      // Go to Step 2
      await tapVisible(tester, find.text('Next: Incident details'));

      // Fill Step 2 required fields
      await tapVisible(tester, find.text('Transdermal bite'));
      await tapVisible(tester, find.text('Upper extremities (arm or hand)'));

      // Advance to Step 3
      await tapVisible(tester, find.text('Next: Animal details'));

      expect(find.text('Step 3 of 5 — Animal details'), findsOneWidget);
      expect(find.text('60%'), findsOneWidget);

      // Verify Animal options: Dog, Cat, Other
      expect(find.text('Dog'), findsOneWidget);
      expect(find.text('Cat'), findsOneWidget);
      expect(find.text('Other'), findsOneWidget);

      // By default, 'Dog' is selected, so the 'Specify animal species *' textbox is NOT visible
      expect(find.text('Specify animal species *'), findsNothing);

      // Tap 'Cat' - textbox remains hidden
      await tapVisible(tester, find.text('Cat'));
      expect(find.text('Specify animal species *'), findsNothing);

      // Tap 'Other' - opens required textbox
      await tapVisible(tester, find.text('Other'));
      expect(find.text('Specify animal species *'), findsOneWidget);

      // Select animal ownership
      await tapVisible(tester, find.text('Select ownership'));
      await tapVisible(tester, find.text('Stray').last);

      // Attempt to advance with empty other textbox -> error
      await tapVisible(tester, find.text('Next: Previous history'));

      expect(
        find.text('Please specify the other animal species.'),
        findsOneWidget,
      );
      expect(find.text('Step 3 of 5 — Animal details'), findsOneWidget);

      // Fill in other animal species
      await tester.enterText(
        find.widgetWithText(TextFormField, 'e.g. Bat, Monkey, Pig, etc.'),
        'Bat',
      );
      await tester.pumpAndSettle();

      // Advance to Step 4
      await tapVisible(tester, find.text('Next: Previous history'));

      expect(find.text('Step 4 of 5 — Previous history'), findsOneWidget);
      expect(find.text('80%'), findsOneWidget);
    },
  );

  testWidgets(
    'BiteIntakeView Step 5 (Review and book) displays all patient-reported sections and disclaimer',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildIntakeView());
      await tester.pump(const Duration(milliseconds: 300));

      // Step 1 -> Step 2
      await tapVisible(tester, find.text('Next: Incident details'));

      // Step 2 fields
      await tapVisible(tester, find.text('Transdermal bite'));
      await tapVisible(tester, find.text('Upper extremities (arm or hand)'));

      // Step 2 -> Step 3
      await tapVisible(tester, find.text('Next: Animal details'));

      // Step 3 fields: Select Dog, Owned
      await tapVisible(tester, find.text('Dog'));
      await tapVisible(tester, find.text('Select ownership'));
      await tapVisible(tester, find.text('Owned').last);

      // Step 3 -> Step 4
      await tapVisible(tester, find.text('Next: Previous history'));
      expect(find.text('Step 4 of 5 — Previous history'), findsOneWidget);

      // Step 4 -> Step 5
      await tapVisible(tester, find.text('Next: Review and book'));

      expect(find.text('Step 5 of 5 — Review and book'), findsOneWidget);
      expect(find.text('100%'), findsOneWidget);

      // Verify patient-safe disclaimer notice
      expect(
        find.text('Patient-Reported Intake · Verification Required'),
        findsOneWidget,
      );

      // Verify review cards
      expect(find.text('Appointment details'), findsOneWidget);
      expect(find.text('1. Patient'), findsOneWidget);
      expect(find.text('2. Incident details'), findsOneWidget);
      expect(find.text('3. Animal details'), findsOneWidget);
      expect(find.text('4. Previous history'), findsOneWidget);

      // Verify action buttons
      expect(find.text('Back'), findsOneWidget);
      expect(find.text('Confirm and book'), findsOneWidget);

      // Test Edit button navigates back to Step 2
      final editButtons = find.text('Edit');
      expect(editButtons, findsWidgets);
      await tapVisible(tester, editButtons.at(1)); // Edit Incident details (index 1 is Incident)

      expect(find.text('Step 2 of 5 — Incident details'), findsOneWidget);
    },
  );

  testWidgets(
    'BiteIntakeView Step 2 supports optional facility referral with pre-arrival vitals and badges',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildIntakeView());
      await tester.pump(const Duration(milliseconds: 300));

      // Advance to Step 2
      await tapVisible(tester, find.text('Next: Incident details'));

      // Verify referral switch exists and is off by default
      expect(find.text('Referred from another facility?'), findsOneWidget);
      expect(find.text('Referred by Location'), findsNothing);

      // Toggle referral switch ON
      await tapVisible(tester, find.byType(Switch));
      expect(find.text('Referred by Location'), findsOneWidget);
      expect(find.text('Pre-Arrival Vitals from Referral Form'), findsOneWidget);

      // Select Municipality
      await tapVisible(tester, find.text('— Select Municipality —'));
      await tapVisible(tester, find.text('Tagoloan').last);

      // Select Barangay
      await tapVisible(tester, find.text('— Select Barangay —'));
      await tapVisible(tester, find.text('Poblacion').last);

      // Verify auto-suggested health center name and customize it
      expect(
        find.widgetWithText(TextFormField, 'Tagoloan Rural Health Unit (RHU) / BHS'),
        findsOneWidget,
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Tagoloan Rural Health Unit (RHU) / BHS'),
        'Barangay Kimalok Health Station (BHS)',
      );

      // Enter Pre-arrival Vitals: BP 120 / 80 (High BP badge)
      await tester.enterText(find.widgetWithText(TextFormField, 'Systolic'), '120');
      await tester.enterText(find.widgetWithText(TextFormField, 'Diastolic'), '80');
      await tester.pumpAndSettle();
      expect(find.textContaining('High BP'), findsOneWidget);

      // Enter Temp: 36 (Normal badge)
      await tester.enterText(find.widgetWithText(TextFormField, 'e.g. 36.5'), '36');
      await tester.pumpAndSettle();
      expect(find.textContaining('Normal'), findsWidgets);

      // Enter Height & Weight
      await tester.enterText(find.widgetWithText(TextFormField, 'e.g. 150'), '150');
      await tester.enterText(find.widgetWithText(TextFormField, 'e.g. 50'), '50');

      // Enter Attending Provider
      await tester.enterText(
        find.widgetWithText(TextFormField, 'e.g. Triage Doctor from referral paper form'),
        'Triage Doctor',
      );

      // Attach referral photo
      await tapVisible(tester, find.text('Attach referral paper form photo'));
      expect(find.byTooltip('Remove photo'), findsOneWidget);
    },
  );
}
