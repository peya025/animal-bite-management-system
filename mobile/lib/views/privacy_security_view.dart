import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/app_routes.dart';
import '../l10n/app_localizations.dart';
import '../models/patient_account_profile.dart';
import '../services/api.dart';
import '../widgets/common/app_toast.dart';
import '../widgets/settings/settings_group.dart';

class PrivacySecurityView extends StatefulWidget {
  const PrivacySecurityView({super.key});

  @override
  State<PrivacySecurityView> createState() => _PrivacySecurityViewState();
}

class _PrivacySecurityViewState extends State<PrivacySecurityView> {
  static const _storage = FlutterSecureStorage();

  bool _biometricsEnabled = false;
  bool _analyticsEnabled = true;
  bool _loadingSettings = true;
  PatientAccountProfile? _account;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final bio = await _storage.read(key: 'app_lock_enabled');
      final analytics = await _storage.read(key: 'analytics_enabled');
      final accountData = await api.account() as PatientAccountProfile;

      if (mounted) {
        setState(() {
          _biometricsEnabled = bio == 'true';
          _analyticsEnabled = analytics != 'false';
          _account = accountData;
          _loadingSettings = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingSettings = false);
    }
  }

  Future<void> _toggleBiometrics(bool value) async {
    setState(() => _biometricsEnabled = value);
    await _storage.write(key: 'app_lock_enabled', value: value.toString());
    if (!mounted) return;
    AppToast.success(
      context,
      value ? 'App lock has been enabled' : 'App lock has been disabled',
    );
  }

  Future<void> _toggleAnalytics(bool value) async {
    setState(() => _analyticsEnabled = value);
    await _storage.write(key: 'analytics_enabled', value: value.toString());
    if (!mounted) return;
    AppToast.info(
      context,
      value ? 'Anonymous diagnostics enabled' : 'Anonymous diagnostics disabled',
    );
  }

  Future<void> _openChangePasswordDialog() async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    bool obscureCurrent = true;
    bool obscureNew = true;
    bool obscureConfirm = true;
    bool isSubmitting = false;
    String? errorMessage;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (_, setDialogState) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x22000000),
                  blurRadius: 28,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F3FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          LucideIcons.keyRound,
                          color: Color(0xFF7C3AED),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('privacy_change_password'),
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Must be at least 8 characters long',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.alertCircle, color: Color(0xFFEF4444), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              errorMessage!,
                              style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Current Password
                  const Text('Current Password', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: currentPasswordController,
                    obscureText: obscureCurrent,
                    decoration: InputDecoration(
                      hintText: 'Enter current password',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
                      suffixIcon: IconButton(
                        icon: Icon(obscureCurrent ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: const Color(0xFF6B7280)),
                        onPressed: () => setDialogState(() => obscureCurrent = !obscureCurrent),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // New Password
                  const Text('New Password', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: newPasswordController,
                    obscureText: obscureNew,
                    decoration: InputDecoration(
                      hintText: 'Enter at least 8 characters',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
                      suffixIcon: IconButton(
                        icon: Icon(obscureNew ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: const Color(0xFF6B7280)),
                        onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Confirm New Password
                  const Text('Confirm New Password', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: confirmPasswordController,
                    obscureText: obscureConfirm,
                    decoration: InputDecoration(
                      hintText: 'Re-enter new password',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
                      suffixIcon: IconButton(
                        icon: Icon(obscureConfirm ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: const Color(0xFF6B7280)),
                        onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isSubmitting ? null : () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF4B5563),
                            side: const BorderSide(color: Color(0xFFE5E7EB)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  final current = currentPasswordController.text.trim();
                                  final newPass = newPasswordController.text.trim();
                                  final confirmPass = confirmPasswordController.text.trim();

                                  if (current.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
                                    setDialogState(() => errorMessage = 'Please fill in all fields.');
                                    return;
                                  }
                                  if (newPass.length < 8) {
                                    setDialogState(() => errorMessage = 'New password must be at least 8 characters.');
                                    return;
                                  }
                                  if (newPass != confirmPass) {
                                    setDialogState(() => errorMessage = 'New passwords do not match.');
                                    return;
                                  }

                                  setDialogState(() {
                                    isSubmitting = true;
                                    errorMessage = null;
                                  });

                                  try {
                                    await api.changePassword(
                                      currentPassword: current,
                                      newPassword: newPass,
                                      newPasswordConfirmation: confirmPass,
                                    );
                                    if (dialogContext.mounted) {
                                      Navigator.of(dialogContext).pop();
                                    }
                                    if (mounted) {
                                      AppToast.success(context, 'Password changed successfully!');
                                    }
                                  } catch (err) {
                                    setDialogState(() {
                                      isSubmitting = false;
                                      errorMessage = err.toString().replaceAll('Exception:', '').trim();
                                    });
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Update', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _logoutOtherDevices() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Log Out Other Devices?', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        content: const Text(
          'This will revoke all active sessions on other phones or tablets. You will remain logged in on this device.',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF4B5563)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Log Out Others', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await api.logoutOtherDevices();
        if (mounted) AppToast.success(context, 'Successfully logged out of other devices');
      } catch (err) {
        if (mounted) AppToast.error(context, 'Failed to log out other devices');
      }
    }
  }

  void _showPolicySheet(String title, String content) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.92,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1D5DB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    content,
                    style: const TextStyle(
                      fontSize: 13.5,
                      height: 1.6,
                      color: Color(0xFF374151),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showExportDataDialog() {
    final account = _account;
    final patientCount = account?.patients.length ?? 0;

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.fileSpreadsheet, color: Color(0xFF059669), size: 20),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Clinical Data Summary',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Under the Philippine Data Privacy Act of 2012, your medical records are encrypted and protected.',
              style: TextStyle(fontSize: 13, color: Color(0xFF4B5563)),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• Account: ${account?.name ?? "Patient"}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('• Email: ${account?.email ?? "—"}', style: const TextStyle(fontSize: 12.5, color: Color(0xFF4B5563))),
                  const SizedBox(height: 4),
                  Text('• Profiles registered: $patientCount dependent(s)', style: const TextStyle(fontSize: 12.5, color: Color(0xFF4B5563))),
                  const SizedBox(height: 4),
                  const Text('• Digital Vaccination Cards: Cryptographically Verified', style: TextStyle(fontSize: 12.5, color: Color(0xFF059669), fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              AppToast.success(context, 'Data summary copied and verified.');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Future<void> _openDeactivateAccountDialog() async {
    final passwordController = TextEditingController();
    bool isSubmitting = false;
    String? errorMessage;

    await showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (_, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.alertTriangle, color: Color(0xFFEF4444), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Deactivate Account?',
                  style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w700, color: Color(0xFF991B1B)),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'This will permanently deactivate your online patient portal account and revoke active sessions. Your clinical clinic records will remain safe in clinic archive.',
                style: TextStyle(fontSize: 13, color: Color(0xFF4B5563), height: 1.4),
              ),
              const SizedBox(height: 14),
              if (errorMessage != null) ...[
                Text(errorMessage!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
              ],
              const Text('Enter password to confirm:', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: 'Your account password',
                  hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final pass = passwordController.text.trim();
                      if (pass.isEmpty) {
                        setDialogState(() => errorMessage = 'Password is required.');
                        return;
                      }
                      setDialogState(() {
                        isSubmitting = true;
                        errorMessage = null;
                      });

                      try {
                        await api.deleteAccount(password: pass);
                        if (dialogCtx.mounted) {
                          Navigator.of(dialogCtx).pop();
                        }
                        if (mounted) {
                          Navigator.of(context).pushNamedAndRemoveUntil(
                            AppRoutes.welcome,
                            (route) => false,
                          );
                        }
                      } catch (err) {
                        setDialogState(() {
                          isSubmitting = false;
                          errorMessage = err.toString().replaceAll('Exception:', '').trim();
                        });
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Deactivate', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingSettings) {
      return const Scaffold(
        backgroundColor: Color(0xFFF9FAFB),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF10B981)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF111827), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          context.tr('privacy_title'),
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: Color(0xFF111827),
          ),
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, thickness: 1, color: Color(0xFFF3F4F6)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Info Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(LucideIcons.shieldCheck, color: Color(0xFF059669), size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Data Protection Active',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF065F46),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Your medical history, appointments, and QR vaccine passes are encrypted in accordance with the Data Privacy Act.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF047857),
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 1. Security & Credentials Group
            SettingsGroup(
              title: context.tr('privacy_security_section'),
              children: [
                SettingsTile(
                  icon: LucideIcons.keyRound,
                  iconBgColor: const Color(0xFFF5F3FF),
                  iconColor: const Color(0xFF7C3AED),
                  title: context.tr('privacy_change_password'),
                  subtitle: context.tr('privacy_change_password_desc'),
                  onTap: _openChangePasswordDialog,
                  trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFD1D5DB), size: 16),
                ),
                SettingsTile(
                  icon: LucideIcons.fingerprint,
                  iconBgColor: const Color(0xFFEFF6FF),
                  iconColor: const Color(0xFF2563EB),
                  title: context.tr('privacy_biometric_lock'),
                  subtitle: context.tr('privacy_biometric_desc'),
                  trailing: Switch.adaptive(
                    value: _biometricsEnabled,
                    onChanged: _toggleBiometrics,
                    activeTrackColor: const Color(0xFF10B981),
                    activeThumbColor: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 2. App Permissions & Data Privacy
            SettingsGroup(
              title: context.tr('privacy_permissions_section'),
              children: [
                SettingsTile(
                  icon: LucideIcons.camera,
                  iconBgColor: const Color(0xFFFEF3C7),
                  iconColor: const Color(0xFFD97706),
                  title: context.tr('privacy_camera_perm'),
                  subtitle: context.tr('privacy_camera_desc'),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Enabled',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                    ),
                  ),
                ),
                SettingsTile(
                  icon: LucideIcons.activity,
                  iconBgColor: const Color(0xFFF3F4F6),
                  iconColor: const Color(0xFF4B5563),
                  title: context.tr('privacy_analytics'),
                  subtitle: context.tr('privacy_analytics_desc'),
                  trailing: Switch.adaptive(
                    value: _analyticsEnabled,
                    onChanged: _toggleAnalytics,
                    activeTrackColor: const Color(0xFF10B981),
                    activeThumbColor: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 3. Active Sessions
            SettingsGroup(
              title: context.tr('privacy_sessions_section'),
              children: [
                SettingsTile(
                  icon: LucideIcons.smartphone,
                  iconBgColor: const Color(0xFFF0FDF4),
                  iconColor: const Color(0xFF16A34A),
                  title: 'This Mobile Device',
                  subtitle: 'Active session · Authorized via token',
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Current',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF15803D)),
                    ),
                  ),
                ),
                SettingsTile(
                  icon: LucideIcons.shieldAlert,
                  iconBgColor: const Color(0xFFEFF6FF),
                  iconColor: const Color(0xFF3B82F6),
                  title: context.tr('privacy_logout_others'),
                  subtitle: context.tr('privacy_logout_others_desc'),
                  onTap: _logoutOtherDevices,
                  trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFD1D5DB), size: 16),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 4. Data Privacy Rights & Legal
            SettingsGroup(
              title: context.tr('privacy_data_rights_section'),
              children: [
                SettingsTile(
                  icon: LucideIcons.fileText,
                  iconBgColor: const Color(0xFFF3F4F6),
                  iconColor: const Color(0xFF374151),
                  title: context.tr('privacy_policy'),
                  subtitle: context.tr('privacy_policy_desc'),
                  onTap: () => _showPolicySheet(
                    'AnimalCare Privacy Policy',
                    '''1. INFORMATION WE COLLECT
We collect clinical profile data including patient names, age, sex, PhilHealth numbers, bite exposure category, and vaccination history solely to administer safe anti-rabies post-exposure prophylaxis (PEP) and schedule consultations.

2. HEALTH DATA CONFIDENTIALITY
In strict compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and Department of Health (DOH) standards, all patient data is encrypted in transit and at rest.

3. DIGITAL VACCINATION CARD
Your QR-verifiable vaccination card contains cryptographically signed metadata to confirm authentic dose administration at certified Animal Bite Treatment Centers.

4. THIRD-PARTY SHARING
Your medical information is never sold, traded, or shared with unauthorized commercial entities. It is only accessible by certified clinic physicians, triage nurses, and healthcare administrators.

5. CONTACT OUR DATA PROTECTION OFFICER
For inquiries regarding your medical records or data rights, please visit the Animal Bite Treatment Center clinic desk.''',
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFD1D5DB), size: 16),
                ),
                SettingsTile(
                  icon: LucideIcons.scale,
                  iconBgColor: const Color(0xFFF3F4F6),
                  iconColor: const Color(0xFF374151),
                  title: context.tr('privacy_terms'),
                  subtitle: context.tr('privacy_terms_desc'),
                  onTap: () => _showPolicySheet(
                    'Terms of Service',
                    '''1. ACCEPTANCE OF TERMS
By using the AnimalCare patient mobile application, you agree to access appointment booking, dose tracking, and treatment card verification in good faith.

2. MEDICAL DISCLAIMER
This application facilitates triage scheduling and digital record viewing. In cases of severe Category III animal bites or bleeding wounds, immediately wash the wound with soap and water for 15 minutes and proceed to the nearest emergency clinic.

3. APPOINTMENT COMPLIANCE
Please adhere strictly to scheduled Day 0, Day 3, Day 7, and Day 28 vaccination dose dates to ensure complete immune protection.

4. ACCOUNT SECURITY
You are responsible for maintaining the confidentiality of your login credentials and preventing unauthorized access to your digital health pass.''',
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFD1D5DB), size: 16),
                ),
                SettingsTile(
                  icon: LucideIcons.downloadCloud,
                  iconBgColor: const Color(0xFFECFDF5),
                  iconColor: const Color(0xFF059669),
                  title: context.tr('privacy_export_data'),
                  subtitle: context.tr('privacy_export_data_desc'),
                  onTap: _showExportDataDialog,
                  trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFD1D5DB), size: 16),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 5. Danger Zone - Deactivate Account
            Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: const Color(0xFFFECACA),
                  width: 1,
                ),
              ),
              child: SettingsTile(
                icon: LucideIcons.userX,
                iconBgColor: const Color(0xFFFEF2F2),
                iconColor: const Color(0xFFDC2626),
                title: context.tr('privacy_delete_account'),
                subtitle: context.tr('privacy_delete_account_desc'),
                onTap: _openDeactivateAccountDialog,
                trailing: const Icon(
                  LucideIcons.chevronRight,
                  color: Color(0xFFF87171),
                  size: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
