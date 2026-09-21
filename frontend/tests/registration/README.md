# Patient Registration Form 1

The registration dialog uses a row-by-row two-column grid at 600px and wider, and a single column below 600px. Styling is scoped by RegistrationDialog; the patient service, address hook, validation rules, and payload mapping remain unchanged.

## Keyboard behavior
- Enter in an ordinary text/telephone/email/number field advances to the next visible, enabled field in DOM/visual order.
- The final ordinary field can save through the existing validation path.
- Native selects, radio groups, dates, textareas, datalists, IME composition, and modified key presses keep their normal Enter behavior.
- Tab and Shift+Tab retain normal order and remain inside the dialog.
- Save uses the same validation path; errors retain the entered values and focus the first visible invalid control.
- Labels are associated with inputs; required status and field errors are exposed to assistive technology.

## Verification
From frontend, with Google Chrome installed:
```powershell
npm run test:registration
npm run build
```
The Playwright configuration starts Vite on port 4178. The separate test harness and mocked API/address requests do not create real patient records and are not entry points in the production build.

The browser checks cover keyboard navigation, native controls, client/server errors, retained values, dependent addresses, final-field saving and queue payloads, five viewport sizes, and dark-theme text contrast. Browser artifacts are ignored by Git.

## Relevant files
- src/features/patients/components/AddPatientModal/AddPatientModal.tsx
- src/features/patients/components/AddPatientModal/RegistrationDialog.styles.ts
- src/features/patients/components/AddPatientModal/RegistrationAddressSection.tsx
- src/features/patients/components/AddPatientModal/registrationAccessibility.ts
- tests/registration/registration.spec.ts
