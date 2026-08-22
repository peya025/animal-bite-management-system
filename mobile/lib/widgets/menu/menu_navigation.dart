import 'package:flutter/material.dart';
import '../../app/app_theme.dart';

class MenuNavigation extends StatelessWidget {
  const MenuNavigation({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
    this.showFabNotch = true,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final bool showFabNotch;

  @override
  Widget build(BuildContext context) {
    const items = [
      _NavigationItem(Icons.home_outlined, Icons.home_rounded, 'Home'),
      _NavigationItem(
        Icons.calendar_month_outlined,
        Icons.calendar_month_rounded,
        'Book',
      ),
      _NavigationItem(Icons.history_rounded, Icons.history_rounded, 'History'),
      _NavigationItem(
        Icons.settings_outlined,
        Icons.settings_rounded,
        'Settings',
      ),
    ];

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 0.5)),
      ),
      child: BottomAppBar(
        height: 64,
        padding: EdgeInsets.zero,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: showFabNotch ? const CircularNotchedRectangle() : null,
        notchMargin: 8,
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              for (var index = 0; index < items.length; index++) ...[
                if (showFabNotch && index == 2) const SizedBox(width: 64),
                Expanded(
                  child: _NavigationDestination(
                    item: items[index],
                    selected: selectedIndex == index,
                    onTap: () => onSelected(index),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _NavigationItem {
  const _NavigationItem(this.icon, this.selectedIcon, this.label);
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

class _NavigationDestination extends StatelessWidget {
  const _NavigationDestination({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavigationItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            selected ? item.selectedIcon : item.icon,
            size: 20,
            color: selected ? AppColors.primary : const Color(0xFF9CA3AF),
          ),
          const SizedBox(height: 2),
          Text(
            item.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w500 : FontWeight.w400,
              color: selected ? AppColors.primary : const Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }
}
