import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/widgets/settings/profile_card.dart';

void main() {
  testWidgets('shows ADD PROFILE button when account has no profiles', (tester) async {
    bool addProfileTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileCard(
            name: 'Bird Dodo',
            email: 'dodo@gmail.com',
            phone: '09307223521',
            patients: const [],
            patientCount: 0,
            onEdit: () {},
            onAddProfile: () => addProfileTapped = true,
          ),
        ),
      ),
    );

    expect(find.text('ADD PROFILE'), findsOneWidget);
    expect(find.text('ADD DEPENDENT'), findsNothing);

    await tester.tap(find.text('ADD PROFILE'));
    expect(addProfileTapped, isTrue);
  });

  testWidgets('shows ADD PROFILE even when onAddDependent is passed as fallback', (tester) async {
    bool addDependentTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileCard(
            name: 'Bird Dodo',
            email: 'dodo@gmail.com',
            phone: '09307223521',
            patients: const [],
            patientCount: 0,
            onEdit: () {},
            onAddDependent: () => addDependentTapped = true,
          ),
        ),
      ),
    );

    expect(find.text('ADD PROFILE'), findsOneWidget);
    expect(find.text('ADD DEPENDENT'), findsNothing);

    await tester.tap(find.text('ADD PROFILE'));
    expect(addDependentTapped, isTrue);
  });

  testWidgets('shows ADD DEPENDENT button when account has existing profiles', (tester) async {
    bool addDependentTapped = false;

    const mockPatient = PatientProfile(
      id: 1,
      name: 'Bird Dodo',
      firstName: 'Bird',
      lastName: 'Dodo',
      relationship: 'self',
      status: 'verified',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileCard(
            name: 'Bird Dodo',
            email: 'dodo@gmail.com',
            phone: '09307223521',
            patients: [mockPatient],
            patientCount: 1,
            onEdit: () {},
            onAddProfile: () {},
            onAddDependent: () => addDependentTapped = true,
          ),
        ),
      ),
    );

    expect(find.text('ADD DEPENDENT'), findsOneWidget);
    expect(find.text('ADD PROFILE'), findsNothing);

    await tester.tap(find.text('ADD DEPENDENT'));
    expect(addDependentTapped, isTrue);
  });

  testWidgets('shows EDIT ACCOUNT button when neither profile callback is provided', (tester) async {
    bool editTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileCard(
            name: 'Bird Dodo',
            email: 'dodo@gmail.com',
            patients: const [],
            patientCount: 0,
            onEdit: () => editTapped = true,
          ),
        ),
      ),
    );

    expect(find.text('EDIT ACCOUNT'), findsOneWidget);
    expect(find.text('ADD PROFILE'), findsNothing);
    expect(find.text('ADD DEPENDENT'), findsNothing);

    await tester.tap(find.text('EDIT ACCOUNT'));
    expect(editTapped, isTrue);
  });
}
