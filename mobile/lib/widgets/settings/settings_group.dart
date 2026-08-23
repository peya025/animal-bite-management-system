import 'package:flutter/material.dart';

class SettingsSectionLabel extends StatelessWidget {
  const SettingsSectionLabel({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 6),
      child: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF9CA3AF),
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.04,
        ),
      ),
    );
  }
}

class SettingsGroup extends StatelessWidget {
  const SettingsGroup({
    super.key,
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SettingsSectionLabel(title: title),
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
          child: Column(
            children: [
              for (var index = 0; index < children.length; index++) ...[
                children[index],
                if (index != children.length - 1)
                  const Divider(
                    height: 0.5,
                    thickness: 0.5,
                    color: Color(0xFFF3F4F6),
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
    this.subtitle,
    required this.iconBgColor,
    required this.iconColor,
    this.iconBorder,
    this.onTap,
    this.trailing,
    this.destructive = false,
    this.customIcon,
  });

  final IconData? icon;
  final Widget? customIcon;
  final String title;
  final String? subtitle;
  final Color iconBgColor;
  final Color iconColor;
  final BoxBorder? iconBorder;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final titleColor = destructive ? const Color(0xFFEF4444) : const Color(0xFF111827);
    final subtitleColor = destructive ? const Color(0xFFFCA5A5) : const Color(0xFF9CA3AF);
    final chevronColor = destructive ? const Color(0xFFFCA5A5) : const Color(0xFFD1D5DB);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            children: [
              // 34x34 Icon Box with 10px radius
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(10),
                  border: iconBorder,
                ),
                alignment: Alignment.center,
                child: customIcon ??
                    Icon(
                      icon,
                      color: iconColor,
                      size: 18,
                    ),
              ),
              const SizedBox(width: 12),

              // Title & Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        height: 1.2,
                      ),
                    ),
                    if (subtitle != null && subtitle!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 11,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Trailing widget or default chevron
              if (trailing != null)
                trailing!
              else if (onTap != null)
                Icon(
                  Icons.chevron_right,
                  color: chevronColor,
                  size: 16,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomToggleSwitch extends StatelessWidget {
  const CustomToggleSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        width: 40,
        height: 22,
        padding: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: value ? const Color(0xFF1D9E75) : const Color(0xFFE5E7EB),
          borderRadius: BorderRadius.circular(11),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 18,
            height: 18,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0x26000000),
                  blurRadius: 2,
                  offset: Offset(0, 1),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PendingBadge extends StatelessWidget {
  const PendingBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF9C3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFFDE047),
          width: 0.5,
        ),
      ),
      child: const Text(
        'Pending',
        style: TextStyle(
          color: Color(0xFF854D0E),
          fontSize: 10,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
