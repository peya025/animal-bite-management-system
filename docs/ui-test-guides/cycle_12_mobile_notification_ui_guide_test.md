# UI Test Guide: Cycle 12 – Mobile Notification Feed & Read Markers

## Objective
Verify the end-to-end functionality of the mobile patient notification center, paginated alerts, family member relationship resolution, single-item read markers, and bulk read markers following the refactoring of `MobileNotificationController.php`.

---

## Target Endpoints Verified
- `GET /api/mobile/notifications` (Paginated notifications with relationship tagging and 2-minute caching)
- `PATCH /api/mobile/notifications/{id}/read` (Mark specific notification as read, cache invalidation)
- `PATCH /api/mobile/notifications/read-all` (Mark all unread notifications as read, cache invalidation)

---

## Prerequisites
1. Local development backend running (`http://127.0.0.1:8000`).
2. Logged in mobile patient account with at least one linked patient profile (e.g. self or child).

---

## Step-by-Step Test Procedure

### 1. View Notification Feed
1. Open the mobile application and tap the **Notification Bell** icon in the header or drawer.
2. The app requests `GET /api/mobile/notifications?page=1`.
3. **Expected Result:**
   - Returns HTTP 200 OK with paginated notification objects.
   - Each item includes `notification_id`, `title`, `message`, `status` (`unread` or `read`), `created_at`, and `relationship` (`self`, `child`, `spouse`, etc.).
   - Notifications tied to family dependents clearly indicate their relationship pill/badge.

---

### 2. Mark Single Notification as Read
1. Tap an unread notification card in the feed or swipe to acknowledge.
2. The app sends `PATCH /api/mobile/notifications/{id}/read`.
3. **Expected Result:**
   - Returns HTTP 200 OK with the updated notification object (`status: "read"` and populated `read_at`).
   - The card in the UI visually transitions to the read state (lighter background, unread dot disappears).
   - Cache for page 1 is invalidated so re-fetching reflects the updated status.

---

### 3. Mark All Notifications as Read
1. Tap the **Mark All as Read** button in the notification screen action bar.
2. The app sends `PATCH /api/mobile/notifications/read-all`.
3. **Expected Result:**
   - Returns HTTP 200 OK with `{"message": "All notifications marked as read."}`.
   - All notification cards switch to read state.
   - The unread badge count on the main header bell icon resets to 0.

---

### 4. Cross-Account Isolation & Access Control
1. Send `PATCH /api/mobile/notifications/{other_user_notification_id}/read` with the current user's token.
   - **Expected Result:** HTTP 404 Not Found (cannot view or mutate other patients' alerts).
2. Attempt to access mobile notification endpoints with staff account credentials.
   - **Expected Result:** HTTP 403 Forbidden with *"Patient account authentication is required."*.

---

## Verification Summary
- **Zero regressions:** Response shapes and HTTP status codes strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Mobile/MobileNotificationCharacterizationTest.php` passes 6/6 tests (40 assertions).
- **Full Suite pass:** 197 total characterization tests passing (1056 assertions) across Person 1 and Person 4.
- **Frontend compatibility:** Full build passes with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
