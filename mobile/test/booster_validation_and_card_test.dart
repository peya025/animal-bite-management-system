import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/services/mock_mobile_api.dart';

void main() {
  group('PatientProfile - Booster Eligibility', () {
    test('parses hasCompletedPrimary correctly from JSON', () {
      final jsonEligible = {
        'id': 101,
        'patient_id': 101,
        'name': 'Juan Dela Cruz',
        'first_name': 'Juan',
        'last_name': 'Dela Cruz',
        'relationship': 'self',
        'gender': 'Male',
        'date_of_birth': '1995-05-12',
        'has_completed_primary': true,
      };

      final profileEligible = PatientProfile.fromJson(jsonEligible);
      expect(profileEligible.hasCompletedPrimary, isTrue);

      final jsonIneligible = {
        'id': 102,
        'patient_id': 102,
        'name': 'Maria Dela Cruz',
        'first_name': 'Maria',
        'last_name': 'Dela Cruz',
        'relationship': 'child',
        'gender': 'Female',
        'date_of_birth': '2015-08-20',
        'has_completed_primary': false,
      };

      final profileIneligible = PatientProfile.fromJson(jsonIneligible);
      expect(profileIneligible.hasCompletedPrimary, isFalse);
    });
  });

  group('MockMobileApi - Vaccination Card & Booster Visibility', () {
    final api = MockMobileApi.instance;

    test('completed primary patient does not show boosters by default', () async {
      final card = await api.vaccinationCard(101);
      expect(card['status'], 'COMPLETED');
      expect(card['has_booster'], isFalse);

      final doses = card['doses'] as List<dynamic>;
      expect(doses.length, 3);
      for (final dose in doses) {
        expect(dose['period'].toString().toLowerCase().contains('booster'), isFalse);
      }
    });

    test('incomplete primary patient does not show boosters', () async {
      final card = await api.vaccinationCard(102);
      expect(card['status'], 'ACTIVE');
      expect(card['has_booster'], isFalse);

      final doses = card['doses'] as List<dynamic>;
      expect(doses.length, 3);
      for (final dose in doses) {
        expect(dose['period'].toString().toLowerCase().contains('booster'), isFalse);
      }
    });

    test('eligible patient shows booster timeline only after deciding to get a booster', () async {
      final eligiblePatient = PatientProfile.fromJson({
        'id': 101,
        'name': 'Juan Dela Cruz',
        'first_name': 'Juan',
        'last_name': 'Dela Cruz',
        'relationship': 'self',
        'gender': 'Male',
        'date_of_birth': '1995-05-12',
        'has_completed_primary': true,
      });

      // Book a booster
      await api.book(
        patient: eligiblePatient,
        booking: {'service': 'booster', 'appointment_type': 'booster'},
      );

      // Now fetch card: booster timeline should appear
      final cardAfter = await api.vaccinationCard(101);
      expect(cardAfter['has_booster'], isTrue);
      expect(cardAfter['status'], 'ACTIVE');

      final dosesAfter = cardAfter['doses'] as List<dynamic>;
      expect(dosesAfter.length, 5);

      final periods = dosesAfter.map((d) => d['period'].toString()).toList();
      expect(periods, contains('Booster 1'));
      expect(periods, contains('Booster 2'));
    });
  });
}
