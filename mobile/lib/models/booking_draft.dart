enum BookingService { consultation, vaccination }

extension BookingServiceLabel on BookingService {
  String get label => switch (this) {
    BookingService.consultation => 'Bite consultation',
    BookingService.vaccination => 'Vaccination',
  };
}

class BookingDraft {
  const BookingDraft({required this.service, required this.date});

  final BookingService service;
  final DateTime date;
}
