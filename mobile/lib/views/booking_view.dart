import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../models/booking_draft.dart';
import '../widgets/booking/booking_header.dart';
import '../widgets/booking/booking_summary.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/service_selector.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class BookingView extends StatefulWidget {
  const BookingView({super.key});

  @override
  State<BookingView> createState() => _BookingViewState();
}

class _BookingViewState extends State<BookingView> {
  BookingService _service = BookingService.consultation;
  DateTime _selectedDate = DateSelector.firstDate;

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

  void _continueBooking() {
    Navigator.of(context).pushNamed(
      AppRoutes.patientInformation,
      arguments: BookingDraft(service: _service, date: _selectedDate),
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
                        selectedDate: _selectedDate,
                        onSelected: (date) {
                          setState(() => _selectedDate = date);
                        },
                      ),
                      const SizedBox(height: 26),
                      BookingSummary(
                        service: _service,
                        date: DateSelector.formatDate(_selectedDate),
                        onConfirm: _continueBooking,
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
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
