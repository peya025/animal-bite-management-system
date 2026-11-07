import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class WalkthroughService {
  WalkthroughService._();

  static const String _storageKey = 'has_completed_app_walkthrough_v1';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static bool _memoryCompleted = false;

  static Future<bool> shouldShowWalkthrough() async {
    if (_memoryCompleted) return false;
    try {
      final value = await _storage.read(key: _storageKey);
      if (value == 'true') {
        _memoryCompleted = true;
        return false;
      }
      return true;
    } catch (_) {
      return !_memoryCompleted;
    }
  }

  static Future<void> markCompleted() async {
    _memoryCompleted = true;
    try {
      await _storage.write(key: _storageKey, value: 'true');
    } catch (_) {
      // Fallback to in-memory flag in test/unsupported environments
    }
  }

  static Future<void> resetWalkthrough() async {
    _memoryCompleted = false;
    try {
      await _storage.delete(key: _storageKey);
    } catch (_) {
      // Ignore in test/unsupported environments
    }
  }
}
