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
      (Icons.home, 'Home'),
      (Icons.book_outlined, 'Book'),
      (Icons.history, 'History'),
      (Icons.settings, 'Setting'),
    ];

    return BottomAppBar(
      height: 68,
      padding: EdgeInsets.zero,
      shape: const CircularNotchedRectangle(),
      notchMargin: 7,
      child: Row(
        children: [
          for (var index = 0; index < items.length; index++) ...[
            if (index == 2) const SizedBox(width: 70),
            Expanded(
              child: InkWell(
                onTap: () => onSelected(index),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      items[index].$1,
                      size: 22,
                      color: selectedIndex == index
                          ? AppColors.primary
                          : const Color(0xFFB8BFBD),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      items[index].$2,
                      style: TextStyle(
                        fontSize: 9,
                        color: selectedIndex == index
                            ? AppColors.primaryDark
                            : AppColors.gray500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
