import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'app_router.dart';
import 'app_routes.dart';
import 'app_theme.dart';
import '../l10n/app_localizations.dart';
import '../l10n/language_controller.dart';
import '../services/api.dart';

class AnimalCareApp extends StatelessWidget {
  const AnimalCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: LanguageController.instance,
      builder: (context, _) {
        return MaterialApp(
          title: 'Animal Bite Management System',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          locale: LanguageController.instance.currentLocale,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            AppLocalizations.materialDelegate,
            AppLocalizations.cupertinoDelegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          initialRoute: api.isAuthenticated
              ? AppRoutes.menu
              : AppRoutes.welcome,
          onGenerateRoute: AppRouter.onGenerateRoute,
        );
      },
    );
  }
}
