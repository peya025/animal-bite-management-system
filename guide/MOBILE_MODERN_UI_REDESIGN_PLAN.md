# Mobile Modern UI Redesign Plan

## Goal

Redesign the Flutter mobile app using the supplied profile and settings screens as the visual base. The result should feel modern, clean, organized, and consistent without copying the reference exactly.

Keep the Animal Bite Center identity:

- Teal is the main action and active-state color.
- White and soft neutral gray create a calm clinical background.
- Information remains easy to scan and suitable for patients of different ages.
- Existing workflows and backend-ready data models must not change during the visual refactor.

## Main Design Direction

Use these ideas from the reference:

- A centered page title with a back icon on detail pages and one optional action icon on the right.
- Clear section titles followed by grouped rows.
- Soft neutral surfaces instead of heavy outlines and shadows.
- Compact profile summaries with avatar, name, relationship, and secondary information.
- Simple line icons with consistent size and stroke weight.
- A fixed bottom navigation bar with a clearly highlighted active destination.
- Generous white space between sections, but compact spacing inside groups.

Do not use the reference's pink accent. Use the clinic teal only for important actions, active navigation, progress, selected states, and useful status indicators.

## Shared Design Tokens

Define these centrally in `mobile/lib/app/app_theme.dart` or small supporting theme files.

### Colors

| Token | Suggested value | Use |
| --- | --- | --- |
| `primary` | Existing `#12AD9B` | Main actions and active states |
| `primaryDark` | Existing `#08766D` | Pressed states and high-emphasis text |
| `primarySoft` | `#E8F7F4` | Selected rows, chips, and subtle highlights |
| `surface` | `#FFFFFF` | Main page and input surfaces |
| `surfaceMuted` | `#F4F6F5` | Grouped settings and summary areas |
| `border` | `#DCE3E1` | Fields, dividers, and outlined actions |
| `textPrimary` | `#1F2937` | Titles and important values |
| `textSecondary` | `#6B7280` | Supporting descriptions |
| `success` | `#159A68` | Vaccination and completed statuses |
| `warning` | `#E58A2B` | Follow-up and attention statuses |
| `error` | Existing `#EF4444` | Errors and destructive actions |

### Shape

- Page horizontal padding: `20` or `24`.
- Cards and grouped surfaces: `8px` radius.
- Text fields and dropdowns: `12px` radius.
- Primary and secondary buttons: `12px` radius.
- Segmented controls and status chips may use a pill shape when it communicates selection or status.
- Icon button touch target: at least `44 x 44`.
- Input and main button height: `50-52`.

Rounded corners must be consistent. Avoid mixing many values such as 6, 10, 14, 18, and 24 on the same screen.

### Spacing

Use a simple spacing scale:

- `4`: icon and small-label spacing.
- `8`: closely related content.
- `12`: row padding and control gaps.
- `16`: standard component spacing.
- `24`: separation between page sections.
- `32`: separation between major form or page groups.

### Typography

- Use **Poppins** as the app-wide font family.
- Page title: `20px`, bold, centered.
- Section title: `17-18px`, semibold.
- Card/row title: `14px`, semibold.
- Body text: `13-14px`, regular.
- Helper text: `12px`, regular.
- Field label: `12px`, semibold; use sentence case where practical.
- Do not use negative letter spacing or viewport-scaled font sizes.

Bundle Poppins locally so the design does not depend on a network connection. Add these files under `mobile/assets/fonts/poppins/`:

- `Poppins-Regular.ttf` (`400`)
- `Poppins-Medium.ttf` (`500`)
- `Poppins-SemiBold.ttf` (`600`)
- `Poppins-Bold.ttf` (`700`)
- `Poppins-ExtraBold.ttf` (`800`)

Register the family in `mobile/pubspec.yaml`:

```yaml
flutter:
  fonts:
    - family: Poppins
      fonts:
        - asset: assets/fonts/poppins/Poppins-Regular.ttf
          weight: 400
        - asset: assets/fonts/poppins/Poppins-Medium.ttf
          weight: 500
        - asset: assets/fonts/poppins/Poppins-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/poppins/Poppins-Bold.ttf
          weight: 700
        - asset: assets/fonts/poppins/Poppins-ExtraBold.ttf
          weight: 800
```

Set `fontFamily: 'Poppins'` once in `AppTheme.light`. Avoid setting the family separately on individual widgets.

## Reusable Flutter Components

Create or improve shared components before redesigning individual pages.

| Component | Purpose | Suggested location |
| --- | --- | --- |
| `AppPageHeader` | Centered title, optional back and action icons | Existing `widgets/common/app_page_header.dart` |
| `AppTextField` | Uniform label, border, error, prefix/suffix, disabled state | `widgets/forms/app_text_field.dart` |
| `AppDropdownField` | Same shape and states as text fields, with overflow handling | `widgets/forms/app_dropdown_field.dart` |
| `PrimaryActionButton` | Teal filled command button with loading/disabled states | Existing button file |
| `SecondaryActionButton` | Neutral outlined command button | `widgets/buttons/secondary_action_button.dart` |
| `DestructiveActionButton` | Cancel/delete action with clear confirmation styling | `widgets/buttons/destructive_action_button.dart` |
| `SettingsGroup` | Muted grouped surface containing divider-separated rows | Existing settings file |
| `SettingsTile` | Leading icon, title, subtitle, optional badge, trailing chevron | Existing settings folder |
| `ProfileSummary` | Avatar, patient name, relationship, and edit action | Existing profile card file |
| `StatusChip` | Vaccination, consultation, follow-up, cancelled states | `widgets/common/status_chip.dart` |
| `EmptyState` | Icon, short message, and one relevant action | `widgets/common/empty_state.dart` |
| `AppBottomNavigation` | Stable navigation shared by all main destinations | Refactor existing menu navigation |

Use Material icons already available in Flutter. Choose the outlined/rounded family consistently, such as `person_outline_rounded`, `calendar_month_outlined`, `notifications_none_rounded`, and `settings_outlined`.

## Sign In and Sign Up

The two authentication pages must look like parts of the same form system.

### Layout

- Keep a maximum content width of about `360-400` for tablet and web preview.
- Use the same page padding, field width, labels, and vertical rhythm on both pages.
- Keep the login/sign-up segmented control at the top.
- Group account fields naturally; do not place every field in a separate card.
- Keep the primary action full width on small screens instead of an arbitrary narrow width.

### Fields

- Use a `12px` rounded border on every text field and dropdown.
- Default border: `1px` neutral gray.
- Focus border: `2px` teal.
- Error border and helper text: red, with the layout reserving enough room to avoid shifting nearby content unexpectedly.
- Disabled/read-only patient identity fields: muted fill, readable text, and a lock or profile icon when helpful.
- Use meaningful keyboard types, autofill hints, next/done actions, and password visibility buttons.
- Keep all field heights and internal padding consistent.

### Buttons

- Primary login/register button: full width, `50-52px` high, `12px` radius, teal fill.
- Social login buttons: same dimensions, white surface, neutral outline, correct provider icon.
- Loading state must keep the same button size.
- Disabled state must remain legible and clearly inactive.
- Text links such as password recovery and account switching remain text buttons, not filled pills.

### Authentication Files

- `mobile/lib/views/login_view.dart`
- `mobile/lib/views/sign_up_view.dart`
- `mobile/lib/widgets/auth_mode_selector.dart`
- `mobile/lib/widgets/buttons/primary_action_button.dart`
- `mobile/lib/widgets/buttons/social_auth_button.dart`
- `mobile/lib/widgets/buttons/account_login_prompt.dart`

## Menu and Home Page

Treat the home screen as a patient dashboard, not a marketing page.

- Use a compact greeting/profile row at the top with search and notification actions.
- Keep the clinic campaign visual prominent but controlled in height.
- Show the next appointment first because it is the patient's most time-sensitive information.
- Use one horizontal quick-action area for Book, Patient Profiles, Vaccination Card, and History.
- Keep working hours and awareness information in clean, separate sections.
- Make every appointment preview open the appointment list.
- Use badges for unread notifications and pending follow-ups.
- Keep the floating digital vaccination card action visually connected to the bottom navigation without covering content.

Refactor existing menu widgets instead of rebuilding them inside `menu_view.dart`.

## Booking and Appointments

- Use a centered header and a short progress indicator when booking has multiple steps.
- Patient, service, and date controls must share the same field border and radius.
- Calendar dates must have clear selected, unavailable, vaccination, consultation, and follow-up states.
- Use green for vaccination and orange for follow-up as already established.
- Show the booking summary in one compact muted surface before confirmation.
- Appointment cards must prioritize patient, service, date/time, and status.
- Put cancel/reschedule actions in a menu or clear secondary action area; require confirmation before cancellation.
- Long patient names must use ellipsis and never overflow dropdowns or cards.

## Notifications

- Use a centered `Notifications` header with an optional mark-all-read action.
- Keep filter controls compact and directly below the header.
- Group notifications by `Today`, `Earlier`, or another useful time label.
- Each row should use an icon based on type, title, short message, timestamp, and unread indicator.
- Unread rows may use `primarySoft`; read rows use white or muted neutral.
- Tapping a notification should open the related appointment, vaccination record, or profile when available.
- Keep notification cards flat and compact; avoid a separate floating card for every short message.

## History

- Place search and filters at the top under the centered header.
- Use status chips consistently for completed, upcoming, cancelled, and follow-up records.
- Present chronological records as compact rows/cards with strong date hierarchy.
- Empty results should show one calm empty state and a way to clear filters.

## Profile and Settings

Follow the supplied reference most closely on these screens.

### Profile

- Centered `Profile` title with settings icon on the right.
- Avatar, patient name, relationship, contact summary, and a small edit icon.
- Patient switcher for self, child, or dependent profiles.
- Quick summary tiles only for useful patient information such as upcoming visit and latest vaccination.
- Group personal information, emergency contact, address, and account access into labeled sections.
- Ensure the digital vaccination card always reflects the currently selected patient.

### Settings

- Centered `Settings` title with back navigation where appropriate.
- Compact signed-in account summary at the top.
- Group rows into `Account`, `Notifications`, `Privacy and Security`, and `Support`.
- Use switches for binary preferences and chevrons only for rows that open another page.
- Place logout separately near the bottom.
- Treat account deletion as a destructive action with confirmation, not as a normal settings row.

## Bottom Navigation

Use the same bottom navigation on Home, Book, History, and Settings.

- Keep destinations stable: Home, Book, Vaccination Card, History, Settings.
- Highlight the active icon and label in teal.
- Use muted gray for inactive destinations.
- Keep labels short and icon touch areas at least `44px`.
- Preserve bottom safe-area padding on gesture-navigation devices.
- The center vaccination card action may remain elevated, but it must not overlap page actions or obscure the final list item.

## Animation and Feedback

- Use short built-in Flutter transitions around `160-220ms`.
- Prefer subtle fade, slide, and size transitions.
- Avoid continuous decorative animation on data-heavy pages.
- Show skeletons or small progress indicators only while data is genuinely loading.
- Maintain stable widget sizes during loading to prevent layout shifts.
- Provide pressed, focused, disabled, loading, success, and error states for interactive controls.

## Implementation Order

1. Add the local Poppins assets and register Poppins as the app-wide font in the theme.
2. Add shared color, spacing, shape, typography, input, and button tokens to the app theme.
3. Build `AppTextField`, `AppDropdownField`, secondary button, status chip, and empty state components.
4. Refactor Sign In and Sign Up first to validate fields, buttons, errors, and responsive behavior.
5. Standardize the page header and bottom navigation.
6. Redesign Settings and Profile using grouped surfaces from the reference.
7. Redesign Home/Menu and its extracted components.
8. Apply the same system to Booking, Appointments, History, Notifications, and the vaccination card.
9. Remove duplicate page-specific colors, radii, shadows, and button styles.
10. Run responsive and accessibility verification before connecting additional backend behavior.

## Completion Checklist

- [x] Login and sign-up fields use one shared component and identical border behavior.
- [x] Poppins is bundled locally and applied globally through `AppTheme`.
- [ ] Primary, secondary, social, and destructive buttons have consistent dimensions and states.
- [ ] Every main page uses the same header and horizontal padding.
- [x] Settings and profile use organized grouped rows based on the reference.
- [x] Home uses a compact dashboard hierarchy with appointment and quick actions prioritized.
- [x] Booking uses shared patient fields, grouped services, a clear calendar, and a compact summary.
- [x] Home, Book, History, Notifications, and Settings share one bottom navigation.
- [ ] Cards use no more than an `8px` radius; fields and buttons use the agreed `12px` radius.
- [ ] Icons use one consistent Material icon family and size system.
- [ ] Text does not overflow at `320px`, `360px`, `390px`, or tablet widths.
- [ ] Layout works with large text scaling and keyboard display.
- [ ] Loading and disabled states do not resize controls.
- [ ] Patient selection is always visible on patient-specific screens.
- [ ] Vaccination cards, reminders, and appointment records show the correct selected patient.
- [ ] Flutter analysis and widget tests pass.
- [ ] Screens are visually checked on the TECNO phone and at least one emulator viewport.

## Definition of Done

The redesign is complete when the app feels like one product across authentication and all menu destinations, common controls come from shared widgets, no screen overflows on supported phone widths, and visual changes do not alter the existing patient, booking, vaccination, notification, or backend integration workflows.
