import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class MenuNavigation extends StatelessWidget {
  const MenuNavigation({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;

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
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: Color(0x0D111827),
            blurRadius: 10,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: BottomAppBar(
        height: 72,
        padding: EdgeInsets.zero,
        color: AppColors.white,
        surfaceTintColor: Colors.transparent,
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              for (var index = 0; index < items.length; index++) ...[
                if (index == 2) const SizedBox(width: 72),
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
      child: SizedBox.expand(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 34,
              height: 28,
              child: Icon(
                selected ? item.selectedIcon : item.icon,
                size: 21,
                color: selected ? AppColors.primary : AppColors.gray500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? AppColors.primary : AppColors.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
