import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'translations/ceb.dart';
import 'translations/en.dart';
import 'translations/fil.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [
    Locale('en'),
    Locale('fil'),
    Locale('ceb'),
  ];

  static const _translations = <String, Map<String, String>>{
    'en': enTranslations,
    'fil': filTranslations,
    'tl': filTranslations,
    'ceb': cebTranslations,
  };

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('en'));
  }

  String translate(String key, {Map<String, String>? params}) {
    final langCode = locale.languageCode.toLowerCase();
    final dict = _translations[langCode] ?? enTranslations;
    var value = dict[key] ?? enTranslations[key] ?? key;

    if (params != null) {
      params.forEach((paramKey, paramVal) {
        value = value.replaceAll('{}', paramVal);
      });
    }

    return value;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const LocalizationsDelegate<MaterialLocalizations> materialDelegate =
      _FallbackMaterialLocalizationsDelegate();

  static const LocalizationsDelegate<CupertinoLocalizations> cupertinoDelegate =
      _FallbackCupertinoLocalizationsDelegate();
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['en', 'fil', 'tl', 'ceb'].contains(locale.languageCode.toLowerCase());
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

/// Fallback for languages like Bisaya (ceb) that Flutter\'s GlobalMaterialLocalizations
/// does not natively bundle, so widgets like RefreshIndicator and DatePicker never crash.
class _FallbackMaterialLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const _FallbackMaterialLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<MaterialLocalizations> load(Locale locale) async {
    final lang = locale.languageCode.toLowerCase();
    if (lang == 'ceb' || lang == 'fil' || lang == 'tl') {
      return await GlobalMaterialLocalizations.delegate
          .load(const Locale('fil'));
    }
    return await GlobalMaterialLocalizations.delegate
        .load(const Locale('en'));
  }

  @override
  bool shouldReload(_FallbackMaterialLocalizationsDelegate old) => false;
}

class _FallbackCupertinoLocalizationsDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  const _FallbackCupertinoLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<CupertinoLocalizations> load(Locale locale) async {
    final lang = locale.languageCode.toLowerCase();
    if (lang == 'ceb' || lang == 'fil' || lang == 'tl') {
      return await GlobalCupertinoLocalizations.delegate
          .load(const Locale('fil'));
    }
    return await GlobalCupertinoLocalizations.delegate
        .load(const Locale('en'));
  }

  @override
  bool shouldReload(_FallbackCupertinoLocalizationsDelegate old) => false;
}

extension AppLocalizationsX on BuildContext {
  String tr(String key, {Map<String, String>? params}) {
    return AppLocalizations.of(this).translate(key, params: params);
  }
}
