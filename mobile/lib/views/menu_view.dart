import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../widgets/menu/campaign_banner.dart';
import '../widgets/menu/guidelines_section.dart';
import '../widgets/menu/information_panels.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
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
                      MenuSearchHeader(
                        onNotificationsPressed: () => Navigator.of(
                          context,
                        ).pushNamed(AppRoutes.notifications),
                      ),
                      const SizedBox(height: 20),
                      const CampaignBanner(),
                      const SizedBox(height: 26),
                      const GuidelinesSection(),
                      const SizedBox(height: 26),
                      const ScheduleSection(),
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
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
