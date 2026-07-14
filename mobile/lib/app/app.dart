import 'package:flutter/material.dart';

import 'app_router.dart';
import 'app_routes.dart';
import 'app_theme.dart';

class AnimalCareApp extends StatelessWidget {
  const AnimalCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Animal Bite Management System',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: AppRoutes.welcome,
      onGenerateRoute: AppRouter.onGenerateRoute,
    );
  }
}
