import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../widgets/menu/campaign_banner.dart';
import '../widgets/menu/guidelines_section.dart';
import '../widgets/menu/information_panels.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/menu/quick_actions_section.dart';
import '../widgets/menu/schedule_section.dart';
import '../widgets/menu/search_header.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class MenuView extends StatefulWidget {
  const MenuView({super.key});

  @override
  State<MenuView> createState() => _MenuViewState();
}

class _MenuViewState extends State<MenuView> {
  int _selectedIndex = 0;

  void _openPatientCard() {
    showDigitalVaccinationCard(context);
  }

  Future<void> _openSearch() async {
    final route = await showSearch<String?>(
      context: context,
      delegate: _HomeSearchDelegate(),
    );
    if (route != null && mounted) Navigator.of(context).pushNamed(route);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                  sliver: SliverList.list(
                    children: [
                      MenuSearchHeader(
                        onSearchPressed: _openSearch,
                        onNotificationsPressed: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.notifications),
                      ),
                      const SizedBox(height: 20),
                      const CampaignBanner(),
                      const SizedBox(height: 24),
                      ScheduleSection(
                        onOpenAppointments: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.appointments),
                      ),
                      const SizedBox(height: 24),
                      QuickActionsSection(
                        onBook: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.booking),
                        onProfiles: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.settings),
                        onPatientCard: _openPatientCard,
                        onHistory: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.history),
                      ),
                      const SizedBox(height: 24),
                      const GuidelinesSection(),
                      const SizedBox(height: 24),
                      const InformationPanels(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: _selectedIndex,
        onSelected: (index) {
          final route = switch (index) {
            1 => AppRoutes.booking,
            2 => AppRoutes.history,
            3 => AppRoutes.settings,
            _ => null,
          };
          if (route != null) {
            Navigator.of(context).pushReplacementNamed(route);
            return;
          }
          setState(() => _selectedIndex = index);
        },
      ),
      floatingActionButton: PatientActionButton(
        onPressed: _openPatientCard,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _HomeSearchDelegate extends SearchDelegate<String?> {
  static const _items = [
    _HomeSearchItem(
      label: 'Book an appointment',
      route: AppRoutes.booking,
      icon: Icons.calendar_month_outlined,
    ),
    _HomeSearchItem(
      label: 'Appointment list',
      route: AppRoutes.appointments,
      icon: Icons.event_note_outlined,
    ),
    _HomeSearchItem(
      label: 'Patient history',
      route: AppRoutes.history,
      icon: Icons.history_rounded,
    ),
    _HomeSearchItem(
      label: 'Notifications',
      route: AppRoutes.notifications,
      icon: Icons.notifications_none_rounded,
    ),
    _HomeSearchItem(
      label: 'Patient profiles and settings',
      route: AppRoutes.settings,
      icon: Icons.manage_accounts_outlined,
    ),
  ];

  @override
  String get searchFieldLabel => 'Search services or schedules';

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          tooltip: 'Clear search',
          onPressed: () => query = '',
          icon: const Icon(Icons.close_rounded),
        ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      tooltip: 'Close search',
      onPressed: () => close(context, null),
      icon: const Icon(Icons.arrow_back_rounded),
    );
  }

  @override
  Widget buildResults(BuildContext context) => _buildList();

  @override
  Widget buildSuggestions(BuildContext context) => _buildList();

  Widget _buildList() {
    final normalizedQuery = query.trim().toLowerCase();
    final matches = _items
        .where(
          (item) =>
              normalizedQuery.isEmpty ||
              item.label.toLowerCase().contains(normalizedQuery),
        )
        .toList();

    if (matches.isEmpty) {
      return const Center(
        child: Text(
          'No matching service',
          style: TextStyle(color: AppColors.gray500),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      itemCount: matches.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = matches[index];
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
          leading: Icon(item.icon, color: AppColors.primaryDark),
          title: Text(
            item.label,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => close(context, item.route),
        );
      },
    );
  }
}

class _HomeSearchItem {
  const _HomeSearchItem({
    required this.label,
    required this.route,
    required this.icon,
  });

  final String label;
  final String route;
  final IconData icon;
}
