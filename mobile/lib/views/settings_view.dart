import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../services/mobile_api.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/settings/profile_card.dart';
import '../widgets/settings/settings_group.dart';
import '../widgets/settings/edit_account_dialog.dart';
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
      final account = await MobileApi.instance.account();
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
          final updated = await MobileApi.instance.updateAccount(
            name: name,
            phone: phone,
          );
          if (mounted) setState(() => _account = updated);
        },
      ),
    );
  }

  Future<void> _addDependent() async {
    final created = await Navigator.of(
      context,
    ).pushNamed(AppRoutes.profileSetup, arguments: 'add-dependent');
    if (created != null && mounted) await _loadAccount();
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
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _confirmLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to sign in again to access patient records.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Log out'),
          ),
        ],
      ),
    );

    if (shouldLogout == true && mounted) {
      await MobileApi.instance.logout();
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                  sliver: SliverList.list(
                    children: [
                      const AppPageHeader(
                        title: 'Settings',
                        subtitle: 'Manage your profile and app preferences.',
                      ),
                      const SizedBox(height: 22),
                      if (_loadingAccount)
                        const Center(child: CircularProgressIndicator())
                      else if (_account case final account?)
                        ProfileCard(
                          name: account.name,
                          email: account.email,
                          phone: account.phone,
                          patientCount: account.patients.length,
                          onEdit: _editAccount,
                        )
                      else
                        SettingsTile(
                          icon: Icons.sync_problem_rounded,
                          title: 'Could not load account',
                          subtitle: _accountError ?? 'Try again',
                          onTap: _loadAccount,
                        ),
                      const SizedBox(height: 26),
                      SettingsGroup(
                        title: 'Managed patients',
                        children: [
                          for (final patient in _account?.patients ?? const [])
                            SettingsTile(
                              icon: patient.relationship == 'child'
                                  ? Icons.child_care_rounded
                                  : Icons.person_outline_rounded,
                              title: patient.name,
                              subtitle:
                                  '${_relationshipLabel(patient)} - ${patient.status}',
                              trailing: Icon(
                                patient.isVerified
                                    ? Icons.verified_rounded
                                    : Icons.schedule_rounded,
                                color: patient.isVerified
                                    ? Colors.green
                                    : Colors.orange,
                              ),
                            ),
                          SettingsTile(
                            icon: Icons.person_add_alt_1_outlined,
                            title: 'Add child or dependent',
                            subtitle: 'Create another patient profile',
                            onTap: _addDependent,
                          ),
                        ],
                      ),
                      const SizedBox(height: 26),
                      SettingsGroup(
                        title: 'Preferences',
                        children: [
                          SettingsTile(
                            icon: Icons.notifications_none_rounded,
                            title: 'Notifications',
                            subtitle: 'Appointment and vaccination reminders',
                            trailing: Switch(
                              value: _notificationsEnabled,
                              onChanged: (value) {
                                setState(() => _notificationsEnabled = value);
                              },
                            ),
                          ),
                          SettingsTile(
                            icon: Icons.language_rounded,
                            title: 'Language',
                            subtitle: 'English',
                            onTap: () => _showDemoMessage(
                              'Language selection will be added later.',
                            ),
                          ),
                          SettingsTile(
                            icon: Icons.lock_outline_rounded,
                            title: 'Privacy and security',
                            subtitle: 'Password and account permissions',
                            onTap: () => _showDemoMessage(
                              'Privacy settings will be added later.',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 26),
                      SettingsGroup(
                        title: 'Support',
                        children: [
                          SettingsTile(
                            icon: Icons.help_outline_rounded,
                            title: 'Help center',
                            subtitle: 'FAQs and contact information',
                            onTap: () => _showDemoMessage(
                              'Help center will be added later.',
                            ),
                          ),
                          SettingsTile(
                            icon: Icons.info_outline_rounded,
                            title: 'About',
                            subtitle: 'AnimalCare demo version 1.0.0',
                            onTap: () => _showDemoMessage(
                              'AnimalCare mobile demo version 1.0.0',
                            ),
                          ),
                          SettingsTile(
                            icon: Icons.logout_rounded,
                            title: 'Log out',
                            subtitle: 'Return to the login screen',
                            destructive: true,
                            onTap: _confirmLogout,
                          ),
                        ],
                      ),
                    ],
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
