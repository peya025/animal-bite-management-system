# Optional staff electronic signatures

## Scope and behavior

Implement PNG/JPG upload in Admin > Staff > Add/Edit without additional hardware or dependencies. Upload, replacement, removal and signing are optional. Drawing and certificate-based PDF signatures are outside this iteration.

- Missing signatures never prevent staff creation, invitation acceptance or treatment recording.
- No placeholder is treated as a signature. An omitted update keeps the existing image; an explicit removal clears it for future use.
- Admin upload records custody, not staff approval. Staff preview their current image and explicitly confirm ownership and application when saving new local vaccine doses. Consent is not restored from drafts. External administrations are never signed with the recording staff's image.
- The backend takes identity from authentication, validates the exact previewed version and records signing time. Completed records retain their original signature, including null; replacing/removing a profile image cannot rewrite history.

## Implementation sequence

1. Add a private signature service: strict base64 or file validation, PNG/JPG only, 2 MiB input cap, dimension/pixel caps, GD re-encoding, random immutable filenames, private disk, authorized image responses with no-store headers.
2. Integrate upload/removal with transactional admin user creation/update and audit logging. Reject client-controlled paths. Remove default signatures from user/invitation creation.
3. Add authenticated current-signature preview and clinic-scoped historical image endpoints. Add signing timestamp and enforce immutable historical signature fields.
4. Add admin upload/preview/remove controls and an unchecked staff confirmation for each save. Render only record-specific images on completed doses, with unsigned fields blank in print.
5. Provide a dry-run legacy migration command, clear known placeholder references in the schema migration, and deny direct access to legacy public assets on Apache. Migrate legacy assets to private storage before deployment on other web servers; deny `/signatures/` there too.
6. Test optionality, malformed and oversized uploads, authorization/clinic boundaries, explicit consent, stale versions, external administrations, and historical preservation. Build the frontend and inspect the UI where browser tooling is available.

## Risks and mitigations

| Risk | Mitigation / remaining limitation |
| --- | --- |
| Wrong image or unauthorized application | Admin preview with staff identity, uploader audit, staff ownership confirmation and explicit signing per save. A signature image alone cannot prove identity. |
| Public copying or cross-clinic access | Private storage; admin/self profile preview; clinical-role, same-clinic historical reads; no public image URLs. Authorized viewers can still copy visible images. |
| Malicious or huge image | Actual content validation, strict decoding, input/dimension caps, PNG normalization, generated filenames, no SVG or arbitrary paths. |
| Historical changes | Immutable random file versions and record-level snapshot; no fallback to current profile image; removal retains referenced files. |
| Concurrent replacement | Lock user during mutation/signing and compare the previewed version before committing. |
| Lost files | Back up private storage and database together; use a persistent volume in hosted deployments. |
| Misleading authenticity | Label electronic signatures accurately; do not claim certificate verification or tamper-proof PDFs. |
| Existing public images | Apache deny rule plus dry-run/apply migration; migrate and configure equivalent deny rules before deployment elsewhere. |

## Deployment

Back up the database and signature assets before deploying; preserve old public images until the migration has read them. PHP GD is required for image normalization. Run `php artisan migrate`, then review `php artisan signatures:privatize` and run `php artisan signatures:privatize --apply`. The command must preserve historical associations, report invalid/missing files, and only delete source files after every database reference has moved successfully. Retain persistent `storage/app/private` storage. Deploy frontend/backend together because signing now requires explicit consent.

## Verification results

Implemented and verified on 2026-09-28.

- 45 backend tests / 320 assertions passed across optional signatures, admin user management, nurse workstations, doctor/re-exposure, mobile workflows, deployment readiness, and seeded demo login.
- Four Playwright browser tests passed: create without signature; upload/preview/replace/remove with the admin save confirmation; consent initially unchecked and reset on refresh; unavailable image disables consent.
- Production frontend build passed. Vite reports the existing large-bundle advisory.
- New PHP files passed Pint checks; `git diff --check` passed. The existing controllers retain their established formatting.
- Inspected the browser screenshot of the staff edit dialog. Fixed the edit confirmation placement inside the active dialog so assistive technology and keyboard focus can reach it.
- Consent and previews stay in memory, outside saved form drafts. Image bytes are fetched with authenticated requests and rendered as data URLs without tokens in URLs.
- Demo seeders now create staff without placeholder/fictitious signature paths.

## Local migration outcome and remaining data issue

- Saved a full database dump and copies of the original public PNG files under `backend/storage/app/private/signature-backups/20260928-234713/` (ignored by Git).
- Applied `2026_09_28_200000_make_staff_signatures_optional` to the local database.
- Moved two referenced legacy images to private storage and updated their existing associations. Their former public files were removed; the private originals and backup must be included in the persistent-storage deployment, not committed to Git.
- Four pre-existing paths point to files that do not exist. The migration reports these and exits nonzero while preserving their references; it does not fabricate replacement images or signing consent. The admin list marks them as unavailable. An admin can upload a replacement for future signing or remove the stale profile reference. Historical missing images require recovery from an earlier backup; a new profile upload does not rewrite those records.
- Direct legacy asset access is denied by the added Apache `.htaccess`. Other servers, including a PHP development server, need an equivalent deny rule or removal of remaining public legacy assets. All newly uploaded signatures are stored outside the public root.

## Verification commands

From `backend`: `php artisan test --compact --filter='OptionalStaffSignatureTest|AdminUserManagementTest|DualNurseWorkstationTest|TriageDoctorAndReExposureTest|MobilePatientWorkflowTest|DeploymentReadinessTest|SeededDemoLoginTest'`.

From `frontend`, with development dependencies installed: `npx playwright test --config playwright.registration.config.ts signatures.spec.ts` and `npm run build`.

The in-app browser runtime could not initialize in this session. Browser verification used the project's Playwright configuration and pinned Playwright 1.63.0, installed in an isolated ignored folder without changing package manifests or the lockfile. All browser API requests were mocked; no clinical records were created by the UI tests.
