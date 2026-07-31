import 'dart:convert';
import 'package:http/http.dart' as http;

class PsgcLocation {
  final String code;
  final String name;

  const PsgcLocation({required this.code, required this.name});

  factory PsgcLocation.fromJson(Map<String, dynamic> json) {
    return PsgcLocation(
      code: json['code'] as String,
      name: json['name'] as String,
    );
  }
}

class PsgcService {
  static const _baseUrl = 'https://psgc.gitlab.io/api';
  static const _misamisOrientalCode = '124900000';

  /// Fetch all municipalities/cities in Misamis Oriental
  static Future<List<PsgcLocation>> getMunicipalities() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/provinces/$_misamisOrientalCode/cities-municipalities/'),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        final municipalities = data
            .map((item) => PsgcLocation.fromJson(item))
            .toList();
        
        // Sort alphabetically by name
        municipalities.sort((a, b) => a.name.compareTo(b.name));
        return municipalities;
      } else {
        throw Exception('Failed to load municipalities');
      }
    } catch (e) {
      throw Exception('Error fetching municipalities: $e');
    }
  }

  /// Fetch all barangays for a given municipality code
  static Future<List<PsgcLocation>> getBarangays(String municipalityCode) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/cities-municipalities/$municipalityCode/barangays/'),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        final barangays = data
            .map((item) => PsgcLocation.fromJson(item))
            .toList();
        
        // Sort alphabetically by name
        barangays.sort((a, b) => a.name.compareTo(b.name));
        return barangays;
      } else {
        throw Exception('Failed to load barangays');
      }
    } catch (e) {
      throw Exception('Error fetching barangays: $e');
    }
  }

  /// Format full address string
  static String formatAddress({
    String? purok,
    String? barangayName,
    String? municipalityName,
  }) {
    final parts = [
      if (purok != null && purok.isNotEmpty) purok,
      if (barangayName != null && barangayName.isNotEmpty) barangayName,
      if (municipalityName != null && municipalityName.isNotEmpty) municipalityName,
      'Misamis Oriental',
    ];
    return parts.join(', ');
  }
}
