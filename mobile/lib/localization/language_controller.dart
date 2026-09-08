import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class LanguageController extends ChangeNotifier {
  LanguageController._();
  static final LanguageController instance = LanguageController._();

  static const _storageKey = 'app_user_language_code';
  static const _storage = FlutterSecureStorage();

  Locale _currentLocale = const Locale('en');

  Locale get currentLocale => _currentLocale;

  String get currentLanguageDisplayName => switch (_currentLocale.languageCode) {
    'fil' || 'tl' => 'Tagalog (Filipino)',
    'ceb' => 'Bisaya (Cebuano)',
    _ => 'English',
  };

  Future<void> initialize() async {
    try {
      final savedCode = await _storage.read(key: _storageKey);
      if (savedCode != null && savedCode.isNotEmpty) {
        _currentLocale = Locale(savedCode);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> setLocale(String languageCode) async {
    final normalized = (languageCode == 'tl') ? 'fil' : languageCode;
    if (_currentLocale.languageCode == normalized) return;
    _currentLocale = Locale(normalized);
    notifyListeners();
    try {
      await _storage.write(key: _storageKey, value: normalized);
    } catch (_) {}
  }
}
