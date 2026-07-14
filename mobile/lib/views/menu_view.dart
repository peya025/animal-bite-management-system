import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../widgets/menu/campaign_banner.dart';
import '../widgets/menu/guidelines_section.dart';
import '../widgets/menu/information_panels.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/schedule_section.dart';
import '../widgets/menu/search_header.dart';

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
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
                  sliver: SliverList.list(
                    children: const [
                      MenuSearchHeader(),
                      SizedBox(height: 18),
                      CampaignBanner(),
                      SizedBox(height: 22),
                      GuidelinesSection(),
                      SizedBox(height: 22),
                      ScheduleSection(),
                      SizedBox(height: 20),
                      InformationPanels(),
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
        onSelected: (index) => setState(() => _selectedIndex = index),
      ),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Patient card',
        onPressed: () {},
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        shape: const CircleBorder(),
        child: const Icon(Icons.badge_outlined),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
