import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/walkthrough_service.dart';
import 'package:mobile/widgets/walkthrough/app_walkthrough_sheet.dart';

void main() {
  testWidgets('AppWalkthroughOverlay steps through Home & Booking items and finishes', (
    tester,
  ) async {
    await WalkthroughService.resetWalkthrough();
    expect(await WalkthroughService.shouldShowWalkthrough(), isTrue);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showAppWalkthrough(
                context,
                steps: [
                  ...kDefaultWalkthroughSteps,
                  ...kBookingWalkthroughSteps,
                ],
              ),
              child: const Text('Start Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start Guide'));
    await tester.pumpAndSettle();

    // Step 1
    expect(
      find.textContaining('Watch tutorials or replay this walkthrough'),
      findsOneWidget,
    );
    expect(find.text('Next'), findsOneWidget);

    // Step 2
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Track your upcoming Day 0, Day 3, and Day 7'),
      findsOneWidget,
    );

    // Step 3 (Quick actions:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Quick actions:'), findsOneWidget);

    // Step 4 (Digital QR Card:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Digital QR Card:'), findsOneWidget);

    // Step 5 (Book a consultation:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Book a consultation:'), findsOneWidget);

    // Step 6 (1. Patient profile:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('1. Patient profile:'), findsOneWidget);

    // Step 7 (2. Service type:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('2. Service type:'), findsOneWidget);

    // Step 8 (3. Date & intake:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('3. Date & intake:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    // Finish walkthrough
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();

    expect(find.text('3. Date & intake:'), findsNothing);
    expect(await WalkthroughService.shouldShowWalkthrough(), isFalse);
  });
}
