# Mobile Workflow Brief

**Date:** July 19, 2026  
**Project:** Animal Bite Management System

## Main Decision

One mobile account can manage multiple patient profiles.

Example:

- Parent account
- Parent profile (`self`)
- Child profile (`child`)
- Another person under their care (`dependent`)

The account is only used to log in. Appointments, bite records, vaccinations, and digital cards always belong to a specific patient profile.

## Mobile Workflow

### 1. Register and Log In

The mobile user creates a patient-side account using their name, email, phone, and password.

- Registration and login now connect to Laravel.
- Laravel Sanctum provides the authentication token.
- The token is stored using secure storage.
- Staff accounts and mobile patient accounts remain separate.

### 2. Create Patient Profiles

After registration, the user creates their first patient profile.

They can later add:

- Themselves
- A child
- A dependent

Profiles are created once and reused. The user does not enter the patient's identity again for every appointment.

### 3. Book an Appointment

The user:

1. Opens **Book**.
2. Selects the patient receiving care.
3. Selects consultation or vaccination.
4. Selects a date.
5. Completes the bite incident intake.
6. Submits the appointment.

Manual consultation and first-vaccination requests use the same intake because both are related to a new animal exposure.

### 4. Bite Incident Intake

The selected patient's first and last names are fetched automatically and disabled.

The patient reports:

- Date and place of the incident
- Bite, scratch, lick, or other exposure
- Dog, cat, or other animal
- Owned, stray, or unknown animal
- Whether the wound was washed
- Whether the animal was captured or available
- Wound location
- Short description of what happened

The mobile app does **not** ask the patient to determine severity or WHO category. Clinic staff must examine the wound and provide the official clinical assessment.

### 5. Clinic Review

The intake is automatically connected to:

- The selected patient
- The mobile account that submitted it
- The appointment
- The patient's clinic

Clinic staff can view pending intakes, review the answers, examine the wound, assign severity, and convert the intake into an official bite case.

When an official case requires vaccination, the backend can generate the follow-up vaccination schedule. Follow-up doses should not request the same intake again.

### 6. Appointment List and Cancellation

The Home page now displays the nearest scheduled appointment.

- Tapping the schedule card opens the appointment list.
- **View all** opens the same list.
- The list has Scheduled and All filters.
- Each entry shows patient, service, date, and status.
- Only scheduled appointments can be cancelled.
- A cancellation reason is optional.
- Cancelled appointments are kept for audit instead of being deleted.

### 7. Settings and Profiles

Settings now displays the real mobile account information.

The user can:

- View account name, email, and phone
- Edit account name and phone
- View managed patient profiles
- See self, child, or dependent relationships
- See pending or verified status
- Add another child or dependent
- Log out securely

Email is currently read-only because it is the login identifier.

## Backend Additions

The Laravel backend now includes:

- Separate `patient_accounts` authentication
- `patient_account_patient` relationships
- Structured patient names
- Patient profile verification status
- Patient-scoped appointment booking
- Patient-reported bite incident intakes
- Clinic intake review endpoints
- Appointment cancellation fields and endpoint
- Account-specific notifications
- Protected vaccination card access
- Clinic and patient authorization checks

Important mobile API routes include:

```text
POST  /api/mobile/register
POST  /api/mobile/login
GET   /api/mobile/me
PATCH /api/mobile/me
GET   /api/mobile/patients
POST  /api/mobile/patients
GET   /api/mobile/appointments
POST  /api/mobile/appointments
PATCH /api/mobile/appointments/{appointment}/cancel
GET   /api/mobile/notifications
GET   /api/mobile/patients/{patient}/vaccination-card
```

Staff intake routes include:

```text
GET  /api/bite-intakes
GET  /api/bite-intakes/{intake}
POST /api/bite-intakes/{intake}/reviewed
```

## Mobile Additions

The Flutter app now includes:

- Real Laravel registration and login
- Secure token storage
- Self, child, and dependent profiles
- Live account profile in Settings
- Patient selection during booking
- Bite incident intake form
- Disabled patient identity fields in the intake
- Real appointment submission
- Live upcoming appointment on Home
- Appointment list and cancellation
- Smooth route transitions

## Still Demo or Pending

These areas still need full backend connection or UI work:

- Clinic web page for reviewing pending mobile intakes
- Live notification list in Flutter
- Live digital vaccination card and QR content
- Live history page
- Password change and forgot-password workflow
- Persistent notification preferences
- Clinic appointment availability and capacity rules

## Current Verification

- Laravel: **7 tests passed, 36 assertions**
- Flutter: **13 tests passed**
- Flutter analyzer: **No issues found**

## Continue Tomorrow

Apply pending migrations:

```powershell
cd backend
php artisan migrate
```

If the earlier failed patient migration left a partial development table, use the following only when it is safe to erase development data:

```powershell
php artisan migrate:fresh --seed
```

Start Laravel:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Flutter web uses this API by default:

```text
http://127.0.0.1:8000/api/mobile
```

For the Android Emulator:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/mobile
```

## Suggested Next Task

Build the clinic web **Pending Bite Intakes** page so registration or triage staff can review mobile submissions and convert them into official bite cases.
