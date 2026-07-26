import 'package:flutter/material.dart';

import '../common/app_page_header.dart';

class BookingHeader extends StatelessWidget {
  const BookingHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppPageHeader(
      title: 'Book appointment',
      subtitle: 'Select a patient, service, and date',
      centered: true,
    );
  }
}
