class BiteIntakeContract {
  const BiteIntakeContract({
    required this.version,
    required this.notice,
    required this.exposureModes,
    required this.bodyPartGroups,
    required this.animalSpecies,
    required this.animalOwnership,
    required this.animalConditions,
    required this.laterality,
    required this.washMethods,
    required this.pastBiteHistory,
    required this.priorPepStatuses,
  });

  final String version;
  final String notice;
  final Map<String, String> exposureModes;
  final Map<String, String> bodyPartGroups;
  final Map<String, String> animalSpecies;
  final Map<String, String> animalOwnership;
  final Map<String, String> animalConditions;
  final Map<String, String> laterality;
  final Map<String, String> washMethods;
  final Map<String, String> pastBiteHistory;
  final Map<String, String> priorPepStatuses;

  static const fallback = BiteIntakeContract(
    version: '1.0',
    notice: 'Patient-reported - clinic verification required',
    exposureModes: {
      'nibbling_uncovered_skin': 'Saliva or licking on intact skin',
      'nibbling_broken_skin': 'Saliva or licking on broken skin',
      'scratch_abrasion': 'Scratch or abrasion',
      'transdermal_bite': 'Transdermal bite',
      'handling_ingestion_raw_meat':
          'Handling or ingestion of raw animal tissue',
      'unsure': 'Unsure',
    },
    bodyPartGroups: {
      'head_neck': 'Head and neck',
      'upper_extremities': 'Upper extremities (arm or hand)',
      'lower_extremities': 'Lower extremities (leg or foot)',
      'trunk_torso': 'Trunk or torso',
      'multiple_sites': 'Multiple sites',
      'na_ingestion': 'Not applicable for ingestion or handling',
    },
    animalSpecies: {
      'dog': 'Dog',
      'cat': 'Cat',
      'bat': 'Bat',
      'monkey': 'Monkey or non-human primate',
      'other': 'Other',
      'unknown': 'Unknown',
    },
    animalOwnership: {'owned': 'Owned', 'stray': 'Stray', 'unknown': 'Unknown'},
    animalConditions: {
      'apparently_healthy': 'Apparently healthy',
      'sick': 'Sick or behaving unusually',
      'dead': 'Dead',
      'unknown': 'Unknown',
    },
    laterality: {
      'left': 'Left',
      'right': 'Right',
      'bilateral': 'Both sides',
      'multiple': 'Multiple sites',
      'not_applicable': 'Not applicable',
      'unknown': 'Unsure',
    },
    washMethods: {
      'soap_and_water': 'Soap and running water',
      'water_only': 'Water only',
      'antiseptic': 'Antiseptic',
      'other': 'Other',
      'unknown': 'Unsure',
    },
    pastBiteHistory: {'yes': 'Yes', 'no': 'No', 'unsure': 'Unsure'},
    priorPepStatuses: {
      'completed': 'Completed',
      'incomplete': 'Incomplete',
      'none': 'None',
      'unsure': 'Unsure',
    },
  );

  factory BiteIntakeContract.fromJson(Map<String, dynamic> json) {
    final options = json['options'] as Map<String, dynamic>? ?? const {};
    Map<String, String> read(String key, Map<String, String> fallbackValues) {
      final value = options[key];
      if (value is! Map) return fallbackValues;
      return value.map(
        (key, value) => MapEntry(key.toString(), value.toString()),
      );
    }

    return BiteIntakeContract(
      version: (json['version'] ?? fallback.version).toString(),
      notice: (json['notice'] ?? fallback.notice).toString(),
      exposureModes: read('reported_mode_of_exposure', fallback.exposureModes),
      bodyPartGroups: read('body_part_group', fallback.bodyPartGroups),
      animalSpecies: read('animal_species', fallback.animalSpecies),
      animalOwnership: read('animal_ownership', fallback.animalOwnership),
      animalConditions: read(
        'animal_condition_reported',
        fallback.animalConditions,
      ),
      laterality: read('laterality', fallback.laterality),
      washMethods: read('wash_method', fallback.washMethods),
      pastBiteHistory: read('past_bite_history', fallback.pastBiteHistory),
      priorPepStatuses: read('prior_pep_status', fallback.priorPepStatuses),
    );
  }
}
