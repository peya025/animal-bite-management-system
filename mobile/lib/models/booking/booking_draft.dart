import 'package:flutter/foundation.dart';

enum BookingService { consultation, vaccination }

extension BookingServiceLabel on BookingService {
  String get label => switch (this) {
    BookingService.consultation => 'Bite consultation',
    BookingService.vaccination => 'Vaccination',
  };
}

enum BookingTimeSlot { morning, afternoon }

extension BookingTimeSlotLabel on BookingTimeSlot {
  String get label => switch (this) {
    BookingTimeSlot.morning => 'Morning (8:00 AM – 12:00 PM)',
    BookingTimeSlot.afternoon => 'Afternoon (1:00 PM – 5:00 PM)',
  };

  String get shortLabel => switch (this) {
    BookingTimeSlot.morning => '8:00 AM – 12:00 PM',
    BookingTimeSlot.afternoon => '1:00 PM – 5:00 PM',
  };
}

@immutable
class BookingDraft {
  const BookingDraft({
    required this.service,
    required this.date,
    this.timeSlot = BookingTimeSlot.morning,
    this.notes,
  });

  final BookingService service;
  final DateTime date;
  final BookingTimeSlot timeSlot;
  final String? notes;

  BookingDraft copyWith({
    BookingService? service,
    DateTime? date,
    BookingTimeSlot? timeSlot,
    String? notes,
  }) {
    return BookingDraft(
      service: service ?? this.service,
      date: date ?? this.date,
      timeSlot: timeSlot ?? this.timeSlot,
      notes: notes ?? this.notes,
    );
  }
}
