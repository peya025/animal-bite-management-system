// Mock API service for UI testing without a live backend.
// Import this instead of mobile_api.dart to test the mobile flows locally.

import 'dart:convert';

import '../models/app_notification.dart';
import '../models/appointment_summary.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import 'mock_data.dart';
import 'psgc_service.dart';

class MockMobileApi {
  MockMobileApi._();

  static final instance = MockMobileApi._();

  bool _isAuthenticated = false;
  Map<String, dynamic> _account = _deepCopyMap(MockData.sampleAccount);
  List<Map<String, dynamic>> _patients = _deepCopyList(MockData.samplePatients);

  bool get isAuthenticated => _isAuthenticated;

  Future<void> initialize() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String passwordConfirmation,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    _account = {..._account, 'name': name, 'email': email, 'phone': phone};
    _isAuthenticated = true;
  }

  Future<String> requestPasswordReset({required String email}) async {
    await Future.delayed(const Duration(seconds: 1));
    return 'If an account associated with $email exists, password reset instructions have been sent.';
  }

  Future<void> activateInvitation({
    required String token,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    if (token.isEmpty || token == 'expired') {
      throw Exception(
        'Invalid or expired code. Please contact the clinic for a new invite.',
      );
    }
    _isAuthenticated = true;
  }

  Future<void> login({
    required String email,
    required String password,
    required bool remember,
  }) async {
    await Future.delayed(const Duration(seconds: 1));

    if (email.isEmpty || password.isEmpty) {
      throw Exception('Please fill in all fields');
    }

    _isAuthenticated = true;
  }

  Future<void> logout() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _isAuthenticated = false;
  }

  Future<PatientAccountProfile> account() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return PatientAccountProfile.fromJson({
      ..._deepCopyMap(_account),
      'patients': _deepCopyList(_patients),
    });
  }

  Future<PatientAccountProfile> updateAccount({
    required String name,
    required String phone,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    _account = {..._account, 'name': name, 'phone': phone};
    return PatientAccountProfile.fromJson({
      ..._deepCopyMap(_account),
      'patients': _deepCopyList(_patients),
    });
  }

  Future<List<PatientProfile>> patients() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return _patients.map(PatientProfile.fromJson).toList();
  }

  Future<ClinicLocationContext> locationContext({int? clinicId}) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return const ClinicLocationContext(
      clinicId: 1,
      clinicName: 'Animal Bite Treatment Center',
      province: 'Misamis Oriental',
      provinceCode: '104300000',
      municipality: 'Tagoloan',
    );
  }

  Future<List<PsgcLocation>> locationMunicipalities({int? clinicId}) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return const [
      PsgcLocation(code: '104305000', name: 'Tagoloan'),
      PsgcLocation(code: '104303000', name: 'Claveria'),
      PsgcLocation(code: '104307000', name: 'Villanueva'),
      PsgcLocation(code: '104301000', name: 'Balingasag'),
    ];
  }

  Future<List<PsgcLocation>> locationBarangays({
    required String municipalityCode,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return switch (municipalityCode) {
      '104305000' => const [
        PsgcLocation(code: '104305001', name: 'Poblacion'),
        PsgcLocation(code: '104305002', name: 'Baluarte'),
        PsgcLocation(code: '104305003', name: 'Gracia'),
        PsgcLocation(code: '104305004', name: 'Rosario'),
      ],
      '104303000' => const [
        PsgcLocation(code: '104303001', name: 'Poblacion'),
        PsgcLocation(code: '104303002', name: 'Aposkahoy'),
        PsgcLocation(code: '104303003', name: 'Mat-i'),
      ],
      '104307000' => const [
        PsgcLocation(code: '104307001', name: 'Poblacion 1'),
        PsgcLocation(code: '104307002', name: 'Balacanas'),
        PsgcLocation(code: '104307003', name: 'Kimaya'),
      ],
      _ => const [PsgcLocation(code: '104301001', name: 'Poblacion')],
    };
  }

  Future<PatientProfile> createPatient(Map<String, dynamic> profile) async {
    await Future.delayed(const Duration(seconds: 1));

    final nextId =
        _patients.fold<int>(
          100,
          (maxId, item) => ((item['patient_id'] ?? item['id']) as int) > maxId
              ? (item['patient_id'] ?? item['id']) as int
              : maxId,
        ) +
        1;

    final created = _buildPatientJson(
      patientId: nextId,
      patientNumber: _nextPatientNumber(),
      profile: profile,
      existing: null,
    );

    _patients = [..._patients, created];
    return PatientProfile.fromJson(_deepCopyMap(created));
  }

  Future<PatientProfile> updatePatient({
    required int patientId,
    required Map<String, dynamic> profile,
  }) async {
    await Future.delayed(const Duration(seconds: 1));

    final index = _patients.indexWhere(
      (item) => (item['patient_id'] ?? item['id']) == patientId,
    );
    if (index == -1) {
      throw Exception('Patient profile not found');
    }

    final updated = _buildPatientJson(
      patientId: patientId,
      patientNumber:
          (_patients[index]['patient_number'] as String?) ??
          _nextPatientNumber(),
      profile: profile,
      existing: _patients[index],
    );

    _patients = [
      for (var i = 0; i < _patients.length; i++)
        if (i == index) updated else _patients[i],
    ];

    return PatientProfile.fromJson(_deepCopyMap(updated));
  }

  Future<void> book({
    required PatientProfile patient,
    required dynamic booking,
    dynamic intake,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
  }

  Future<List<AppointmentSummary>> appointments() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return MockData.sampleAppointments
        .map((item) => AppointmentSummary.fromJson(item))
        .toList();
  }

  Future<AppointmentSummary> cancelAppointment({
    required int appointmentId,
    String? reason,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    final cancelled = Map<String, dynamic>.from(MockData.sampleAppointments[0]);
    cancelled['status'] = 'cancelled';
    cancelled['cancellation_reason'] = reason;
    return AppointmentSummary.fromJson(cancelled);
  }

  Future<List<AppNotification>> notifications() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return MockData.sampleNotifications
        .map((item) => AppNotification.fromJson(item))
        .toList();
  }

  Future<void> markNotificationRead(int notificationId) async {
    await Future.delayed(const Duration(milliseconds: 300));
  }

  Future<void> markAllNotificationsRead() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  Future<bool> checkConnectivity() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return true;
  }

  Map<String, dynamic> _buildPatientJson({
    required int patientId,
    required String patientNumber,
    required Map<String, dynamic> profile,
    required Map<String, dynamic>? existing,
  }) {
    final existingDetails = Map<String, dynamic>.from(
      existing?['details'] as Map<String, dynamic>? ?? const {},
    );
    final updatedDetails = {...existingDetails};

    for (final key in _detailKeys) {
      if (profile.containsKey(key)) {
        updatedDetails[key] = profile[key];
      }
    }

    final firstName = _resolveString(profile, existing, 'first_name');
    final middleName = _resolveNullableString(profile, existing, 'middle_name');
    final lastName = _resolveString(profile, existing, 'last_name');
    final suffix = _resolveNullableString(profile, existing, 'suffix');

    final memberships = profile['memberships'] is List
        ? _normalizeMemberships(profile['memberships'] as List<dynamic>)
        : _deepCopyList(existing?['memberships'] as List<dynamic>? ?? const []);

    final pivot = Map<String, dynamic>.from(
      existing?['pivot'] as Map<String, dynamic>? ??
          {
            'relationship': profile['relationship'] ?? 'dependent',
            'status': 'pending',
          },
    );

    if (profile.containsKey('relationship')) {
      pivot['relationship'] = profile['relationship'];
    }

    final address = profile.containsKey('address')
        ? profile['address']
        : existing?['address'];

    return {
      'patient_id': patientId,
      'patient_number': patientNumber,
      'name': [
        firstName,
        middleName,
        lastName,
        suffix,
      ].whereType<String>().where((part) => part.trim().isNotEmpty).join(' '),
      'first_name': firstName,
      'middle_name': middleName,
      'last_name': lastName,
      'suffix': suffix,
      'gender': profile.containsKey('gender')
          ? profile['gender']
          : existing?['gender'],
      'date_of_birth': profile.containsKey('date_of_birth')
          ? profile['date_of_birth']
          : existing?['date_of_birth'],
      'address': address,
      'contact_number': profile.containsKey('contact_number')
          ? profile['contact_number']
          : existing?['contact_number'],
      'email': profile.containsKey('email')
          ? profile['email']
          : existing?['email'],
      'emergency_contact_name': profile.containsKey('emergency_contact_name')
          ? profile['emergency_contact_name']
          : existing?['emergency_contact_name'],
      'emergency_contact_number':
          profile.containsKey('emergency_contact_number')
          ? profile['emergency_contact_number']
          : existing?['emergency_contact_number'],
      'details': updatedDetails,
      'memberships': memberships,
      'pivot': pivot,
    };
  }

  List<Map<String, dynamic>> _normalizeMemberships(List<dynamic> memberships) {
    return [
      for (var i = 0; i < memberships.length; i++)
        if (memberships[i] is Map)
          {
            'id': i + 1,
            'is_active': true,
            ...Map<String, dynamic>.from(memberships[i] as Map),
          },
    ];
  }

  Future<Map<String, dynamic>> history({int? patientId}) async {
    await Future.delayed(const Duration(milliseconds: 400));
    return {
      'summary': {
        'total_visits': 3,
        'total_vaccinations': 2,
        'active_cases': 1,
      },
      'active_case': {
        'case_number': 'Case BC-2026-0018',
        'next_dose_text': 'Next: Day 7 dose · March 17, 2026',
        'due_badge_text': 'Due in 4 days',
      },
      'records': [
        {
          'id': 'app-1',
          'type': 'appointments',
          'title': 'Bite consultation',
          'date_time': 'March 10, 2026 · 9:30 AM',
          'case_number': 'BC-2026-0018',
          'status': 'completed',
        },
        {
          'id': 'vac-1',
          'type': 'vaccinations',
          'title': 'Anti-rabies vaccine · Day 3',
          'date_time': 'March 13, 2026 · 10:00 AM',
          'status': 'completed',
          'completed_doses': 2,
          'total_doses': 4,
          'dose_label': '2 of 4 done',
        },
        {
          'id': 'vac-2',
          'type': 'vaccinations',
          'title': 'Anti-rabies vaccine · Day 7',
          'date_time': 'March 17, 2026 · 10:00 AM',
          'status': 'scheduled',
          'completed_doses': 2,
          'total_doses': 4,
          'dose_label': '3 of 4 · upcoming',
        },
      ],
    };
  }

  String _resolveString(
    Map<String, dynamic> profile,
    Map<String, dynamic>? existing,
    String key,
  ) {
    final value = profile.containsKey(key) ? profile[key] : existing?[key];
    return value?.toString() ?? '';
  }

  String? _resolveNullableString(
    Map<String, dynamic> profile,
    Map<String, dynamic>? existing,
    String key,
  ) {
    final value = profile.containsKey(key) ? profile[key] : existing?[key];
    final text = value?.toString();
    if (text == null || text.trim().isEmpty) {
      return null;
    }
    return text;
  }

  String _nextPatientNumber() {
    final suffix = (_patients.length + 1).toString().padLeft(3, '0');
    return 'P-2026-$suffix';
  }

  static Map<String, dynamic> _deepCopyMap(Map<String, dynamic> source) {
    return Map<String, dynamic>.from(jsonDecode(jsonEncode(source)) as Map);
  }

  static List<Map<String, dynamic>> _deepCopyList(List<dynamic> source) {
    final decoded = jsonDecode(jsonEncode(source)) as List<dynamic>;
    return decoded
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  static const List<String> _detailKeys = [
    'blood_type',
    'mother_maiden_name',
    'civil_status',
    'spouse_name',
    'address_municipality',
    'address_barangay',
    'address_purok',
    'province',
    'educational_attainment',
    'employment_status',
    'family_member',
    'philhealth_member',
    'philhealth_status',
    'philhealth_no',
    'philhealth_category',
    'fourps_member',
    'fourps_category',
    'fourps_relationship',
    'registered_fourps_beneficiary',
    'dswd_nhts',
    'has_membership',
    'other_membership',
    'other_membership_name',
    'other_membership_no',
  ];
}
