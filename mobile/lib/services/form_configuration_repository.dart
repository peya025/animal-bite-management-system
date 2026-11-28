import '../models/form_configuration.dart';
import 'api.dart';

/// Fetches, caches, and refreshes clinic form rules per authorized context.
class FormConfigurationRepository {
  const FormConfigurationRepository();

  static final Map<String, FormConfiguration> _cache = {};

  static void clearCache() {
    _cache.clear();
  }

  static String _newProfileKey(int clinicId) => 'clinic:$clinicId';
  static String _patientKey(int patientId) => 'patient:$patientId';
  static String _appointmentKey(int appointmentId) =>
      'appointment:$appointmentId';

  FormConfiguration? lastKnownForNewProfile(int clinicId) =>
      _cache[_newProfileKey(clinicId)];

  FormConfiguration? lastKnownForPatient(int patientId) =>
      _cache[_patientKey(patientId)];

  FormConfiguration? lastKnownForAppointment(int appointmentId) =>
      _cache[_appointmentKey(appointmentId)];

  Future<FormConfiguration> forNewProfile(
    int clinicId, {
    bool forceRefresh = false,
  }) async {
    final key = _newProfileKey(clinicId);
    if (!forceRefresh && _cache.containsKey(key)) {
      return _cache[key]!;
    }
    final config =
        await api.formConfiguration(clinicId: clinicId) as FormConfiguration;
    _cache[key] = config;
    return config;
  }

  Future<FormConfiguration> forPatient(
    int patientId, {
    bool forceRefresh = false,
  }) async {
    final key = _patientKey(patientId);
    if (!forceRefresh && _cache.containsKey(key)) {
      return _cache[key]!;
    }
    final config =
        await api.formConfiguration(patientId: patientId) as FormConfiguration;
    _cache[key] = config;
    return config;
  }

  Future<FormConfiguration> forAppointment(
    int appointmentId, {
    bool forceRefresh = false,
  }) async {
    final key = _appointmentKey(appointmentId);
    if (!forceRefresh && _cache.containsKey(key)) {
      return _cache[key]!;
    }
    final config =
        await api.formConfiguration(appointmentId: appointmentId)
            as FormConfiguration;
    _cache[key] = config;
    return config;
  }
}
