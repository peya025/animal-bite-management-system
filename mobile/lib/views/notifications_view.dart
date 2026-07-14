import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/menu_surface.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/notifications/notification_card.dart';
import '../widgets/notifications/notification_filter.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class NotificationsView extends StatefulWidget {
  const NotificationsView({super.key});

  @override
  State<NotificationsView> createState() => _NotificationsViewState();
}

class _NotificationsViewState extends State<NotificationsView> {
  NotificationFilter _filter = NotificationFilter.all;
  final Set<int> _readIds = {3};

  static const _notifications = [
    DemoNotification(
      id: 1,
      type: DemoNotificationType.vaccination,
      title: 'Vaccination reminder',
      message:
          'Your Day 7 anti-rabies vaccine is scheduled tomorrow at 10:00 AM.',
      time: '10 minutes ago',
    ),
    DemoNotification(
      id: 2,
      type: DemoNotificationType.appointment,
      title: 'Appointment confirmed',
      message: 'Your bite consultation has been confirmed for July 18, 2026.',
      time: '2 hours ago',
    ),
    DemoNotification(
      id: 3,
      type: DemoNotificationType.awareness,
      title: 'Rabies prevention tip',
      message:
          'Wash bite wounds with soap and running water for at least 15 minutes.',
      time: 'Yesterday',
    ),
    DemoNotification(
      id: 4,
      type: DemoNotificationType.system,
      title: 'Digital card updated',
      message: 'Your latest vaccination dose was added to your digital card.',
      time: 'July 12, 2026',
    ),
  ];

  int get _unreadCount {
    return _notifications.where((item) => !_readIds.contains(item.id)).length;
  }

  Iterable<DemoNotification> get _visibleNotifications {
    if (_filter == NotificationFilter.unread) {
      return _notifications.where((item) => !_readIds.contains(item.id));
    }
    return _notifications;
  }

  void _markRead(int id) {
    setState(() => _readIds.add(id));
  }

  void _markAllRead() {
    setState(() {
      _readIds.addAll(_notifications.map((item) => item.id));
    });
  }

  void _navigate(int index) {
    final route = switch (index) {
      0 => AppRoutes.menu,
      1 => AppRoutes.booking,
      2 => AppRoutes.history,
      3 => AppRoutes.settings,
      _ => null,
    };
    if (route != null) Navigator.of(context).pushReplacementNamed(route);
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
                      AppPageHeader(
                        title: 'Notifications',
                        subtitle: 'Reminders and clinic updates.',
                        onBack: () => Navigator.of(context).pop(),
                        trailing: TextButton(
                          onPressed: _unreadCount == 0 ? null : _markAllRead,
                          child: const Text('Read all'),
                        ),
                      ),
                      const SizedBox(height: 22),
                      NotificationFilterControl(
                        selected: _filter,
                        unreadCount: _unreadCount,
                        onSelected: (filter) =>
                            setState(() => _filter = filter),
                      ),
                      const SizedBox(height: 16),
                      if (_visibleNotifications.isEmpty)
                        const MenuSurface(
                          padding: EdgeInsets.all(28),
                          child: Column(
                            children: [
                              Icon(
                                Icons.notifications_off_outlined,
                                color: AppColors.gray500,
                                size: 36,
                              ),
                              SizedBox(height: 10),
                              Text(
                                'You are all caught up.',
                                style: TextStyle(
                                  color: AppColors.gray700,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        for (final notification in _visibleNotifications) ...[
                          NotificationCard(
                            notification: notification,
                            isRead: _readIds.contains(notification.id),
                            onTap: () => _markRead(notification.id),
                          ),
                          const SizedBox(height: 10),
                        ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: 0,
        onSelected: _navigate,
      ),
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
