import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/app_notification.dart';
import '../services/api.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/common/app_toast.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/menu_surface.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/notifications/notification_card.dart';
import '../widgets/notifications/notification_filter.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

import '../models/patient_profile.dart';

class NotificationsView extends StatefulWidget {
  const NotificationsView({super.key});

  @override
  State<NotificationsView> createState() => _NotificationsViewState();
}

class _NotificationsViewState extends State<NotificationsView> {
  NotificationFilter _filter = NotificationFilter.all;
  int? _selectedPatientId;
  List<AppNotification> _notifications = const [];
  List<PatientProfile> _patients = const [];
  bool _loading = true;
  bool _markingAll = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  int get _unreadCount =>
      _notifications.where((notification) => !notification.isRead).length;

  Iterable<AppNotification> get _visibleNotifications {
    var items = _notifications;
    if (_selectedPatientId != null) {
      items = items.where((n) => n.patientId == _selectedPatientId).toList();
    }
    if (_filter == NotificationFilter.unread) {
      return items.where((notification) => !notification.isRead);
    }
    return items;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final notifsFuture = api.notifications();
      final patientsFuture = api.patients();
      final notifications = (await notifsFuture) as List<AppNotification>;
      final rawPatients = (await patientsFuture) as List<PatientProfile>;
      if (mounted) {
        setState(() {
          _notifications = notifications;
          _patients = rawPatients.where((p) => p.isActive).toList();
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(AppNotification notification) async {
    if (notification.isRead) return;
    final previous = _notifications;
    setState(() {
      _notifications = _notifications
          .map(
            (item) => item.id == notification.id
                ? item.copyWith(status: 'read')
                : item,
          )
          .toList();
    });
    try {
      await api.markNotificationRead(notification.id);
    } catch (error) {
      if (!mounted) return;
      setState(() => _notifications = previous);
      _showError(error);
    }
  }

  Future<void> _markAllRead() async {
    if (_unreadCount == 0 || _markingAll) return;
    final previous = _notifications;
    setState(() {
      _markingAll = true;
      _notifications = _notifications
          .map((item) => item.copyWith(status: 'read'))
          .toList();
    });
    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      if (mounted) {
        setState(() => _notifications = previous);
        _showError(error);
      }
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  void _showError(Object error) {
    AppToast.error(context, error.toString());
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

  Widget _buildProfileFilterBar() {
    if (_patients.length <= 1) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        children: [
          _buildProfileFilterChip(
            id: null,
            name: 'All Profiles',
            relationship: null,
            count: _notifications.length,
            isSelected: _selectedPatientId == null,
          ),
          const SizedBox(width: 8),
          for (final p in _patients) ...[
            _buildProfileFilterChip(
              id: p.id,
              name: p.name,
              relationship: p.relationship,
              count: _notifications.where((n) => n.patientId == p.id).length,
              isSelected: _selectedPatientId == p.id,
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _buildProfileFilterChip({
    required int? id,
    required String name,
    required String? relationship,
    required int count,
    required bool isSelected,
  }) {
    final rel = (relationship ?? '').toLowerCase();
    final isSelf = rel == 'self';

    final label = id == null
        ? 'All Profiles'
        : (isSelf
            ? '$name (Self)'
            : '$name (${rel == 'child' ? 'Child' : (rel.isNotEmpty ? rel[0].toUpperCase() + rel.substring(1) : 'Dependent')})');

    final icon = id == null
        ? Icons.people_outline_rounded
        : (isSelf
            ? Icons.person_outline_rounded
            : (rel == 'child' ? Icons.child_care_rounded : Icons.group_outlined));

    return InkWell(
      onTap: () => setState(() => _selectedPatientId = id),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1D9E75) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF1D9E75) : const Color(0xFFE5E7EB),
            width: isSelected ? 1.2 : 0.8,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF1D9E75).withValues(alpha: 0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 13,
              color: isSelected ? Colors.white : const Color(0xFF6B7280),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF374151),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.25)
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleNotifications.toList();
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                    sliver: SliverList.list(
                      children: [
                        AppPageHeader(
                          title: 'Notifications',
                          subtitle: 'Reminders and clinic updates.',
                          onBack: () => Navigator.of(context).pop(),
                          trailing: TextButton.icon(
                            onPressed: _unreadCount == 0 || _markingAll
                                ? null
                                : _markAllRead,
                            icon: _markingAll
                                ? const SizedBox.square(
                                    dimension: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.done_all_rounded, size: 18),
                            label: const Text('Read all'),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Profile Carousel Filter (Shown if managing multiple family members)
                        _buildProfileFilterBar(),

                        NotificationFilterControl(
                          selected: _filter,
                          unreadCount: _unreadCount,
                          onSelected: (filter) =>
                              setState(() => _filter = filter),
                        ),
                        const SizedBox(height: 16),
                        if (_loading)
                          const _NotificationState(
                            title: 'Checking for updates',
                            subtitle: 'Loading your latest clinic activity.',
                            showProgress: true,
                          )
                        else if (_error case final message?)
                          _NotificationState(
                            title: 'Could not load notifications',
                            subtitle: message,
                            action: TextButton.icon(
                              onPressed: _load,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('RETRY'),
                            ),
                          )
                        else if (visible.isEmpty)
                          const _NotificationState(
                            title: 'You are all caught up',
                            subtitle:
                                'Appointment and vaccination updates will appear here.',
                          )
                        else
                          for (final notification in visible) ...[
                            NotificationCard(
                              notification: notification,
                              onTap: () => _markRead(notification),
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

class _NotificationState extends StatelessWidget {
  const _NotificationState({
    required this.title,
    required this.subtitle,
    this.action,
    this.showProgress = false,
  });

  final String title;
  final String subtitle;
  final Widget? action;
  final bool showProgress;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.fromLTRB(22, 12, 22, 22),
      child: Column(
        children: [
          Container(
            width: 92,
            height: 92,
            margin: const EdgeInsets.symmetric(vertical: 16),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.notifications_none_rounded,
              size: 42,
              color: AppColors.primaryDark,
            ),
          ),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.gray900,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.gray500,
              fontSize: 11,
              height: 1.35,
            ),
          ),
          if (showProgress) ...[
            const SizedBox(height: 14),
            const SizedBox(
              width: 90,
              child: LinearProgressIndicator(minHeight: 3),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 10),
            action!,
          ],
        ],
      ),
    );
  }
}
