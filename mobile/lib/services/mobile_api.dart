import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/booking_draft.dart';
import '../models/bite_intake_draft.dart';
import '../models/patient_profile.dart';
import '../models/patient_account_profile.dart';

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class MobileApi {
  MobileApi._();

  static final instance = MobileApi._();

  static const _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8000/api/mobile',
  );
  static const clinicId = int.fromEnvironment('CLINIC_ID', defaultValue: 1);
  static const _tokenKey = 'patient_account_token';
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

  Future<List<PatientProfile>> patients() async {
    final data = await _send('GET', '/patients') as List<dynamic>;
    return data
        .map((item) => PatientProfile.fromJson(item as Map<String, dynamic>))
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
        if (intake != null) 'intake': intake.toJson(),
      },
    );
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

    final response = switch (method) {
      'GET' => await http.get(uri, headers: headers),
      'POST' => await http.post(uri, headers: headers, body: encodedBody),
      'PATCH' => await http.patch(uri, headers: headers, body: encodedBody),
      _ => throw ArgumentError.value(method, 'method'),
    };

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
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

    throw const ApiException('Could not connect to the clinic server.');
  }
}
