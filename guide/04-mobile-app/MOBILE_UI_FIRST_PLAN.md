# Flutter Mobile Application UI-First Plan

## Goal

Build a usable mobile companion for the Animal Bite Management System in Flutter. Complete and validate the user interface with mock data first, then connect it to the Laravel API.

The first release should prioritize clinic staff workflows on Android. Keep iOS compatibility, but use Android as the main development and testing target on Windows.

## Current Starting Point

- A Flutter project already exists in `mobile/`.
- The project currently contains a landing page and a demo login screen.
- `pubspec.yaml` currently uses only Flutter, Cupertino Icons, and Flutter lints.
- The Laravel API already supports authentication, patients, bite cases, vaccinations, inventory, and queues.
- Backend roles are `admin`, `registration`, `triage`, and `treatment`.
- The shared design guide uses mint green (`#10B981`) while the current mobile screens use lime green (`#84CC16`). Standardize the mobile UI on the shared mint theme before creating more screens.

## 1. Install and Verify First

### Required tools

1. Install the latest stable Flutter SDK compatible with Dart `^3.12.1`.
2. Install Android Studio.
3. In Android Studio, install:
   - Android SDK
   - Android SDK Platform Tools
   - Android SDK Command-line Tools
   - Android Emulator
4. Install the Flutter and Dart extensions in VS Code or the IDE being used.
5. Create an Android emulator, preferably a current Pixel profile with a current stable API level.
6. Accept Android licenses and verify the toolchain:

```powershell
flutter doctor
flutter doctor --android-licenses
flutter devices
```

### Verify the existing project

Run these commands before changing the application:

```powershell
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run
```

Do not install application packages until the existing scaffold runs successfully.

## 2. Packages to Add

Add packages by capability when that capability is implemented. Avoid installing the entire list on day one.

### UI foundation phase

```powershell
flutter pub add flutter_riverpod go_router intl
flutter pub add --dev mocktail
```

| Package | Purpose |
|---|---|
| `flutter_riverpod` | Predictable screen and application state |
| `go_router` | Named routes, guarded routes, and role-based navigation |
| `intl` | Clinic-friendly dates and formatted values |
| `mocktail` | Unit and widget test mocks |

### API integration phase

```powershell
flutter pub add dio flutter_secure_storage connectivity_plus
```

| Package | Purpose |
|---|---|
| `dio` | Laravel API requests, interceptors, and error handling |
| `flutter_secure_storage` | Store the Sanctum bearer token securely |
| `connectivity_plus` | Show connection state and support retry behavior |

### Device features phase

Install only after the related UI and workflow are approved:

```powershell
flutter pub add image_picker permission_handler
```

Notifications and offline storage need a separate design decision. Choose their packages only when notification ownership and offline conflict rules are defined.

## 3. UI-First Rules

- Use mock repositories and realistic fixture data; do not call the backend during the initial UI phase.
- Build the actual staff workspace as the first authenticated screen, not a marketing landing page.
- Use Material 3 and one shared theme instead of screen-level color constants.
- Use the system font and the spacing scale from `guide/DESIGN_SYSTEM.md`.
- Use mint as the primary color, neutral surfaces for information density, and semantic colors for status.
- Keep card radius at 8 px or less for operational screens.
- Use at least 44 x 44 logical pixels for touch targets.
- Support loading, empty, error, offline, disabled, and success states on every data screen.
- Design for small phones first, then verify larger phones and tablets.
- Keep destructive actions behind confirmation dialogs.
- Never use color as the only indication of queue, case, or vaccination status.

## 4. Proposed Project Structure

Use a feature-first structure so UI prototypes can later receive API repositories without rewriting screens.

```text
mobile/lib/
|-- app/
|   |-- app.dart
|   |-- router.dart
|   `-- theme/
|-- core/
|   |-- constants/
|   |-- errors/
|   |-- network/
|   `-- widgets/
|-- features/
|   |-- auth/
|   |-- dashboard/
|   |-- patients/
|   |-- bite_cases/
|   |-- vaccinations/
|   |-- queue/
|   |-- inventory/
|   `-- profile/
|-- shared/
|   |-- models/
|   `-- fixtures/
`-- main.dart
```

Within each feature, add only the folders it needs: `presentation`, `application`, `domain`, and `data`. During UI prototyping, `presentation` and mock `data` are enough.

## 5. Navigation Plan

### Unauthenticated

- Splash/session check
- Sign in
- Forgot password placeholder only if the backend workflow is confirmed

### Authenticated shell

Use a bottom navigation bar for the most frequent destinations and an overflow/profile menu for less frequent tools.

| Role | Primary destinations |
|---|---|
| Registration | Dashboard, Patients, Queue, Profile |
| Triage | Dashboard, Queue, Cases, Profile |
| Treatment | Dashboard, Vaccinations, Patients, Profile |
| Admin | Dashboard, Patients, Queue, More |

The admin `More` screen can contain cases, vaccinations, inventory, staff, clinic settings, and profile. Route guards must hide and block actions that a role cannot perform.

## 6. Screen Build Order

### Phase 0: UI inventory and wireframes

- [ ] Confirm whether the mobile app is staff-only or will later include a patient account.
- [ ] List each role's three most frequent tasks.
- [ ] Sketch compact wireframes for phone widths of 360 and 412 logical pixels.
- [ ] Define status vocabulary for queue, bite case, and vaccination records.
- [ ] Confirm required fields against Laravel request validation.

### Phase 1: Design foundation

- [ ] Move colors, typography, spacing, radii, and component themes into `app/theme/`.
- [ ] Create reusable app bar, search field, status chip, empty state, error state, loading skeleton, confirmation dialog, and form controls.
- [ ] Add light theme first; defer dark mode unless it is a requirement.
- [ ] Add a small widget gallery screen for visual review during development.

### Phase 2: Authentication and app shell

- [ ] Replace the demo landing-first flow with splash/session check and sign in.
- [ ] Use email and password labels that match the `/api/login` contract.
- [ ] Create the authenticated scaffold, bottom navigation, overflow menu, and logout confirmation.
- [ ] Prototype role switching with mock users.
- [ ] Build invalid credentials, validation, loading, and network error states.

### Phase 3: Dashboard

- [ ] Show role-relevant work for today rather than decorative statistics.
- [ ] Add quick actions based on permission.
- [ ] Show queue counts, vaccinations due/overdue, and recent cases as applicable.
- [ ] Make every summary item open its corresponding filtered list.

### Phase 4: Patient workflow

- [ ] Patient list with search, filters, pagination/loading, and empty state.
- [ ] Patient details with profile, bite cases, and vaccination history tabs.
- [ ] Registration form split into short, logical sections.
- [ ] Edit and delete flows according to role permissions.
- [ ] Success receipt showing the generated patient number.

### Phase 5: Queue and triage workflow

- [ ] Queue list with waiting, called, completed, cancelled, and priority states.
- [ ] Add patient to queue and adjust priority.
- [ ] Call next patient and complete queue entry.
- [ ] Bite case form with exposure, animal, wound, and treatment sections.
- [ ] Case details with generated vaccination schedule.

### Phase 6: Vaccination workflow

- [ ] Today, upcoming, and overdue tabs.
- [ ] Vaccination details with patient and bite case context.
- [ ] Administer dose, record batch/details, mark missed, and reschedule dialogs.
- [ ] Clear confirmation and success states for clinical actions.

### Phase 7: Admin tools

- [ ] Inventory list, low-stock state, stock adjustment, and transaction history.
- [ ] Staff list and invitation flow.
- [ ] Clinic profile and setup status.
- [ ] Keep dense administrative forms responsive on phones and tablets.

## 7. Mock Data Strategy

Create fixtures for each important state:

- A patient with no bite cases
- A patient with multiple cases
- Normal and high-priority queue entries
- Called, completed, and cancelled queue entries
- Scheduled, completed, missed, overdue, and rescheduled vaccinations
- In-stock, low-stock, and out-of-stock inventory items
- One user fixture for every role
- Long names, long addresses, missing optional values, and large result lists

Expose fixtures through repository interfaces. The UI should depend on those interfaces so mock repositories can later be replaced by API repositories.

## 8. UI Approval Gate

Do not begin API integration until these conditions pass:

- [ ] All priority workflows are navigable using mock data.
- [ ] Role-specific destinations and actions are correct.
- [ ] Screens work at 360 x 640 and 412 x 915 logical pixels without overflow.
- [ ] Keyboard, back navigation, dialogs, and form validation behave correctly.
- [ ] Loading, empty, error, and offline designs are approved.
- [ ] Text contrast and touch target sizes meet accessibility requirements.
- [ ] Widget tests cover shared controls and the main happy-path workflows.
- [ ] Stakeholders approve screenshots or an emulator walkthrough.

## 9. API Integration Order

Connect one vertical workflow at a time:

1. Configure the API base URL with `--dart-define`, not a committed environment secret.
2. Add `Dio`, response parsing, timeouts, and a common API error model.
3. Implement login, secure token storage, `/me`, logout, and expired-session handling.
4. Connect patient list, details, registration, and editing.
5. Connect queue actions.
6. Connect bite cases and vaccination schedules.
7. Connect vaccination administration and rescheduling.
8. Connect admin inventory and staff tools.

Development base URLs:

```text
Android emulator: http://10.0.2.2:8000/api
iOS simulator:    http://127.0.0.1:8000/api
Physical device:  http://<computer-lan-ip>:8000/api
```

Example run command:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api
```

Never place credentials or bearer tokens in source code, logs, or mock screenshots.

## 10. Testing and Definition of Done

For every feature:

- [ ] Run `dart format .`.
- [ ] Run `flutter analyze` with no new warnings.
- [ ] Run `flutter test`.
- [ ] Add widget tests for validation, loading, error, empty, and success behavior.
- [ ] Test allowed and forbidden actions for every relevant role.
- [ ] Verify on an Android emulator and at least one physical Android device before release.
- [ ] Verify slow network, no network, token expiration, and repeated-submit behavior after API integration.

A screen is done only when it is responsive, accessible, permission-aware, tested, and connected to either an approved mock repository or the real API repository for its current phase.

## Recommended First Milestone

Deliver a clickable UI prototype containing:

1. Shared Material 3 theme and reusable controls
2. Sign in and mock role selection
3. Role-aware authenticated navigation
4. Dashboard
5. Patient list and patient details
6. Patient registration form
7. Queue list
8. Loading, empty, error, and confirmation states

This milestone gives registration staff a complete visual workflow and establishes patterns that triage, treatment, and admin features can reuse.
