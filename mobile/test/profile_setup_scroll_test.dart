import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/views/profile_setup_view.dart';

void main() {
  testWidgets('scrolls up to top when required fields are missing in profile setup', (tester) async {
    tester.view.physicalSize = const Size(390, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: ProfileSetupView(
          initialRelationship: 'dependent',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify initial screen is on Step 1
    expect(find.text('Step 1 of 3 — Basic info'), findsOneWidget);

    final scrollableFinder = find.byType(SingleChildScrollView);
    expect(scrollableFinder, findsOneWidget);
    final controller = tester.widget<SingleChildScrollView>(scrollableFinder).controller!;

    // Scroll down to the Continue button
    final continueButtonFinder = find.widgetWithText(ElevatedButton, 'Continue');
    expect(continueButtonFinder, findsOneWidget);

    await tester.ensureVisible(continueButtonFinder);
    await tester.pumpAndSettle();

    // Current scroll offset should be greater than 0
    expect(controller.offset, greaterThan(0));

    // Tap Continue without filling in First name
    await tester.tap(continueButtonFinder);
    await tester.pumpAndSettle();

    // Should have smoothly scrolled back to top to reveal the error banner
    expect(controller.offset, lessThanOrEqualTo(10.0));
    expect(find.text('First name is required.'), findsWidgets);

    // Verify the invalid field is highlighted with red errorBorder
    final firstNameDecorator = tester.widget<InputDecorator>(
      find.descendant(
        of: find.byType(TextFormField).at(0),
        matching: find.byType(InputDecorator),
      ),
    );
    expect(firstNameDecorator.decoration.errorText, 'First name is required.');
    expect(firstNameDecorator.decoration.errorBorder?.borderSide.color, const Color(0xFFEF4444));
  });

  testWidgets('resets scroll position to top when transitioning between steps', (tester) async {
    tester.view.physicalSize = const Size(390, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: ProfileSetupView(
          initialRelationship: 'dependent',
        ),
      ),
    );
    await tester.pumpAndSettle();

    final scrollableFinder = find.byType(SingleChildScrollView);
    final controller = tester.widget<SingleChildScrollView>(scrollableFinder).controller!;

    // Fill in required Step 1 fields (at 0 is First Name, at 1 is Last Name)
    await tester.enterText(find.byType(TextFormField).at(0), 'John');
    await tester.enterText(find.byType(TextFormField).at(1), 'Doe');

    // Select gender
    final maleFinder = find.text('Male');
    await tester.ensureVisible(maleFinder);
    await tester.tap(maleFinder);
    await tester.pumpAndSettle();

    // Scroll down to Continue button
    final continueButtonFinder = find.widgetWithText(ElevatedButton, 'Continue');
    await tester.ensureVisible(continueButtonFinder);
    await tester.pumpAndSettle();
    expect(controller.offset, greaterThan(0));

    // Tap Continue to go to Step 2
    await tester.tap(continueButtonFinder);
    await tester.pumpAndSettle();

    // Should now be on Step 2 and scroll position should be reset at top
    expect(find.text('Step 2 of 3 — Address & contact'), findsOneWidget);
    expect(controller.offset, lessThanOrEqualTo(10.0));
  });

  testWidgets('highlights missing gender and dropdown fields in red when validation fails', (tester) async {
    tester.view.physicalSize = const Size(390, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: ProfileSetupView(
          initialRelationship: 'dependent',
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Fill First and Last name, but omit gender
    await tester.enterText(find.byType(TextFormField).at(0), 'Jane');
    await tester.enterText(find.byType(TextFormField).at(1), 'Smith');

    final continueButtonFinder = find.widgetWithText(ElevatedButton, 'Continue');
    await tester.ensureVisible(continueButtonFinder);
    await tester.tap(continueButtonFinder);
    await tester.pumpAndSettle();

    // Gender should be highlighted in red with error text
    expect(find.text('Please select a gender.'), findsWidgets);

    // Now tap Male chip - error should clear
    final maleFinder = find.text('Male');
    await tester.ensureVisible(maleFinder);
    await tester.tap(maleFinder);
    await tester.pumpAndSettle();

    // Proceed to Step 2
    await tester.ensureVisible(continueButtonFinder);
    await tester.tap(continueButtonFinder);
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 3 — Address & contact'), findsOneWidget);

    // In Step 2, tap Continue without selecting City/Municipality
    final step2Continue = find.widgetWithText(ElevatedButton, 'Continue');
    await tester.ensureVisible(step2Continue);
    await tester.tap(step2Continue);
    await tester.pumpAndSettle();

    // City / Municipality dropdown should have red error
    expect(find.text('City / Municipality is required.'), findsWidgets);
    final dropdownDecorator = tester.widget<InputDecorator>(
      find.descendant(
        of: find.byType(DropdownButtonFormField<String>).first,
        matching: find.byType(InputDecorator),
      ),
    );
    expect(dropdownDecorator.decoration.errorBorder?.borderSide.color, const Color(0xFFEF4444));
  });
}
