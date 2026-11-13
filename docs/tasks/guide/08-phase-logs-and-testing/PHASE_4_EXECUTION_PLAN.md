# Phase 4 Execution Plan: Styling Standardization

## Objective

Standardize the frontend on MUI's theme system and `sx`/`styled` APIs while preserving the current appearance and behavior. At the end of this phase, global CSS will contain resets and truly global rules only; page and component styles will be colocated with the React code that owns them.

This phase changes presentation, not application behavior, routing, API calls, or feature ownership.

## Current Baseline

- Phases 1-3 are complete and the feature-based structure is in place.
- `npm run build` passes as of June 27, 2026.
- `npm run lint` currently reports 46 pre-existing errors. Phase 4 must
  introduce no additional errors; fixing unrelated baseline errors is out of
  scope unless a migrated file must change the affected code.
- MUI and Emotion are already installed.
- No application-level `ThemeProvider` or shared MUI theme exists yet.
- There are 13 imported CSS files containing approximately 4,600 lines:

| Area | Stylesheet | Approx. lines | Risk |
|---|---|---:|---|
| Global | `src/index.css` | 98 | High |
| App shell | `src/App.css` | 163 | High |
| App shell/dashboard | `src/SimpleDashboard.css` | 313 | High |
| Layout | `src/components/Layout/DashboardLayout.css` | 340 | High |
| Dashboard | `src/features/dashboard/styles/Dashboard.css` | 429 | High |
| Patients | `src/features/patients/styles/PatientList.css` | 394 | Medium |
| Patient modal | `src/features/patients/components/AddPatientModal/AddPatientModal.css` | 66 | Medium |
| Form modal | `src/components/forms/FormModal/FormModal.css` | 206 | High |
| Confirmation dialog | `src/components/feedback/ConfirmationDialog/ConfirmationDialog.css` | 166 | Medium |
| Loader | `src/components/Loader/Loader.css` | 94 | Low |
| Clinic setup | `src/features/clinic-setup/styles/SetupWizard.css` | 408 | Medium |
| Login | `src/styles/Login.css` | 486 | Medium |
| Landing page | `src/styles/LandingPage.css` | 1,431 | High |

The earlier two-hour estimate covered only three stylesheets and is no longer realistic. Expected effort is 12-18 hours, including responsive visual checks.

## Styling Standard

1. Use a single MUI theme for palette, typography, spacing, shape, shadows, breakpoints, and component defaults.
2. Use `sx` for short, one-off styles near the JSX that owns them.
3. Use MUI `styled` for reusable elements, state-heavy selectors, and complex responsive rules. Avoid very large `sx` objects inside page components.
4. Use MUI components before styling raw HTML when semantics and behavior are equivalent.
5. Keep `index.css` only for browser normalization, root sizing, font loading, and other genuinely global rules.
6. Do not introduce new page- or component-specific `.css` files.
7. Replace repeated literal colors, radii, shadows, and spacing with theme tokens. Do not force intentionally distinct brand colors into one token.
8. Preserve visible layout and behavior during migration. Redesigns belong in a separate phase.

## Scope Boundaries

### In scope

- Theme creation and provider setup
- Migration of all currently imported CSS
- Responsive, hover, focus, disabled, error, loading, and modal states
- Removal of obsolete style imports and CSS files after verification
- Styling documentation and migration checks

### Out of scope

- Extracting the dashboard from `App.tsx`
- Unifying `SdCard` and `StatCard`
- Rewriting charts or route configuration
- Changing workflows, copy, validation, or API behavior
- Broad accessibility redesign (regressions must still be prevented)

Those structural TODOs can be completed before or after Phase 4, but should not be mixed into styling commits.

## Execution Sequence

### Step 4.0: Capture baseline

**Verification note (June 27, 2026):** Browser automation was unavailable, so
the user manually verified visual parity and confirmed that all migrated
surfaces match the original design.

- [x] Manually compare landing, login, dashboard, patients, add-patient modal,
      inventory, queue, clinic setup, and shared dialogs.
- [x] Verify responsive presentation at the target viewport sizes.
- [x] Exercise relevant interactive and responsive states.
- [x] Run and record `npm run build` and `npm run lint`.
- [x] Preserve pre-existing behavior and avoid unrelated visual fixes.

**Exit criterion:** a comparison baseline exists and build/lint status is known.

### Step 4.1: Establish the theme foundation

- [x] Create `frontend/src/styles/theme.ts`.
- [x] Preserve existing design values during migration; broader token
      consolidation is deferred to avoid changing the design.
- [x] Confirm custom TypeScript theme augmentation is not currently required.
- [x] Wrap the application in `ThemeProvider` in `main.tsx`.
- [x] Keep `CssBaseline` disabled because the existing global rules already
      define the baseline and visual parity is the priority.
- [x] Rename `index.css` to the documented `styles/global.css`.
- [x] Add `frontend/src/styles/README.md` describing the styling rules.

**Exit criterion:** every route renders under the shared theme with no intended visual change, and build/lint pass.

### Step 4.2: Migrate low-risk shared components

Migrate one component at a time:

1. `Loader` (completed June 27, 2026)
2. `ConfirmationDialog` (completed June 27, 2026)
3. `FormModal` (completed June 27, 2026)
4. `AddPatientModal` (completed June 27, 2026)

For each component:

- [x] Move styles to `sx` or a colocated `*.styles.ts` file using MUI `styled`.
- [x] Preserve focus rings, overlay stacking, scroll locking, disabled states, error states, and responsive sizing.
- [x] Remove the CSS import and delete the CSS file after parity checks.
- [x] Run build/lint and test consumers.

**Exit criterion:** shared components have no CSS imports and work in all known call sites.

### Step 4.3: Migrate feature pages

Use this order so reusable patterns emerge before the app shell:

1. Clinic setup (`SetupWizard.css`) (completed June 27, 2026)
2. Patients (`PatientList.css`) (completed June 27, 2026)
3. Role dashboard (`Dashboard.css`) (completed June 27, 2026)

- [x] Reuse shared styling patterns without changing existing design values.
- [x] Test tables, filters, pagination, states, dialogs, forms, and responsive breakpoints.
- [x] Remove each stylesheet only when its entire selector set is no longer referenced.

**Exit criterion:** the three feature areas have no feature CSS imports and match the baseline at all target widths.

### Step 4.4: Migrate the authenticated app shell

Treat the overlapping shell styles as one batch:

- `App.css`
- `SimpleDashboard.css`
- `components/Layout/DashboardLayout.css`

Completed June 27, 2026. `App.css` was verified unused and removed; the two
live layout stylesheets were migrated to scoped MUI `styled` roots.

- [x] Inventory overlapping `sd-*` and layout rules before conversion.
- [x] Create styled shell scopes for sidebar, header, content, navigation, submenu, user panel, dashboard cards, charts, and filters.
- [x] Preserve collapsed sidebar state, active navigation, role-aware menus, content scrolling, and mobile behavior.
- [x] Keep component extraction and `SdCard` unification out of this step.
- [x] Remove the three CSS imports/files after authenticated routes pass.

**Exit criterion:** all roles can navigate the authenticated application at desktop and mobile widths without layout or interaction regressions.

### Step 4.5: Migrate public and auth pages

1. Login (`Login.css`) (completed June 27, 2026)
2. Landing page (`LandingPage.css`) (completed June 27, 2026)

The landing page is the largest stylesheet and should be its own reviewable change.

- [x] Preserve imagery, carousel behavior, navigation menu, anchors, footer, animation, and all breakpoints.
- [x] Preserve the landing stylesheet verbatim with MUI `GlobalStyles`; defer
      selector-by-selector scoping until screenshot comparison is available.
- [x] Verify keyboard focus and mobile menu behavior.
- [x] Delete the old CSS imports/files after visual parity checks.

**Exit criterion:** public pages match the baseline and contain no page-specific CSS imports.

### Step 4.6: Cleanup and enforcement

- [x] Search for remaining `.css` imports; only approved global CSS may remain.
- [x] Search for stale `className` values tied to deleted selectors.
- [x] Retain hard-coded design values where token replacement could affect visual parity.
- [x] Confirm no orphaned stylesheets remain.
- [x] Update `FRONTEND_REFACTORING_PLAN.md` and `FRONTEND_REFACTORING_TODO.md`.
- [x] Add final test results and known exceptions to `PHASE_4_COMPLETE.md`.

**Exit criterion:** the Phase 4 definition of done is satisfied.

## Verification Matrix

Run after every migration batch:

```powershell
cd frontend
npm run build
npm run lint
```

| Surface | Required manual checks |
|---|---|
| Landing | navigation, carousel, CTA links, responsive sections, footer |
| Auth | login fields, validation, loading/error states, mobile layout |
| App shell | expanded/collapsed sidebar, active/submenu states, logout dialog |
| Dashboard | stat cards, charts, filters, role variants, responsive layout |
| Patients | search/filter/table/pagination, empty state, add/edit flows |
| Inventory | table and add/edit/adjust/history/delete dialogs |
| Queue | table, pagination, actions, empty/loading states |
| Clinic setup | step transitions, validation, working-hours modal |
| Shared UI | modal focus, escape/backdrop behavior, loader, disabled states |

Check each applicable surface at 375, 768, 1024, and 1440 pixels. Compare against Step 4.0 and treat unexpected spacing, wrapping, overflow, color, font, or interaction changes as regressions.

## Commit / Review Boundaries

1. Theme foundation
2. Shared feedback/form components
3. Clinic setup and patients
4. Dashboard feature
5. Authenticated app shell
6. Login
7. Landing page
8. Cleanup and documentation

Do not delete a stylesheet in a different commit from the component migration that makes it obsolete.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Global selector or cascade behavior is lost | Capture computed appearance first and migrate by complete surface |
| Responsive regressions | Test four fixed viewport widths after every batch |
| Modal z-index/focus/scroll regressions | Test every modal state and use MUI modal primitives consistently |
| Theme rollout changes existing MUI defaults | Start with tokens matching the current UI and add overrides deliberately |
| Oversized, unreadable JSX | Move complex/stateful styling into colocated `*.styles.ts` files |
| Scope expands into dashboard refactoring | Keep extraction and component unification explicitly out of Phase 4 |
| Landing-page change is hard to review | Migrate it alone after shared tokens and patterns are stable |

## Definition of Done

- [x] One application theme is installed and documented.
- [x] `global.css` is the only remaining stylesheet and contains global rules.
- [x] No imported component/page CSS files remain.
- [x] No stale stylesheet references or orphaned CSS files remain.
- [x] All target routes and interaction states pass manual visual checks.
- [x] `npm run build` passes.
- [x] `npm run lint` passes, or pre-existing failures are documented with no new failures introduced.
- [x] Phase documents and TODOs reflect completed work and exceptions.
