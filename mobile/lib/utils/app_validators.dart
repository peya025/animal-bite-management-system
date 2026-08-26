/// Standardized defensive input validators across the mobile application.
abstract final class AppValidators {
  static final RegExp _phMobileRegex = RegExp(r'^(09\d{9}|9\d{9}|\+639\d{9})$');
  static final RegExp _emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
  static final RegExp _nameRegex = RegExp(r'''^[a-zA-Z\s\-\.\'\ñ\Ñ]+$''');

  /// Validates Philippine mobile numbers (09XXXXXXXXX, 9XXXXXXXXX, or +639XXXXXXXXX).
  static String? phMobile(String? value, {bool required = true}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? 'Contact number is required.' : null;
    }
    final clean = trimmed.replaceAll(RegExp(r'[\s\-]'), '');
    if (!_phMobileRegex.hasMatch(clean)) {
      return 'Enter a valid 11-digit PH mobile number (e.g. 09XX XXX XXXX).';
    }
    return null;
  }

  /// Normalizes a Philippine mobile number into standard 11-digit '09XXXXXXXXX' format.
  static String normalizePhMobile(String? value) {
    if (value == null) return '';
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('639') && digits.length == 12) {
      return '0${digits.substring(2)}';
    }
    if (digits.startsWith('9') && digits.length == 10) {
      return '0$digits';
    }
    return digits;
  }

  /// Validates email address format.
  static String? email(String? value, {bool required = false}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? 'Email address is required.' : null;
    }
    if (!_emailRegex.hasMatch(trimmed)) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  /// Validates 12-digit PhilHealth Identification Number (PIN).
  static String? philHealth(String? value, {bool isMember = false}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return isMember ? 'PhilHealth number is required for members.' : null;
    }
    final digitsOnly = trimmed.replaceAll(RegExp(r'\D'), '');
    if (digitsOnly.length != 12) {
      return 'PhilHealth PIN must be exactly 12 digits (e.g. 12-345678901-2).';
    }
    return null;
  }

  /// Validates personal name fields (First name, Last name, etc.).
  static String? name(String? value, String fieldName, {bool required = true}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) {
      return required ? ' is required.' : null;
    }
    if (trimmed.length < 2) {
      return ' must be at least 2 characters.';
    }
    if (!_nameRegex.hasMatch(trimmed)) {
      return ' should only contain letters, spaces, and hyphens.';
    }
    return null;
  }

  /// Validates Date of Birth (cannot be in the future, reasonable age threshold).
  static String? dateOfBirth(DateTime? date, {bool required = true}) {
    if (date == null) {
      return required ? 'Date of birth is required.' : null;
    }
    final now = DateTime.now();
    if (date.isAfter(now)) {
      return 'Date of birth cannot be in the future.';
    }
    final maxAgeDate = DateTime(now.year - 125, now.month, now.day);
    if (date.isBefore(maxAgeDate)) {
      return 'Please enter a valid birth date.';
    }
    return null;
  }

  /// Validates Bite Incident Date/Time (cannot be in the future).
  static String? biteIncidentDate(DateTime? date, {bool required = true}) {
    if (date == null) {
      return required ? 'Incident date is required.' : null;
    }
    final now = DateTime.now();
    // Allow small 5-minute clock drift
    if (date.isAfter(now.add(const Duration(minutes: 5)))) {
      return 'Incident date cannot be in the future.';
    }
    return null;
  }
}
