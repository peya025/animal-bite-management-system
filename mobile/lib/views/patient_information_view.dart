import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/booking_draft.dart';
import '../models/patient_booking_request.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/patient_information_form.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

class PatientInformationView extends StatelessWidget {
  const PatientInformationView({super.key, required this.booking});

  final BookingDraft booking;

  Future<void> _submit(
    BuildContext context,
    PatientBookingRequest request,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.event_available_rounded,
          color: AppColors.primary,
        ),
        title: const Text('Booking submitted'),
        content: Text(
          '${request.name} is booked for ${request.booking.service.label.toLowerCase()} on ${DateSelector.formatDate(request.booking.date)}.\n\nThis is demo data and has not been sent to Laravel yet.',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Return home'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
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
                        title: 'Patient information',
                        subtitle: 'Complete the details to finish booking.',
                        onBack: () => Navigator.of(context).pop(),
                      ),
                      const SizedBox(height: 20),
                      MenuSurface(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: AppColors.primaryLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                booking.service == BookingService.vaccination
                                    ? Icons.vaccines_outlined
                                    : Icons.medical_information_outlined,
                                color: AppColors.primaryDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    booking.service.label,
                                    style: const TextStyle(
                                      color: AppColors.gray900,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    DateSelector.formatDate(booking.date),
                                    style: const TextStyle(
                                      color: AppColors.gray500,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      PatientInformationForm(
                        booking: booking,
                        onSubmitted: (request) => _submit(context, request),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
