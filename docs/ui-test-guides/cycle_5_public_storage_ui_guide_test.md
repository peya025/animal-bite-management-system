# UI Test Guide: Cycle 5 – Secure Public Asset & Storage Streaming

## Objective
Verify the end-to-end functionality of public storage file and asset streaming (clinic logos, public media, branding assets) following the refactoring of `PublicStorageController.php`.

---

## Target Endpoints Verified
- `GET /api/storage/{path}` (Public file streaming with CORS and caching headers)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. An uploaded clinic logo or branding asset in public storage (e.g. in `storage/app/public/logos/`).

---

## Step-by-Step Test Procedure

### 1. Public Logo / Media Rendering
1. Open the web browser and visit the Public Landing Page or Login page (`http://localhost:5173/login`).
2. Observe the clinic branding header / logo.
3. Open the browser's Developer Tools -> Network tab.
4. Filter by `Img` or `storage`.
5. **Expected Result:**
   - Network request `GET /api/storage/logos/...` returns HTTP `200 OK`.
   - The logo image displays crisply without broken image placeholders.
   - Response headers include:
     - `Content-Type: image/png` (or appropriate media type)
     - `Cache-Control: public, max-age=86400, must-revalidate`
     - `Access-Control-Allow-Origin: *` (or frontend origin)
     - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`

---

### 2. Print Document Media Streaming
1. Access any report or patient card with print logos (e.g. `/api/print/reports/exposure-registry` or `/print/reports/monthly`).
2. **Expected Result:**
   - The left and right clinic logos load immediately into the print preview document without requiring symlinks or filesystem permissions on local Windows/Linux deployments.

---

### 3. Missing File Handling
1. In a new browser tab, navigate directly to an invalid storage path: `http://127.0.0.1:8000/api/storage/nonexistent/missing.png`.
2. **Expected Result:**
   - Server returns HTTP 404 with uniform JSON payload: `{"message": "File not found"}`.

---

### 4. Path Traversal Protection
1. Attempt to request an escaped path: `http://127.0.0.1:8000/api/storage/../../etc/passwd`.
2. **Expected Result:**
   - Traversal sequences `../` and `..\\` are stripped out; server does not allow directory traversal outside the `public` disk and returns 404.

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Storage/PublicStorageCharacterizationTest.php` (5 tests, 19 assertions)
