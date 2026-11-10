import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/announcement.dart';
import 'package:mobile/widgets/menu/announcement_carousel.dart';
import 'package:mobile/widgets/menu/campaign_banner.dart';

final _transparentPng = Uint8List.fromList(<int>[
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D,
  0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
  0x60, 0x82,
]);

class _TestHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _FakeHttpClient();
}

class _FakeHttpClient extends Fake implements HttpClient {
  @override
  bool autoUncompress = true;

  @override
  Future<HttpClientRequest> getUrl(Uri url) async => _FakeHttpClientRequest();
}

class _FakeHttpClientRequest extends Fake implements HttpClientRequest {
  @override
  final HttpHeaders headers = _FakeHttpHeaders();

  @override
  Future<HttpClientResponse> close() async => _FakeHttpClientResponse();
}

class _FakeHttpHeaders extends Fake implements HttpHeaders {
  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {}
}

class _FakeHttpClientResponse extends Fake implements HttpClientResponse {
  @override
  int get statusCode => HttpStatus.ok;

  @override
  int get contentLength => _transparentPng.length;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.value(_transparentPng).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }
}

const notice = Announcement(
  id: 1,
  title: 'Clinic schedule update',
  message: 'Please read the updated clinic schedule before your visit.',
  isUrgent: true,
);

Widget host({
  required Future<List<Announcement>> Function() load,
  int refresh = 0,
  double textScale = 1,
  VoidCallback? onGuide,
}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
    child: Scaffold(
      body: SingleChildScrollView(
        child: SizedBox(
          width: 320,
          child: AnnouncementCarousel(
            refreshTrigger: refresh,
            loadAnnouncements: load,
            welcome: CampaignBanner(
              onStartWalkthrough: onGuide,
              onOpenFaq: () {},
            ),
          ),
        ),
      ),
    ),
  ),
);

void main() {
  setUpAll(() {
    HttpOverrides.global = _TestHttpOverrides();
  });

  testWidgets(
    'keeps the original hero and buttons, swipes to published notice',
    (tester) async {
      var guideOpened = false;
      await tester.pumpWidget(
        host(load: () async => [notice], onGuide: () => guideOpened = true),
      );
      await tester.pumpAndSettle();
      expect(find.text('Anti-Rabies\nAwareness & PEP Guide'), findsOneWidget);
      await tester.tap(find.text('Guide walkthrough'));
      expect(guideOpened, isTrue);
      final heroSize = tester.getSize(find.byType(PageView));
      await tester.drag(find.byType(PageView), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(find.text('Clinic schedule update').hitTestable(), findsOneWidget);
      expect(find.text('IMPORTANT NOTICE'), findsOneWidget);
      expect(tester.getSize(find.byType(PageView)), heroSize);
      expect(find.text(notice.message), findsNothing);
      await tester.tap(find.byTooltip('View announcement'));
      await tester.pumpAndSettle();
      expect(find.byType(SelectableText), findsOneWidget);
      expect(find.text('Close'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      await tester.drag(find.byType(PageView), const Offset(300, 0));
      await tester.pumpAndSettle();
      expect(find.text('Guide walkthrough').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('failed feed keeps original hero without announcement controls', (
    tester,
  ) async {
    await tester.pumpWidget(host(load: () async => throw Exception('offline')));
    await tester.pumpAndSettle();
    expect(find.text('Guide walkthrough'), findsOneWidget);
    expect(find.byTooltip('View announcement'), findsNothing);
    expect(find.byType(Wrap), findsOneWidget); // Original guide buttons only.
    expect(tester.takeException(), isNull);
  });

  testWidgets('refresh removes unpublished slides and returns to welcome', (
    tester,
  ) async {
    await tester.pumpWidget(host(load: () async => [notice]));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    await tester.pumpWidget(host(load: () async => [], refresh: 1));
    await tester.pumpAndSettle();
    expect(find.text('Clinic schedule update'), findsNothing);
    expect(find.text('Guide walkthrough').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('small screens and large text grow without overflow', (
    tester,
  ) async {
    await tester.pumpWidget(host(load: () async => [notice], textScale: 2));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(find.byTooltip('View announcement'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('ignores unsafe image URLs and parses public feed', () {
    final item = Announcement.fromJson({
      'id': 2,
      'title': 'Notice',
      'message': 'Details',
      'image_url': 'javascript:alert(1)',
      'is_urgent': true,
    });
    expect(item.imageUrl, isNull);
    expect(item.isUrgent, isTrue);
  });

  testWidgets('photo fills the hero and arrow opens uncropped details', (
    tester,
  ) async {
    const photoNotice = Announcement(
      id: 2,
      title: 'Clinic photo notice',
      message: 'Full announcement details.',
      imageUrl: 'https://clinic.example/announcement.jpg',
    );
    await tester.pumpWidget(host(load: () async => [photoNotice]));
    await tester.pumpAndSettle();
    final heroSize = tester.getSize(find.byType(PageView));
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    final photo = find.byType(Image).hitTestable();
    expect(tester.widget<Image>(photo).fit, BoxFit.cover);
    expect(tester.getSize(photo), heroSize);
    final heroRect = tester.getRect(find.byType(PageView));
    expect(
      heroRect.contains(tester.getCenter(find.byTooltip('View announcement'))),
      isTrue,
    );
    await tester.tap(find.byTooltip('View announcement'));
    await tester.pumpAndSettle();
    expect(find.text(photoNotice.message), findsOneWidget);
    expect(
      tester.widget<Image>(find.byType(Image).last).fit,
      BoxFit.contain,
    );
    expect(tester.takeException(), isNull);
  });
}
