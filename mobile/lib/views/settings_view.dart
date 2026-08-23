import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/settings/edit_account_dialog.dart';
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
        content: const Text(
          'You will need to sign in again to access patient records.',
        ),
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
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Settings',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF111827),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Manage your profile and preferences',
                        style: TextStyle(
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
                                      Icons.sync_problem_rounded,
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
                          title: 'Patient profiles',
                          children: [
                            for (final patient
                                in _account?.patients ?? const [])
                              SettingsTile(
                                icon: patient.relationship == 'child'
                                    ? Icons.mood_rounded
                                    : Icons.person_rounded,
                                iconBgColor: const Color(0xFFE1F5EE),
                                iconColor: const Color(0xFF1D9E75),
                                title: patient.name,
                                subtitle: _relationshipLabel(patient),
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
                                    if (patient.status == 'pending')
                                      const PendingBadge(),
                                    const SizedBox(width: 6),
                                    const Icon(
                                      Icons.chevron_right,
                                      color: Color(0xFFD1D5DB),
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            SettingsTile(
                              icon: Icons.add,
                              iconBgColor: const Color(0xFFF9FAFB),
                              iconColor: const Color(0xFF9CA3AF),
                              iconBorder: Border.all(
                                color: const Color(0xFFD1D5DB),
                                width: 0.5,
                              ),
                              title: 'Add child or dependent',
                              onTap: _addDependent,
                              trailing: const Icon(
                                Icons.chevron_right,
                                color: Color(0xFFD1D5DB),
                                size: 16,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 4. Preferences section
                        SettingsGroup(
                          title: 'Preferences',
                          children: [
                            SettingsTile(
                              icon: Icons.notifications_none_rounded,
                              iconBgColor: const Color(0xFFE1F5EE),
                              iconColor: const Color(0xFF1D9E75),
                              title: 'Notifications',
                              subtitle: 'Appointment and vaccination reminders',
                              trailing: CustomToggleSwitch(
                                value: _notificationsEnabled,
                                onChanged: (val) {
                                  setState(() => _notificationsEnabled = val);
                                },
                              ),
                            ),
                            SettingsTile(
                              icon: Icons.language_rounded,
                              iconBgColor: const Color(0xFFEFF6FF),
                              iconColor: const Color(0xFF3B82F6),
                              title: 'Language',
                              subtitle: 'English',
                              onTap: () => _showDemoMessage(
                                'Language selection will be added later.',
                              ),
                            ),
                            SettingsTile(
                              icon: Icons.lock_outline_rounded,
                              iconBgColor: const Color(0xFFF5F3FF),
                              iconColor: const Color(0xFF7C3AED),
                              title: 'Privacy and security',
                              subtitle: 'Password and account permissions',
                              onTap: () => _showDemoMessage(
                                'Privacy settings will be added later.',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 5. Support section
                        SettingsGroup(
                          title: 'Support',
                          children: [
                            SettingsTile(
                              icon: Icons.help_outline_rounded,
                              iconBgColor: const Color(0xFFFFF7ED),
                              iconColor: const Color(0xFFEA580C),
                              title: 'Help center',
                              subtitle: 'FAQs and contact information',
                              onTap: () => _showDemoMessage(
                                'Help center will be added later.',
                              ),
                            ),
                            SettingsTile(
                              icon: Icons.info_outline_rounded,
                              iconBgColor: const Color(0xFFF9FAFB),
                              iconColor: const Color(0xFF6B7280),
                              title: 'About',
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
                            icon: Icons.logout_rounded,
                            iconBgColor: const Color(0xFFFEF2F2),
                            iconColor: const Color(0xFFEF4444),
                            title: 'Log out',
                            subtitle: 'Return to the login screen',
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
