import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/app_routes.dart';
import '../l10n/app_localizations.dart';
import '../l10n/language_controller.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../widgets/common/app_toast.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/settings/edit_account_dialog.dart';
import '../widgets/settings/language_selection_sheet.dart';
import '../widgets/settings/profile_card.dart';
import '../widgets/settings/settings_group.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class SettingsView extends StatefulWidget {
  const SettingsView({super.key});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  bool _notificationsEnabled = true;
  PatientAccountProfile? _account;
  bool _loadingAccount = true;
  String? _accountError;

  @override
  void initState() {
    super.initState();
    _loadAccount();
  }

  Future<void> _loadAccount() async {
    setState(() {
      _loadingAccount = true;
      _accountError = null;
    });
    try {
      final account = await api.account() as PatientAccountProfile;
      if (mounted) setState(() => _account = account);
    } catch (error) {
      if (mounted) setState(() => _accountError = error.toString());
    } finally {
      if (mounted) setState(() => _loadingAccount = false);
    }
  }

  Future<void> _editAccount() async {
    final account = _account;
    if (account == null) return;
    await showDialog<void>(
      context: context,
      builder: (context) => EditAccountDialog(
        account: account,
        onSave: (name, phone) async {
          final updated =
              await api.updateAccount(name: name, phone: phone)
                  as PatientAccountProfile;
          if (mounted) setState(() => _account = updated);
        },
      ),
    );
  }

  Future<void> _addDependent() async {
    final account = _account;
    if (account == null) return;
    await Navigator.of(
      context,
    ).pushNamed(AppRoutes.profileSetup, arguments: {'accountId': account.id});
    if (mounted) await _loadAccount();
  }

  String _relationshipLabel(PatientProfile patient) {
    return switch (patient.relationship) {
      'self' => 'Self',
      'child' => 'Child',
      _ => 'Dependent',
    };
  }

  void _navigate(int index) {
    final route = switch (index) {
      0 => AppRoutes.menu,
      1 => AppRoutes.booking,
      2 => AppRoutes.history,
      3 => null,
      _ => null,
    };
    if (route != null) Navigator.of(context).pushReplacementNamed(route);
  }

  void _showDemoMessage(String message) {
    AppToast.info(context, message);
  }

  Future<void> _confirmLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 380),
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(
                color: Color(0x24000000),
                blurRadius: 28,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Icon Badge
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF2F2),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Icon(
                  LucideIcons.logOut,
                  color: Color(0xFFEF4444),
                  size: 24,
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                context.tr('logout_dialog_title'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                context.tr('logout_dialog_desc'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF6B7280),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 22),

              // Action Buttons Row
              Row(
                children: [
                  // Cancel Button
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF374151),
                          side: const BorderSide(color: Color(0xFFE5E7EB), width: 1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: Text(
                          context.tr('btn_cancel'),
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Log Out Button
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          context.tr('btn_logout'),
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (shouldLogout == true && mounted) {
      await api.logout();
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                // 1. Top bar
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      bottom: BorderSide(
                        color: Color(0xFFE5E7EB),
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        context.tr('settings_title'),
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF111827),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        context.tr('settings_subtitle'),
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF9CA3AF),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main Scrollable Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 80),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 2. Profile hero card
                        if (_loadingAccount)
                          Container(
                            height: 80,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1D9E75),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            alignment: Alignment.center,
                            child: const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            ),
                          )
                        else if (_account case final account?)
                          ProfileCard(
                            name: account.name,
                            email: account.email,
                            phone: account.phone,
                            patientCount: account.patients.length,
                            onEdit: _editAccount,
                          )
                        else
                          Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              onTap: _loadAccount,
                              borderRadius: BorderRadius.circular(14),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    const Icon(
                                      LucideIcons.alertCircle,
                                      color: Color(0xFFEF4444),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        _accountError ??
                                            'Could not load account. Tap to retry.',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF111827),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(height: 14),

                        // 3. Patient profiles section
                        SettingsGroup(
                          title: context.tr('settings_patient_profiles'),
                          children: [
                            for (final patient
                                in _account?.patients ?? const [])
                              SettingsTile(
                                icon: patient.relationship == 'child'
                                    ? LucideIcons.smile
                                    : LucideIcons.user,
                                iconBgColor: !patient.isActive
                                    ? const Color(0xFFF3F4F6)
                                    : const Color(0xFFE1F5EE),
                                iconColor: !patient.isActive
                                    ? const Color(0xFF9CA3AF)
                                    : const Color(0xFF1D9E75),
                                title: patient.name,
                                subtitle: !patient.isActive
                                    ? '${_relationshipLabel(patient)} • ${context.tr('prof_archived_badge')}'
                                    : _relationshipLabel(patient),
                                onTap: () async {
                                  await Navigator.of(context).pushNamed(
                                    AppRoutes.patientProfile,
                                    arguments: patient,
                                  );
                                  if (mounted) {
                                    await _loadAccount();
                                  }
                                },
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (!patient.isActive)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF3F4F6),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: const Color(0xFFE5E7EB),
                                          ),
                                        ),
                                        child: Text(
                                          context.tr('prof_archived_badge'),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF6B7280),
                                          ),
                                        ),
                                      )
                                    else if (patient.status == 'pending')
                                      const PendingBadge(),
                                    const SizedBox(width: 6),
                                    const Icon(
                                      LucideIcons.chevronRight,
                                      color: Color(0xFFD1D5DB),
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            SettingsTile(
                              icon: LucideIcons.plus,
                              iconBgColor: const Color(0xFFF9FAFB),
                              iconColor: const Color(0xFF9CA3AF),
                              iconBorder: Border.all(
                                color: const Color(0xFFD1D5DB),
                                width: 0.5,
                              ),
                              title: context.tr('settings_add_dependent'),
                              onTap: _addDependent,
                              trailing: const Icon(
                                LucideIcons.chevronRight,
                                color: Color(0xFFD1D5DB),
                                size: 16,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 4. Preferences section
                        SettingsGroup(
                          title: context.tr('settings_preferences'),
                          children: [
                            SettingsTile(
                              icon: LucideIcons.bell,
                              iconBgColor: const Color(0xFFE1F5EE),
                              iconColor: const Color(0xFF1D9E75),
                              title: context.tr('settings_notifications'),
                              subtitle: context.tr('settings_notifications_desc'),
                              trailing: CustomToggleSwitch(
                                value: _notificationsEnabled,
                                onChanged: (val) {
                                  setState(() => _notificationsEnabled = val);
                                },
                              ),
                            ),
                            SettingsTile(
                              icon: LucideIcons.globe,
                              iconBgColor: const Color(0xFFEFF6FF),
                              iconColor: const Color(0xFF3B82F6),
                              title: context.tr('settings_language'),
                              subtitle: LanguageController.instance.currentLanguageDisplayName,
                              onTap: () => showLanguageSelectionSheet(context),
                              trailing: const Icon(
                                LucideIcons.chevronRight,
                                color: Color(0xFFD1D5DB),
                                size: 16,
                              ),
                            ),
                            SettingsTile(
                              icon: LucideIcons.lock,
                              iconBgColor: const Color(0xFFF5F3FF),
                              iconColor: const Color(0xFF7C3AED),
                              title: context.tr('settings_privacy'),
                              subtitle: context.tr('settings_privacy_desc'),
                              onTap: () => _showDemoMessage(
                                'Privacy settings will be added later.',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 5. Support section
                        SettingsGroup(
                          title: context.tr('settings_support'),
                          children: [
                            SettingsTile(
                              icon: LucideIcons.helpCircle,
                              iconBgColor: const Color(0xFFFFF7ED),
                              iconColor: const Color(0xFFEA580C),
                              title: context.tr('settings_help_center'),
                              subtitle: context.tr('settings_help_desc'),
                              onTap: () => _showDemoMessage(
                                'Help center will be added later.',
                              ),
                            ),
                            SettingsTile(
                              icon: LucideIcons.info,
                              iconBgColor: const Color(0xFFF9FAFB),
                              iconColor: const Color(0xFF6B7280),
                              title: context.tr('settings_about'),
                              subtitle: 'AnimalCare · v1.0.0',
                              onTap: () => _showDemoMessage(
                                'AnimalCare · v1.0.0',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 6. Logout row — separate card
                        Container(
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(0xFFE5E7EB),
                              width: 0.5,
                            ),
                          ),
                          child: SettingsTile(
                            icon: LucideIcons.logOut,
                            iconBgColor: const Color(0xFFFEF2F2),
                            iconColor: const Color(0xFFEF4444),
                            title: context.tr('settings_logout'),
                            subtitle: context.tr('settings_logout_desc'),
                            destructive: true,
                            onTap: _confirmLogout,
                          ),
                        ),
                        const SizedBox(height: 18),

                        // 7. Version tag
                        const Center(
                          child: Text(
                            'AnimalCare · demo v1.0.0',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFFD1D5DB),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: 3,
        onSelected: _navigate,
      ),
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
