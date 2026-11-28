# UI Test Guide: Cycle 11 – Mobile Location & PSGC Lookups

## Objective
Verify the end-to-end functionality of mobile GPS/clinic geographic context, Philippine Standard Geographic Code (PSGC) municipality queries, and barangay lookups following the refactoring of `MobileLocationController.php`.

---

## Target Endpoints Verified
- `GET /api/mobile/locations/context` (Get clinic province, municipality, and resolved PSGC code)
- `GET /api/mobile/locations/municipalities` (Get cities and municipalities within clinic's province)
- `GET /api/mobile/locations/barangays` (Get barangays for a specified municipality code)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`).
2. An active Patient Account token (issued via `/api/mobile/login` or seeded mobile test account).

---

## Step-by-Step Test Procedure

### 1. Retrieve Clinic Location Context
1. From the mobile app or API client authenticated with a `PatientAccount` bearer token:
2. Request `GET /api/mobile/locations/context` (or `GET /api/mobile/locations/context?clinic_id=1`).
3. **Expected Result:**
   - Returns HTTP 200 OK with:
     ```json
     {
       "clinic_id": 1,
       "clinic_name": "Tagoloan Animal Bite Treatment Center",
       "province": "Misamis Oriental",
       "province_code": "104300000",
       "municipality": "Tagoloan"
     }
     ```
   - If the patient account has a linked patient record, the clinic context resolves automatically without an explicit query parameter.

---

### 2. Retrieve Municipalities for Clinic Province
1. Request `GET /api/mobile/locations/municipalities` (or with `?clinic_id=1`).
2. **Expected Result:**
   - Returns HTTP 200 OK with:
     ```json
     {
       "clinic_id": 1,
       "province": "Misamis Oriental",
       "province_code": "104300000",
       "data": [
         { "code": "...", "name": "Tagoloan" },
         { "code": "...", "name": "Cagayan de Oro City" },
         ...
       ]
     }
     ```
   - The mobile address dropdown is populated with cities and municipalities located in the clinic's province.

---

### 3. Retrieve Barangays for Selected Municipality
1. In the mobile registration/intake form, select a municipality (e.g. Tagoloan, code `104319000`).
2. The client fetches `GET /api/mobile/locations/barangays?municipality_code=104319000`.
3. **Expected Result:**
   - Returns HTTP 200 OK with:
     ```json
     {
       "data": [
         { "code": "...", "name": "Baluarte" },
         { "code": "...", "name": "Poblacion" },
         ...
       ]
     }
     ```
   - The barangay dropdown populates with official PSGC barangays.

---

### 4. Input Validation & Access Control
1. Send `GET /api/mobile/locations/barangays` without `municipality_code`.
   - **Expected Result:** HTTP 422 with validation error on `municipality_code`.
2. Authenticate as clinic staff (User model) and attempt to access mobile location endpoints.
   - **Expected Result:** HTTP 403 Forbidden with *"Patient account authentication is required."*.

---

## Verification Summary
- **Zero regressions:** Response contracts for context, municipalities, and barangays strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Mobile/MobileLocationCharacterizationTest.php` passes 8/8 tests (34 assertions).
- **Full Suite pass:** 191 total characterization tests passing (1016 assertions) across Person 1 and Person 4.
- **Frontend compatibility:** Full build passes with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
