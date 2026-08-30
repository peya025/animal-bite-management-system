import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../models/booking_draft.dart';
import '../models/bite_intake_draft.dart';
import '../models/appointment_summary.dart';
import '../models/app_notification.dart';
import '../models/patient_profile.dart';
import '../models/patient_account_profile.dart';
import 'psgc_service.dart';

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class MobileApi {
  MobileApi._();

  static final instance = MobileApi._();

  // Load from .env file - change .env when switching networks
  static String get _baseUrl =>
      (dotenv.env['API_BASE_URL'] ?? 'http://192.168.18.53:8000/api/mobile')
          .trim()
          .replaceAll(' ', '');
  static int get clinicId => int.parse(dotenv.env['CLINIC_ID'] ?? '1');

  static const _tokenKey = 'patient_account_token';
  static const _requestTimeout = Duration(seconds: 20);
  static const _storage = FlutterSecureStorage();

  String? _token;

  bool get isAuthenticated => _token != null;

  Future<void> initialize() async {
    _token = await _storage.read(key: _tokenKey);
  }

  Future<void> _setToken(String token, {required bool persist}) async {
    _token = token;
    if (persist) {
      await _storage.write(key: _tokenKey, value: token);
    } else {
      await _storage.delete(key: _tokenKey);
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String passwordConfirmation,
  }) async {
    final data = await _send(
      'POST',
      '/register',
      body: {
        'name': name,
        'email': email,
        'phone': phone.isEmpty ? null : phone,
        'password': password,
        'password_confirmation': passwordConfirmation,
      },
    );
    await _setToken(data['token'] as String, persist: true);
  }

  Future<String> requestPasswordReset({required String email}) async {
    final data = await _send(
      'POST',
      '/forgot-password',
      body: {'email': email},
    );
    return data['message'] as String? ??
        'Password reset instructions have been sent if account exists.';
  }

  Future<void> activateInvitation({
    required String token,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    final rootUrl = _baseUrl.replaceAll('/api/mobile', '/api');
    final response = await http
        .post(
          Uri.parse('$rootUrl/patient-invitations/activate'),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: jsonEncode({
            'token': token,
            'email': email,
            'password': password,
            'password_confirmation': passwordConfirmation,
          }),
        )
        .timeout(_requestTimeout);

    final data = jsonDecode(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        data['message'] ??
            'Invalid or expired code. Please contact the clinic for a new invite.',
      );
    }

    final authToken = data['token'] as String;
    await _setToken(authToken, persist: true);
  }

  Future<void> login({
    required String email,
    required String password,
    required bool remember,
  }) async {
    final data = await _send(
      'POST',
      '/login',
      body: {'email': email, 'password': password},
    );
    await _setToken(data['token'] as String, persist: remember);
  }

  Future<void> logout() async {
    if (_token != null) await _send('POST', '/logout');
    _token = null;
    await _storage.delete(key: _tokenKey);
  }

  Future<PatientAccountProfile> account() async {
    final data = await _send('GET', '/me') as Map<String, dynamic>;
    return PatientAccountProfile.fromJson(data);
  }

  Future<PatientAccountProfile> updateAccount({
    required String name,
    required String phone,
  }) async {
    final data =
        await _send(
              'PATCH',
              '/me',
              body: {'name': name, 'phone': phone.isEmpty ? null : phone},
            )
            as Map<String, dynamic>;
    return PatientAccountProfile.fromJson(data);
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required String newPasswordConfirmation,
  }) async {
    await _send(
      'POST',
      '/change-password',
      body: {
        'current_password': currentPassword,
        'password': newPassword,
        'password_confirmation': newPasswordConfirmation,
      },
    );
  }

  Future<void> logoutOtherDevices() async {
    await _send('POST', '/logout-other-devices');
  }

  Future<void> deleteAccount({required String password}) async {
    await _send('DELETE', '/me', body: {'password': password});
    await logout();
  }

  Future<List<PatientProfile>> patients() async {
    final data = await _send('GET', '/patients') as List<dynamic>;
    return data
        .map((item) => PatientProfile.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ClinicLocationContext> locationContext({int? clinicId}) async {
    final effectiveClinicId = clinicId ?? MobileApi.clinicId;
    final data =
        await _send('GET', '/locations/context?clinic_id=$effectiveClinicId')
            as Map<String, dynamic>;
    return ClinicLocationContext.fromJson(data);
  }

  Future<List<PsgcLocation>> locationMunicipalities({int? clinicId}) async {
    final effectiveClinicId = clinicId ?? MobileApi.clinicId;
    final data =
        await _send(
              'GET',
              '/locations/municipalities?clinic_id=$effectiveClinicId',
            )
            as Map<String, dynamic>;
    final items = data['data'] as List<dynamic>? ?? const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(PsgcLocation.fromJson)
        .toList();
  }

  Future<List<PsgcLocation>> locationBarangays({
    required String municipalityCode,
  }) async {
    final data =
        await _send(
              'GET',
              '/locations/barangays?municipality_code=$municipalityCode',
            )
            as Map<String, dynamic>;
    final items = data['data'] as List<dynamic>? ?? const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(PsgcLocation.fromJson)
        .toList();
  }

  Future<PatientProfile> createPatient(Map<String, dynamic> profile) async {
    final data = await _send(
      'POST',
      '/patients',
      body: {'clinic_id': clinicId, ...profile},
    );
    return PatientProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<PatientProfile> updatePatient({
    required int patientId,
    required Map<String, dynamic> profile,
  }) async {
    final data = await _send('PATCH', '/patients/$patientId', body: profile);
    return PatientProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<void> archivePatient(int patientId) async {
    await _send('DELETE', '/patients/$patientId');
  }

  Future<void> book({
    required PatientProfile patient,
    required BookingDraft booking,
    BiteIntakeDraft? intake,
  }) async {
    await _send(
      'POST',
      '/appointments',
      body: {
        'patient_id': patient.id,
        'appointment_type': booking.service.name,
        'scheduled_date': booking.date.toIso8601String().split('T').first,
        'time_slot': booking.timeSlot.name,
        if (booking.notes != null && booking.notes!.trim().isNotEmpty)
          'notes': booking.notes!.trim(),
        if (intake != null) 'intake': intake.toJson(),
      },
    );
  }

  Future<List<AppointmentSummary>> appointments() async {
    final data = await _send('GET', '/appointments') as List<dynamic>;
    return data
        .map(
          (item) => AppointmentSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<AppointmentSummary> cancelAppointment({
    required int appointmentId,
    String? reason,
  }) async {
    final data =
        await _send(
              'PATCH',
              '/appointments/$appointmentId/cancel',
              body: {'reason': reason},
            )
            as Map<String, dynamic>;
    return AppointmentSummary.fromJson(data);
  }

  Future<List<AppNotification>> notifications() async {
    final response =
        await _send('GET', '/notifications') as Map<String, dynamic>;
    final data = response['data'] as List<dynamic>;
    return data
        .map((item) => AppNotification.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> markNotificationRead(int notificationId) async {
    await _send('PATCH', '/notifications/$notificationId/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _send('PATCH', '/notifications/read-all');
  }

  Future<Map<String, dynamic>> history({int? patientId}) async {
    final query = patientId != null ? '?patient_id=$patientId' : '';
    final data = await _send('GET', '/history$query') as Map<String, dynamic>;
    return data;
  }

  Future<Map<String, dynamic>> vaccinationCard(int patientId) async {
    final data = await _send('GET', '/patients/$patientId/vaccination-card') as Map<String, dynamic>;
    return data;
  }

  /// Returns true if the server is reachable.
  Future<bool> checkConnectivity() async {
    try {
      final uri = Uri.parse('$_baseUrl/../test'); // hits /api/test
      final res = await http
          .get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 6));
      return res.statusCode < 500;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> scheduleSummary([int? id]) async {
    try {
      final res = await _send('GET', '/schedule-summary');
      if (res is Map<String, dynamic>) {
        return res;
      }
    } catch (_) {}

    final targetId = id ?? clinicId;
    final rootUrl = _baseUrl.replaceAll('/api/mobile', '/api');
    try {
      final response = await http.get(
        Uri.parse('$rootUrl/clinics/$targetId/schedule-summary'),
        headers: {'Accept': 'application/json'},
      ).timeout(_requestTimeout);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return <String, dynamic>{
      'open_days_of_week': [1, 2, 3, 4, 5],
      'exceptions': <String, dynamic>{},
      'urgent_policy': <String, dynamic>{
        'urgent_access_policy': 'walk_ins_accepted_outside_hours',
      },
    };
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
    final encodedBody = body == null ? null : jsonEncode(body);

    late final Future<http.Response> request;
    switch (method) {
      case 'GET':
        request = http.get(uri, headers: headers);
      case 'POST':
        request = http.post(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        request = http.patch(uri, headers: headers, body: encodedBody);
      default:
        throw ArgumentError.value(method, 'method');
    }

    late final http.Response response;
    try {
      response = await request.timeout(_requestTimeout);
    } on TimeoutException {
      throw const ApiException(
        'Connection timed out. Please check your network or try again later.',
      );
    } on SocketException {
      throw const ApiException(
        'Unable to reach server. Please check your connection and ensure the backend is running.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Unable to connect to the clinic server. Please verify your connection.',
      );
    }

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    if (response.statusCode == 401) {
      _token = null;
      await _storage.delete(key: _tokenKey);
      throw const ApiException('Session expired. Please log in again.');
    }

    if (response.statusCode == 403) {
      throw const ApiException('You do not have permission to perform this action.');
    }

    if (response.statusCode == 404) {
      throw const ApiException('The requested clinic resource was not found.');
    }

    if (response.statusCode >= 500) {
      throw const ApiException('Clinic server is temporarily unavailable. Please try again later.');
    }

    if (decoded is Map<String, dynamic>) {
      final errors = decoded['errors'];
      if (errors is Map<String, dynamic> && errors.isNotEmpty) {
        final first = errors.values.first;
        if (first is List && first.isNotEmpty) {
          throw ApiException(first.first.toString());
        }
      }
      throw ApiException(decoded['message']?.toString() ?? 'Request failed.');
    }

    throw const ApiException('Could not complete request with the clinic server.');
  }
}
