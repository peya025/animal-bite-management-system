class ElevatedBiteArea {
  const ElevatedBiteArea({
    required this.barangay,
    required this.municipality,
    required this.cautionLevel,
    required this.label,
    required this.notice,
  });

  final String barangay;
  final String municipality;
  final String cautionLevel; // 'elevated' | 'watch'
  final String label;
  final String notice;

  factory ElevatedBiteArea.fromJson(Map<String, dynamic> json) {
    return ElevatedBiteArea(
      barangay: (json['barangay'] ?? '').toString(),
      municipality: (json['municipality'] ?? '').toString(),
      cautionLevel: (json['caution_level'] ?? 'watch').toString(),
      label: (json['label'] ?? 'Higher bite reports').toString(),
      notice: (json['notice'] ?? '').toString(),
    );
  }
}

class CommunityVaccineAvailability {
  const CommunityVaccineAvailability({
    required this.arvAvailable,
    required this.rigAvailable,
    required this.statusLabel,
  });

  final bool arvAvailable;
  final bool rigAvailable;
  final String statusLabel;

  factory CommunityVaccineAvailability.fromJson(Map<String, dynamic> json) {
    return CommunityVaccineAvailability(
      arvAvailable: json['arv_available'] == true,
      rigAvailable: json['rig_available'] == true,
      statusLabel: (json['status_label'] ?? 'Check with clinic').toString(),
    );
  }
}

class CommunityBiteOverview {
  const CommunityBiteOverview({
    required this.clinicName,
    required this.municipality,
    required this.status,
    required this.headline,
    required this.guidance,
    required this.elevatedAreas,
    required this.vaccineAvailability,
    required this.disclaimer,
  });

  final String clinicName;
  final String municipality;
  final String status; // 'caution' | 'normal'
  final String headline;
  final String guidance;
  final List<ElevatedBiteArea> elevatedAreas;
  final CommunityVaccineAvailability vaccineAvailability;
  final String disclaimer;

  bool get hasCaution => status == 'caution' && elevatedAreas.isNotEmpty;

  factory CommunityBiteOverview.fromJson(Map<String, dynamic> json) {
    final areas = (json['elevated_areas'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ElevatedBiteArea.fromJson)
        .toList();
    final vacJson =
        json['vaccine_availability'] as Map<String, dynamic>? ?? const {};

    return CommunityBiteOverview(
      clinicName: (json['clinic_name'] ?? 'Animal Bite Treatment Center')
          .toString(),
      municipality: (json['municipality'] ?? 'Tagoloan').toString(),
      status: (json['status'] ?? 'normal').toString(),
      headline: (json['headline'] ?? 'No unusual bite spikes reported this week.')
          .toString(),
      guidance: (json['guidance'] ?? '').toString(),
      elevatedAreas: areas,
      vaccineAvailability: CommunityVaccineAvailability.fromJson(vacJson),
      disclaimer: (json['disclaimer'] ?? '').toString(),
    );
  }
}
