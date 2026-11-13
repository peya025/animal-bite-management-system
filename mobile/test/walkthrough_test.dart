import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/walkthrough_service.dart';
import 'package:mobile/widgets/walkthrough/app_walkthrough_sheet.dart';

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  testWidgets('AppWalkthroughOverlay steps through individual Home menu guide and finishes', (
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
                steps: kHomeWalkthroughSteps,
              ),
              child: const Text('Start Home Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start Home Guide'));
    await tester.pumpAndSettle();

    // Step 1: Guide & Tutorials
    expect(
      find.textContaining('Watch tutorials or replay menu walkthroughs'),
      findsOneWidget,
    );
    expect(find.text('Next'), findsOneWidget);

    // Step 2: PEP Schedule
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Track your upcoming Day 0, Day 3, and Day 7'),
      findsOneWidget,
    );

    // Step 3: Quick actions
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Quick actions:'), findsOneWidget);

    // Step 4: Digital QR Card
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Digital QR Card:'), findsOneWidget);

    // Step 5: Menu navigation
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Explore menus:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    // Finish walkthrough on Home
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();

    expect(find.text('Explore menus:'), findsNothing);
    expect(await WalkthroughService.shouldShowWalkthrough(), isFalse);
  });

  testWidgets('AppWalkthroughOverlay steps through Booking menu guide', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showAppWalkthrough(
                context,
                steps: kBookingWalkthroughSteps,
              ),
              child: const Text('Start Booking Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start Booking Guide'));
    await tester.pumpAndSettle();

    expect(find.text('1. Patient profile:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('2. Service type:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('3. Date & intake:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    expect(find.text('3. Date & intake:'), findsNothing);
  });

  testWidgets('AppWalkthroughOverlay steps through History menu guide', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showAppWalkthrough(
                context,
                steps: kHistoryWalkthroughSteps,
              ),
              child: const Text('Start History Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start History Guide'));
    await tester.pumpAndSettle();

    expect(find.text('1. Care summary:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('2. Category filters:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('3. Visit records:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    expect(find.text('3. Visit records:'), findsNothing);
  });

  testWidgets('AppWalkthroughOverlay steps through Settings menu guide', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showAppWalkthrough(
                context,
                steps: kSettingsWalkthroughSteps,
              ),
              child: const Text('Start Settings Guide'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Start Settings Guide'));
    await tester.pumpAndSettle();

    expect(find.text('1. Account profile:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('2. Family dependents:'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    expect(find.text('3. Support & guides:'), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);

    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    expect(find.text('3. Support & guides:'), findsNothing);
  });

  testWidgets('showGuideMenuChooser displays all 4 menu walkthrough options', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showGuideMenuChooser(context),
              child: const Text('Open Chooser'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Chooser'));
    await tester.pumpAndSettle();

    expect(find.text('App Guide Walkthroughs'), findsOneWidget);
    expect(find.text('Home Dashboard Tour'), findsOneWidget);
    expect(find.text('Book Consultation Tour'), findsOneWidget);
    expect(find.text('My Records & History Tour'), findsOneWidget);
    expect(find.text('Profile & Settings Tour'), findsOneWidget);
  });
}
