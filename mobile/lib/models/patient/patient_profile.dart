class PatientMembership {
  const PatientMembership({
    required this.membershipType,
    this.id,
    this.isActive = true,
    this.statusValue,
    this.category,
    this.relationshipValue,
    this.registeredBeneficiary,
    this.membershipIdNo,
    this.membershipLabel,
    this.extraValue,
  });

  final int? id;
  final String membershipType;
  final bool isActive;
  final String? statusValue;
  final String? category;
  final String? relationshipValue;
  final String? registeredBeneficiary;
  final String? membershipIdNo;
  final String? membershipLabel;
  final String? extraValue;

  factory PatientMembership.fromJson(Map<String, dynamic> json) {
    return PatientMembership(
      id: json['id'] as int?,
      membershipType: (json['membership_type'] ?? json['type'] ?? '')
          .toString(),
      isActive: json['is_active'] as bool? ?? true,
      statusValue: json['status_value'] as String?,
      category: json['category'] as String?,
      relationshipValue: json['relationship_value'] as String?,
      registeredBeneficiary: json['registered_beneficiary'] as String?,
      membershipIdNo: json['membership_id_no'] as String?,
      membershipLabel: json['membership_label'] as String?,
      extraValue: json['extra_value'] as String?,
    );
  }
}

class PatientDetailsProfile {
  const PatientDetailsProfile({
    this.bloodType,
    this.motherMaidenName,
    this.civilStatus,
    this.spouseName,
    this.addressMunicipality,
    this.addressBarangay,
    this.addressPurok,
    this.province,
    this.educationalAttainment,
    this.employmentStatus,
    this.familyMember,
    this.philhealthMember,
    this.philhealthStatus,
    this.philhealthNo,
    this.philhealthCategory,
    this.fourpsMember,
    this.fourpsCategory,
    this.fourpsRelationship,
    this.registeredFourpsBeneficiary,
    this.dswdNhts,
    this.hasMembership,
    this.otherMembership,
    this.otherMembershipName,
    this.otherMembershipNo,
  });

  final String? bloodType;
  final String? motherMaidenName;
  final String? civilStatus;
  final String? spouseName;
  final String? addressMunicipality;
  final String? addressBarangay;
  final String? addressPurok;
  final String? province;
  final String? educationalAttainment;
  final String? employmentStatus;
  final String? familyMember;
  final String? philhealthMember;
  final String? philhealthStatus;
  final String? philhealthNo;
  final String? philhealthCategory;
  final String? fourpsMember;
  final String? fourpsCategory;
  final String? fourpsRelationship;
  final String? registeredFourpsBeneficiary;
  final String? dswdNhts;
  final String? hasMembership;
  final String? otherMembership;
  final String? otherMembershipName;
  final String? otherMembershipNo;

  factory PatientDetailsProfile.fromJson(Map<String, dynamic> json) {
    return PatientDetailsProfile(
      bloodType: json['blood_type'] as String?,
      motherMaidenName: json['mother_maiden_name'] as String?,
      civilStatus: json['civil_status'] as String?,
      spouseName: json['spouse_name'] as String?,
      addressMunicipality: json['address_municipality'] as String?,
      addressBarangay: json['address_barangay'] as String?,
      addressPurok: json['address_purok'] as String?,
      province: json['province'] as String?,
      educationalAttainment: json['educational_attainment'] as String?,
      employmentStatus: json['employment_status'] as String?,
      familyMember: json['family_member'] as String?,
      philhealthMember: json['philhealth_member'] as String?,
      philhealthStatus: json['philhealth_status'] as String?,
      philhealthNo: json['philhealth_no'] as String?,
      philhealthCategory: json['philhealth_category'] as String?,
      fourpsMember: json['fourps_member'] as String?,
      fourpsCategory: json['fourps_category'] as String?,
      fourpsRelationship: json['fourps_relationship'] as String?,
      registeredFourpsBeneficiary:
          json['registered_fourps_beneficiary'] as String?,
      dswdNhts: json['dswd_nhts'] as String?,
      hasMembership: json['has_membership'] as String?,
      otherMembership: json['other_membership'] as String?,
      otherMembershipName: json['other_membership_name'] as String?,
      otherMembershipNo: json['other_membership_no'] as String?,
    );
  }
}

class PatientProfile {
  const PatientProfile({
    required this.id,
    required this.name,
    required this.firstName,
    required this.lastName,
    required this.relationship,
    required this.status,
    this.patientNumber,
    this.middleName,
    this.suffix,
    this.gender,
    this.dateOfBirth,
    this.address,
    this.contactNumber,
    this.email,
    this.emergencyContactName,
    this.emergencyContactNumber,
    this.details,
    this.memberships = const [],
    this.isActive = true,
  });

  final int id;
  final String name;
  final String firstName;
  final String lastName;
  final String relationship;
  final String status;
  final String? patientNumber;
  final String? middleName;
  final String? suffix;
  final String? gender;
  final String? dateOfBirth;
  final String? address;
  final String? contactNumber;
  final String? email;
  final String? emergencyContactName;
  final String? emergencyContactNumber;
  final PatientDetailsProfile? details;
  final List<PatientMembership> memberships;
  final bool isActive;

  bool get isVerified => status == 'verified';

  PatientProfile copyWith({
    int? id,
    String? name,
    String? firstName,
    String? lastName,
    String? relationship,
    String? status,
    String? patientNumber,
    String? middleName,
    String? suffix,
    String? gender,
    String? dateOfBirth,
    String? address,
    String? contactNumber,
    String? email,
    String? emergencyContactName,
    String? emergencyContactNumber,
    PatientDetailsProfile? details,
    List<PatientMembership>? memberships,
    bool? isActive,
  }) {
    return PatientProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      relationship: relationship ?? this.relationship,
      status: status ?? this.status,
      patientNumber: patientNumber ?? this.patientNumber,
      middleName: middleName ?? this.middleName,
      suffix: suffix ?? this.suffix,
      gender: gender ?? this.gender,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      address: address ?? this.address,
      contactNumber: contactNumber ?? this.contactNumber,
      email: email ?? this.email,
      emergencyContactName: emergencyContactName ?? this.emergencyContactName,
      emergencyContactNumber: emergencyContactNumber ?? this.emergencyContactNumber,
      details: details ?? this.details,
      memberships: memberships ?? this.memberships,
      isActive: isActive ?? this.isActive,
    );
  }

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    final pivot = json['pivot'] as Map<String, dynamic>? ?? const {};
    final detailsJson = json['details'] as Map<String, dynamic>?;
    final membershipsJson = json['memberships'] as List<dynamic>? ?? const [];

    final firstName = (json['first_name'] ?? '').toString();
    final middleName = json['middle_name'] as String?;
    final lastName = (json['last_name'] ?? '').toString();
    final suffix = json['suffix'] as String?;
    final resolvedName =
        (json['name'] as String?) ??
        [
          firstName,
          middleName,
          lastName,
          suffix,
        ].where((part) => part != null && part.trim().isNotEmpty).join(' ');

    final rawIsActive = json['is_active'] ?? pivot['is_active'];
    final bool parsedIsActive = (rawIsActive is bool)
        ? rawIsActive
        : (rawIsActive == 1 || rawIsActive == '1' || rawIsActive == null);

    return PatientProfile(
      id: (json['patient_id'] ?? json['id']) as int,
      name: resolvedName,
      firstName: firstName,
      lastName: lastName,
      relationship: pivot['relationship'] as String? ?? 'dependent',
      status: pivot['status'] as String? ?? 'pending',
      patientNumber: json['patient_number'] as String?,
      middleName: middleName,
      suffix: suffix,
      gender: json['gender'] as String?,
      dateOfBirth: json['date_of_birth'] as String?,
      address: json['address'] as String?,
      contactNumber: (json['contact_number'] ?? json['phone']) as String?,
      email: json['email'] as String?,
      emergencyContactName: json['emergency_contact_name'] as String?,
      emergencyContactNumber: json['emergency_contact_number'] as String?,
      details: detailsJson == null
          ? null
          : PatientDetailsProfile.fromJson(detailsJson),
      memberships: membershipsJson
          .whereType<Map<String, dynamic>>()
          .map(PatientMembership.fromJson)
          .toList(),
      isActive: parsedIsActive,
    );
  }
}
