/// API Factory - Returns mock or real API based on .env configuration
/// Use this in your app instead of importing mobile_api.dart directly

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'mobile_api.dart';
import 'mock_mobile_api.dart';

/// Get the appropriate API instance based on USE_MOCK_DATA setting
dynamic get api {
  final useMockData = dotenv.env['USE_MOCK_DATA']?.toLowerCase() == 'true';
  
  if (useMockData) {
    return MockMobileApi.instance;
  } else {
    return MobileApi.instance;
  }
}

/// Check if running in mock mode
bool get isMockMode {
  return dotenv.env['USE_MOCK_DATA']?.toLowerCase() == 'true';
}
