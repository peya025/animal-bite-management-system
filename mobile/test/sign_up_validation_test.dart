import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/utils/app_validators.dart';
import 'package:mobile/views/sign_up_view.dart';

void main() {
  group('AppValidators cautions and rules', () {
    test('email validator cautions', () {
      expect(AppValidators.email(null, required: true), 'Email address is required.');
      expect(AppValidators.email('', required: true), 'Email address is required.');
      expect(AppValidators.email('pia@', required: true), 'Enter a valid email address (e.g. name@example.com).');
      expect(AppValidators.email('pia@gmail', required: true), 'Enter a valid email address (e.g. name@example.com).');
      expect(AppValidators.email('pia @gmail.com', required: true), 'Email address cannot contain spaces.');
      expect(AppValidators.email('pia@gmail.com', required: true), isNull);
    });

    test('name validator cautions', () {
      expect(AppValidators.name(null, 'First name', required: true), 'First name is required.');
      expect(AppValidators.name('', 'First name', required: true), 'First name is required.');
      expect(AppValidators.name('A', 'First name', required: true), 'First name must be at least 2 characters.');
      expect(AppValidators.name('John123', 'First name', required: true), 'First name should only contain letters, spaces, and hyphens.');
      expect(AppValidators.name('Juan-Carlos', 'First name', required: true), isNull);
      expect(AppValidators.name('Dela Cruz', 'Last name', required: true), isNull);
    });

    test('mobile number validator cautions', () {
      expect(AppValidators.phMobile(null, required: true), 'Mobile number is required.');
      expect(AppValidators.phMobile('', required: true), 'Mobile number is required.');
      expect(AppValidators.phMobile('1234567890', required: true), 'Mobile number must start with 9 (e.g. 9XX XXX XXXX).');
      expect(AppValidators.phMobile('912345', required: true), 'Enter a valid 10-digit mobile number (e.g. 9XX XXX XXXX).');
      expect(AppValidators.phMobile('9171234567', required: true), isNull);
      expect(AppValidators.phMobile('09171234567', required: true), isNull);
    });

    test('password and confirm password validator cautions', () {
      expect(AppValidators.password(null, required: true), 'Password is required.');
      expect(AppValidators.password('', required: true), 'Password is required.');
      expect(AppValidators.password('short', required: true, minLength: 8), 'Password must be at least 8 characters long.');
      expect(AppValidators.password('password123', required: true, minLength: 8), isNull);

      expect(AppValidators.confirmPassword(null, 'password123'), 'Please confirm your password.');
      expect(AppValidators.confirmPassword('', 'password123'), 'Please confirm your password.');
      expect(AppValidators.confirmPassword('different123', 'password123'), 'Passwords do not match.');
      expect(AppValidators.confirmPassword('password123', 'password123'), isNull);
    });
  });

  group('SignUpView selective blur cautions', () {
    testWidgets('shows blur caution on email, phone, password but NOT on firstname/lastname', (tester) async {
      tester.view.physicalSize = const Size(400, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: SignUpView(),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Email blur caution
      final emailInput = find.widgetWithText(TextFormField, 'you@example.com');
      await tester.tap(emailInput);
      await tester.pumpAndSettle();
      await tester.enterText(emailInput, 'pia');
      await tester.pumpAndSettle();

      // While in email, no caution
      expect(find.text('Enter a valid email address (e.g. name@example.com).'), findsNothing);

      // Click Last Name -> Email caution pops up
      final lastNameInput = find.widgetWithText(TextFormField, 'Doe');
      await tester.tap(lastNameInput);
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email address (e.g. name@example.com).'), findsOneWidget);

      // 2. Last Name & First Name do NOT show blur caution when clicked and blurred
      final firstNameInput = find.widgetWithText(TextFormField, 'Jane');
      await tester.tap(firstNameInput);
      await tester.pumpAndSettle();
      expect(find.text('Last name is required.'), findsNothing);

      final phoneInput = find.widgetWithText(TextFormField, '9XX XXX XXXX');
      await tester.tap(phoneInput);
      await tester.pumpAndSettle();
      expect(find.text('First name is required.'), findsNothing);

      // 3. Mobile Number blur caution
      await tester.enterText(phoneInput, '1234');
      await tester.pumpAndSettle();

      final passwordInput = find.widgetWithText(TextFormField, '••••••••').first;
      await tester.tap(passwordInput);
      await tester.pumpAndSettle();
      expect(find.text('Mobile number must start with 9 (e.g. 9XX XXX XXXX).'), findsOneWidget);

      // 4. Password blur caution
      await tester.enterText(passwordInput, '123');
      await tester.pumpAndSettle();

      final confirmInput = find.widgetWithText(TextFormField, '••••••••').last;
      await tester.tap(confirmInput);
      await tester.pumpAndSettle();
      expect(find.text('Password must be at least 8 characters long.'), findsOneWidget);

      // 5. On Submit, firstname and lastname also validate
      await tester.ensureVisible(find.text('CREATE ACCOUNT'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('CREATE ACCOUNT'));
      await tester.pumpAndSettle();

      expect(find.text('Last name is required.'), findsOneWidget);
      expect(find.text('First name is required.'), findsOneWidget);
    });
  });
}
