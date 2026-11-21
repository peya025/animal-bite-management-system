import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/bite_intake_contract.dart';
import 'package:mobile/models/bite_intake_draft.dart';

void main() {
  test('fallback contract matches the versioned clinic field vocabulary', () {
    final contract = BiteIntakeContract.fallback;

    expect(contract.version, '1.0');
    expect(contract.bodyPartGroups.keys, contains('upper_extremities'));
    expect(contract.bodyPartGroups.keys, isNot(contains('other_parts')));
    expect(
      contract.animalSpecies.keys,
      containsAll(['dog', 'cat', 'bat', 'monkey', 'other', 'unknown']),
    );
    expect(
      contract.priorPepStatuses.keys,
      containsAll(['completed', 'incomplete', 'none', 'unsure']),
    );
  });

  test('draft serializes only the canonical patient-reported contract', () {
    final draft = BiteIntakeDraft(
      schemaVersion: '1.0',
      dateOfExposure: DateTime(2026, 9, 24),
      timeOfExposure: '08:30',
      placeOfExposure: 'Poblacion, Tagoloan',
      siteWashed: true,
      washMethod: 'soap_and_water',
      reportedModeOfExposure: 'transdermal_bite',
      animalSpecies: 'bat',
      animalOwnership: 'unknown',
      bodyPartGroup: 'upper_extremities',
      bodyPartDetail: 'Left index finger',
      pastBiteHistory: 'yes',
      pastBiteDates: 'June 2024',
      priorPepStatus: 'completed',
    );

    final json = draft.toJson();

    expect(json['date_of_exposure'], '2026-09-24');
    expect(json['reported_mode_of_exposure'], 'transdermal_bite');
    expect(json['body_part_group'], 'upper_extremities');
    expect(json['body_part_detail'], 'Left index finger');
    expect(json['prior_pep_status'], 'completed');
    expect(json, isNot(contains('diagnosis')));
    expect(json, isNot(contains('exposure_category')));
    expect(json, isNot(contains('treatment_plan')));
  });
}
