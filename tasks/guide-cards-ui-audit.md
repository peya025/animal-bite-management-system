# UI Audit & Improvement Plan: GuidelinesSection / _GuideCard

> **Target Component**: mobile/lib/widgets/menu/guidelines_section.dart (Wash, Consult, Vaccinate)  
> **Status**: Planned Task Backlog  
> **Assignees / Dates**: None (Task backlog format)  

---

## 1. Context

The GuidelinesSection (_GuideCard) is a 3-step bite-care visual guide (Wash, Consult, Vaccinate) located prominently on the main patient portal. Its primary purpose is to provide urgent, at-a-glance clinical first-aid instructions to anxious users immediately following an animal bite incident.

This audit addresses known visual glitches, substandard accessibility metrics (minimum font sizes, poor contrast ratios, missing semantics), multi-language truncation risks (Tagalog/Cebuano), and hardcoded spacing magic numbers before production deployment.

---

## 2. Bugs (must fix)

- [ ] **Fix image corner clipping on Wash, Consult, and Vaccinate cards**
  - *Why it matters*: The outer Container uses 16px borderRadius with Clip.antiAlias, but the inner image Padding was originally less than the corner radius, slicing off the top-right image bounding box.
  - *Fix*: Wrap the Image.asset in its own ClipRRect with an 8px-12px radius or ensure outer padding is uniformly set so the aspect-ratio box never intersects the outer 16px clip.

---

## 3. Accessibility Issues (must fix before ship)

- [ ] **Increase description font size above platform minimums**
  - *Why it matters*: Current 9.5px is below iOS HIG platform minimums (>= 11pt) and Material Guidelines (>= 12sp), making critical emergency steps unreadable for users with mild visual impairments.
  - *Fix*: Bump text size to at least 11px-12px; do not rely on maxLines: 2 or ellipsis to compensate for inadequate text boxes.

- [ ] **Resolve low contrast ratio between guideTealBg (card) and white text**
  - *Why it matters*: guideTealBg (#52B6B4) vs Colors.white has a contrast ratio of only ~2.43:1, and vs #E6F7F6 is ~2.18:1 - both fail WCAG AA (minimum 4.5:1 for normal text, 3:1 for large text).
  - *Fix*: Use a dark text color (e.g. #111827 / #193B40) on a light text pocket, or darken the card text background zone to pass WCAG AA.

- [ ] **Add Semantics / semanticLabel to all _GuideCard illustrations**
  - *Why it matters*: Screen readers (TalkBack/VoiceOver) currently announce illustrations as mundane unlabeled images or skip them entirely.
  - *Fix*: Add descriptive labels like semanticLabel: 'Washing bite wound under water'.

- [ ] **Support system font scaling (MediaQuery.textScaler)**
  - *Why it matters*: Users who enable large/accessibility fonts in system settings will experience text overflow or clipping if the card's height and line-counts are rigid.
  - *Fix*: Test with maximum text scaling (e.g. 2.0x) and adapt flex spacing to prevent red bottom overflow bars.

- [ ] **Ensure tap targets exceed >= 44x44pt (iOS) / 48x48dp (Android) if tappable**
  - *Why it matters*: If cards are later wired to open detailed guide sheets, sub-minimum touch targets would cause unresponsive fumbling for panicked patients.
  - *Fix*: Apply kMinInteractiveDimension metrics such as MinimumInteractiveComponentSize.

---

## 4. Localization / i18n Readiness

- [ ] **Migrate all card strings to AppLocalizations (context.tr) (en/tl/ceb)**
  - *Why it matters*: Hardcoded English texts prevent Filipino and Cebuano speakers from understanding critical first-aid rabies guidance when switching languages.
  - *Fix*: Use context.tr('guide_wash_title') namespaced across en.dart, il.dart, and ceb.dart.

- [ ] **Test ceb (Cebuano) and il (Tagalog) string lengths against maxLines: 2 card bounds**
  - *Why it matters*: Philippine languages (e.g.  Hugasi: 15 minutos ubos sa naga-agas nga tubig) are generally 30-50% longer than English and can suffer premature ellipsis cutoffs.
  - *Fix*: Validate real translated strings across all three cards on live screens instead of developer placeholders.

- [ ] **Review Cebuano (ceb) phrasing with native speakers for clinical accuracy**
  - *Why it matters*: Raw machine translations may use awkward or inaccurate medical terms (e.g. bakuna batok rabies vs pabakuna ligois) that could confuse patients.
  - *Fix*: Verify all Cebuano and Tagalog first-aid dictionaries with local rabies clinic healthworkers.

---

## 5. Consistency & Design System Cleanup

- [ ] **Refactor inline magic numbers to consistent spacing scale (4/8/12/16/24)**
  - *Why it matters*: Using ad hoc values like 4.0, 6.0, 8.0, 9.5, 10.0, and 12.5 gradually erodes visual harmony and makes maintenance prone to divergence.
  - *Fix*: Align all padding, margins, and gaps to an 8px grid (4px/8px/12px/16px).

- [ ] **Migrate widget-local guideTealBg and text grays into shared AppColors**
  - *Why it matters*: Hardcoding Color(0xFF52B6B4) and Color(0xFFE6F7F6) directly inside the widget prevents global theming, dark mode adaptation, and brand consistency.
  - *Fix*: Export as AppColors.guideTeal or reference AppTheme.themeOf(context).

---

## 6. Resilience

- [ ] **Confirm all guide assets are 100% bundled locally for offline fortitude**
  - *Why it matters*: Patients in remote barangays or areas without cellular data must still be able to read bite first-aid guidelines without a failing network hit.
  - *Fix*: All 3 guide images use Image.asset without external HTTP urls.

- [ ] **Ensure fail-safe fallbacks exist for both illustrations and texts**
  - *Why it matters*: If an asset is renamed or if guide texts are ever loaded via remote feature flags, missing resources should never crash the homescreen.
  - *Fix*: Preserve errorBuilder with broken-image fallback icon, and provide default English string fallbacks.

---

## 7. Testing Checklist

- [ ] **Smallest Screen Widths**: Test on iPhone SE (1st/2nd gen, 320px-375px width) and small Android devices to confirm cards render without horizontal/overflow crush.
- [ ] **System Font Scaling**: Test with largest accessibility font size enabled in OS settings (2.0x text scaler) to confirm text does not spill out of cards.
- [ ] **Multi-Locale Validation**: Test English (en), Tagalog (il), and Cebuano (ceb) using real approved strings and verify no unintended truncation.
- [ ] **Contrast Checker Verification**: Run WCAG AA contrast checker against all text/background pairs and document passing design values (>= 4.5:1).
- [ ] **Screen Reader Audit**: Test with TalkBack (Android) and VoiceOver (iOS); verify all 3 steps are announced with portrait descriptions.
- [ ] **Offline Mode Survival**: Place device in Airplane mode with Wi-Fi/cellular disabled, launch app, and confirm cards display immediately.
