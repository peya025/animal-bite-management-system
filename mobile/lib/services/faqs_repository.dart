import '../models/clinic_faq.dart';
import 'api.dart' show isMockMode;
import 'mobile_api.dart';

class FaqsRepository {
  const FaqsRepository({this.fetcher});

  static const instance = FaqsRepository();
  final Future<List<dynamic>> Function()? fetcher;

  Future<List<FaqItemData>> fetchFaqs() async {
    if (fetcher == null && isMockMode) return kClinicFaqs;
    final items = await (fetcher ?? MobileApi.instance.clinicFaqs)();
    return items
        .map(
          (item) => FaqItemData(
            category: item['category'] as String? ?? '',
            question: item['question'] as String,
            answer: item['answer'] as String,
          ),
        )
        .toList();
  }
}
