import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/community_bite_overview.dart';
import 'package:mobile/widgets/menu/community_bite_watch_card.dart';

void main() {
  testWidgets('renders caution areas and highlights matching user barangay', (
    tester,
  ) async {
    var tappedBook = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CommunityBiteWatchCard(
            userBarangay: 'Bal-ason',
            onBookVisit: () => tappedBook = true,
            loadOverview: () async => const CommunityBiteOverview(
              clinicName: 'Tagoloan ABTC',
              municipality: 'Tagoloan',
              status: 'caution',
              headline: 'Higher bite reports this week in Brgy. Bal-ason.',
              guidance: 'Keep pets leashed and avoid stray animals.',
              elevatedAreas: [
                ElevatedBiteArea(
                  barangay: 'Bal-ason',
                  municipality: 'Tagoloan',
                  cautionLevel: 'elevated',
                  label: 'Higher bite reports',
                  notice: 'Higher reports in Brgy. Bal-ason.',
                ),
              ],
              vaccineAvailability: CommunityVaccineAvailability(
                arvAvailable: true,
                rigAvailable: true,
                statusLabel: 'Anti-Rabies Vaccine & RIG Available',
              ),
              disclaimer: 'Facility surveillance notice.',
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Community Bite Watch'), findsOneWidget);
    expect(find.text('Stay Cautious'), findsOneWidget);
    expect(find.text('Brgy. Bal-ason (Near you)'), findsOneWidget);
    expect(find.text('Anti-Rabies Vaccine & RIG Available'), findsOneWidget);

    await tester.tap(find.text('Bitten or scratched? Book ABTC visit'));
    expect(tappedBook, isTrue);
  });

  testWidgets('renders calm normal state when no elevated areas exist', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CommunityBiteWatchCard(
            onBookVisit: () {},
            loadOverview: () async => const CommunityBiteOverview(
              clinicName: 'Tagoloan ABTC',
              municipality: 'Tagoloan',
              status: 'normal',
              headline: 'No unusual bite spikes reported in Tagoloan this week.',
              guidance: 'Keep pets vaccinated and leashed.',
              elevatedAreas: [],
              vaccineAvailability: CommunityVaccineAvailability(
                arvAvailable: true,
                rigAvailable: false,
                statusLabel: 'Anti-Rabies Vaccine Available',
              ),
              disclaimer: 'Facility surveillance notice.',
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Normal'), findsOneWidget);
    expect(
      find.text('No unusual bite spikes reported in Tagoloan this week.'),
      findsOneWidget,
    );
  });
}
