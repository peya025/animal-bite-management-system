import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/walkthrough_service.dart';
import 'package:mobile/widgets/walkthrough/app_walkthrough_sheet.dart';

void main() {
  testWidgets('AppWalkthroughOverlay steps through all 5 guide items and finishes', (
    tester,
  ) async {
    await WalkthroughService.resetWalkthrough();
    expect(await WalkthroughService.shouldShowWalkthrough(), isTrue);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showAppWalkthrough(context),
              child: const Text('Start Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start Guide'));
    await tester.pumpAndSettle();

    // Step 1
    expect(find.text('Track Your PEP Schedule'), findsOneWidget);
    expect(find.textContaining('STEP 1 OF 5'), findsOneWidget);

    // Advance to Step 2
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Book Bite Consultation & Intake'), findsOneWidget);
    expect(find.textContaining('STEP 2 OF 5'), findsOneWidget);

    // Go back to Step 1
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Track Your PEP Schedule'), findsOneWidget);

    // Advance through Steps 2, 3, 4, 5
    for (var i = 0; i < 4; i++) {
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
    }

    expect(find.text('Manage Dependents & Reminders'), findsOneWidget);
    expect(find.text('Done'), findsOneWidget);

    // Finish walkthrough
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();

    expect(find.text('Manage Dependents & Reminders'), findsNothing);
    expect(await WalkthroughService.shouldShowWalkthrough(), isFalse);
  });
}
