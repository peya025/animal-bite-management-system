import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/section_header.dart';

class SettingsGroup extends StatelessWidget {
  const SettingsGroup({super.key, required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MenuSectionHeader(title: title),
        const SizedBox(height: 10),
        Material(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(8),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (var index = 0; index < children.length; index++) ...[
                children[index],
                if (index != children.length - 1)
                  const Divider(
                    height: 1,
                    indent: 62,
                    endIndent: 14,
                    color: AppColors.border,
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.trailing,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final foreground = destructive ? AppColors.errorDark : AppColors.gray900;

    return ListTile(
      onTap: onTap,
      minTileHeight: 68,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: destructive ? AppColors.errorLight : AppColors.white,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          color: destructive ? AppColors.errorDark : AppColors.primaryDark,
          size: 20,
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          color: foreground,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        subtitle,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: AppColors.gray500, fontSize: 11),
      ),
      trailing:
          trailing ??
          (onTap == null
              ? null
              : const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.gray500,
                )),
    );
  }
}
