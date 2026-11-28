import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app_routes.dart';
import 'package:mobile/models/community_bite_overview.dart';
import 'package:mobile/services/push_notification_service.dart';
import 'package:mobile/views/community_advisory_view.dart';
import 'package:mobile/widgets/menu/community_bite_watch_card.dart';

void main() {
  testWidgets(
    'CommunityAdvisoryView renders active official advisory with source and disclaimer',
    (tester) async {
      final now = DateTime.now().toUtc();
      await tester.pumpWidget(
        MaterialApp(
          home: CommunityAdvisoryView(
            advisoryId: 42,
            onBookVisit: () {},
            loadDetail: (id) async => CommunityAdvisoryDetailResult(
              status: 'active',
              advisory: CommunityAdvisory(
                id: id,
                revision: 3,
                advisoryType: 'official_health_advisory',
                title: 'Official Rabies Prevention Notice',
                body: 'Wash bite wounds with soap and water and visit the clinic.',
                reviewedAt: now.subtract(const Duration(hours: 1)),
                expiresAt: now.add(const Duration(days: 5)),
                source: const CommunityAdvisorySource(
                  authority: 'Department of Health',
                  reference: 'https://doh.gov.ph/advisories/2026-01',
                  issuedOn: '2026-11-26',
                  geographyNote: 'Municipality-wide',
                ),
              ),
              disclaimer:
                  'Facility-reviewed clinic guidance only. Reports of animal bites do not by themselves confirm rabies infection.',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Official health advisory'), findsOneWidget);
      expect(find.text('Official Rabies Prevention Notice'), findsOneWidget);
      expect(find.text('Official source attribution'), findsOneWidget);
      expect(find.textContaining('Department of Health'), findsOneWidget);
      expect(
        find.textContaining('do not by themselves confirm rabies infection'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'CommunityAdvisoryView shows neutral tombstone on withdrawn 410 response',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: CommunityAdvisoryView(
            advisoryId: 42,
            onBookVisit: () {},
            loadDetail: (_) async => const CommunityAdvisoryDetailResult(
              status: 'withdrawn',
              message:
                  'This clinic advisory is no longer active. Check current clinic guidance if you need help.',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.textContaining('This clinic advisory is no longer active'),
        findsOneWidget,
      );
      expect(find.textContaining('no cases'), findsNothing);
    },
  );

  testWidgets(
    'CommunityAdvisoryView refuses to display locally expired advisory',
    (tester) async {
      final past = DateTime.now().toUtc().subtract(const Duration(days: 2));
      await tester.pumpWidget(
        MaterialApp(
          home: CommunityAdvisoryView(
            advisoryId: 99,
            onBookVisit: () {},
            loadDetail: (id) async => CommunityAdvisoryDetailResult(
              status: 'active',
              advisory: CommunityAdvisory(
                id: id,
                title: 'Expired Notice',
                body: 'Should never be rendered as active.',
                reviewedAt: past.subtract(const Duration(days: 1)),
                expiresAt: past,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Expired Notice'), findsNothing);
      expect(find.textContaining('no longer active'), findsOneWidget);
    },
  );

  testWidgets(
    'CommunityAdvisoryView shows safe unavailable state on fetch failure',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: CommunityAdvisoryView(
            advisoryId: 42,
            onBookVisit: () {},
            loadDetail: (_) async => throw Exception('network offline'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.textContaining('temporarily unavailable'),
        findsOneWidget,
      );
      expect(
        find.textContaining('does not mean an area is free of risk'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'CommunityBiteWatchCard supports multi-clinic switching and opens full advisory',
    (tester) async {
      final now = DateTime.now().toUtc();
      int? selectedClinic;
      CommunityAdvisory? opened;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: CommunityBiteWatchCard(
                onBookVisit: () {},
                clinicId: 1,
                clinics: const [
                  PublicClinicOption(id: 1, name: 'Clinic One'),
                  PublicClinicOption(id: 2, name: 'Clinic Two'),
                ],
                onClinicChanged: (id) => selectedClinic = id,
                onOpenAdvisory: (advisory) => opened = advisory,
                loadOverview: () async => CommunityBiteOverview(
                  clinicName: selectedClinic == 2 ? 'Clinic Two' : 'Clinic One',
                  municipality: 'Tagoloan',
                  status: 'information',
                  headline: 'Community Bite Awareness',
                  guidance: 'Wash wounds promptly.',
                  elevatedAreas: const [],
                  vaccineAvailability: const CommunityVaccineAvailability(
                    arvAvailable: true,
                    rigAvailable: true,
                    statusLabel: 'Check with clinic',
                  ),
                  disclaimer: 'Reviewed clinic guidance.',
                  advisories: [
                    CommunityAdvisory(
                      id: 77,
                      advisoryType: 'official_health_advisory',
                      title: 'Official Update',
                      body: 'Read clinic guidance.',
                      reviewedAt: now.subtract(const Duration(hours: 2)),
                      expiresAt: now.add(const Duration(days: 3)),
                      source: const CommunityAdvisorySource(
                        authority: 'DOH Region X',
                        reference: 'https://doh.gov.ph/1',
                        issuedOn: '2026-11-26',
                        geographyNote: 'Clinic municipality',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('DOH Region X'), findsOneWidget);
      await tester.tap(find.text('Read full advisory'));
      await tester.pumpAndSettle();
      expect(opened?.id, 77);

      await tester.tap(find.byType(DropdownButtonFormField<int>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Clinic Two').last);
      await tester.pumpAndSettle();
      expect(selectedClinic, 2);
      expect(find.text('Clinic Two'), findsWidgets);
    },
  );

  test(
    'PushNotificationService routes community_advisory safely with allowlisted validation',
    () {
      final service = PushNotificationService.instance;
      expect(
        service.resolveRouteFromPayload({
          'category': 'community_advisory',
          'advisory_id': '42',
        }),
        AppRoutes.communityAdvisory,
      );
      expect(
        service.resolveRouteFromPayload({
          'category': 'community_advisory',
          'advisory_id': 'invalid',
        }),
        AppRoutes.menu,
      );
      expect(
        service.resolveRouteFromPayload({
          'route': AppRoutes.communityAdvisory,
          'advisory_id': '42',
        }),
        AppRoutes.communityAdvisory,
      );
    },
  );
}
