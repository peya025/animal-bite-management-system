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

class PublicClinicOption {
  const PublicClinicOption({required this.id, required this.name});

  final int id;
  final String name;
}

class CommunityAdvisorySource {
  const CommunityAdvisorySource({
    required this.authority,
    required this.reference,
    required this.issuedOn,
    required this.geographyNote,
    this.verifiedAt,
  });

  final String authority;
  final String reference;
  final String issuedOn;
  final String geographyNote;
  final DateTime? verifiedAt;

  factory CommunityAdvisorySource.fromJson(Map<String, dynamic> json) {
    return CommunityAdvisorySource(
      authority: (json['authority'] ?? '').toString(),
      reference: (json['reference'] ?? '').toString(),
      issuedOn: (json['issued_on'] ?? '').toString(),
      geographyNote: (json['geography_note'] ?? '').toString(),
      verifiedAt: DateTime.tryParse((json['verified_at'] ?? '').toString()),
    );
  }
}

class CommunityAdvisory {
  const CommunityAdvisory({
    this.id = 0,
    this.revision = 1,
    this.advisoryType = 'community_awareness',
    this.scopeLabel = 'Clinic community',
    required this.title,
    required this.body,
    required this.reviewedAt,
    required this.expiresAt,
    this.publishedAt,
    this.source,
  });

  final int id;
  final int revision;
  final String advisoryType;
  final String scopeLabel;
  final String title;
  final String body;
  final DateTime? reviewedAt;
  final DateTime? expiresAt;
  final DateTime? publishedAt;
  final CommunityAdvisorySource? source;

  bool get isOfficial => advisoryType == 'official_health_advisory';

  bool get isCurrent =>
      reviewedAt != null &&
      expiresAt != null &&
      expiresAt!.isAfter(DateTime.now());

  factory CommunityAdvisory.fromJson(Map<String, dynamic> json) {
    final sourceJson = json['source'];
    return CommunityAdvisory(
      id: (json['id'] as num?)?.toInt() ?? 0,
      revision: (json['revision'] as num?)?.toInt() ?? 1,
      advisoryType: (json['advisory_type'] ?? 'community_awareness').toString(),
      scopeLabel: (json['scope_label'] ?? 'Clinic community').toString(),
      title: (json['title'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      reviewedAt: DateTime.tryParse((json['reviewed_at'] ?? '').toString()),
      publishedAt: DateTime.tryParse((json['published_at'] ?? '').toString()),
      expiresAt: DateTime.tryParse((json['expires_at'] ?? '').toString()),
      source: sourceJson is Map<String, dynamic>
          ? CommunityAdvisorySource.fromJson(sourceJson)
          : null,
    );
  }
}

class CommunityAdvisoryDetailResult {
  const CommunityAdvisoryDetailResult({
    required this.status,
    this.advisory,
    this.message,
    this.disclaimer = '',
  });

  /// 'active' | 'withdrawn' | 'expired' | 'unavailable' | 'not_found'
  final String status;
  final CommunityAdvisory? advisory;
  final String? message;
  final String disclaimer;

  bool get isActive => status == 'active' && (advisory?.isCurrent ?? false);
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
    this.advisories = const [],
  });

  final String clinicName;
  final String municipality;
  final String status; // 'information' | legacy 'caution' | 'normal'
  final String headline;
  final String guidance;
  final List<ElevatedBiteArea> elevatedAreas;
  final CommunityVaccineAvailability vaccineAvailability;
  final String disclaimer;
  final List<CommunityAdvisory> advisories;

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
      status: (json['status'] ?? 'information').toString(),
      headline: (json['headline'] ?? 'Community Bite Awareness').toString(),
      guidance: (json['guidance'] ?? '').toString(),
      elevatedAreas: areas,
      vaccineAvailability: CommunityVaccineAvailability.fromJson(vacJson),
      disclaimer: (json['disclaimer'] ?? '').toString(),
      advisories: (json['advisories'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(CommunityAdvisory.fromJson)
          .toList(),
    );
  }
}
