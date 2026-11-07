import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/clinic_resource.dart';
import 'package:mobile/services/resources_repository.dart';
import 'package:mobile/utils/external_link_launcher.dart';
import 'package:mobile/utils/video_thumbnail.dart';
import 'package:mobile/widgets/learn_more_section.dart';
import 'package:mobile/widgets/link_resource_card.dart';
import 'package:mobile/widgets/video_resource_card.dart';

void main() {
  group('ClinicResource model', () {
    test('falls back to link for unknown type and handles missing optionals', () {
      final resource = ClinicResource.fromJson(const {
        'id': '42',
        'type': 'podcast',
        'title': 'Rabies FAQ',
        'url': 'https://doh.gov.ph/rabies-faq',
      });

      expect(resource.id, 42);
      expect(resource.type, ClinicResourceType.link);
      expect(resource.title, 'Rabies FAQ');
      expect(resource.subtitle, isNull);
      expect(resource.thumbnailUrl, isNull);
      expect(resource.durationLabel, isNull);
      expect(resource.hasValidHttpsUrl, isTrue);
    });

    test('listFromJson skips empty, non-https, or placeholder URLs', () {
      final list = ClinicResource.listFromJson(const [
        {
          'id': 1,
          'type': 'video',
          'title': 'Valid HTTPS Video',
          'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        {
          'id': 2,
          'type': 'link',
          'title': 'Insecure HTTP Link',
          'url': 'http://doh.gov.ph/rabies',
        },
        {
          'id': 3,
          'type': 'link',
          'title': 'Empty URL',
          'url': '',
        },
        {
          'id': 4,
          'type': 'video',
          'title': 'Placeholder Seeder Video',
          'url': 'https://example.com/replace-with-clinic-orientation-video',
        },
      ]);

      expect(list.length, 1);
      expect(list.first.id, 1);
    });
  });

  group('VideoThumbnail helper', () {
    test('uses custom https thumbnail_url when provided', () {
      final thumb = VideoThumbnail.resolve(
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://cdn.example.com/custom-thumb.jpg',
      );
      expect(thumb, 'https://cdn.example.com/custom-thumb.jpg');
    });

    test('derives YouTube hqdefault thumbnail for watch, youtu.be, and shorts URLs', () {
      expect(
        VideoThumbnail.resolve(
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ),
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
      expect(
        VideoThumbnail.resolve(
          videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
        ),
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
      expect(
        VideoThumbnail.resolve(
          videoUrl: 'https://youtube.com/shorts/dQw4w9WgXcQ',
        ),
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
    });

    test('returns null for non-YouTube URL without thumbnail_url', () {
      expect(
        VideoThumbnail.resolve(
          videoUrl: 'https://vimeo.com/12345678',
        ),
        isNull,
      );
    });
  });

  group('LearnMoreSection widget', () {
    tearDown(() {
      ResourcesRepository.debugFetchOverride = null;
      debugExternalUrlLauncher = null;
    });

    testWidgets('hides completely when no active resources exist', (tester) async {
      final repo = ResourcesRepository(
        fetcher: () async => const {'data': <dynamic>[]},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LearnMoreSection(repository: repo),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('LEARN MORE'), findsNothing);
      expect(find.byType(VideoResourceCard), findsNothing);
      expect(find.byType(LinkResourceCard), findsNothing);
      expect(tester.getSize(find.byType(LearnMoreSection)).height, 0);
    });

    testWidgets('hides silently when API throws an error', (tester) async {
      final repo = ResourcesRepository(
        fetcher: () async => throw Exception('Network error'),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LearnMoreSection(repository: repo),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('LEARN MORE'), findsNothing);
      expect(tester.getSize(find.byType(LearnMoreSection)).height, 0);
    });

    testWidgets('renders video and link cards, domain host, and hides See all for <= 2 items', (tester) async {
      Uri? launchedUri;
      debugExternalUrlLauncher = (uri) async {
        launchedUri = uri;
        return true;
      };

      final repo = ResourcesRepository(
        fetcher: () async => const {
          'data': [
            {
              'id': 1,
              'type': 'video',
              'title': 'What to expect at your first ABTC visit',
              'subtitle': 'Orientation guide on wound washing',
              'url': 'https://example.com/orientation-video',
              'thumbnail_url': null,
              'duration_label': '3:45',
            },
            {
              'id': 2,
              'type': 'link',
              'title': 'DOH Rabies Prevention Program',
              'subtitle': null,
              'url': 'https://doh.gov.ph/health-programs/rabies',
              'thumbnail_url': null,
              'duration_label': null,
            },
          ],
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: LearnMoreSection(repository: repo),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('LEARN MORE'), findsOneWidget);
      expect(find.text('See all'), findsNothing);
      expect(find.text('Orientation video'), findsOneWidget);
      expect(find.text('3:45'), findsOneWidget);
      expect(find.text('What to expect at your first ABTC visit'), findsOneWidget);
      expect(find.text('Orientation guide on wound washing'), findsOneWidget);
      expect(find.text('DOH Rabies Prevention Program'), findsOneWidget);
      expect(find.text('doh.gov.ph'), findsOneWidget);

      await tester.tap(find.byType(LinkResourceCard));
      await tester.pump();
      expect(launchedUri?.toString(), 'https://doh.gov.ph/health-programs/rabies');
    });

    testWidgets('shows See all only when more than 2 active resources exist', (tester) async {
      final repo = ResourcesRepository(
        fetcher: () async => const {
          'data': [
            {
              'id': 1,
              'type': 'video',
              'title': 'Video 1',
              'url': 'https://example.com/v1',
            },
            {
              'id': 2,
              'type': 'link',
              'title': 'Link 2',
              'url': 'https://example.com/l2',
            },
            {
              'id': 3,
              'type': 'link',
              'title': 'Link 3',
              'url': 'https://example.com/l3',
            },
          ],
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: LearnMoreSection(repository: repo),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('See all'), findsOneWidget);
      expect(find.text('Link 3'), findsNothing);

      await tester.tap(find.text('See all'));
      await tester.pumpAndSettle();

      expect(find.text('Link 3'), findsOneWidget);
    });

    testWidgets('reloads resources when refreshTrigger increments and hides deleted or inactive items', (tester) async {
      var activeItems = <Map<String, dynamic>>[
        {
          'id': 1,
          'type': 'video',
          'title': 'Initial Video',
          'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      ];

      final repo = ResourcesRepository(
        fetcher: () async => {'data': activeItems},
      );

      var trigger = 0;
      late StateSetter setParentState;

      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (context, setState) {
              setParentState = setState;
              return Scaffold(
                body: SingleChildScrollView(
                  child: LearnMoreSection(
                    repository: repo,
                    refreshTrigger: trigger,
                  ),
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Initial Video'), findsOneWidget);

      activeItems = [
        {
          'id': 2,
          'type': 'link',
          'title': 'Updated Website Resource',
          'url': 'https://doh.gov.ph/updated',
        },
      ];
      setParentState(() => trigger++);
      await tester.pumpAndSettle();

      expect(find.text('Initial Video'), findsNothing);
      expect(find.text('Updated Website Resource'), findsOneWidget);

      activeItems = [];
      setParentState(() => trigger++);
      await tester.pumpAndSettle();

      expect(find.text('LEARN MORE'), findsNothing);
      expect(find.text('Updated Website Resource'), findsNothing);
    });
  });
}
