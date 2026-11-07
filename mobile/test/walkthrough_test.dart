import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/walkthrough_service.dart';
import 'package:mobile/widgets/walkthrough/app_walkthrough_sheet.dart';

void main() {
  testWidgets('AppWalkthroughOverlay steps through all 5 speech-bubble items and finishes', (
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
    expect(
      find.textContaining('Watch tutorials or replay this walkthrough'),
      findsOneWidget,
    );
    expect(find.text('Next'), findsOneWidget);

    // Advance to Step 2
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Track your upcoming Day 0, Day 3, and Day 7'),
      findsOneWidget,
    );

    // Advance to Step 3 (Quick actions:)
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Quick actions:'), findsOneWidget);

    // Advance to Step 4 & Step 5
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Digital QR Card:'), findsOneWidget);

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Navigation & Settings:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    // Finish walkthrough
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();

    expect(find.text('Navigation & Settings:'), findsNothing);
    expect(await WalkthroughService.shouldShowWalkthrough(), isFalse);
  });
}
