import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/faqs_repository.dart';

void main() {
  test('fetches saved changes again and respects removed FAQs', () async {
    var rows = <dynamic>[
      {'category': null, 'question': 'Where do I go?', 'answer': 'Reception.'},
    ];
    final repository = FaqsRepository(fetcher: () async => rows);
    var faqs = await repository.fetchFaqs();
    expect(faqs.single.category, '');
    expect(faqs.single.answer, 'Reception.');
    rows = [
      {'question': 'Where do I go?', 'answer': 'The clinic entrance.'},
    ];
    faqs = await repository.fetchFaqs();
    expect(faqs.single.answer, 'The clinic entrance.');
    rows = [];
    expect(await repository.fetchFaqs(), isEmpty);
  });

  test('reports load failure instead of replacing clinic content with defaults', () async {
    final repository = FaqsRepository(fetcher: () async => throw Exception('Offline'));
    expect(repository.fetchFaqs(), throwsException);
  });
}
