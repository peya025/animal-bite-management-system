import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/booking/date_selector.dart';

void main() {
  testWidgets('DateSelector test tapping disabled day', (tester) async {
    DateTime selected = DateTime(2026, 11, 16); // Monday

    final exceptions = {
      '2026-11-17': {'is_open': false, 'reason': 'National Holiday'},
    };

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DateSelector(
            selectedDate: selected,
            openDaysOfWeek: const [1, 2, 3, 4, 5],
            exceptions: exceptions,
            onSelected: (date) => selected = date,
          ),
        ),
      ),
    );

    await tester.tap(find.text('17'));
    await tester.pumpAndSettle();

    print('SELECTED AFTER TAPPING 17: $selected');
    expect(selected.day, 16, reason: 'Disabled day should NOT be selectable!');

    // Verify holiday day 17 text is red Color(0xFFDC2626)
    final textFinder = find.text('17');
    expect(textFinder, findsOneWidget);
    final textWidget = tester.widget<Text>(textFinder);
    expect(textWidget.style?.color, const Color(0xFFDC2626));

    // Verify SnackBar was triggered
    expect(find.text('Clinic closed: National Holiday'), findsOneWidget);
  });
}
