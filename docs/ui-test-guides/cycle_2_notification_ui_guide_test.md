# UI Test Guide: Cycle 2 – Web System & Staff Notifications

## Objective
Verify the end-to-end functionality of web staff notifications, badge counters, toast alerts, mark-as-read, and mark-all-as-read following the refactoring of `NotificationController.php`.

---

## Target Endpoints Verified
- `GET /api/notifications` (List notifications for authenticated user and current unread count)
- `GET /api/notifications/unread-count` (Badge counter)
- `POST /api/notifications/{id}/read` (Mark individual notification as read)
- `POST /api/notifications/read-all` (Mark all visible notifications as read)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Logged in as any clinic staff member (Admin, Doctor, Nurse, or Registration Clerk).

---

## Step-by-Step Test Procedure

### 1. Notification Bell & Badge Count
1. Look at the top navigation bar.
2. Locate the notification bell icon.
3. **Expected Result:**
   - If unread notifications exist, a badge count displays the exact number of unread notifications.
   - If no unread notifications exist, the badge is hidden or indicates 0.

---

### 2. Notification Dropdown Panel
1. Click the notification bell icon.
2. **Expected Result:**
   - The notification popover/panel opens smoothly.
   - Recent notifications are listed chronologically (newest first) with appropriate category icons:
     - Warning icon for `inventory` or `expiry` alerts
     - Patient icon for `queue` events
     - Calendar icon for `appointment` or `overdue` events
     - Activity icon for system events
   - Unread notifications are visually distinguished (highlighted background / unread dot indicator).

---

### 3. Mark Single Notification as Read
1. Click the "mark as read" checkmark or click directly on an unread notification card.
2. **Expected Result:**
   - The unread badge counter decrements by 1 immediately (optimistic UI update).
   - Network call `POST /api/notifications/{id}/read` returns `200 OK` with `{"success": true, "message": "Notification marked as read."}`.
   - The item visual styling transitions to read state.

---

### 4. Mark All Notifications as Read
1. In the open notification dropdown, click **Mark all as read**.
2. **Expected Result:**
   - The badge count instantly drops to 0.
   - Network call `POST /api/notifications/read-all` returns `200 OK` with `{"success": true, "message": "All notifications marked as read."}`.
   - All notifications in the panel transition to the read state.

---

### 5. Multi-User Read State Isolation
1. Log in as a different staff member in the same clinic (e.g., Nurse Joy).
2. **Expected Result:**
   - Notifications shared with the role or clinic remain unread for Nurse Joy even if Admin previously marked them as read for their own user account.

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Notification/NotificationCharacterizationTest.php` (8 tests, 40 assertions)
- `backend/tests/Feature/NotificationBellTest.php` (13 tests, 48 assertions)
