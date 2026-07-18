import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../services/mobile_api.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
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
                      ProfileCard(
                        onEdit: () => _showDemoMessage(
                          'Profile editing will be added later.',
                        ),
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
