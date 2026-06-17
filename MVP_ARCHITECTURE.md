# Animal Bite Clinic Management System - MVP Architecture

## 🎯 Phased Development Approach

### Phase 1: MVP (Core Foundation) - Priority
**Goal**: Get a working system with essential features

**Features**:
- ✅ Login system (email + password)
- ✅ Clinic setup wizard (admin only, first-time)
- ✅ Manual staff creation (admin creates users directly)
- ✅ Patient registration
- ✅ Queue management
- ✅ Bite case tracking
- ✅ Vaccination scheduling and recording

**Complexity**: Simple, focused, deliverable quickly

### Phase 2: Enhanced Workflow (Upgrade)
**Goal**: Improve user management and security

**Features**:
- 📧 Email invitation system for staff
- 🔐 Enhanced role permissions
- 📊 Better reporting
- 🔔 Notifications

### Phase 3: Customization (Nice-to-Have)
**Goal**: Multi-template support and branding

**Features**:
- 🎨 Template A & B with different layouts
- 🎨 Theme customization (colors, logo)
- 📱 Better mobile responsiveness
- 🌐 Multi-language support (future)

---

## 👥 User Roles (4 Types)

### 1. Admin
**Permissions**: Full system access
- Clinic setup and configuration
- Create/manage all staff accounts
- View all system data
- System settings


### 2. Registration Staff
**Permissions**: Patient management and check-in
- Register new patients
- Edit patient information
- Add patients to queue (check-in)
- View patient records
- Search patients

### 3. Triage/Doctor Staff
**Permissions**: Medical assessment and case creation
- View patient queue
- Create bite case records
- Document bite details (location, severity, animal type)
- Schedule vaccination doses
- Update case status
- Assign cases for treatment

### 4. Treatment Recording Staff
**Permissions**: Vaccination administration
- View vaccination schedules (today's/upcoming)
- Record vaccine administration
- Update vaccination status (completed/missed)
- Document vaccine batch numbers
- Mark doses as complete

---

## 📊 MVP Database Schema

### Simplified Tables for Phase 1

#### 1. `clinics` Table (Simplified)
```sql
CREATE TABLE clinics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_path VARCHAR(255),
    
    -- Setup Status
    is_setup_complete BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. `users` Table (4 Roles)
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    -- Role (4 types)
    role ENUM('admin', 'registration', 'triage', 'treatment') NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Profile
    phone VARCHAR(50),
    
    -- Security
    remember_token VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_clinic_email (clinic_id, email),
    INDEX idx_role (role)
);
```

#### 3. `patients` Table
```sql
CREATE TABLE patients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: P-2024-0001
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female') DEFAULT 'male',
    
    -- Contact
    phone VARCHAR(50),
    address TEXT,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    
    -- Registration
    registered_by BIGINT NOT NULL, -- registration staff user_id
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id),
    INDEX idx_patient_number (patient_number),
    INDEX idx_name (first_name, last_name)
);
```

#### 4. `bite_cases` Table
```sql
CREATE TABLE bite_cases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    case_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: BC-2024-0001
    
    -- Bite Details
    bite_date DATE NOT NULL,
    bite_location VARCHAR(255) NOT NULL, -- e.g., "Right hand", "Left leg"
    bite_severity ENUM('minor', 'moderate', 'severe') NOT NULL,
    animal_type VARCHAR(100) NOT NULL, -- dog, cat, rat, etc.
    animal_status ENUM('owned', 'stray', 'unknown') DEFAULT 'unknown',
    
    -- Additional Details
    symptoms TEXT, -- bleeding, swelling, etc.
    notes TEXT,
    
    -- Case Status
    status ENUM('active', 'completed', 'referred', 'abandoned') DEFAULT 'active',
    
    -- Created by triage/doctor staff
    created_by BIGINT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_case_number (case_number),
    INDEX idx_status (status)
);
```

#### 5. `vaccination_schedules` Table
```sql
CREATE TABLE vaccination_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    bite_case_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL, -- denormalized for quick access
    
    -- Schedule Details
    dose_number INT NOT NULL, -- 1, 2, 3, 4, 5 (typical rabies schedule)
    scheduled_date DATE NOT NULL,
    status ENUM('scheduled', 'completed', 'missed', 'rescheduled') DEFAULT 'scheduled',
    
    -- Administration (filled by treatment staff)
    administered_at TIMESTAMP NULL,
    administered_by BIGINT NULL, -- treatment staff user_id
    vaccine_batch_number VARCHAR(100),
    administration_notes TEXT,
    
    -- Scheduling info
    scheduled_by BIGINT NOT NULL, -- triage/doctor who scheduled
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_case_id) REFERENCES bite_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (scheduled_by) REFERENCES users(id),
    
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_status (status),
    INDEX idx_patient_schedule (patient_id, scheduled_date)
);
```

#### 6. `patient_queue` Table
```sql
CREATE TABLE patient_queue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    bite_case_id BIGINT NULL, -- NULL for new patients, filled for follow-ups
    
    -- Queue Details
    queue_number INT NOT NULL, -- 1, 2, 3... (daily counter)
    queue_date DATE NOT NULL,
    visit_type ENUM('new_case', 'follow_up', 'vaccination') NOT NULL,
    
    -- Status
    status ENUM('waiting', 'in_consultation', 'completed', 'cancelled') DEFAULT 'waiting',
    
    -- Timing
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL, -- when triage calls the patient
    completed_at TIMESTAMP NULL,
    
    -- Staff tracking
    checked_in_by BIGINT NOT NULL, -- registration staff
    handled_by BIGINT NULL, -- triage/doctor staff
    
    -- Notes
    check_in_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_case_id) REFERENCES bite_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (checked_in_by) REFERENCES users(id),
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_daily_queue (clinic_id, queue_date, queue_number),
    INDEX idx_queue_date_status (queue_date, status)
);
```

---

## 🔄 MVP Workflows

### 1. First-Time Setup (Admin Only)

```
Admin Login (first time)
    ↓
System detects: is_setup_complete = FALSE
    ↓
Redirect to Setup Wizard
    ↓
┌─────────────────────────────────┐
│ Step 1: Clinic Information      │
│ - Name                          │
│ - Address                       │
│ - Phone                         │
│ - Email                         │
│ - Upload Logo                   │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Step 2: Review & Confirm        │
│ - Preview clinic info           │
│ - Confirm setup                 │
└─────────────────────────────────┘
    ↓
Set is_setup_complete = TRUE
    ↓
Redirect to Admin Dashboard
```

### 2. Staff Creation (Manual - MVP)

```
Admin Dashboard
    ↓
Navigate to "User Management"
    ↓
Click "Add New Staff"
    ↓
┌─────────────────────────────────┐
│ Create Staff Form               │
│ - Full Name                     │
│ - Email                         │
│ - Phone                         │
│ - Role: [dropdown]              │
│   * Registration Staff          │
│   * Triage/Doctor Staff         │
│   * Treatment Recording Staff   │
│ - Temporary Password            │
│ - Force Password Change: ✓     │
└─────────────────────────────────┘
    ↓
Create user account
    ↓
Send credentials via email/SMS
    (or print and give manually)
    ↓
Staff logs in with temporary password
    ↓
Forced to change password on first login
```

### 3. Patient Registration Flow (Registration Staff)

```
Registration Staff Dashboard
    ↓
Click "Register New Patient"
    ↓
┌─────────────────────────────────┐
│ Patient Registration Form       │
│ - First Name                    │
│ - Last Name                     │
│ - Date of Birth                 │
│ - Gender                        │
│ - Phone                         │
│ - Address                       │
│ - Emergency Contact Name        │
│ - Emergency Contact Phone       │
└─────────────────────────────────┘
    ↓
System auto-generates patient_number
(e.g., P-2024-0001)
    ↓
Save patient record
    ↓
Option: "Add to Queue Now"
    ↓
If Yes → Create queue entry
    ↓
Print queue ticket/receipt
```

### 4. Queue Management Flow

```
┌─────────────────────────────────┐
│ Registration Staff:             │
│ - Patient arrives               │
│ - Check if existing patient     │
│   * New: Register first         │
│   * Existing: Search & select   │
│ - Add to today's queue          │
│ - Select visit type:            │
│   * New Case                    │
│   * Follow-up                   │
│   * Vaccination                 │
│ - Get queue number (auto)       │
│ - Print ticket                  │
└─────────────────────────────────┘
    ↓
Patient waits in queue (status: waiting)
    ↓
┌─────────────────────────────────┐
│ Triage/Doctor Staff:            │
│ - View queue list               │
│ - Call next patient             │
│ - Status → "in_consultation"    │
│ - Conduct assessment            │
└─────────────────────────────────┘
    ↓
Complete consultation
    ↓
Status → "completed"
```

### 5. Bite Case Creation Flow (Triage/Doctor)

```
Triage Dashboard
    ↓
View patient from queue
    ↓
Click "Create Bite Case"
    ↓
┌─────────────────────────────────┐
│ Bite Case Form                  │
│ - Patient: [auto-filled]        │
│ - Bite Date                     │
│ - Bite Location (body part)     │
│ - Bite Severity: [dropdown]     │
│   * Minor                       │
│   * Moderate                    │
│   * Severe                      │
│ - Animal Type (dog/cat/rat)     │
│ - Animal Status                 │
│   * Owned                       │
│   * Stray                       │
│   * Unknown                     │
│ - Symptoms                      │
│ - Additional Notes              │
└─────────────────────────────────┘
    ↓
System auto-generates case_number
(e.g., BC-2024-0001)
    ↓
Save bite case
    ↓
Proceed to "Schedule Vaccinations"
```

### 6. Vaccination Scheduling Flow (Triage/Doctor)

```
After creating bite case
    ↓
┌─────────────────────────────────┐
│ Vaccination Schedule            │
│ Based on WHO/local protocol:    │
│                                 │
│ Dose 1: Day 0 (Today)           │
│ Dose 2: Day 3                   │
│ Dose 3: Day 7                   │
│ Dose 4: Day 14                  │
│ Dose 5: Day 28                  │
│                                 │
│ [Confirm Schedule]              │
└─────────────────────────────────┘
    ↓
System creates 5 vaccination_schedules records
    ↓
Status: "scheduled"
    ↓
Patient notified of schedule
```

### 7. Vaccination Administration Flow (Treatment Staff)

```
Treatment Staff Dashboard
    ↓
View "Today's Vaccinations"
    ↓
List shows:
- Patient name
- Dose number
- Case number
- Scheduled time
- Status
    ↓
Select patient
    ↓
┌─────────────────────────────────┐
│ Administer Vaccination          │
│ - Patient: [display]            │
│ - Dose: [display]               │
│ - Vaccine Batch Number          │
│ - Administration Time: [now]    │
│ - Notes                         │
│ - Confirm Administration        │
└─────────────────────────────────┘
    ↓
Update vaccination_schedules:
- status = "completed"
- administered_at = NOW()
- administered_by = current_user
- vaccine_batch_number = input
    ↓
Print vaccination certificate
    ↓
Next patient
```

---

## 🔐 MVP Access Control Matrix

| Feature | Admin | Registration | Triage/Doctor | Treatment |
|---------|-------|-------------|---------------|-----------|
| **Clinic Setup** | ✅ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ❌ | ❌ | ❌ |
| **Register Patients** | ✅ | ✅ | ❌ | ❌ |
| **Edit Patients** | ✅ | ✅ | ❌ | ❌ |
| **View Patients** | ✅ | ✅ | ✅ | ✅ |
| **Add to Queue** | ✅ | ✅ | ❌ | ❌ |
| **View Queue** | ✅ | ✅ | ✅ | ❌ |
| **Call from Queue** | ✅ | ❌ | ✅ | ❌ |
| **Create Bite Case** | ✅ | ❌ | ✅ | ❌ |
| **Edit Bite Case** | ✅ | ❌ | ✅ | ❌ |
| **Schedule Vaccinations** | ✅ | ❌ | ✅ | ❌ |
| **View Vaccination Schedule** | ✅ | ❌ | ✅ | ✅ |
| **Record Vaccination** | ✅ | ❌ | ❌ | ✅ |
| **View Reports** | ✅ | ✅ | ✅ | ✅ |

---

## 📦 MVP Implementation Order

### Week 1: Foundation
1. ✅ Database migrations (6 core tables)
2. ✅ Models with relationships
3. ✅ Authentication system (Sanctum)
4. ✅ Clinic setup wizard (admin)

### Week 2: User Management
1. ✅ Manual staff creation (admin)
2. ✅ User CRUD operations
3. ✅ Role-based middleware
4. ✅ First login password change

### Week 3: Patient Management
1. ✅ Patient registration form
2. ✅ Patient search/list
3. ✅ Patient details view
4. ✅ Auto-generate patient numbers

### Week 4: Queue System
1. ✅ Add patient to queue
2. ✅ Queue display (registration view)
3. ✅ Queue display (triage view)
4. ✅ Call patient from queue
5. ✅ Queue status updates

### Week 5: Bite Case Management
1. ✅ Create bite case form
2. ✅ Link to patient
3. ✅ Case details view
4. ✅ Case status tracking
5. ✅ Auto-generate case numbers

### Week 6: Vaccination Module
1. ✅ Auto-generate vaccination schedule
2. ✅ View schedules (triage)
3. ✅ Today's vaccinations (treatment)
4. ✅ Record administration
5. ✅ Vaccination status tracking

### Week 7: Frontend Polish
1. ✅ Dashboard for each role
2. ✅ Navigation based on role
3. ✅ Forms validation
4. ✅ Error handling
5. ✅ Loading states

### Week 8: Testing & Deployment
1. ✅ End-to-end testing
2. ✅ Bug fixes
3. ✅ Documentation
4. ✅ Deployment setup

---

## 🚀 Phase 2 Additions (Future)

- Email invitation system
- Password reset via email
- Enhanced permissions (granular)
- Activity logs
- Advanced reporting
- SMS notifications

## 🎨 Phase 3 Additions (Future)

- Template A & B selection
- Theme customization
- Logo upload
- Color schemes
- Multi-language

---

This MVP architecture focuses on delivering core functionality quickly while maintaining a clean structure for future enhancements.
