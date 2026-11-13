# 🚀 Database & System Performance Optimization Guide

This document outlines the recommended best practices, architectural strategies, and implementation steps for database query optimization, lazy vs. eager loading management, and frontend code splitting in the **Animal Bite Management and Monitoring System**.

---

## 📌 Executive Summary

To ensure high performance, low latency, and scalable operation at the **Tagoloan Rural Health Unit (RHU) Animal Bite Treatment Center**, the backend database queries and frontend bundles must be optimized for fast loading even under low network bandwidth or high patient volume.

---

## 1. ⚡ Single SQL Query Aggregation (Conditional SQL Aggregations)

### Problem
Executing multiple sequential `COUNT(*)` queries for dashboard summary metrics (e.g., today's actions, logins today, suspicious after-hours events, weekly stats) sends 4–5 separate network roundtrips to MySQL.

### Solution
Combine counter metrics into a **single parallel SQL query** using conditional aggregation (`COUNT(CASE WHEN ... THEN 1 END)`).

```php
// Location: app/Http/Controllers/AuditLogController.php
public function summary(Request $request)
{
    $clinicId = $request->user()->clinic_id;
    $today = today()->toDateString();
    $startOfWeek = now()->startOfWeek()->toDateTimeString();
    $endOfWeek = now()->endOfWeek()->toDateTimeString();

    $metrics = AuditLog::where('clinic_id', $clinicId)
        ->whereNotNull('user_id')
        ->selectRaw("
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_actions,
            COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as week_actions,
            COUNT(CASE WHEN DATE(created_at) = ? AND action = 'login' THEN 1 END) as today_logins,
            COUNT(CASE WHEN DATE(created_at) = ? AND (TIME(created_at) < '08:00:00' OR TIME(created_at) > '17:00:00') THEN 1 END) as suspicious_after_hours
        ", [$today, $startOfWeek, $endOfWeek, $today, $today])
        ->first();

    return response()->json([
        'today_actions' => (int) ($metrics->today_actions ?? 0),
        'week_actions' => (int) ($metrics->week_actions ?? 0),
        'today_logins' => (int) ($metrics->today_logins ?? 0),
        'suspicious_after_hours' => (int) ($metrics->suspicious_after_hours ?? 0),
    ]);
}
```

---

## 2. 🛡️ Strict N+1 Query Protection (`preventLazyLoading`)

### Problem
Accessing relationships inside loops on fetched lists triggers the **N+1 query problem** (1 query for list + N queries for each row).

### Solution
Enforce Eloquent's `preventLazyLoading()` in `app/Providers/AppServiceProvider.php` during development:

```php
// Location: app/Providers/AppServiceProvider.php
use Illuminate\Database\Eloquent\Model;

public function boot(): void
{
    // Throws an exception in development if N+1 lazy loading is attempted
    Model::preventLazyLoading(! $this->app->isProduction());
}
```

### When to use Eager vs. Lazy Loading:
- **Use Eager Loading (`with(['patient', 'biteIncident'])`)**: On ALL collection/list endpoints (`/api/patients`, `/api/queue`, `/api/audit-logs`).
- **Use Lazy Loading (`$model->load(...)`)**: ONLY on single-item detail endpoints (`/api/patients/{id}`) where relationships are conditionally needed.

---

## 3. 🎯 Column Projection (Select Specific Columns)

### Problem
Fetching `SELECT *` loads unused BLOB or large text fields into PHP RAM.

### Solution
Specify only the columns needed by the UI when eager loading:

```php
// Fetches only id, name, email, and role from the users table
AuditLog::with('user:id,name,email,role')
    ->where('clinic_id', $clinicId)
    ->paginate(50);
```

---

## 4. 🗂️ Composite Database Indexing Strategy

### Problem
Filtering by `(clinic_id, created_at)` or `(clinic_id, queue_date, status)` without composite indexes results in full table scans.

### Recommended Indexes Migration:

```php
Schema::table('patient_queues', function (Blueprint $table) {
    $table->index(['clinic_id', 'queue_date', 'status']);
});

Schema::table('audit_logs', function (Blueprint $table) {
    $table->index(['clinic_id', 'created_at']);
});

Schema::table('bite_incidents', function (Blueprint $table) {
    $table->index(['clinic_id', 'incident_date', 'exposure_category']);
});
```

---

## 5. 📦 Frontend Code-Splitting (`React.lazy()`)

### Problem
Bundling secondary or heavy developer pages into the main JavaScript bundle increases initial app load time.

### Solution
Use `React.lazy()` and `<Suspense>` in `App.tsx` for heavy pages:

```tsx
// Location: src/App.tsx
import { lazy, Suspense } from 'react';

const StaffActivityPage = lazy(() => import('./features/audit/pages/StaffActivityPage'));
const ReportsDashboardPage = lazy(() => import('./features/reports/pages/ReportsDashboardPage'));
const DeveloperDatabaseExplorerPage = lazy(() => import('./features/developer/pages/DeveloperDatabaseExplorerPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="loading-screen">Loading page...</div>}>
        <Routes>
          <Route path="/staff-activity" element={<StaffActivityPage />} />
          <Route path="/developer/database-explorer" element={<DeveloperDatabaseExplorerPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

---

## 🏁 Verification & Testing Checklist

- [x] Run backend test suite: `php artisan test`
- [x] Verify no N+1 query exceptions in local dev logs
- [x] Verify frontend build: `npm run build`
- [x] Check async JS chunks outputted by Vite/Rolldown
