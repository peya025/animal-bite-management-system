import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';
import '../widgets/common/app_toast.dart';

bool _isLaunchingExternalLink = false;
DateTime? _lastExternalLaunchAt;

/// Optional override hook for widget tests.
Future<bool> Function(Uri uri)? debugExternalUrlLauncher;

/// Whether to verify DNS/network reachability before handing off to the OS browser.
/// Ensures tapping a card in airplane mode shows the in-app offline toast immediately.
bool enableExternalLinkConnectivityCheck = true;

/// Resets launcher debounce state (for tests).
void resetExternalLinkLauncherState() {
  _isLaunchingExternalLink = false;
  _lastExternalLaunchAt = null;
}

Future<void> openExternal(BuildContext context, String url) async {
  final now = DateTime.now();
  if (_isLaunchingExternalLink) return;
  if (_lastExternalLaunchAt != null &&
      now.difference(_lastExternalLaunchAt!) <
          const Duration(milliseconds: 600)) {
    return;
  }

  final uri = Uri.tryParse(url.trim());
  if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http') || uri.host.isEmpty) return;

  _isLaunchingExternalLink = true;
  _lastExternalLaunchAt = now;
  try {
    if (debugExternalUrlLauncher != null) {
      final ok = await debugExternalUrlLauncher!(uri);
      if (!ok && context.mounted) {
        AppToast.error(context, context.tr('learn_more_unable_open'));
      }
      return;
    }

    if (enableExternalLinkConnectivityCheck) {
      final lookup = await InternetAddress.lookup(uri.host)
          .timeout(const Duration(seconds: 3));
      if (lookup.isEmpty || lookup.first.rawAddress.isEmpty) {
        throw const SocketException('No internet connection');
      }
    }

    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      AppToast.error(context, context.tr('learn_more_unable_open'));
    }
  } on Exception {
    if (context.mounted) {
      AppToast.error(context, context.tr('learn_more_no_internet'));
    }
  } finally {
    _isLaunchingExternalLink = false;
  }
}
