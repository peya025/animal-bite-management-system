import 'package:flutter/material.dart';

import 'app_router.dart';
import 'app_routes.dart';
import 'app_theme.dart';
import '../services/mobile_api.dart';

class AnimalCareApp extends StatelessWidget {
  const AnimalCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Animal Bite Management System',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: MobileApi.instance.isAuthenticated
          ? AppRoutes.menu
          : AppRoutes.welcome,
      onGenerateRoute: AppRouter.onGenerateRoute,
    );
  }
}
