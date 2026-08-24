import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app/app.dart';
import 'l10n/language_controller.dart';
import 'services/mobile_api.dart';
import 'services/mock_mobile_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize stored language preference
  await LanguageController.instance.initialize();

  // Load environment variables from .env file
  await dotenv.load(fileName: ".env");
  
  // Check if mock mode is enabled
  final useMockData = dotenv.env['USE_MOCK_DATA']?.toLowerCase() == 'true';
  
  if (useMockData) {
    // Use mock data (no backend needed)
    await MockMobileApi.instance.initialize();
    debugPrint('🎭 Running in MOCK MODE - No backend needed');
  } else {
    // Use real backend API
    await MobileApi.instance.initialize();
    debugPrint('🔌 Running in REAL MODE - Backend required');
  }
  
  runApp(const AnimalCareApp());
}
