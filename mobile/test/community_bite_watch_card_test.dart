import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/community_bite_overview.dart';
import 'package:mobile/widgets/menu/community_bite_watch_card.dart';

CommunityBiteOverview overview({
  List<CommunityAdvisory> advisories = const [],
}) => CommunityBiteOverview(
  clinicName: 'Test Clinic',
  municipality: 'Example',
  status: 'caution',
  headline: 'Legacy unreviewed location warning',
  guidance: 'Contact the clinic for information.',
  elevatedAreas: const [
    ElevatedBiteArea(
      barangay: 'Example',
      municipality: 'Example',
      cautionLevel: 'elevated',
      label: 'Higher reports',
      notice: 'Unreviewed',
    ),
  ],
  vaccineAvailability: const CommunityVaccineAvailability(
    arvAvailable: true,
    rigAvailable: false,
    statusLabel: 'Check with clinic',
  ),
  disclaimer: 'Reports do not confirm rabies infection.',
  advisories: advisories,
);

void main() {
  testWidgets('ignores legacy area warnings and renders visible context', (
    tester,
  ) async {
    var booked = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: CommunityBiteWatchCard(
              userBarangay: 'Example',
              onBookVisit: () => booked = true,
              loadOverview: () async => overview(),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Community Bite Awareness'), findsOneWidget);
    expect(find.textContaining('Near you'), findsNothing);
    expect(find.text('Normal'), findsNothing);
    expect(find.text('Stay Cautious'), findsNothing);
    expect(find.text('Legacy unreviewed location warning'), findsNothing);
    expect(
      find.text('Reports do not confirm rabies infection.'),
      findsOneWidget,
    );
    expect(find.textContaining('No current clinic advisory'), findsOneWidget);
    expect(find.text('Contact or book a clinic visit'), findsNothing);
    expect(booked, isFalse);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'only shows unexpired reviewed advisories and clears on failed refresh',
    (tester) async {
      var fail = false;
      final data = overview(
        advisories: [
          CommunityAdvisory(
            title: 'Reviewed update',
            body: 'Generic prevention information',
            reviewedAt: DateTime.now(),
            expiresAt: DateTime.now().add(const Duration(days: 1)),
          ),
          CommunityAdvisory(
            title: 'Expired update',
            body: 'Old information',
            reviewedAt: DateTime.now(),
            expiresAt: DateTime.now().subtract(const Duration(days: 1)),
          ),
          CommunityAdvisory(
            title: 'Missing review',
            body: 'Unverified',
            reviewedAt: null,
            expiresAt: DateTime.now().add(const Duration(days: 1)),
          ),
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: CommunityBiteWatchCard(
                onBookVisit: () {},
                loadOverview: () async {
                  if (fail) throw Exception('Offline');
                  return data;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Reviewed update'), findsOneWidget);
      expect(find.text('Expired update'), findsNothing);
      expect(find.text('Missing review'), findsNothing);
      fail = true;
      await tester.tap(find.byTooltip('Refresh community updates'));
      await tester.pumpAndSettle();
      expect(find.text('Reviewed update'), findsNothing);
      expect(
        find.text('Community updates are temporarily unavailable.'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  test('malformed review and expiry dates fail closed', () {
    final item = CommunityAdvisory.fromJson({
      'title': 'Invalid',
      'reviewed_at': 'bad',
      'expires_at': 'bad',
    });
    expect(item.isCurrent, isFalse);
  });
}
