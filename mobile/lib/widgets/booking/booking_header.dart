import 'package:flutter/material.dart';

import '../common/app_page_header.dart';

class BookingHeader extends StatelessWidget {
  const BookingHeader({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return AppPageHeader(
      title: 'Book appointment',
      subtitle: 'Choose your service, date, and time.',
      onBack: onBack,
    );
  }
}
