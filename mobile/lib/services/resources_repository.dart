import '../models/clinic_resource.dart';
import 'api.dart';
import 'mobile_api.dart';
import 'mock_mobile_api.dart';

class ResourcesRepository {
  const ResourcesRepository({
    this.fetcher,
  });

  static const ResourcesRepository instance = ResourcesRepository();

  /// Optional global override for widget tests.
  static Future<List<ClinicResource>> Function()? debugFetchOverride;

  final Future<Map<String, dynamic>> Function()? fetcher;

  Future<List<ClinicResource>> fetchActiveResources() async {
    if (debugFetchOverride != null) {
      return debugFetchOverride!();
    }

    final Map<String, dynamic> response;
    if (fetcher != null) {
      response = await fetcher!();
    } else if (isMockMode) {
      response = await MockMobileApi.instance.clinicResources();
    } else {
      response = await MobileApi.instance.clinicResources();
    }

    return ClinicResource.listFromJson(response['data']);
  }
}
