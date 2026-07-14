# Manual Testing Checklist

Run through this checklist after any significant change or before a release.

---

## Authentication

- [ ] Landing page loads at `/`
- [ ] "Staff Sign In" button navigates to `/login`
- [ ] Login with valid credentials → redirects to `/dashboard`
- [ ] Login with invalid credentials → shows error message
- [ ] Admin with incomplete setup → redirects to `/setup`
- [ ] Logout button → clears session and returns to `/login`
- [ ] Accessing a protected route while logged out → redirects to `/login`
- [ ] Token expiry (401 response) → auto-redirects to `/login`

---

## Setup Wizard (Admin only)

- [ ] Setup wizard loads at `/setup`
- [ ] All 4 steps navigate correctly (Welcome → Customize → Clinic Profile → Confirm → Done)
- [ ] Clinic profile form validates required fields
- [ ] Completing setup saves clinic data and redirects to `/dashboard`
- [ ] "Go to Dashboard" button on Done step works

---

## Dashboard

- [ ] Admin dashboard shows 4 stat cards
- [ ] Registration dashboard shows 2 stat cards + Quick Actions
- [ ] Triage dashboard shows greeting, 4 stat cards, and 4 cards (Queue, Vaccinations, Cases, Quick Actions)
- [ ] Treatment dashboard shows 2 stat cards
- [ ] All "View all →" and quick action buttons navigate correctly
- [ ] Universal dashboard (SimpleDashboard) loads charts and cards

---

## Navigation & Sidebar

- [ ] All nav links in the sidebar navigate to the correct pages
- [ ] Active route is highlighted in the sidebar
- [ ] "Clinic Setup" submenu expands and collapses
- [ ] Sidebar collapses and expands with the toggle button
- [ ] Role-based nav — Registration staff does not see Inventory / Users / Clinic Setup
- [ ] Logout button in sidebar shows confirmation dialog

---

## Patient Management (`/patients`)

- [ ] Patient list loads with pagination
- [ ] Search filters patients in real time
- [ ] "Show entries" dropdown changes page size
- [ ] Print button opens browser print dialog
- [ ] "Add Patient" button opens the modal
- [ ] Add Patient form validates required fields
- [ ] Successfully added patient appears in the list
- [ ] View / Edit action buttons are present on each row
- [ ] Stat cards (Total, Active, Follow-up) update with data
- [ ] Breadcrumb "Dashboard" link navigates home

---

## Queue Dashboard (`/queue`)

- [ ] Queue list loads with correct columns
- [ ] Search filters by patient name or queue number
- [ ] Status filter works (Waiting, In Consultation, Completed, Cancelled)
- [ ] Clear button resets filters
- [ ] "Next Patient" banner appears when a waiting patient exists
- [ ] "Call Patient" button triggers confirmation dialog → calls patient
- [ ] "Complete Consultation" button opens notes dialog → marks complete
- [ ] "Cancel" button triggers danger confirmation → removes from queue
- [ ] Stats cards (Total, Waiting, In Consultation, Completed, Cancelled) are correct
- [ ] Progress bar reflects completed / total ratio
- [ ] Auto-refresh runs every 30 seconds

---

## Vaccine Inventory (`/inventory`)

- [ ] Inventory list loads with correct columns
- [ ] Search by vaccine type filters results
- [ ] Batch number filter works
- [ ] Status filter (Active / Expired / Depleted) works
- [ ] Expiry date range filters work
- [ ] Clear button resets all filters
- [ ] "Add Stock" button opens the Add/Edit dialog
- [ ] Add Stock form validates and saves
- [ ] Edit button opens the dialog with pre-filled data
- [ ] Adjust Stock dialog changes quantity and shows in list
- [ ] Transaction History dialog shows history for the item
- [ ] Delete dialog removes the record with confirmation
- [ ] Stats cards (Active Batches, Total Vials, Expiring Soon, Depleted) are correct
- [ ] Low stock items show amber quantity colour
- [ ] Expired items show red expiry label

---

## Clinic Setup (`/setup/clinic-info`)

- [ ] Clinic Information page loads with current data
- [ ] Form fields are editable
- [ ] Save button updates clinic details
- [ ] Working hours modal opens and saves

---

## Modals & Dialogs

- [ ] All confirmation dialogs show correct title, message, and buttons
- [ ] "Cancel" / "Go Back" closes the dialog without action
- [ ] "Confirm" button executes the action
- [ ] Danger variant shows in red
- [ ] Warning variant shows in amber
- [ ] Success variant shows in green

---

## General

- [ ] No console errors on any page
- [ ] No TypeScript build errors (`npm run build` passes)
- [ ] 404 page shows for unknown routes
- [ ] Unauthorized page shows for forbidden routes
- [ ] App is responsive at 375px (mobile), 768px (tablet), 1024px, 1440px
- [ ] Snackbar notifications appear and auto-dismiss after 4 seconds
