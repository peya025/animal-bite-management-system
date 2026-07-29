# Mobile Patient Registration - Form 1 Alignment Plan

## Problem Statement

The mobile app's patient registration (`profile_setup_view.dart`) has **minimal fields** compared to the web version's comprehensive Form 1 (Patient Enrolment) in `AddPatientModal.tsx`.

This creates **data inconsistency** and **incomplete patient records** when patients register through the mobile app vs web interface.

---

## Current State Comparison

### 🟢 Web Form 1 (AddPatientModal.tsx) - COMPLETE

#### Section I: Patient Information
- ✅ Last Name (required)
- ✅ First Name (required)
- ✅ Middle Name
- ✅ Suffix
- ✅ Sex/Gender (required) - radio buttons (Female/Male)
- ✅ Date of Birth (required)
- ✅ Blood Type - dropdown (A+, A-, B+, B-, AB+, AB-, O+, O-)
- ✅ Mother's Maiden Name
- ✅ Civil Status - dropdown (single, married, widowed, separated, annulled, cohabitation)
- ✅ Spouse's Name (conditional - if married)

#### Address Section: Misamis Oriental
- ✅ City/Municipality (required) - PSGC API dropdown
- ✅ Barangay (required) - PSGC API dropdown
- ✅ Purok/Zone/Street
- ✅ Full address preview (auto-formatted)

#### Contact Information
- ✅ Contact Number
- ✅ Emergency Contact Name
- ✅ Emergency Contact Phone

#### Socioeconomic Information
- ✅ Educational Attainment - dropdown (no_formal, elementary, high_school, vocational, college, post_graduate, student, unknown)
- ✅ Employment Status - dropdown (employed, unemployed, self_employed, retired, student)
- ✅ Family Member Position - dropdown (father, mother, son, daughter, others)

#### Section II: Government Program Information
- ✅ PhilHealth Member? (yes/no radio)
  - If yes:
    - ✅ Status Type (member/dependent radio)
    - ✅ PhilHealth No.
    - ✅ Category - dropdown (fe_private, fe_government, ie, others)
- ✅ 4Ps Member? (yes/no radio)
- ✅ DSWD NHTS? (yes/no radio)

**Total Fields: 27 fields**

---

### 🔴 Mobile Current (profile_setup_view.dart) - MINIMAL

- ✅ Relationship (self/child/dependent)
- ✅ First Name (required)
- ✅ Middle Name
- ✅ Last Name (required)
- ✅ Suffix
- ✅ Gender (required) - dropdown (male/female)
- ✅ Date of Birth
- ✅ Contact Number

**Total Fields: 8 fields**

---

## Missing Fields in Mobile (19 fields)

### Critical Missing Data
1. ❌ Blood Type
2. ❌ Mother's Maiden Name
3. ❌ Civil Status (+ spouse name)
4. ❌ **Complete Address System** (Municipality, Barangay, Purok)
5. ❌ Emergency Contact Information (2 fields)
6. ❌ Educational Attainment
7. ❌ Employment Status
8. ❌ Family Member Position
9. ❌ PhilHealth Information (4 fields)
10. ❌ 4Ps Member status
11. ❌ DSWD NHTS status

---

## Impact Analysis

### Data Integrity Issues
- ❌ Incomplete patient records from mobile registration
- ❌ Missing critical health information (blood type, emergency contacts)
- ❌ No address validation (web uses Philippine government PSGC API)
- ❌ Missing government program enrollment data (PhilHealth, 4Ps)
- ❌ Socioeconomic data gaps affect clinic reporting

### User Experience Issues
- ❌ Mobile users can't fully register without accessing web portal
- ❌ Staff must re-enter data when mobile-registered patients arrive
- ❌ Inconsistent registration workflows between platforms

### Compliance Issues
- ❌ Government health programs require complete patient data
- ❌ PhilHealth claims need member information
- ❌ Missing emergency contact information is a safety risk

---

## Recommended Solution

### Option A: Full Form 1 Implementation (RECOMMENDED)

**Implement the complete Form 1 in mobile with all 27 fields**

#### Advantages
- ✅ **Data consistency** - Same registration process across platforms
- ✅ **Complete records** - All required information captured upfront
- ✅ **Government compliance** - PhilHealth, 4Ps data collected
- ✅ **Emergency preparedness** - Contact information available
- ✅ **Single registration flow** - No follow-up data entry needed

#### Implementation Strategy
**Multi-step wizard approach** (breaks complexity into digestible steps)

```
Step 1: Basic Information (current fields + blood type)
Step 2: Address (PSGC integration)
Step 3: Contact & Emergency
Step 4: Socioeconomic Data
Step 5: Government Programs
Step 6: Review & Submit
```

#### Mobile-Specific Adaptations
- **Progressive disclosure** - Show sections as user scrolls
- **Smart defaults** - Remember common selections
- **Skip option** - Mark optional fields clearly
- **Save draft** - Allow partial completion
- **Offline support** - Save locally, sync when online

#### Technical Requirements
1. **PSGC API Integration** - Philippine address system
2. **Form state management** - Multi-step wizard
3. **Validation** - Client-side + backend validation
4. **Responsive design** - Works on small screens
5. **Accessibility** - Large touch targets, clear labels

#### Estimated Effort
- 📅 **Development**: 3-4 days
- 📅 **Testing**: 1 day
- 📅 **Total**: 4-5 days

---

### Option B: Essential Fields Only (COMPROMISE)

**Add only the most critical missing fields (10-12 fields total)**

#### Fields to Add
1. ✅ Blood Type (dropdown)
2. ✅ Mother's Maiden Name (text)
3. ✅ Civil Status (dropdown)
4. ✅ Emergency Contact Name (text)
5. ✅ Emergency Contact Phone (text)

#### Fields to Skip (for now)
- Address details (just free-form text field)
- Socioeconomic data
- Government programs

#### Advantages
- ✅ Faster to implement (1-2 days)
- ✅ Captures critical safety data (emergency contact, blood type)
- ✅ Simpler mobile UX
- ✅ Minimal scrolling

#### Disadvantages
- ❌ Still incomplete compared to web
- ❌ Missing government program data
- ❌ Address validation issues
- ❌ Future rework needed

---

### Option C: Two-Tier Registration

**Quick registration (8 fields) + "Complete Profile" flow (remaining 19 fields)**

#### Initial Registration (Current)
- Basic identity fields
- Can book appointments immediately

#### Profile Completion Prompt
- "Complete your profile for PhilHealth benefits"
- "Add emergency contacts for safety"
- Progressive nudging to complete

#### Advantages
- ✅ Fast initial registration
- ✅ No UX disruption for existing users
- ✅ Gradual data collection

#### Disadvantages
- ❌ Two-step process creates friction
- ❌ Many users won't complete profile
- ❌ Incomplete data remains an issue

---

## Detailed Implementation Plan (Option A - RECOMMENDED)

### Phase 1: UI/UX Design (Day 1)

#### Step-by-Step Wizard Screens

**Screen 1: Basic Information**
```dart
- First Name *
- Middle Name
- Last Name *
- Suffix
- Sex (Female/Male radio) *
- Date of Birth *
- Blood Type (dropdown)
- Mother's Maiden Name

[Back] [Next: Address →]
```

**Screen 2: Address (Misamis Oriental)**
```dart
RESIDENTIAL ADDRESS

- Municipality * (PSGC dropdown)
- Barangay * (PSGC dropdown, filtered by municipality)
- Purok/Zone/Street

📍 Full address: [Auto-formatted preview]

[← Back] [Next: Contact →]
```

**Screen 3: Contact Information**
```dart
- Contact Number
- Civil Status (dropdown)
- Spouse's Name (conditional, if married)

EMERGENCY CONTACT
- Name
- Phone Number

[← Back] [Next: Socioeconomic →]
```

**Screen 4: Socioeconomic**
```dart
- Educational Attainment (dropdown)
- Employment Status (dropdown)
- Family Member Position (dropdown)

[← Back] [Next: Programs →]
```

**Screen 5: Government Programs**
```dart
PHILHEALTH
- Member? (Yes/No)
  If Yes:
  - Status (Member/Dependent)
  - PhilHealth No.
  - Category (dropdown)

OTHER PROGRAMS
- 4Ps Member? (Yes/No)
- DSWD NHTS? (Yes/No)

[← Back] [Review & Save →]
```

**Screen 6: Review**
```dart
REVIEW YOUR INFORMATION

[Collapsible sections showing all entered data]

- Basic Information
- Address
- Contact
- Socioeconomic
- Government Programs

[← Back] [✓ Save Patient Profile]
```

---

### Phase 2: Backend Integration (Day 1)

#### API Endpoint Updates

**Current mobile API:**
```dart
createPatient({
  'relationship': string,
  'first_name': string,
  'middle_name': string?,
  'last_name': string,
  'suffix': string?,
  'gender': string,
  'date_of_birth': string,
  'contact_number': string?,
})
```

**Updated mobile API (Form 1 complete):**
```dart
createPatient({
  // Basic Info
  'relationship': string,
  'first_name': string,
  'middle_name': string?,
  'last_name': string,
  'suffix': string?,
  'gender': string, // 'male' | 'female'
  'date_of_birth': string,
  'blood_type': string?,
  'mother_maiden_name': string?,
  'civil_status': string?,
  'spouse_name': string?,
  
  // Address (Misamis Oriental)
  'address_municipality': string,
  'address_barangay': string,
  'address_purok': string?,
  'address': string, // Full formatted address
  'province': 'Misamis Oriental',
  
  // Contact
  'contact_number': string?,
  'emergency_contact_name': string?,
  'emergency_contact_phone': string?,
  
  // Socioeconomic
  'educational_attainment': string?,
  'employment_status': string?,
  'family_member': string?,
  
  // Government Programs
  'philhealth_member': 'yes' | 'no' | null,
  'philhealth_status': 'member' | 'dependent' | null,
  'philhealth_no': string?,
  'philhealth_category': string?,
  'fourps_member': 'yes' | 'no' | null,
  'dswd_nhts': 'yes' | 'no' | null,
})
```

#### Backend Changes Required
- ✅ **None!** Backend already accepts all these fields
- ✅ Existing `patients` API endpoint handles full Form 1 data
- ✅ Just need to pass more fields from mobile

---

### Phase 3: PSGC Address Integration (Day 2)

#### PSGC API Implementation

**Web version uses:**
```typescript
const PSGC = 'https://psgc.gitlab.io/api';
const MIS_OR = '124900000'; // Misamis Oriental province code

// Fetch municipalities
GET ${PSGC}/provinces/${MIS_OR}/cities-municipalities/

// Fetch barangays for selected municipality
GET ${PSGC}/cities-municipalities/${municipalityCode}/barangays/
```

**Mobile Dart implementation:**
```dart
class PsgcService {
  static const _baseUrl = 'https://psgc.gitlab.io/api';
  static const _misamisOrientalCode = '124900000';
  
  Future<List<PsgcLocation>> getMunicipalities() async {
    final response = await http.get(
      Uri.parse('$_baseUrl/provinces/$_misamisOrientalCode/cities-municipalities/')
    );
    // Parse and sort alphabetically
  }
  
  Future<List<PsgcLocation>> getBarangays(String municipalityCode) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/cities-municipalities/$municipalityCode/barangays/')
    );
    // Parse and sort alphabetically
  }
}

class PsgcLocation {
  final String code;
  final String name;
}
```

#### Address Formatting
```dart
String formatAddress({
  required String purok,
  required String barangay,
  required String municipality,
}) {
  return [purok, barangay, municipality, 'Misamis Oriental']
    .where((s) => s.isNotEmpty)
    .join(', ');
}

// Example output:
// "Purok 3, Barangay Poblacion, Cagayan de Oro City, Misamis Oriental"
```

---

### Phase 4: Form State Management (Day 2-3)

#### Multi-Step Form Controller

```dart
class PatientRegistrationController extends ChangeNotifier {
  int _currentStep = 0;
  final _formData = PatientFormData();
  
  // Step navigation
  void nextStep() {
    if (_currentStep < 5) {
      _currentStep++;
      notifyListeners();
    }
  }
  
  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      notifyListeners();
    }
  }
  
  void goToStep(int step) {
    _currentStep = step;
    notifyListeners();
  }
  
  // Form data
  void updateBasicInfo({...}) { /* ... */ }
  void updateAddress({...}) { /* ... */ }
  void updateContact({...}) { /* ... */ }
  void updateSocioeconomic({...}) { /* ... */ }
  void updateGovernmentPrograms({...}) { /* ... */ }
  
  // Validation
  bool validateCurrentStep() { /* ... */ }
  bool get isComplete { /* ... */ }
  
  // Persistence
  Future<void> saveDraft() async { /* ... */ }
  Future<void> loadDraft() async { /* ... */ }
  
  // Submission
  Future<void> submit() async {
    final patient = await MobileApi.instance.createPatient(_formData.toJson());
    // Handle success
  }
}
```

---

### Phase 5: UI Components (Day 3-4)

#### Reusable Form Widgets

**Step Indicator Widget**
```dart
class StepIndicator extends StatelessWidget {
  final int currentStep;
  final int totalSteps;
  
  // Shows: ● ● ○ ○ ○ ○ (filled = completed, outline = remaining)
}
```

**Radio Group Widget** (Minimalist Design)
```dart
class MinimalistRadioGroup extends StatelessWidget {
  final String label;
  final List<RadioOption> options;
  final String? value;
  final ValueChanged<String> onChanged;
  
  // Hairline-divided rows with checkmark selection indicator
}
```

**PSGC Dropdown Widget**
```dart
class PsgcDropdown extends StatelessWidget {
  final String label;
  final String? value;
  final Future<List<PsgcLocation>> Function() loadOptions;
  final ValueChanged<String> onChanged;
  
  // Async dropdown with loading state
}
```

**Conditional Field Widget**
```dart
class ConditionalField extends StatelessWidget {
  final bool show;
  final Widget child;
  
  // Animated show/hide for spouse name, PhilHealth details, etc.
}
```

---

### Phase 6: Minimalist Design Application (Day 4)

#### Apply Design System to Registration

**Colors:**
- Primary CTA: `#0C6B5E` (deep teal) - "Next" and "Save" buttons
- Accent: `#14A98C` (bright teal) - Selected radio, checkmarks, icons
- Text: `#1A1A1A` (near-black) - All body text
- Muted: `#A8A8A8` (light gray) - Section labels, helpers
- Dividers: `#EBEBEB` (hairline) - Between fields and sections

**Typography:**
- Section labels: 12px, uppercase, letter-spacing 0.8 (e.g., "BASIC INFORMATION")
- Field labels: 12px, medium weight, sentence case
- Input text: 15px, regular weight
- Helper text: 13px, muted gray

**Structure:**
- No boxed cards - use hairline dividers between fields
- Radio options - hairline-divided rows with checkmark circles
- Dropdowns - minimal 0.5px border, white background
- Buttons - "Next step →" uses sentence case

**Example Screen Structure:**
```
┌─────────────────────────────────┐
│  BASIC INFORMATION              │ ← Small caps label
├─────────────────────────────────┤ ← Hairline
│                                 │
│  First name                     │ ← Sentence case
│  [Juan____________]             │ ← Minimal input
│                                 │
│  Middle name                    │
│  [Santos__________]             │
│                                 │
│  Last name                      │
│  [Dela Cruz_______]             │
│                                 │
│  Sex                            │
│  ┌─────────────────────────┐   │
│  │ 👤 Female            ✓  │   │ ← Hairline rows
│  ├─────────────────────────┤   │
│  │ 👤 Male              ○  │   │
│  └─────────────────────────┘   │
│                                 │
│  Date of birth                  │
│  [2000-01-15______] 📅          │
│                                 │
└─────────────────────────────────┘

[← Back]              [Next: Address →]
```

---

## File Structure

```
mobile/lib/
├── views/
│   ├── patient_registration/
│   │   ├── patient_registration_view.dart          # Main wizard container
│   │   ├── steps/
│   │   │   ├── basic_info_step.dart                # Step 1
│   │   │   ├── address_step.dart                   # Step 2
│   │   │   ├── contact_step.dart                   # Step 3
│   │   │   ├── socioeconomic_step.dart             # Step 4
│   │   │   ├── government_programs_step.dart       # Step 5
│   │   │   └── review_step.dart                    # Step 6
│   │   └── patient_registration_controller.dart    # State management
│   └── profile_setup_view.dart                     # (deprecate or redirect)
│
├── widgets/
│   ├── registration/
│   │   ├── step_indicator.dart
│   │   ├── minimalist_radio_group.dart
│   │   ├── psgc_dropdown.dart
│   │   ├── conditional_field.dart
│   │   └── registration_app_bar.dart
│   └── forms/
│       ├── app_text_field.dart (existing)
│       └── app_dropdown_field.dart (existing)
│
├── services/
│   ├── psgc_service.dart                           # NEW - Address API
│   └── mobile_api.dart (update)
│
├── models/
│   ├── patient_form_data.dart                      # NEW - Form state model
│   ├── psgc_location.dart                          # NEW - Address data
│   └── patient_profile.dart (existing)
│
└── utils/
    └── address_formatter.dart                      # NEW - Address helpers
```

---

## Migration Strategy

### Backward Compatibility

**Existing mobile users** with minimal profiles:
1. ✅ Keep existing `profile_setup_view.dart` for backward compat
2. ✅ Add "Complete your profile" banner in app
3. ✅ Allow editing existing profiles to add missing fields
4. ✅ Gradual migration - don't force immediate update

### Deployment Plan

1. **Week 1**: Implement new registration flow, keep old flow accessible
2. **Week 2**: Beta test with staff
3. **Week 3**: Roll out to new users, show "complete profile" prompt to existing users
4. **Week 4**: Monitor completion rates, gather feedback

---

## Testing Checklist

### Functional Testing
- [ ] All 27 fields accept valid input
- [ ] Required field validation works
- [ ] PSGC address dropdowns populate correctly
- [ ] Conditional fields (spouse name, PhilHealth details) show/hide properly
- [ ] Step navigation (next/back) works
- [ ] Draft save/load works
- [ ] Final submission creates complete patient record
- [ ] Data matches web Form 1 output

### UX Testing
- [ ] Wizard progresses smoothly
- [ ] Form doesn't feel overwhelming
- [ ] Touch targets are adequate (44px min)
- [ ] Text is readable on small screens
- [ ] Keyboard navigation works
- [ ] Error messages are clear
- [ ] Loading states shown during PSGC API calls

### Cross-Platform Testing
- [ ] Android phone (multiple screen sizes)
- [ ] iOS phone (multiple screen sizes)
- [ ] Tablet layouts
- [ ] Different Android versions
- [ ] Different iOS versions

### Data Integrity Testing
- [ ] Mobile-registered patient matches web-registered patient structure
- [ ] Backend receives all Form 1 fields
- [ ] Address formatting is consistent
- [ ] PhilHealth data saves correctly
- [ ] Optional fields handle null values properly

---

## Success Metrics

### Completion Rates
- Target: **80%+ completion** of full Form 1 in mobile
- Track: Drop-off rates at each step
- Goal: No step should have >15% drop-off

### Data Quality
- Target: **95%+ of mobile registrations** have complete address
- Target: **70%+ have emergency contacts**
- Target: **60%+ have PhilHealth data** (if applicable)

### User Satisfaction
- Target: **4.5+ stars** in app reviews mentioning registration
- Target: **<2 minutes** average time to complete
- Target: **<5% support tickets** related to registration

---

## Recommendations

### ⭐ PRIMARY RECOMMENDATION: Option A (Full Form 1)

**Implement the complete Form 1 with multi-step wizard.**

**Rationale:**
1. **Data consistency** - Single source of truth across platforms
2. **Government compliance** - PhilHealth and 4Ps data required for claims
3. **Future-proof** - Won't need rework when requirements expand
4. **Better UX** - Progressive steps less overwhelming than single long form
5. **Safety** - Emergency contact information is critical

**Implementation Timeline:** 4-5 days
**Long-term benefit:** High - eliminates platform discrepancies

---

### 🎯 Quick Wins While Building Full Solution

#### Phase 0: Immediate Additions (1 day)

Add these critical fields to current form **while** building full solution:

1. ✅ **Blood Type** (dropdown) - Medical emergency info
2. ✅ **Emergency Contact Name** (text)
3. ✅ **Emergency Contact Phone** (text)
4. ✅ **Civil Status** (dropdown)

These 4 fields address the most critical safety gaps with minimal effort.

---

### 📋 Additional Suggestions

#### 1. Smart Defaults & Autofill
```dart
// Remember common selections per user
- If user registered as "mother", default family_member to "Mother"
- Pre-fill emergency contact from user's account phone
- Remember municipality for repeated registrations
```

#### 2. Offline Support
```dart
// Save PSGC data locally
- Cache municipality/barangay lists
- Allow offline form completion
- Sync when connection restored
```

#### 3. Progressive Disclosure
```dart
// Show field relevance
- "PhilHealth info helps with billing" tooltip
- "Emergency contact - for your safety" helper text
- Progress percentage: "75% complete"
```

#### 4. Validation Improvements
```dart
// Smart validation
- PhilHealth number format: XX-XXXXXXXXX-X
- Phone number: 09XX-XXX-XXXX
- Purok autocomplete from common patterns
```

#### 5. Accessibility Enhancements
```dart
// Screen reader support
- Semantic labels on all fields
- Error announcements
- Progress announcements
- Large touch targets (48x48dp minimum)
```

#### 6. Analytics Integration
```dart
// Track completion funnel
- Log step completion times
- Identify drop-off points
- A/B test field ordering
- Measure data quality improvements
```

---

## Risk Mitigation

### Risk: Users abandon long form
**Mitigation:** 
- Save draft automatically
- Allow skip/complete later
- Show progress clearly
- Break into digestible steps

### Risk: PSGC API downtime
**Mitigation:**
- Cache address data locally
- Fallback to free-text input
- Retry mechanism with exponential backoff

### Risk: Backend field mismatch
**Mitigation:**
- Test mobile API against web API
- Use same field names as web
- Backend validation catches issues

### Risk: Increased support tickets
**Mitigation:**
- In-app help tooltips
- Clear field examples
- Video tutorial
- Staff training materials

---

## Conclusion

The **recommended approach** is **Option A: Full Form 1 Implementation** with a multi-step wizard.

This ensures:
- ✅ **Complete patient data** from day one
- ✅ **Platform consistency** between web and mobile
- ✅ **Government compliance** for health programs
- ✅ **Safety** with emergency contact information
- ✅ **Professional** clinic management system

**Estimated effort:** 4-5 days
**Long-term benefit:** Eliminates data inconsistency and future rework

---

## Next Steps

1. ✅ **Review this plan** with team
2. ✅ **Approve approach** (Option A recommended)
3. ✅ **Create UI mockups** for wizard steps
4. ✅ **Set up development branch** (`feature/mobile-form1`)
5. ✅ **Implement Phase 0 quick wins** (4 critical fields)
6. ✅ **Build full wizard** (Phases 1-6)
7. ✅ **Test thoroughly** (all platforms)
8. ✅ **Deploy with monitoring**

---

**Ready to proceed with implementation?** 🚀
