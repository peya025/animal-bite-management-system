import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'app_router.dart';
import 'app_routes.dart';
import 'app_theme.dart';
import '../l10n/app_localizations.dart';
import '../l10n/language_controller.dart';
import '../services/api.dart';

class AnimalCareApp extends StatefulWidget {
  const AnimalCareApp({super.key});

  @override
  State<AnimalCareApp> createState() => _AnimalCareAppState();
}

class _AnimalCareAppState extends State<AnimalCareApp> with WidgetsBindingObserver {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  bool _isBackgrounded = false;
  DateTime? _pausedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _pausedAt ??= DateTime.now();
      if (!_isBackgrounded && mounted) {
        setState(() => _isBackgrounded = true);
      }
    } else if (state == AppLifecycleState.resumed) {
      final pausedAt = _pausedAt;
      _pausedAt = null;

      if (_isBackgrounded && mounted) {
        setState(() => _isBackgrounded = false);
      }

      // Security: Auto-logout / lock session if app was backgrounded for more than 15 minutes
      if (pausedAt != null &&
          DateTime.now().difference(pausedAt) > const Duration(minutes: 15) &&
          api.isAuthenticated) {
        api.logout().catchError((_) {});
        _navigatorKey.currentState?.pushNamedAndRemoveUntil(
          AppRoutes.welcome,
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: LanguageController.instance,
      builder: (context, _) {
        return MaterialApp(
          navigatorKey: _navigatorKey,
          title: 'ABTCare',
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
          builder: (context, child) {
            return Stack(
              children: [
                ?child,
                if (_isBackgrounded && api.isAuthenticated)
                  const _PrivacyShieldOverlay(),
              ],
            );
          },
        );
      },
    );
  }
}

class _PrivacyShieldOverlay extends StatelessWidget {
  const _PrivacyShieldOverlay();

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Material(
        color: const Color(0xFF0F172A),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    LucideIcons.shieldCheck,
                    color: Color(0xFF10B981),
                    size: 32,
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Data Privacy Active',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    'Protected under Republic Act No. 10173\n(Philippine Data Privacy Act)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF94A3B8),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
