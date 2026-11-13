import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/views/menu_view.dart';
import 'package:mobile/widgets/re_exposure_protocol_card.dart';
import 'package:mobile/widgets/menu/schedule_section.dart';

void main() {
  const delegates = [
    AppLocalizations.delegate,
    AppLocalizations.materialDelegate,
    AppLocalizations.cupertinoDelegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  group('ReExposureProtocolCard Unit & UI Tests', () {
    testWidgets('renders all expected visual elements with correct styles', (
      tester,
    ) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ReExposureProtocolCard(
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      // Verify title & subtitle
      expect(find.text('Re-exposure protocol'), findsOneWidget);
      expect(
        find.text('Bitten again? DOH booster guidance applies'),
        findsOneWidget,
      );

      // Verify action link
      expect(find.text('View'), findsOneWidget);
      expect(find.byIcon(Icons.open_in_new), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);

      // Verify tap interaction
      await tester.tap(find.byType(ReExposureProtocolCard));
      expect(tapped, isTrue);

      // Verify colors and styling
      final titleWidget = tester.widget<Text>(find.text('Re-exposure protocol'));
      expect(titleWidget.style?.fontSize, 13);
      expect(titleWidget.style?.fontWeight, FontWeight.w500);
      expect(titleWidget.style?.color, const Color(0xFF111827));

      final viewWidget = tester.widget<Text>(find.text('View'));
      expect(viewWidget.style?.fontSize, 12);
      expect(viewWidget.style?.fontWeight, FontWeight.w500);
      expect(viewWidget.style?.color, const Color(0xFF1D9E75));

      final infoIcon = tester.widget<Icon>(find.byIcon(Icons.info_outline));
      expect(infoIcon.color, const Color(0xFFF59E0B));
      expect(infoIcon.size, 18);

      final openIcon = tester.widget<Icon>(find.byIcon(Icons.open_in_new));
      expect(openIcon.color, const Color(0xFF1D9E75));
      expect(openIcon.size, 13);
    });
  });

  group('Home Screen (MenuView) Conditional Rendering', () {
    testWidgets('does NOT render card for first-time / incomplete PEP patients', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          localizationsDelegates: delegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: MenuView(hasCompletedPEP: false),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      // Card should NOT be rendered
      expect(find.byType(ReExposureProtocolCard), findsNothing);
      expect(find.text('Re-exposure protocol'), findsNothing);
    });

    testWidgets('renders card for patients with completed PEP history', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          localizationsDelegates: delegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: MenuView(hasCompletedPEP: true),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      // Card should be rendered
      expect(find.byType(ReExposureProtocolCard), findsOneWidget);
      expect(find.text('Re-exposure protocol'), findsOneWidget);
      expect(find.text('Bitten again? DOH booster guidance applies'), findsOneWidget);

      // Verify position: card appears after ScheduleSection in vertical scroll order
      final schedulePos = tester.getTopLeft(find.byType(ScheduleSection));
      final cardPos = tester.getTopLeft(find.byType(ReExposureProtocolCard));
      expect(cardPos.dy, greaterThan(schedulePos.dy));
    });
  });
}
