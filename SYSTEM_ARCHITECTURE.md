# Animal Bite Clinic Management System - Architecture Design

## 🏗️ System Architecture Overview

### System Type: Single-Tenant, Multi-Deployment
- **One clinic per installation** (not SaaS)
- Each deployment operates independently
- Data isolation by design (no shared database)
- Reusable codebase across different clinic installations

---

## 📊 Database Schema Design

### Core Tables

#### 1. `clinics` Table
Stores single clinic information per installation.

```sql
CREATE TABLE clinics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    registration_number VARCHAR(100),
    logo_path VARCHAR(255),
    
    -- Template Selection
    template_id ENUM('template_a', 'template_b') NOT NULL,
    
    -- Theme Customization
    primary_color VARCHAR(7) DEFAULT '#0066cc',
    secondary_color VARCHAR(7) DEFAULT '#00cc66',
    
    -- Setup Status
    is_setup_complete BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP NULL,
    setup_by BIGINT NULL, -- admin user who completed setup
    
    -- Operational Status
    is_active BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. `users` Table
All system users (admin and staff).

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL, -- Always linked to clinic
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    -- Role Management
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    
    -- Account Status
    status ENUM('pending', 'active', 'inactive', 'suspended') DEFAULT 'pending',
    email_verified_at TIMESTAMP NULL,
    
    -- Profile
    phone VARCHAR(50),
    avatar_path VARCHAR(255),
    
    -- Security
    remember_token VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_clinic_email (clinic_id, email),
    INDEX idx_role (role)
);
```

#### 3. `staff_invitations` Table
Email-based staff invitation system.

```sql
CREATE TABLE staff_invitations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    invited_by BIGINT NOT NULL, -- admin user who sent invitation
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    role ENUM('staff', 'admin') DEFAULT 'staff',
    token VARCHAR(64) UNIQUE NOT NULL, -- secure random token
    
    -- Status Tracking
    status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL, -- 7 days from creation
    
    -- Acceptance Tracking
    accepted_at TIMESTAMP NULL,
    accepted_by BIGINT NULL, -- created user_id
    
    -- Metadata
    invitation_message TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_token (token),
    INDEX idx_email_status (email, status),
    INDEX idx_expires (expires_at)
);
```

#### 4. `templates` Table
Predefined clinic templates (seeded data).

```sql
CREATE TABLE templates (
    id VARCHAR(50) PRIMARY KEY, -- 'template_a', 'template_b'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- UI Configuration
    layout_config JSON, -- stores layout structure
    features JSON, -- enabled features per template
    
    -- Preview
    thumbnail_path VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 5. `clinic_settings` Table
Configurable clinic settings.

```sql
CREATE TABLE clinic_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    
    -- Setting Key-Value
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    UNIQUE KEY unique_clinic_setting (clinic_id, setting_key)
);
```

#### 6. Additional Core Tables (For Clinic Operations)

```sql
-- Patients
CREATE TABLE patients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    
    -- Registration
    registered_by BIGINT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id),
    INDEX idx_patient_number (patient_number),
    INDEX idx_clinic_patient (clinic_id, patient_number)
);

-- Animal Bite Cases
CREATE TABLE bite_cases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Bite Details
    bite_date DATE NOT NULL,
    bite_location TEXT, -- body part
    bite_severity ENUM('minor', 'moderate', 'severe') NOT NULL,
    animal_type VARCHAR(100), -- dog, cat, etc.
    animal_status ENUM('owned', 'stray', 'unknown'),
    
    -- Case Status
    status ENUM('new', 'in_treatment', 'completed', 'referred') DEFAULT 'new',
    
    -- Assignment
    assigned_to BIGINT NULL,
    
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Vaccination Schedule
CREATE TABLE vaccination_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    bite_case_id BIGINT NOT NULL,
    
    -- Schedule Details
    dose_number INT NOT NULL, -- 1, 2, 3, 4, etc.
    scheduled_date DATE NOT NULL,
    status ENUM('scheduled', 'completed', 'missed', 'rescheduled') DEFAULT 'scheduled',
    
    -- Administration
    administered_at TIMESTAMP NULL,
    administered_by BIGINT NULL,
    vaccine_batch_number VARCHAR(100),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_case_id) REFERENCES bite_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Queue Management
CREATE TABLE patient_queue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    bite_case_id BIGINT NULL,
    
    -- Queue Details
    queue_number INT NOT NULL,
    queue_date DATE NOT NULL,
    purpose ENUM('initial_visit', 'follow_up', 'vaccination') NOT NULL,
    
    -- Status
    status ENUM('waiting', 'in_consultation', 'completed', 'cancelled') DEFAULT 'waiting',
    
    -- Timing
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Assignment
    assigned_to BIGINT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_case_id) REFERENCES bite_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_queue_date_status (queue_date, status)
);
```

---

## 🔄 System Workflows

### 1. First-Time Setup Flow

```
┌─────────────────────────────────────┐
│  Admin Login (First Time)           │
│  Email: admin@clinic.com            │
│  Default Password: (provided)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  System Check                       │
│  - Check if clinic.is_setup_complete│
│  - If FALSE → Redirect to Setup     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 1: Clinic Profile             │
│  - Clinic Name                      │
│  - Address, Phone, Email            │
│  - Registration Number              │
│  - Upload Logo                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 2: Template Selection         │
│  - View Template A Preview          │
│  - View Template B Preview          │
│  - Select One Template              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 3: Theme Customization        │
│  - Primary Color Picker             │
│  - Secondary Color Picker           │
│  - Preview Changes                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 4: Confirmation               │
│  - Review All Settings              │
│  - Confirm Setup                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Setup Complete                     │
│  - Set is_setup_complete = TRUE     │
│  - Redirect to Dashboard            │
│  - System Fully Operational         │
└─────────────────────────────────────┘
```

### 2. Staff Invitation & Onboarding Flow

```
┌─────────────────────────────────────┐
│  Admin: Invite Staff                │
│  - Enter Email Address              │
│  - Select Role (staff/admin)        │
│  - Optional: Welcome Message        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: Generate Invitation       │
│  - Create staff_invitations record  │
│  - Generate secure random token     │
│  - Set expires_at (+7 days)         │
│  - Status = 'pending'               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Send Email                         │
│  To: staff@email.com                │
│  Subject: Invitation to Join Clinic │
│  Body: Click link to accept         │
│  Link: /accept-invitation/{token}   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Staff: Click Email Link            │
│  - Validates token                  │
│  - Checks if not expired            │
│  - Checks status = 'pending'        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Registration Form                  │
│  - Display Clinic Name              │
│  - Email (pre-filled, readonly)     │
│  - Full Name                        │
│  - Create Password                  │
│  - Confirm Password                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Create User Account                │
│  - Insert into users table          │
│  - Link to clinic_id                │
│  - Assign role from invitation      │
│  - Status = 'active'                │
│  - Update invitation:               │
│    - status = 'accepted'            │
│    - accepted_at = NOW()            │
│    - accepted_by = user.id          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Auto-Login & Redirect              │
│  - Generate auth token              │
│  - Redirect to Dashboard            │
│  - Show Welcome Message             │
└─────────────────────────────────────┘
```

### 3. Login & Access Control Flow

```
┌─────────────────────────────────────┐
│  User: Login Page                   │
│  - Enter Email                      │
│  - Enter Password                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Authenticate                       │
│  - Verify email + password          │
│  - Check status = 'active'          │
│  - Generate Sanctum token           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Load User Context                  │
│  - Fetch user with clinic data      │
│  - Load role permissions            │
│  - Check clinic.is_setup_complete   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Route Based on Role & Setup        │
│                                     │
│  IF role = 'admin' AND              │
│     !clinic.is_setup_complete       │
│  → Redirect to Setup Wizard         │
│                                     │
│  ELSE IF role = 'admin'             │
│  → Redirect to Admin Dashboard      │
│                                     │
│  ELSE IF role = 'staff'             │
│  → Redirect to Staff Dashboard      │
└─────────────────────────────────────┘
```

---

## 🔐 Security Architecture

### 1. Authentication Layer
```php
// middleware: EnsureClinicSetup.php
if (!$user->clinic->is_setup_complete && $user->role === 'admin') {
    return redirect()->route('setup.wizard');
}

// middleware: CheckUserStatus.php
if ($user->status !== 'active') {
    abort(403, 'Your account is not active');
}
```

### 2. Authorization Layer (Policies)

```php
// Policy: UserPolicy.php
public function viewAny(User $user): bool
{
    return $user->role === 'admin';
}

public function invite(User $user): bool
{
    return $user->role === 'admin';
}

// Policy: PatientPolicy.php
public function viewAny(User $user): bool
{
    // Both admin and staff can view patients
    return in_array($user->role, ['admin', 'staff']);
}

public function create(User $user): bool
{
    return in_array($user->role, ['admin', 'staff']);
}
```

### 3. Data Isolation
```php
// Global Scope: ClinicScope.php
// Automatically filters all queries by clinic_id
class ClinicScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (auth()->check()) {
            $builder->where('clinic_id', auth()->user()->clinic_id);
        }
    }
}
```

### 4. Token Security
- Use `Str::random(64)` for invitation tokens
- Hash tokens in database (optional for extra security)
- Set expiration (7 days recommended)
- One-time use tokens (mark as used after acceptance)

---

## 📱 Frontend Architecture

### Route Protection

```typescript
// routes/index.tsx
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { SetupRoute } from './SetupRoute';

<Routes>
  {/* Public */}
  <Route path="/login" element={<Login />} />
  <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
  
  {/* Setup (Admin only, if not setup) */}
  <Route element={<SetupRoute />}>
    <Route path="/setup/*" element={<SetupWizard />} />
  </Route>
  
  {/* Protected Routes */}
  <Route element={<ProtectedRoute />}>
    {/* Admin Only */}
    <Route element={<RoleRoute allowedRoles={['admin']} />}>
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/staff/invite" element={<InviteStaff />} />
      <Route path="/settings" element={<ClinicSettings />} />
    </Route>
    
    {/* Staff & Admin */}
    <Route element={<RoleRoute allowedRoles={['admin', 'staff']} />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/patients/*" element={<Patients />} />
      <Route path="/queue" element={<Queue />} />
      <Route path="/vaccinations/*" element={<Vaccinations />} />
    </Route>
  </Route>
</Routes>
```

### Context Providers

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  isAdmin: boolean;
  isStaff: boolean;
  isSetupComplete: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
}

// contexts/ClinicContext.tsx
interface ClinicContextType {
  clinic: Clinic;
  template: Template;
  theme: ThemeConfig;
  updateClinic: (data) => Promise<void>;
}
```

---

## 🚀 Scalability Considerations

### 1. Multi-Deployment Strategy
- **Docker containerization** for easy deployment
- **Environment-based configuration** (.env per clinic)
- **Automated backup scripts** per installation
- **Update mechanism** without data loss

### 2. Performance Optimization
- **Database indexing** on foreign keys and frequently queried fields
- **Query optimization** with eager loading
- **Caching strategy** for clinic settings and templates
- **API response pagination** for large datasets

### 3. Future-Proofing
- **Template system** allows adding Template C, D, etc.
- **Settings table** supports dynamic feature toggles
- **Modular architecture** for adding new modules
- **API versioning** (/api/v1/) for backward compatibility

---

## 📦 Implementation Priority

### Phase 1: Core Foundation (Week 1-2)
1. Database migrations for core tables
2. Authentication system (Sanctum + Login)
3. Clinic setup wizard (admin first-time flow)
4. Basic admin dashboard

### Phase 2: Staff Management (Week 3)
1. Staff invitation system
2. Email service integration
3. Accept invitation flow
4. User management UI

### Phase 3: Template System (Week 4)
1. Template seeding
2. Template preview components
3. Template switching logic
4. Theme customization

### Phase 4: Core Operations (Week 5-6)
1. Patient management
2. Bite case tracking
3. Vaccination scheduling
4. Queue management

### Phase 5: Reporting & Polish (Week 7-8)
1. Reports and analytics
2. Mobile app integration
3. Testing and QA
4. Documentation

---

## 🔧 Technology Stack Recommendations

### Backend
- **Laravel 12** - Framework
- **MySQL/PostgreSQL** - Database
- **Laravel Sanctum** - API Authentication
- **Laravel Mail** - Email invitations
- **Laravel Queue** - Background jobs
- **Laravel Policy** - Authorization
- **Laravel Scopes** - Data isolation

### Frontend
- **React 19 + TypeScript** - UI Framework
- **React Router v6** - Routing
- **React Context + Hooks** - State management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Tailwind CSS** - Styling

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **MySQL Backup Scripts** - Data safety

---

This architecture provides:
✅ Clear separation of concerns
✅ Secure role-based access
✅ Scalable multi-deployment model
✅ Email-based staff onboarding
✅ Template-based customization
✅ Data isolation by design
✅ Future-proof extensibility
