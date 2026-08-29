import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/widgets/menu/guidelines_section.dart';

void main() {
  const delegates = [
    AppLocalizations.delegate,
    AppLocalizations.materialDelegate,
    AppLocalizations.cupertinoDelegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  testWidgets('GuidelinesSection renders all three bite care steps', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        localizationsDelegates: delegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: Locale('en'),
        home: Scaffold(
          body: SingleChildScrollView(
            child: GuidelinesSection(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('BITE CARE GUIDE'), findsOneWidget);
    expect(find.text('Wash'), findsOneWidget);
    expect(find.text('Consult'), findsOneWidget);
    expect(find.text('Vaccinate'), findsOneWidget);
  });

  testWidgets('GuidelinesSection renders in Tagalog (fil) without overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        localizationsDelegates: delegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: Locale('fil'),
        home: Scaffold(
          body: SingleChildScrollView(
            child: GuidelinesSection(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('GABAY SA PAG-ALAGA NG KAGAT'), findsOneWidget);
    expect(find.text('Hugasan'), findsOneWidget);
    expect(find.text('Magpakonsulta'), findsOneWidget);
    expect(find.text('Magpabakuna'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('GuidelinesSection renders in Cebuano (ceb) without overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        localizationsDelegates: delegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: Locale('ceb'),
        home: Scaffold(
          body: SingleChildScrollView(
            child: GuidelinesSection(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('GIYA SA PAG-ATIMAN SA PAAK'), findsOneWidget);
    expect(find.text('Hugasi'), findsOneWidget);
    expect(find.text('Pakonsulta'), findsOneWidget);
    expect(find.text('Pabakuna'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('GuidelinesSection renders under 2.0x system font scaling', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(
          textScaler: TextScaler.linear(2.0),
        ),
        child: const MaterialApp(
          localizationsDelegates: delegates,
          supportedLocales: AppLocalizations.supportedLocales,
          locale: Locale('en'),
          home: Scaffold(
            body: SingleChildScrollView(
              child: GuidelinesSection(),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('BITE CARE GUIDE'), findsOneWidget);
    expect(find.text('Wash'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
