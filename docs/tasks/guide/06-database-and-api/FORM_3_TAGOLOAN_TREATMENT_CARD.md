# Form 3: Tagoloan Animal Bite Treatment Card

**Official Name**: TAGOLOAN ANIMAL BITE TREATMENT CENTER — Official Form  
**Purpose**: Complete treatment and vaccination record  
**Used By**: Nurse (treatment role) and Doctor (triage role)  
**Opens From**: Patient Queue "Edit" action

---

## 📋 Form Structure

### SECTION 1: Patient & Registration Information

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Date of form/treatment |
| Registry No. | Text | Yes | Patient registry number |
| Hospital No. | Text | Optional | If referred from hospital |
| Referred by | Text | Optional | Referring facility/doctor |
| PhilHealth Identification Number (PIN) | Text | Optional | PhilHealth number |
| PhilHealth Type | Radio | If PhilHealth | • Member<br>• Dependent |
| **Patient Name** | Text | **Required** | Full name |
| **Age** | Number | **Required** | Patient age |
| **Date of Birth** | Date | **Required** | DOB |
| **Address** | Text | **Required** | Full address |
| **Sex** | Radio | **Required** | • Male<br>• Female |

---

### SECTION 2: Exposure Details

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| **Exposure Category** | Radio | **Required** | • I<br>• II<br>• III |
| **Date of Exposure** | Date | **Required** | When bite occurred |
| **Date Treatment Started** | Date | **Required** | When treatment began |
| **Place of Exposure** | Text | **Required** | Location of incident |

---

### SECTION 3: Exposure Details (Detailed)

#### 1. Mode of Animal Exposure
**Type**: Checkbox (multiple selection)
**Required**: Yes

Options:
- ☐ Nibbling/Licking of uncovered skin
- ☐ Nibbling/Licking of wounded/broken skin
- ☐ Scratch / Abrasion
- ☐ Transdermal Bite
- ☐ Handling / Ingestion of raw infected meat

---

#### 2. Body Part Affected/Exposed
**Type**: Radio (single selection)
**Required**: Yes

Options:
- ○ Head and/or neck
- ○ Other parts of the body
- ○ N/A if Ingestion mode

---

#### 3. Type of Animal
**Type**: Radio + Text input
**Required**: Yes

Options:
- ○ Dog
- ○ Others: _____________ (text field)

---

#### 4. Past History of Animal Bite
**Type**: Radio
**Required**: Yes

Options:
- ○ Yes
- ○ No

**If Yes, follow-up question**:
- Was PEP Immunization completed?
  - ○ Yes
  - ○ No

---

### SECTION 4: Vaccination Record (Main Section)

**Type**: Table/Grid with multiple rows

| Period | Adm Route | Date | Given by | Signature |
|--------|-----------|------|----------|-----------|
| Day 0 | ID / IM | [Date picker] | [Text] | [Text/Image] |
| Day 3 | ID / IM | [Date picker] | [Text] | [Text/Image] |
| Day 7 | ID / IM | [Date picker] | [Text] | [Text/Image] |
| Day 28 | ID / IM | [Date picker] | [Text] | [Text/Image] |
| Booster 1 | ID / IM | [Date picker] | [Text] | [Text/Image] |
| Booster 2 | ID / IM | [Date picker] | [Text] | [Text/Image] |

**Field Details**:
- **Period**: Pre-defined (Day 0, Day 3, Day 7, Day 28, Booster 1, Booster 2)
- **Adm Route**: Radio button (ID or IM)
  - ID = Intradermal
  - IM = Intramuscular
- **Date**: Date picker
- **Given by**: Text (Healthcare provider name)
- **Signature**: Text or image upload

---

### SECTION 5: Additional Medications

| Field | Type | Notes |
|-------|------|-------|
| ERIG | Text/Checkbox | Equine Rabies Immunoglobulin |
| TT | Text/Checkbox | Tetanus Toxoid |
| ATS | Text/Checkbox | Anti-Tetanus Serum |

---

### SECTION 6: Diagnosis

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| ICD 10 Code | Text | Yes | International Classification of Diseases code |

---

## 🎯 Key Observations

### 1. This is NOT Just Vaccination Schedule
This is the **complete treatment card** that includes:
- ✅ Patient demographics
- ✅ Exposure details
- ✅ Bite incident information
- ✅ **Complete vaccination schedule**
- ✅ Additional medications
- ✅ Medical diagnosis

### 2. Overlaps with Form 1 and Form 2
Many fields **duplicate** what's in:
- **Form 1** (Patient Registration): Name, Age, DOB, Address, Sex, PhilHealth
- **Form 2** (Individual Treatment): Exposure category, date of exposure

### 3. This is the Official DOH/RHU Form
This appears to be the **standardized form** required by:
- Department of Health (DOH)
- Rural Health Unit (RHU)
- Used for official reporting

---

## 💡 Workflow Implications

### Current Understanding:

```
Form 1 (Registration)
└─ Basic patient demographics
└─ Government program info

Form 2 (Individual Treatment Record) 
└─ Consultation details
└─ Vital signs
└─ Initial assessment

Form 3 (Tagoloan Treatment Card) ← THIS FORM
└─ Complete exposure details
└─ Full vaccination schedule
└─ Treatment timeline
└─ Official documentation
```

### Who Fills What:

**Registration Staff**:
- Form 1 only (patient demographics)

**Doctor (Triage)**:
- Can start Form 3 (exposure details, category)
- OR fills Form 2 then nurse completes Form 3

**Nurse (Treatment)**:
- Completes Form 3 (vaccination schedule)
- Updates after each vaccine dose
- Signs off on completion

---

## 🔄 Revised Queue Workflow

```
1. Registration Staff
   └─ Form 1: Patient Registration
   └─ Adds to queue

2. Doctor (Triage) - Clicks "Edit" in queue
   └─ Opens Form 3 (Tagoloan Treatment Card)
   └─ Fills SECTION 1-3 (Patient info + Exposure details)
   └─ Determines Exposure Category (I, II, III)
   └─ May give Day 0 vaccine
   └─ Saves → Queue status: "Ready for Treatment"

3. Nurse (Treatment) - Clicks "Edit" in queue
   └─ Opens Form 3 (same form, continue filling)
   └─ Fills SECTION 4 (Vaccination Record)
   └─ Records Day 0, Day 3, Day 7, Day 28, Boosters
   └─ Records ERIG, TT, ATS if given
   └─ Adds ICD 10 code
   └─ Saves → Queue status: "Ongoing Treatment"

4. Nurse (Follow-up visits)
   └─ Patient returns for Day 3, Day 7, Day 28
   └─ Opens same Form 3
   └─ Updates vaccination record table
   └─ Marks dose as given
   └─ Schedules next appointment
```

---

## 📊 Database Schema Implications

### Option 1: Single "Treatment Card" Table
Store all Form 3 data in one table:

```sql
CREATE TABLE tagoloan_treatment_cards (
  id BIGINT PRIMARY KEY,
  patient_id BIGINT,
  queue_id BIGINT,
  
  -- Section 1: Patient Info
  registry_no VARCHAR(50),
  hospital_no VARCHAR(50),
  referred_by VARCHAR(255),
  philhealth_pin VARCHAR(50),
  philhealth_type ENUM('member', 'dependent'),
  
  -- Section 2: Exposure
  exposure_category ENUM('I', 'II', 'III'),
  date_of_exposure DATE,
  date_treatment_started DATE,
  place_of_exposure TEXT,
  
  -- Section 3: Exposure Details
  mode_of_exposure JSON, -- Array of selected modes
  body_part_affected VARCHAR(100),
  animal_type VARCHAR(100),
  past_history_bite BOOLEAN,
  past_pep_completed BOOLEAN,
  
  -- Section 4: Vaccination Record (JSON or separate table)
  vaccination_record JSON,
  
  -- Section 5: Additional Meds
  erig_given BOOLEAN,
  tt_given BOOLEAN,
  ats_given BOOLEAN,
  
  -- Section 6: Diagnosis
  icd_10_code VARCHAR(20),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Option 2: Separate Vaccination Doses Table
Better for tracking individual doses:

```sql
CREATE TABLE vaccination_doses (
  id BIGINT PRIMARY KEY,
  treatment_card_id BIGINT,
  period ENUM('day_0', 'day_3', 'day_7', 'day_28', 'booster_1', 'booster_2'),
  route ENUM('ID', 'IM'),
  date_given DATE,
  given_by VARCHAR(255),
  signature_path VARCHAR(255),
  created_at TIMESTAMP
);
```

---

## 🎨 Form Design Notes

### Critical UX Considerations:

1. **Progressive Disclosure**
   - Show sections progressively
   - Don't overwhelm with all fields at once
   - Doctor fills exposure sections first
   - Nurse sees vaccination section highlighted

2. **Smart Pre-filling**
   - Pull data from Form 1 (demographics)
   - Pull data from Form 2 if exists (exposure details)
   - Minimize re-entry of same information

3. **Vaccination Table**
   - Clear grid layout
   - Easy to add dose records
   - Calculate dates automatically (Day 0 + 3, + 7, + 28)
   - Mark completed doses with ✓

4. **Follow-up Mode**
   - When patient returns for Day 3
   - Open same form in "update mode"
   - Highlight the dose to be given
   - Quick record entry

---

## ✅ Recommendations

### 1. Form 3 Should Be the Master Treatment Form
- Replace separate "Vaccination Schedule" concept
- This is the official form
- Contains everything needed
- Meets DOH/RHU requirements

### 2. Simplify Forms 1 and 2
- Form 1: Keep as patient demographics only
- Form 2: Keep as initial consultation/triage notes
- Form 3: Complete treatment and vaccination record

### 3. Make Form 3 Collaborative
- Doctor fills exposure sections
- Nurse fills vaccination sections
- Both roles can access same form
- Track who filled what section

### 4. Use Form 3 for Follow-ups
- Don't create new form for each visit
- Update existing Form 3
- Add vaccination dose records progressively
- One form per treatment episode

---

## 🚀 Implementation Priority

**HIGH PRIORITY**:
- Build Form 3 (Tagoloan Treatment Card) component
- Connect to queue workflow
- Implement progressive disclosure (sections)
- Add vaccination record table

**MEDIUM PRIORITY**:
- Smart pre-filling from Form 1/2
- Auto-calculate dates (Day 3 = Date of Exposure + 3)
- Validation logic

**LOW PRIORITY**:
- Signature capture
- Print/PDF export
- Digital signing

---

## 📝 Questions to Clarify

1. **When is Form 2 used?**
   - Is it still needed if Form 3 has exposure details?
   - Or is Form 2 for general consultations (non-bite)?

2. **Who fills what in Form 3?**
   - Can both doctor and nurse edit?
   - Or doctor fills first, then locks, then nurse continues?

3. **Follow-up workflow?**
   - Patient returns for Day 3 vaccine
   - Do they join queue again?
   - Or direct to treatment?

4. **Multiple treatment episodes?**
   - If patient gets bitten again (new incident)
   - Create new Form 3?
   - Or add to existing?

---

**Document Created**: July 31, 2026  
**Status**: Form 3 structure documented  
**Next**: Implement Tagoloan Treatment Card component  
**Priority**: HIGH (this is the core clinical form)
