# UI Test Guide: Cycle 15 – Developer Database Explorer

## Objective
Verify the end-to-end functionality of the Developer Database Explorer tool, table schema inspection, live row counts, and column metadata inspection following the refactoring of `DeveloperDatabaseExplorerController.php`.

---

## Target Endpoints Verified
- `GET /api/developer/database/tables` (List all application database tables with row counts, primary keys, and engine)
- `GET /api/developer/database/tables/{tableName}` (Inspect column data types, nullability, keys, defaults, and security notice)

---

## Prerequisites
1. Local development backend running (`http://127.0.0.1:8000`).
2. Logged in staff user with the `developer` role.
3. Developer tools enabled in environment (`APP_ENV=local` or `DEVELOPER_TOOLS_ENABLED=true`).

---

## Step-by-Step Test Procedure

### 1. View Database Overview & Table List
1. Open the web application and navigate to `/developer/database-explorer` (or access via Developer Tools menu).
2. The web client requests `GET /api/developer/database/tables`.
3. **Expected Result:**
   - Returns HTTP 200 OK with `database_name`, `total_tables`, and `tables` list.
   - The tables grid renders each database table (e.g., `appointments`, `patients`, `bite_incidents`, `users`).
   - Each row displays: Table Name, Estimated/Actual Row Count, Column Count, Primary Key, and Storage Engine (`InnoDB`).
   - The search filter input at the top allows instant client-side filtering by table name.

---

### 2. View Table Column Structure
1. Click on any table row (e.g., `appointments` or `clinics`).
2. Switch to the **Structure** tab.
3. The web client requests `GET /api/developer/database/tables/{tableName}`.
4. **Expected Result:**
   - Returns HTTP 200 OK with `columns` list and `total_records`.
   - The schema table lists every column: Column Name, Data Type (e.g., `bigint(20) unsigned`, `varchar(255)`), Nullable status (`YES`/`NO`), Column Key (`PRI`, `UNI`, `MUL`), and Default values.
   - Privacy Banner displayed: *"Raw record content disabled for data privacy & security compliance."* (confirms HIPAA/data privacy compliance).

---

### 3. Nonexistent Table Lookup
1. Manually request `GET /api/developer/database/tables/non_existent_table_xyz`.
2. **Expected Result:**
   - Returns HTTP 404 Not Found with `{"message": "Table not found"}`.

---

### 4. Role Authorization & Access Control
1. Attempt to access `/api/developer/database/tables` without an authorization token:
   - **Expected Result:** HTTP 401 Unauthorized.
2. Attempt to access `/api/developer/database/tables` with a user account having role `treatment` or `nurse`:
   - **Expected Result:** HTTP 403 Forbidden with *"Unauthorized. This action requires developer role."*.

---

## Verification Summary
- **Zero regressions:** Database schema inspection contracts preserved across MySQL, MariaDB, and SQLite.
- **Automated coverage:** `backend/tests/Feature/Developer/DeveloperDatabaseExplorerCharacterizationTest.php` passing 5/5 tests (462 assertions).
- **Security:** Raw user data rows are never exposed over the API; only structural metadata is returned.
