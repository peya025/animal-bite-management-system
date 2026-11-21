import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app_router.dart';
import 'package:mobile/models/bite_intake_route_args.dart';
import 'package:mobile/models/booking_draft.dart';
import 'package:mobile/models/form_configuration.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/services/form_configuration_repository.dart';
import 'package:mobile/services/mock_mobile_api.dart';
import 'package:mobile/views/bite_intake_view.dart';
import 'package:mobile/views/booking_view.dart';
import 'package:mobile/views/profile_setup_view.dart';
import 'package:mobile/widgets/history/history_filters.dart';
import 'package:mobile/widgets/history/history_record_card.dart';

FormConfiguration _makeConfig({
  Map<String, bool> profileSections = const {},
  Map<String, String> profileRules = const {},
  Map<String, bool> intakeSections = const {},
  Map<String, String> intakeRules = const {},
  int revision = 1,
}) {
  return FormConfiguration.fromJson({
    'schema_version': 1,
    'revision': revision,
    'clinic_id': 1,
    'profile': {
      'sections': {
        'patient_registration_enabled': true,
        'address_section_enabled': true,
        'socioeconomic_section_enabled': true,
        'gov_programs_section_enabled': true,
        ...profileSections,
      },
      'field_rules': {
        'blood_type': 'optional',
        'mother_maiden_name': 'optional',
        'civil_status': 'optional',
        'spouse_name': 'optional',
        'address_municipality': 'required',
        'address_barangay': 'required',
        'address_purok': 'optional',
        'province': 'required',
        'educational_attainment': 'optional',
        'employment_status': 'optional',
        'family_member': 'optional',
        'philhealth_member': 'optional',
        'philhealth_status': 'optional',
        'philhealth_no': 'optional',
        'philhealth_category': 'optional',
        'fourps_member': 'optional',
        'dswd_nhts': 'optional',
        ...profileRules,
      },
    },
    'intake': {
      'sections': {
        'bite_intake_section_enabled': true,
        ...intakeSections,
      },
      'field_rules': {
        'bite_date': 'required',
        'bite_place': 'required',
        'site_washed': 'required',
        'exposure_type': 'required',
        'animal_type': 'required',
        'animal_status': 'required',
        'animal_captured': 'optional',
        'wound_location': 'required',
        'patient_description': 'optional',
        ...intakeRules,
      },
      'payload_aliases': {
        'bite_date': 'date_of_exposure',
        'bite_place': 'place_of_exposure',
        'exposure_type': 'reported_mode_of_exposure',
        'animal_type': 'animal_species',
        'animal_status': 'animal_ownership',
        'wound_location': 'body_part_detail',
        'patient_description': 'incident_narrative',
      },
    },
  });
}

void main() {
  setUp(() {
    FormConfigurationRepository.clearCache();
    MockMobileApi.instance.resetDebugOverrides();
  });

  tearDown(() {
    FormConfigurationRepository.clearCache();
    MockMobileApi.instance.resetDebugOverrides();
  });

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'profile setup hides empty step 3, enforces required blood type, and omits hidden fields on save',
    (tester) async {
      tester.view.physicalSize = const Size(420, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            profileSections: {
              'socioeconomic_section_enabled': false,
              'gov_programs_section_enabled': false,
            },
            profileRules: {
              'blood_type': 'required',
              'address_purok': 'hidden',
            },
          );

      Map<String, dynamic>? capturedPayload;
      MockMobileApi.instance.debugOnCreatePatient = (payload) {
        capturedPayload = payload;
      };

      await tester.pumpWidget(
        const MaterialApp(
          home: ProfileSetupView(
            initialRelationship: 'dependent',
            returnToBooking: true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Step 1 of 2 — Basic info'), findsOneWidget);
      expect(find.textContaining('Blood type'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField).at(0), 'Ana');
      await tester.enterText(find.byType(TextFormField).at(1), 'Reyes');
      await tapVisible(tester, find.text('Female'));

      // Missing required blood type blocks advancing
      await tapVisible(tester, find.widgetWithText(ElevatedButton, 'Continue'));
      expect(find.text('Blood type is required.'), findsWidgets);

      await tapVisible(tester, find.text('Select'));
      await tapVisible(tester, find.text('O+').last);
      await tapVisible(tester, find.widgetWithText(ElevatedButton, 'Continue'));

      expect(find.text('Step 2 of 2 — Address & contact'), findsOneWidget);
      expect(find.text('Purok / Zone / Street'), findsNothing);
      expect(find.widgetWithText(ElevatedButton, 'Save profile'), findsOneWidget);

      await tapVisible(tester, find.text('Select municipality'));
      await tapVisible(tester, find.text('Tagoloan').last);
      await tapVisible(tester, find.text('Select barangay'));
      await tapVisible(tester, find.text('Poblacion').last);

      await tapVisible(
        tester,
        find.widgetWithText(ElevatedButton, 'Save profile'),
      );

      expect(capturedPayload, isNotNull);
      expect(capturedPayload!['blood_type'], 'O+');
      expect(capturedPayload!.containsKey('address_purok'), isFalse);
      expect(capturedPayload!.containsKey('address'), isFalse);
      expect(capturedPayload!.containsKey('educational_attainment'), isFalse);
      expect(capturedPayload!.containsKey('memberships'), isFalse);
    },
  );

  testWidgets(
    'profile setup retains draft and surfaces error when clinic policy changes before save',
    (tester) async {
      tester.view.physicalSize = const Size(420, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      var revision = 1;
      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            revision: revision,
            profileSections: {
              'socioeconomic_section_enabled': false,
              'gov_programs_section_enabled': false,
            },
            profileRules: {
              'blood_type': revision == 1 ? 'optional' : 'required',
            },
          );

      var createCalls = 0;
      MockMobileApi.instance.debugOnCreatePatient = (_) => createCalls++;

      await tester.pumpWidget(
        const MaterialApp(
          home: ProfileSetupView(
            initialRelationship: 'dependent',
            returnToBooking: true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), 'Pedro');
      await tester.enterText(find.byType(TextFormField).at(1), 'Cruz');
      await tapVisible(tester, find.text('Male'));
      await tapVisible(tester, find.widgetWithText(ElevatedButton, 'Continue'));

      expect(find.text('Step 2 of 2 — Address & contact'), findsOneWidget);
      await tapVisible(tester, find.text('Select municipality'));
      await tapVisible(tester, find.text('Tagoloan').last);
      await tapVisible(tester, find.text('Select barangay'));
      await tapVisible(tester, find.text('Poblacion').last);

      // Admin updates blood_type to required mid-draft
      revision = 2;
      await tapVisible(
        tester,
        find.widgetWithText(ElevatedButton, 'Save profile'),
      );

      expect(createCalls, 0);
      expect(find.text('Step 1 of 2 — Basic info'), findsOneWidget);
      expect(
        find.text(
          'Clinic form requirements were updated. Please review the highlighted fields before saving.',
        ),
        findsOneWidget,
      );
      expect(find.text('Pedro'), findsOneWidget);
    },
  );

  testWidgets('profile setup shows retry on config failure and recovers', (
    tester,
  ) async {
    var shouldFail = true;
    MockMobileApi.instance.debugFormConfigurationOverride =
        ({clinicId, patientId, appointmentId}) async {
          if (shouldFail) {
            throw Exception('Network unavailable');
          }
          return _makeConfig();
        };

    await tester.pumpWidget(
      const MaterialApp(
        home: ProfileSetupView(initialRelationship: 'dependent'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Could not load clinic form settings'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);

    shouldFail = false;
    await tapVisible(tester, find.widgetWithText(ElevatedButton, 'Retry'));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Step 1 of 3 — Basic info'), findsOneWidget);
  });

  testWidgets(
    'booking consultation checks profile completeness before intake while allowing booster without profile gate',
    (tester) async {
      tester.view.physicalSize = const Size(520, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      // Maria (patient 102) has no blood_type in MockData, while Juan (101) has O+
      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async =>
              _makeConfig(profileRules: {'blood_type': 'required'});

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: const BookingView(),
        ),
      );
      await tester.pumpAndSettle();

      // Switch patient from Juan to Maria
      await tapVisible(tester, find.text('Juan Santos Dela Cruz'));
      await tapVisible(tester, find.text('Maria Santos Dela Cruz'));

      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -1000),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Continue to intake'));
      expect(find.text('Complete patient profile'), findsOneWidget);
      expect(find.textContaining('Blood type'), findsOneWidget);
      expect(find.text('Update profile'), findsOneWidget);
    },
  );

  testWidgets(
    'bite intake disables steps when intake section disabled and submits without fabricated answers',
    (tester) async {
      tester.view.physicalSize = const Size(460, 950);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            intakeSections: {'bite_intake_section_enabled': false},
          );

      dynamic capturedIntake = 'UNSET';
      MockMobileApi.instance.debugOnBook = (_, _, intake) {
        capturedIntake = intake;
      };

      const patient = PatientProfile(
        id: 101,
        name: 'Juan Dela Cruz',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        relationship: 'self',
        status: 'verified',
        details: PatientDetailsProfile(
          addressMunicipality: 'Tagoloan',
          addressBarangay: 'Poblacion',
          province: 'Misamis Oriental',
        ),
      );
      final booking = BookingDraft(
        service: BookingService.consultation,
        date: DateTime(2026, 11, 20),
      );

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: BiteIntakeView(
            args: BiteIntakeRouteArgs(patient: patient, booking: booking),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Step 1 of 2 — Patient'), findsOneWidget);
      await tapVisible(tester, find.text('Next: Review and book'));

      expect(find.text('Step 2 of 2 — Review and book'), findsOneWidget);
      expect(find.text('Clinic Check-In Intake'), findsOneWidget);

      await tapVisible(tester, find.text('Confirm and book'));
      expect(capturedIntake, isNull);
    },
  );

  testWidgets(
    'bite intake captures explicit false site_washed and omits hidden narrative',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            intakeRules: {
              'patient_description': 'hidden',
              'site_washed': 'required',
            },
          );

      dynamic capturedIntake;
      MockMobileApi.instance.debugOnBook = (_, _, intake) {
        capturedIntake = intake;
      };

      const patient = PatientProfile(
        id: 101,
        name: 'Juan Dela Cruz',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        relationship: 'self',
        status: 'verified',
        details: PatientDetailsProfile(
          addressMunicipality: 'Tagoloan',
          addressBarangay: 'Poblacion',
          province: 'Misamis Oriental',
        ),
      );
      final booking = BookingDraft(
        service: BookingService.consultation,
        date: DateTime(2026, 11, 20),
      );

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: BiteIntakeView(
            args: BiteIntakeRouteArgs(patient: patient, booking: booking),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tapVisible(tester, find.text('Next: Incident details'));
      expect(
        find.text('Patient description of the incident'),
        findsNothing,
      );

      // Select municipality, site_washed = No, exposure, body-part group
      await tapVisible(tester, find.text('Select municipality'));
      await tapVisible(tester, find.text('Tagoloan').last);
      await tapVisible(
        tester,
        find.descendant(
          of: find.byKey(const ValueKey('site-washed-validation')),
          matching: find.text('No'),
        ),
      );
      await tapVisible(tester, find.text('Transdermal bite'));
      await tapVisible(tester, find.text('Upper extremities (arm or hand)'));

      await tapVisible(tester, find.text('Next: Animal details'));
      expect(find.text('Step 3 of 5 — Animal details'), findsOneWidget);

      await tapVisible(tester, find.text('Select ownership'));
      await tapVisible(tester, find.text('Owned').last);
      await tapVisible(tester, find.text('Next: Previous history'));
      await tapVisible(tester, find.text('Next: Review and book'));

      expect(find.text('Step 5 of 5 — Review and book'), findsOneWidget);
      await tapVisible(tester, find.text('Confirm and book'));

      expect(capturedIntake, isA<Map<String, dynamic>>());
      final map = capturedIntake as Map<String, dynamic>;
      expect(map['site_washed'], isFalse);
      expect(map.containsKey('incident_narrative'), isFalse);
    },
  );

  testWidgets(
    'bite intake retains draft and navigates to newly required field on mid-draft policy change',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      var revision = 1;
      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            revision: revision,
            intakeRules: {
              'site_washed': revision == 1 ? 'optional' : 'required',
            },
          );

      var bookCalls = 0;
      MockMobileApi.instance.debugOnBook = (_, _, _) => bookCalls++;

      const patient = PatientProfile(
        id: 101,
        name: 'Juan Dela Cruz',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        relationship: 'self',
        status: 'verified',
        details: PatientDetailsProfile(
          addressMunicipality: 'Tagoloan',
          addressBarangay: 'Poblacion',
          province: 'Misamis Oriental',
        ),
      );
      final booking = BookingDraft(
        service: BookingService.consultation,
        date: DateTime(2026, 11, 20),
      );

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: BiteIntakeView(
            args: BiteIntakeRouteArgs(patient: patient, booking: booking),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tapVisible(tester, find.text('Next: Incident details'));
      await tapVisible(tester, find.text('Select municipality'));
      await tapVisible(tester, find.text('Tagoloan').last);
      await tapVisible(tester, find.text('Transdermal bite'));
      await tapVisible(tester, find.text('Upper extremities (arm or hand)'));

      await tapVisible(tester, find.text('Next: Animal details'));
      await tapVisible(tester, find.text('Select ownership'));
      await tapVisible(tester, find.text('Owned').last);
      await tapVisible(tester, find.text('Next: Previous history'));
      await tapVisible(tester, find.text('Next: Review and book'));

      // Admin makes site_washed required while user is on Review
      revision = 2;
      await tapVisible(tester, find.text('Confirm and book'));

      expect(bookCalls, 0);
      expect(find.text('Step 2 of 5 — Incident details'), findsOneWidget);
      expect(
        find.text(
          'Clinic form requirements were updated. Please review before submitting.',
        ),
        findsOneWidget,
      );
      expect(
        find.text('Please indicate whether the wound was washed.'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'edit bite intake sheet hides hidden fields and omits them from update payload',
    (tester) async {
      tester.view.physicalSize = const Size(500, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      MockMobileApi.instance.debugFormConfigurationOverride =
          ({clinicId, patientId, appointmentId}) async => _makeConfig(
            intakeRules: {
              'bite_date': 'hidden',
              'patient_description': 'hidden',
              'site_washed': 'optional',
            },
          );

      Map<String, dynamic>? updatedIntake;
      MockMobileApi.instance.debugOnUpdateIntake = (_, intake) {
        updatedIntake = intake;
      };

      const record = HistoryRecord(
        type: HistoryFilter.appointments,
        title: 'Bite consultation',
        dateTime: 'Nov 17, 2026',
        status: HistoryStatus.scheduled,
        icon: Icons.calendar_today,
        appointmentId: 42,
        intake: {
          'date_of_exposure': '2026-11-15',
          'place_of_exposure': 'Poblacion, Tagoloan',
          'reported_mode_of_exposure': 'transdermal_bite',
          'animal_species': 'dog',
          'animal_ownership': 'owned',
          'body_part_group': 'upper_extremities',
          'site_washed': false,
          'incident_narrative': 'Existing hidden narrative',
        },
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: HistoryTimelineItem(record: record, isLast: true),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tapVisible(tester, find.text('Bite intake & patient details'));
      await tapVisible(tester, find.text('Edit bite intake details'));

      expect(find.text('Edit Bite Intake'), findsOneWidget);
      expect(find.text('Date of Exposure / Incident'), findsNothing);
      expect(find.text('Incident Description / Additional Notes'), findsNothing);

      await tapVisible(tester, find.text('Save Changes'));
      await tester.pump(const Duration(seconds: 4));

      expect(updatedIntake, isNotNull);
      expect(updatedIntake!.containsKey('date_of_exposure'), isFalse);
      expect(updatedIntake!.containsKey('incident_narrative'), isFalse);
      expect(updatedIntake!['site_washed'], isFalse);
    },
  );
}
