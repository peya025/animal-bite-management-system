class PsgcLocation {
  final String code;
  final String name;

  const PsgcLocation({required this.code, required this.name});

  factory PsgcLocation.fromJson(Map<String, dynamic> json) {
    return PsgcLocation(
      code: (json['code'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
    );
  }
}

class ClinicLocationContext {
  const ClinicLocationContext({
    required this.clinicId,
    required this.clinicName,
    this.province,
    this.provinceCode,
    this.municipality,
  });

  final int clinicId;
  final String clinicName;
  final String? province;
  final String? provinceCode;
  final String? municipality;

  factory ClinicLocationContext.fromJson(Map<String, dynamic> json) {
    return ClinicLocationContext(
      clinicId: (json['clinic_id'] ?? 0) as int,
      clinicName: (json['clinic_name'] ?? '').toString(),
      province: json['province'] as String?,
      provinceCode: json['province_code'] as String?,
      municipality: json['municipality'] as String?,
    );
  }
}

class PsgcService {
  static String formatAddress({
    String? purok,
    String? barangayName,
    String? municipalityName,
    String? provinceName,
  }) {
    final parts = [
      if (purok != null && purok.isNotEmpty) purok,
      if (barangayName != null && barangayName.isNotEmpty) barangayName,
      if (municipalityName != null && municipalityName.isNotEmpty)
        municipalityName,
      if (provinceName != null && provinceName.isNotEmpty) provinceName,
    ];
    return parts.join(', ');
  }
}
