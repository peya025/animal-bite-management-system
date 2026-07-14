import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';

void main() {
  testWidgets('opens the login view from the welcome view', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());

    expect(find.text('ANIMAL BITE CENTER'), findsOneWidget);

    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    expect(find.text('LOGIN'), findsWidgets);
    expect(find.text('EMAIL'), findsOneWidget);
  });

  testWidgets('login form shows required field validation', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('LOGIN').last);
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('sign up tab opens the registration form', (tester) async {
    await tester.pumpWidget(const AnimalCareApp());
    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('SIGN UP'));
    await tester.pumpAndSettle();

    expect(find.text('FIRST NAME'), findsOneWidget);
    expect(find.text('LAST NAME'), findsOneWidget);
    expect(find.text('REGISTER'), findsOneWidget);
    expect(find.text('Have an account?'), findsOneWidget);
    expect(find.text('Log in'), findsOneWidget);
  });
}
