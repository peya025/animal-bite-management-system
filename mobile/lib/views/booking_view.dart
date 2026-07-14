import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../widgets/booking/booking_header.dart';
import '../widgets/booking/booking_summary.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/service_selector.dart';
import '../widgets/booking/time_slot_selector.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';

class BookingView extends StatefulWidget {
  const BookingView({super.key});

  @override
  State<BookingView> createState() => _BookingViewState();
}

class _BookingViewState extends State<BookingView> {
  BookingService _service = BookingService.consultation;
  int _dateIndex = 0;
  String _time = TimeSlotSelector.slots.first;

  void _openHome() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.menu);
  }

  void _handleNavigation(int index) {
    final route = switch (index) {
      0 => AppRoutes.menu,
      1 => null,
      2 => AppRoutes.history,
      3 => AppRoutes.settings,
      _ => null,
    };
    if (route != null) Navigator.of(context).pushReplacementNamed(route);
  }

  void _confirmBooking() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sample appointment booked successfully.')),
    );
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
                      BookingHeader(onBack: _openHome),
                      const SizedBox(height: 26),
                      ServiceSelector(
                        selected: _service,
                        onSelected: (service) {
                          setState(() => _service = service);
                        },
                      ),
                      const SizedBox(height: 26),
                      DateSelector(
                        selectedIndex: _dateIndex,
                        onSelected: (index) {
                          setState(() => _dateIndex = index);
                        },
                      ),
                      const SizedBox(height: 26),
                      TimeSlotSelector(
                        selected: _time,
                        onSelected: (time) {
                          setState(() => _time = time);
                        },
                      ),
                      const SizedBox(height: 26),
                      BookingSummary(
                        service: _service,
                        date: DateSelector.dates[_dateIndex].fullLabel,
                        time: _time,
                        onConfirm: _confirmBooking,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: 1,
        onSelected: _handleNavigation,
      ),
      floatingActionButton: PatientActionButton(onPressed: () {}),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
