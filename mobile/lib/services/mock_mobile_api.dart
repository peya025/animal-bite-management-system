/// Mock API service for UI testing without backend
/// Import this instead of mobile_api.dart to test UI

import '../models/patient_profile.dart';
import '../models/patient_account_profile.dart';
import '../models/appointment_summary.dart';
import '../models/app_notification.dart';
import 'mock_data.dart';

class MockMobileApi {
  MockMobileApi._();

  static final instance = MockMobileApi._();

  bool _isAuthenticated = false;
  
  bool get isAuthenticated => _isAuthenticated;

  Future<void> initialize() async {
    // Simulate initialization delay
    await Future.delayed(const Duration(milliseconds: 500));
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String passwordConfirmation,
  }) async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));
    _isAuthenticated = true;
  }

  Future<void> activateInvitation({
    required String token,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    if (token.isEmpty || token == 'expired') {
      throw Exception('Invalid or expired code. Please contact the clinic for a new invite.');
    }
    _isAuthenticated = true;
  }

  Future<void> login({
    required String email,
    required String password,
    required bool remember,
  }) async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));
    
    // Simple validation for demo
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
    return PatientAccountProfile.fromJson(MockData.sampleAccount);
  }

  Future<PatientAccountProfile> updateAccount({
    required String name,
    required String phone,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    final updated = Map<String, dynamic>.from(MockData.sampleAccount);
    updated['name'] = name;
    updated['phone'] = phone;
    return PatientAccountProfile.fromJson(updated);
  }

  Future<List<PatientProfile>> patients() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return MockData.samplePatients
        .map((item) => PatientProfile.fromJson(item))
        .toList();
  }

  Future<PatientProfile> createPatient(Map<String, dynamic> profile) async {
    await Future.delayed(const Duration(seconds: 1));
    // Return the first sample patient as newly created
    return PatientProfile.fromJson(MockData.samplePatients[0]);
  }

  Future<void> book({
    required PatientProfile patient,
    required dynamic booking,
    dynamic intake,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    // Simulate successful booking
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
    // Return the cancelled appointment
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
    // Simulate marking as read
  }

  Future<void> markAllNotificationsRead() async {
    await Future.delayed(const Duration(milliseconds: 500));
    // Simulate marking all as read
  }

  Future<bool> checkConnectivity() async {
    await Future.delayed(const Duration(milliseconds: 200));
    // Always return true for mock
    return true;
  }
}
