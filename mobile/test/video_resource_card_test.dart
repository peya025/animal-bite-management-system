import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/clinic_resource.dart';
import 'package:mobile/utils/video_thumbnail.dart';
import 'package:mobile/widgets/inline_video_player.dart';
import 'package:mobile/widgets/video_resource_card.dart';

void main() {
  group('VideoThumbnail.extractYoutubeId', () {
    test('extracts ID from standard watch URL', () {
      expect(
        VideoThumbnail.extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        'dQw4w9WgXcQ',
      );
    });

    test('extracts ID from youtu.be short URL', () {
      expect(
        VideoThumbnail.extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'),
        'dQw4w9WgXcQ',
      );
    });

    test('extracts ID from shorts URL', () {
      expect(
        VideoThumbnail.extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
        'dQw4w9WgXcQ',
      );
    });

    test('returns null for non-YouTube video files', () {
      expect(
        VideoThumbnail.extractYoutubeId('https://example.com/videos/orientation.mp4'),
        isNull,
      );
    });
  });

  group('VideoResourceCard', () {
    const testResource = ClinicResource(
      id: 10,
      type: ClinicResourceType.video,
      title: 'First Visit Orientation',
      subtitle: 'What to expect at the clinic',
      url: 'https://example.com/videos/guide.mp4',
      thumbnailUrl: null,
      durationLabel: '2:15',
    );

    const testResource2 = ClinicResource(
      id: 11,
      type: ClinicResourceType.video,
      title: 'Second Orientation Guide',
      subtitle: 'Wound care essentials',
      url: 'https://example.com/videos/guide2.mp4',
      thumbnailUrl: null,
      durationLabel: '1:45',
    );

    setUp(() {
      VideoResourceCard.activePlayingResourceId.value = null;
    });

    testWidgets('renders thumbnail preview initially with play button and labels', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: VideoResourceCard(resource: testResource),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('First Visit Orientation'), findsOneWidget);
      expect(find.text('What to expect at the clinic'), findsOneWidget);
      expect(find.text('2:15'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow_rounded), findsNWidgets(2)); // center button and bottom action
      expect(find.byType(InlineVideoPlayer), findsNothing);
    });

    testWidgets('calls onTapOverride when provided', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VideoResourceCard(
              resource: testResource,
              onTapOverride: () {
                tapped = true;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('First Visit Orientation'));
      await tester.pump();

      expect(tapped, isTrue);
      expect(find.byType(InlineVideoPlayer), findsNothing);
    });

    testWidgets('tapping play switches to inline video player', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: VideoResourceCard(resource: testResource),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap card to start playback
      await tester.tap(find.text('First Visit Orientation'));
      await tester.pump();

      expect(find.byType(InlineVideoPlayer), findsOneWidget);
      expect(VideoResourceCard.activePlayingResourceId.value, 10);
    });

    testWidgets('only one video card plays at a time', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  VideoResourceCard(resource: testResource),
                  VideoResourceCard(resource: testResource2),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Start playing Card 1
      await tester.tap(find.text('First Visit Orientation'));
      await tester.pump();

      expect(VideoResourceCard.activePlayingResourceId.value, 10);
      expect(find.byType(InlineVideoPlayer), findsOneWidget);

      // Start playing Card 2
      await tester.tap(find.text('Second Orientation Guide'));
      await tester.pump();

      expect(VideoResourceCard.activePlayingResourceId.value, 11);
      // Card 1 automatically reset, only Card 2 is playing
      expect(find.byType(InlineVideoPlayer), findsOneWidget);
    });
  });
}
