/// Read-only patient-facing projection of a clinic's form policy.
class FormConfiguration {
  const FormConfiguration({
    required this.schemaVersion,
    required this.revision,
    required this.clinicId,
    required this.profile,
    required this.intake,
  });

  final int schemaVersion;
  final int revision;
  final int clinicId;
  final FormSurfaceConfiguration profile;
  final FormSurfaceConfiguration intake;

  factory FormConfiguration.fromJson(Map<String, dynamic> json) =>
      FormConfiguration(
        schemaVersion: (json['schema_version'] as num).toInt(),
        revision: (json['revision'] as num).toInt(),
        clinicId: (json['clinic_id'] as num).toInt(),
        profile: FormSurfaceConfiguration.fromJson(
          json['profile'] as Map<String, dynamic>,
        ),
        intake: FormSurfaceConfiguration.fromJson(
          json['intake'] as Map<String, dynamic>,
        ),
      );
}

class FormSurfaceConfiguration {
  const FormSurfaceConfiguration({
    required this.sections,
    required this.fieldRules,
    required this.payloadAliases,
    this.options = const {},
  });

  final Map<String, bool> sections;
  final Map<String, String> fieldRules;
  final Map<String, String> payloadAliases;
  final Map<String, Map<String, String>> options;

  bool isSectionEnabled(String sectionKey) => sections[sectionKey] ?? true;

  String ruleFor(String fieldKey) => fieldRules[fieldKey] ?? 'optional';

  String aliasFor(String fieldKey) => payloadAliases[fieldKey] ?? fieldKey;

  Map<String, String>? get exposureModeOptions =>
      options['reported_mode_of_exposure'];

  Map<String, String>? get bodyPartGroupOptions => options['body_part_group'];

  factory FormSurfaceConfiguration.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'] as Map<String, dynamic>? ?? const {};
    final parsedOptions = <String, Map<String, String>>{};
    for (final entry in rawOptions.entries) {
      if (entry.value is Map) {
        parsedOptions[entry.key] = (entry.value as Map).map(
          (k, v) => MapEntry(k.toString(), v.toString()),
        );
      }
    }

    return FormSurfaceConfiguration(
      sections: (json['sections'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, value == true),
      ),
      fieldRules: (json['field_rules'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, value as String),
      ),
      payloadAliases:
          ((json['payload_aliases'] as Map<String, dynamic>?) ??
                  const <String, dynamic>{})
              .map((key, value) => MapEntry(key, value as String)),
      options: parsedOptions,
    );
  }
}
