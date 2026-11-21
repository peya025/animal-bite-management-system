# Role-Based Dashboard Plans

**Purpose**: Define what each user role should see and do on their dashboard  
**Last Updated**: July 27, 2026

---

## 📋 **Table of Contents**

1. [System Roles Overview](#system-roles-overview)
2. [Admin Dashboard](#admin-dashboard)
3. [Registration Dashboard](#registration-dashboard)
4. [Triage Dashboard](#triage-dashboard)
5. [Treatment Dashboard](#treatment-dashboard)
6. [Common Elements](#common-elements)
7. [Implementation Checklist](#implementation-checklist)

---

## 🎭 **System Roles Overview**

| Role | Primary Responsibility | Access Level | User Type |
|------|----------------------|--------------|-----------|
| **Admin** | System management, oversight, reports | Full access | Administrator |
| **Registration** | Patient intake, registration, queue | Limited | Front desk staff |
| **Triage** | Case assessment, vaccination scheduling | Clinical | Doctor/Nurse |
| **Treatment** | Vaccination administration, treatment | Clinical | Nurse/Pharmacist |

---

## 👑 **Admin Dashboard**

### **Role**: System Administrator
**Persona**: Clinic Manager, Head Nurse, Director

### **Primary Goals**
- Monitor overall clinic operations
- Manage users and system settings
- View comprehensive reports and analytics
- Oversee all departments


### **Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 KEY METRICS (4 Statistics Cards)                        │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ 👥 Total │ 🩺 Active│ 💉 Pending│ 📋 Today's│           │
│  │ Patients │ Cases    │ Vaccines │ Queue     │           │
│  │   250    │    15    │    32    │    8      │           │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  📈 SYSTEM OVERVIEW                                         │
│  ┌────────────────────────┬────────────────────────┐       │
│  │ Recent Activity        │ System Alerts          │       │
│  │ • New patient (2 min)  │ ⚠️ Low vaccine stock   │       │
│  │ • Case created (5 min) │ ⚠️ 5 overdue vaccines  │       │
│  │ • Vaccine admin (10min)│ ✅ All systems normal  │       │
│  └────────────────────────┴────────────────────────┘       │
│                                                             │
│  🗂️ MANAGEMENT SECTIONS                                     │
│  ┌───────────┬───────────┬───────────┬───────────┐        │
│  │ Recent    │ Quick     │ Reports   │ Bite Map  │        │
│  │ Patients  │ Actions   │ Summary   │ Preview   │        │
│  │           │           │           │           │        │
│  │ • John D. │ 👥 Users  │ 📊 Stats  │ 🗺️ [Map]  │        │
│  │ • Mary S. │ ⚙️ Settings│ 📄 Export │ 45 cases  │        │
│  │ • Peter L.│ 🔔 Invites│ 📈 Trends │ View Full │        │
│  └───────────┴───────────┴───────────┴───────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### **Components to Display**

#### **1. Statistics Cards** (Top Row - 4 cards)
```typescript
// Card 1: Total Patients
{
  label: "Total Patients",
  value: stats.total_patients,
  icon: "👥",
  color: "blue",
  trend: "+12 this month",
  link: "/patients"
}

// Card 2: Active Bite Cases
{
  label: "Active Bite Cases",
  value: stats.active_cases,
  icon: "🩺",
  color: "red",
  trend: "3 critical",
  link: "/bite-cases"
}

// Card 3: Pending Vaccinations
{
  label: "Pending Vaccinations",
  value: stats.pending_vaccinations,
  icon: "💉",
  color: "yellow",
  trend: "5 due today",
  link: "/vaccinations"
}

// Card 4: Queue Status
{
  label: "Today's Queue",
  value: stats.today_queue,
  icon: "📋",
  color: "green",
  trend: "3 waiting",
  link: "/queue"
}
```


#### **2. Recent Activity Feed** (Left Column)
```typescript
{
  title: "Recent Activity",
  items: [
    {
      type: "patient_registered",
      message: "New patient registered: John Doe",
      time: "2 minutes ago",
      icon: "👤",
      link: "/patients/123"
    },
    {
      type: "case_created",
      message: "Bite case BC-2026-0045 created",
      time: "5 minutes ago",
      icon: "🩺",
      link: "/bite-cases/45"
    },
    {
      type: "vaccination_administered",
      message: "Vaccination administered to Mary Smith",
      time: "10 minutes ago",
      icon: "💉",
      link: "/vaccinations/67"
    },
    {
      type: "user_added",
      message: "New staff member added: Dr. Santos",
      time: "1 hour ago",
      icon: "👥",
      link: "/users/8"
    }
  ],
  showMore: "/activity-log"
}
```

#### **3. System Alerts** (Right Column)
```typescript
{
  title: "System Alerts",
  alerts: [
    {
      type: "warning",
      severity: "high",
      message: "Low vaccine stock: Anti-Rabies (10 vials remaining)",
      icon: "⚠️",
      action: "Reorder",
      link: "/inventory"
    },
    {
      type: "warning",
      severity: "medium",
      message: "5 overdue vaccinations need attention",
      icon: "⏰",
      action: "View",
      link: "/vaccinations?status=overdue"
    },
    {
      type: "info",
      severity: "low",
      message: "System backup completed successfully",
      icon: "✅",
      time: "Today at 2:00 AM"
    }
  ]
}
```


#### **4. Recent Patients** (Bottom Left)
```typescript
{
  title: "Recent Patients",
  subtitle: "Last 5 registrations",
  patients: [
    {
      id: 123,
      name: "John Doe",
      patient_number: "P-2026-0123",
      registration_date: "2026-07-27",
      avatar: "JD",
      status: "active"
    },
    // ... 4 more
  ],
  actions: [
    { label: "View All", link: "/patients" },
    { label: "Register New", link: "/patients/new" }
  ]
}
```

#### **5. Quick Actions** (Bottom Center-Left)
```typescript
{
  title: "Quick Actions",
  actions: [
    {
      label: "Manage Users",
      icon: "👥",
      color: "blue",
      link: "/users"
    },
    {
      label: "Clinic Settings",
      icon: "⚙️",
      color: "gray",
      link: "/setup"
    },
    {
      label: "Send Invitations",
      icon: "📧",
      color: "green",
      link: "/invitations"
    },
    {
      label: "View Reports",
      icon: "📊",
      color: "purple",
      link: "/reports"
    },
    {
      label: "Bite Map",
      icon: "🗺️",
      color: "red",
      link: "/bite-map"
    },
    {
      label: "Vaccine Inventory",
      icon: "💊",
      color: "orange",
      link: "/inventory"
    }
  ]
}
```


#### **6. Reports Summary** (Bottom Center-Right)
```typescript
{
  title: "Reports Summary",
  subtitle: "This month",
  stats: [
    { label: "New Patients", value: 45, change: "+12%" },
    { label: "Bite Cases", value: 38, change: "+8%" },
    { label: "Vaccinations", value: 156, change: "+15%" },
    { label: "Completion Rate", value: "94%", change: "+2%" }
  ],
  actions: [
    { label: "Generate Report", link: "/reports?action=generate" },
    { label: "Export Data", link: "/reports?action=export" }
  ]
}
```

#### **7. Bite Map Preview** (Bottom Right)
```typescript
{
  title: "Bite Location Map",
  type: "widget",
  preview: "mini-map", // 200px height
  stats: {
    total_cases: 45,
    hotspots: [
      { location: "Manila", count: 28 },
      { location: "Quezon City", count: 17 }
    ]
  },
  action: {
    label: "View Full Map",
    link: "/bite-map"
  }
}
```

### **Sidebar Navigation (Admin)**
```typescript
[
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Patients", icon: "👥", path: "/patients" },
  { label: "Bite Cases", icon: "🩺", path: "/bite-cases" },
  { label: "Vaccinations", icon: "💉", path: "/vaccinations" },
  { label: "Queue", icon: "📋", path: "/queue" },
  { label: "Inventory", icon: "💊", path: "/inventory" },
  { label: "Bite Map", icon: "🗺️", path: "/bite-map" }, // NEW
  { label: "Reports", icon: "📊", path: "/reports" },
  { label: "Users", icon: "👤", path: "/users" },
  { label: "Invitations", icon: "📧", path: "/invitations" },
  { label: "Settings", icon: "⚙️", path: "/setup" }
]
```


---

## 📝 **Registration Dashboard**

### **Role**: Registration Staff
**Persona**: Front desk receptionist, Admissions clerk

### **Primary Goals**
- Register new patients quickly
- Manage patient queue
- Search and update patient records
- Handle walk-ins efficiently

### **Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Registration Dashboard                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Good morning, Maria! 👋                                    │
│  Friday, July 27, 2026                                      │
│                                                             │
│  📊 KEY METRICS (3 Statistics Cards)                        │
│  ┌──────────┬──────────┬──────────┐                        │
│  │ 👥 Total │ 📋 Queue │ 🆕 Today's│                       │
│  │ Patients │ Waiting  │ Registra. │                       │
│  │   250    │    8     │    5      │                       │
│  └──────────┴──────────┴──────────┘                        │
│                                                             │
│  ⚡ QUICK REGISTRATION                                       │
│  ┌─────────────────────────────────────────┐               │
│  │  [+] Register New Patient (Primary CTA) │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  📋 TODAY'S QUEUE                 🔍 PATIENT SEARCH         │
│  ┌────────────────────┬────────────────────┐               │
│  │ Queue #01          │ Search by name or  │               │
│  │ John Doe           │ patient number...  │               │
│  │ Status: Waiting    │ [Search Bar]       │               │
│  │ [Call] [Remove]    │                    │               │
│  │                    │ Recent Searches:   │               │
│  │ Queue #02          │ • Mary Smith       │               │
│  │ Mary Smith         │ • P-2026-0120      │               │
│  │ Status: In Progress│ • John Doe         │               │
│  │ [Complete]         │                    │               │
│  └────────────────────┴────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### **Components to Display**

#### **1. Greeting Header**
```typescript
{
  greeting: "Good morning", // Based on time
  userName: user.name.split(' ')[0],
  date: new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
```


#### **2. Statistics Cards** (3 cards)
```typescript
// Card 1: Total Patients
{
  label: "Total Patients",
  value: stats.total_patients,
  icon: "👥",
  color: "blue"
}

// Card 2: Queue Waiting
{
  label: "Queue Waiting",
  value: stats.queue_waiting,
  icon: "📋",
  color: "orange",
  trend: "3 waiting"
}

// Card 3: Today's Registrations
{
  label: "Today's Registrations",
  value: stats.today_registrations,
  icon: "🆕",
  color: "green"
}
```

#### **3. Quick Registration Button** (Primary CTA)
```typescript
{
  label: "Register New Patient",
  icon: "+",
  color: "primary",
  size: "large",
  action: () => navigate('/patients/new')
}
```

#### **4. Today's Queue List** (Left Side)
```typescript
{
  title: "Today's Queue",
  subtitle: `${queueCount} patients waiting`,
  items: queue.map(item => ({
    id: item.queue_id,
    queue_number: item.queue_number,
    patient_name: item.patient.name,
    patient_number: item.patient.patient_number,
    status: item.status, // waiting, in_progress, completed
    time_added: item.created_at,
    actions: [
      {
        label: "Call",
        action: () => callPatient(item.queue_id),
        show: item.status === 'waiting'
      },
      {
        label: "Remove",
        action: () => removeFromQueue(item.queue_id),
        show: item.status === 'waiting'
      },
      {
        label: "Complete",
        action: () => completeQueue(item.queue_id),
        show: item.status === 'in_progress'
      }
    ]
  })),
  emptyState: {
    icon: "📋",
    message: "No patients in queue",
    action: "Add Patient to Queue"
  }
}
```


#### **5. Patient Search** (Right Side)
```typescript
{
  title: "Patient Search",
  searchBar: {
    placeholder: "Search by name or patient number...",
    onSearch: (query) => searchPatients(query),
    debounce: 300
  },
  recentSearches: [
    { label: "Mary Smith", link: "/patients/124" },
    { label: "P-2026-0120", link: "/patients/120" },
    { label: "John Doe", link: "/patients/123" }
  ],
  quickFilters: [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" }
  ]
}
```

#### **6. Quick Actions**
```typescript
{
  title: "Quick Actions",
  actions: [
    {
      label: "Register New Patient",
      icon: "➕",
      color: "primary",
      link: "/patients/new"
    },
    {
      label: "Add to Queue",
      icon: "📋",
      color: "blue",
      link: "/queue/add"
    },
    {
      label: "Search Patients",
      icon: "🔍",
      color: "gray",
      link: "/patients"
    },
    {
      label: "View All Queue",
      icon: "📊",
      color: "orange",
      link: "/queue"
    }
  ]
}
```

### **Sidebar Navigation (Registration)**
```typescript
[
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Patients", icon: "👥", path: "/patients" },
  { label: "Queue", icon: "📋", path: "/queue" },
  { label: "Bite Intakes", icon: "📝", path: "/bite-intakes" }, // View only
  { label: "My Profile", icon: "👤", path: "/profile" }
]
```


---

## 🏥 **Triage Dashboard**

### **Role**: Triage Nurse/Doctor
**Persona**: Triage nurse, Emergency doctor, Assessment specialist

### **Primary Goals**
- Assess new bite cases
- Create bite incident records
- Schedule vaccinations
- Monitor active cases
- Manage patient queue

### **Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Good afternoon, Dr. Santos! 👋                             │
│  Friday, July 27, 2026                                      │
│                                                             │
│  [+ New Bite Case] ← Primary CTA                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 KEY METRICS (4 Statistics Cards)                        │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ 🩺 Active│ 📋 Queue │ 💉 Pending│ 👥 Total │           │
│  │ Cases    │ Waiting  │ Vaccines │ Patients │           │
│  │    15    │    8     │    32    │   250    │           │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  📋 TODAY'S QUEUE      🩺 ACTIVE CASES    💉 VACCINATIONS  │
│  ┌────────────────┬────────────────┬────────────────┐     │
│  │ #01 John Doe   │ BC-2026-0045   │ Mary Smith     │     │
│  │ Waiting        │ Category III   │ Dose 2 - Today │     │
│  │ [Call]         │ Dog bite       │ [View]         │     │
│  │                │ [View Details] │                │     │
│  │ #02 Mary Smith │                │ John Doe       │     │
│  │ In Progress    │ BC-2026-0044   │ Dose 1 - Today │     │
│  │ [Complete]     │ Category II    │ [View]         │     │
│  │                │ Cat scratch    │                │     │
│  └────────────────┴────────────────┴────────────────┘     │
│                                                             │
│  ⚡ QUICK ACTIONS                                            │
│  [New Bite Case] [View Queue] [Vaccinations] [Patients]   │
└─────────────────────────────────────────────────────────────┘
```

### **Components to Display**

#### **1. Hero Section with Primary CTA**
```typescript
{
  greeting: "Good afternoon",
  userName: "Dr. " + user.name.split(' ').pop(), // Last name
  date: getCurrentDate(),
  primaryAction: {
    label: "New Bite Case",
    icon: "+",
    size: "large",
    color: "primary",
    link: "/bite-cases/new"
  }
}
```


#### **2. Statistics Cards** (4 cards)
```typescript
// Card 1: Active Bite Cases
{
  label: "Active Bite Cases",
  value: stats.active_cases,
  icon: "🩺",
  color: "red",
  trend: "3 critical",
  link: "/bite-cases?status=active"
}

// Card 2: Queue Waiting
{
  label: "Waiting in Queue",
  value: stats.queue_waiting,
  icon: "📋",
  color: "blue",
  link: "/queue"
}

// Card 3: Pending Vaccinations
{
  label: "Pending Vaccinations",
  value: stats.pending_vaccinations,
  icon: "💉",
  color: "yellow",
  trend: "5 due today",
  link: "/vaccinations?status=pending"
}

// Card 4: Total Patients
{
  label: "Total Patients",
  value: stats.total_patients,
  icon: "👥",
  color: "green",
  link: "/patients"
}
```

#### **3. Today's Queue** (Left Column)
```typescript
{
  title: "Today's Queue",
  subtitle: `${queueCount} patients waiting`,
  items: queue.slice(0, 5).map(item => ({
    queue_number: item.queue_number,
    patient: {
      name: item.patient.name,
      patient_number: item.patient.patient_number
    },
    status: item.status,
    priority: item.priority,
    time_waiting: calculateWaitTime(item.created_at),
    actions: [
      {
        label: "Call",
        icon: "📞",
        action: () => callPatient(item.queue_id),
        show: item.status === 'waiting',
        color: "primary"
      },
      {
        label: "Complete",
        icon: "✓",
        action: () => completeQueue(item.queue_id),
        show: item.status === 'in_progress',
        color: "success"
      }
    ]
  })),
  viewAllLink: "/queue",
  emptyState: {
    icon: "📋",
    message: "No patients in queue"
  }
}
```


#### **4. Active Bite Cases** (Center Column)
```typescript
{
  title: "Active Bite Cases",
  subtitle: `${activeCasesCount} ongoing cases`,
  items: activeCases.slice(0, 5).map(caseItem => ({
    case_number: caseItem.case_number,
    patient_name: caseItem.patient.name,
    category: caseItem.severity, // Category I, II, III
    animal_type: caseItem.animal_type,
    bite_date: caseItem.bite_date,
    days_since_bite: calculateDaysSince(caseItem.bite_date),
    status: caseItem.status,
    urgency: determineUrgency(caseItem),
    badge: {
      label: getCategoryLabel(caseItem.severity),
      color: getCategoryColor(caseItem.severity)
      // Category III = red, II = orange, I = green
    },
    actions: [
      {
        label: "View Details",
        link: `/bite-cases/${caseItem.bite_id}`
      }
    ]
  })),
  viewAllLink: "/bite-cases?status=active",
  emptyState: {
    icon: "🩺",
    message: "No active bite cases"
  }
}
```

#### **5. Upcoming Vaccinations** (Right Column)
```typescript
{
  title: "Upcoming Vaccinations",
  subtitle: "Next 24 hours",
  items: upcomingVaccinations.slice(0, 5).map(vax => ({
    patient: {
      name: vax.patient.name,
      patient_number: vax.patient.patient_number
    },
    dose_number: vax.dose_number,
    dose_label: `Dose ${vax.dose_number} of 5`,
    scheduled_date: vax.scheduled_date,
    time_until: calculateTimeUntil(vax.scheduled_date),
    status: vax.status,
    badge: {
      label: vax.status,
      color: getStatusColor(vax.status)
      // pending=yellow, overdue=red, completed=green
    },
    actions: [
      {
        label: "View",
        link: `/vaccinations/${vax.treatment_id}`
      }
    ]
  })),
  viewAllLink: "/vaccinations",
  emptyState: {
    icon: "💉",
    message: "No vaccinations scheduled today"
  }
}
```


#### **6. Quick Actions Grid**
```typescript
{
  title: "Quick Actions",
  actions: [
    {
      label: "New Bite Case",
      icon: "🩺",
      color: "red",
      size: "large",
      link: "/bite-cases/new"
    },
    {
      label: "View Queue",
      icon: "📋",
      color: "blue",
      link: "/queue"
    },
    {
      label: "Vaccinations",
      icon: "💉",
      color: "yellow",
      link: "/vaccinations"
    },
    {
      label: "All Patients",
      icon: "👥",
      color: "green",
      link: "/patients"
    }
  ]
}
```

### **Sidebar Navigation (Triage)**
```typescript
[
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Queue", icon: "📋", path: "/queue" },
  { label: "Bite Cases", icon: "🩺", path: "/bite-cases" },
  { label: "Patients", icon: "👥", path: "/patients" },
  { label: "Vaccinations", icon: "💉", path: "/vaccinations" },
  { label: "Bite Intakes", icon: "📝", path: "/bite-intakes" },
  { label: "My Profile", icon: "👤", path: "/profile" }
]
```

---

## 💉 **Treatment Dashboard**

### **Role**: Treatment Nurse/Pharmacist
**Persona**: Vaccination nurse, Treatment staff, Pharmacist

### **Primary Goals**
- Administer vaccinations
- Record treatments
- Track vaccination schedules
- Complete patient treatments


### **Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Good evening, Nurse Maria! 👋                              │
│  Friday, July 27, 2026                                      │
│                                                             │
│  [💉 Record Vaccination] ← Primary CTA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 KEY METRICS (3 Statistics Cards)                        │
│  ┌──────────┬──────────┬──────────┐                        │
│  │ 💉 Pending│ ✅ Today's│ 📋 Queue │                       │
│  │ Vaccines │ Completed│ Waiting  │                       │
│  │    32    │    12    │    8     │                       │
│  └──────────┴──────────┴──────────┘                        │
│                                                             │
│  💉 TODAY'S VACCINATIONS         ⏰ OVERDUE VACCINATIONS   │
│  ┌────────────────────────┬────────────────────────┐       │
│  │ Due Now (5)            │ Overdue (3)            │       │
│  │                        │                        │       │
│  │ • John Doe             │ • Peter Smith          │       │
│  │   Dose 2 - Anti-Rabies │   Dose 3 - 2 days late│       │
│  │   [Record] [Reschedule]│   [Record Now] [Call]  │       │
│  │                        │                        │       │
│  │ • Mary Santos          │ • Linda Cruz           │       │
│  │   Dose 1 - Anti-Rabies │   Dose 4 - 1 day late │       │
│  │   [Record] [Reschedule]│   [Record Now] [Call]  │       │
│  └────────────────────────┴────────────────────────┘       │
│                                                             │
│  📅 UPCOMING SCHEDULE              ✅ COMPLETED TODAY       │
│  ┌────────────────────────┬────────────────────────┐       │
│  │ Tomorrow (8)           │ 12 vaccinations        │       │
│  │ This Week (45)         │ completed today        │       │
│  │ [View Schedule]        │ [View Details]         │       │
│  └────────────────────────┴────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### **Components to Display**

#### **1. Hero Section**
```typescript
{
  greeting: getGreeting(), // Good morning/afternoon/evening
  userName: user.name.split(' ')[0],
  date: getCurrentDate(),
  primaryAction: {
    label: "Record Vaccination",
    icon: "💉",
    size: "large",
    color: "primary",
    action: () => openRecordModal()
  }
}
```


#### **2. Statistics Cards** (3 cards)
```typescript
// Card 1: Pending Vaccinations
{
  label: "Pending Vaccinations",
  value: stats.pending_vaccinations,
  icon: "💉",
  color: "yellow",
  trend: "5 due now",
  link: "/vaccinations?status=pending"
}

// Card 2: Today's Completed
{
  label: "Today's Completed",
  value: stats.today_completed,
  icon: "✅",
  color: "green",
  trend: "+12 since morning",
  link: "/vaccinations?status=completed&date=today"
}

// Card 3: Queue Waiting
{
  label: "Queue Waiting",
  value: stats.queue_waiting,
  icon: "📋",
  color: "blue",
  link: "/queue"
}
```

#### **3. Today's Vaccinations - Due Now** (Left Column)
```typescript
{
  title: "Today's Vaccinations",
  subtitle: "Due Now",
  count: dueNowCount,
  priority: "high",
  items: dueNowVaccinations.map(vax => ({
    patient: {
      name: vax.patient.name,
      patient_number: vax.patient.patient_number,
      age: calculateAge(vax.patient.date_of_birth)
    },
    vaccination: {
      dose_number: vax.dose_number,
      dose_label: `Dose ${vax.dose_number} of 5`,
      vaccine_type: vax.vaccine_type || "Anti-Rabies",
      scheduled_date: vax.scheduled_date,
      scheduled_time: vax.scheduled_time
    },
    case_info: {
      case_number: vax.bite_case?.case_number,
      animal_type: vax.bite_case?.animal_type
    },
    actions: [
      {
        label: "Record",
        icon: "✓",
        color: "success",
        action: () => recordVaccination(vax.treatment_id)
      },
      {
        label: "Reschedule",
        icon: "📅",
        color: "default",
        action: () => rescheduleVaccination(vax.treatment_id)
      }
    ]
  })),
  emptyState: {
    icon: "💉",
    message: "No vaccinations due right now"
  }
}
```


#### **4. Overdue Vaccinations** (Right Column - Alert Section)
```typescript
{
  title: "Overdue Vaccinations",
  subtitle: "Requires immediate attention",
  priority: "critical",
  count: overdueCount,
  alertType: "error",
  items: overdueVaccinations.map(vax => ({
    patient: {
      name: vax.patient.name,
      patient_number: vax.patient.patient_number,
      contact: vax.patient.phone
    },
    vaccination: {
      dose_number: vax.dose_number,
      vaccine_type: vax.vaccine_type || "Anti-Rabies",
      scheduled_date: vax.scheduled_date,
      days_overdue: calculateDaysOverdue(vax.scheduled_date)
    },
    urgencyBadge: {
      label: `${calculateDaysOverdue(vax.scheduled_date)} days late`,
      color: "error"
    },
    actions: [
      {
        label: "Record Now",
        icon: "⚡",
        color: "error",
        priority: "high",
        action: () => recordVaccination(vax.treatment_id)
      },
      {
        label: "Call Patient",
        icon: "📞",
        color: "default",
        action: () => initiateCall(vax.patient.phone)
      }
    ]
  })),
  emptyState: {
    icon: "✅",
    message: "No overdue vaccinations. Great work!"
  }
}
```

#### **5. Upcoming Schedule Summary** (Bottom Left)
```typescript
{
  title: "Upcoming Schedule",
  items: [
    {
      label: "Tomorrow",
      count: stats.tomorrow_vaccinations,
      icon: "📅",
      link: "/vaccinations?date=tomorrow"
    },
    {
      label: "This Week",
      count: stats.week_vaccinations,
      icon: "📆",
      link: "/vaccinations?range=week"
    },
    {
      label: "Next 30 Days",
      count: stats.month_vaccinations,
      icon: "🗓️",
      link: "/vaccinations?range=month"
    }
  ],
  action: {
    label: "View Full Schedule",
    link: "/vaccinations/schedule"
  }
}
```


#### **6. Completed Today** (Bottom Right)
```typescript
{
  title: "Completed Today",
  subtitle: `${completedCount} vaccinations administered`,
  successMessage: completedCount >= 10 ? 
    "Excellent work today! 🎉" : null,
  stats: {
    total: completedCount,
    by_dose: {
      dose_1: stats.completed_dose_1,
      dose_2: stats.completed_dose_2,
      dose_3: stats.completed_dose_3,
      dose_4: stats.completed_dose_4,
      dose_5: stats.completed_dose_5
    }
  },
  recentCompletions: recentCompletions.slice(0, 5).map(vax => ({
    patient_name: vax.patient.name,
    dose_number: vax.dose_number,
    completed_at: vax.administered_at,
    completed_by: vax.administered_by?.name || user.name
  })),
  action: {
    label: "View All Completions",
    link: "/vaccinations?status=completed&date=today"
  }
}
```

#### **7. Quick Actions**
```typescript
{
  title: "Quick Actions",
  actions: [
    {
      label: "Record Vaccination",
      icon: "💉",
      color: "primary",
      size: "large",
      action: () => openRecordModal()
    },
    {
      label: "View Schedule",
      icon: "📅",
      color: "blue",
      link: "/vaccinations/schedule"
    },
    {
      label: "View Queue",
      icon: "📋",
      color: "orange",
      link: "/queue"
    },
    {
      label: "Search Patient",
      icon: "🔍",
      color: "gray",
      action: () => openSearchModal()
    }
  ]
}
```

### **Sidebar Navigation (Treatment)**
```typescript
[
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Vaccinations", icon: "💉", path: "/vaccinations" },
  { label: "Schedule", icon: "📅", path: "/vaccinations/schedule" },
  { label: "Queue", icon: "📋", path: "/queue" },
  { label: "Patients", icon: "👥", path: "/patients" }, // View only
  { label: "My Profile", icon: "👤", path: "/profile" }
]
```


---

## 🔄 **Common Elements Across All Dashboards**

### **1. Top Navigation Bar**
```typescript
{
  logo: {
    text: "Animal Bite Management System",
    link: "/dashboard"
  },
  rightSection: [
    {
      type: "notifications",
      icon: "🔔",
      badge: notificationCount,
      dropdown: true
    },
    {
      type: "user_menu",
      avatar: user.name.charAt(0),
      name: user.name,
      role: user.role,
      dropdown: [
        { label: "My Profile", link: "/profile", icon: "👤" },
        { label: "Settings", link: "/settings", icon: "⚙️" },
        { label: "Help", link: "/help", icon: "❓" },
        { type: "divider" },
        { label: "Logout", action: logout, icon: "🚪", color: "error" }
      ]
    }
  ]
}
```

### **2. Notifications Panel**
```typescript
{
  title: "Notifications",
  tabs: ["All", "Unread", "Important"],
  items: notifications.map(notif => ({
    id: notif.id,
    type: notif.type, // info, warning, error, success
    title: notif.title,
    message: notif.message,
    timestamp: notif.created_at,
    read: notif.is_read,
    action: notif.action_link,
    icon: getNotificationIcon(notif.type)
  })),
  actions: [
    { label: "Mark all as read", action: markAllRead },
    { label: "View all", link: "/notifications" }
  ]
}
```


### **3. Empty States**
```typescript
{
  icon: "📋", // Contextual icon
  title: "No items found",
  message: "Description of what's missing",
  action: {
    label: "Primary action",
    link: "/action-path",
    color: "primary"
  },
  secondaryAction: {
    label: "Learn more",
    link: "/help"
  }
}
```

### **4. Loading States**
```typescript
{
  type: "skeleton", // or "spinner"
  rows: 5,
  message: "Loading data...",
  timeout: 30000 // Show error after 30s
}
```

### **5. Error States**
```typescript
{
  icon: "⚠️",
  title: "Something went wrong",
  message: error.message || "Unable to load data",
  actions: [
    {
      label: "Try Again",
      action: retry,
      color: "primary"
    },
    {
      label: "Report Issue",
      link: "/support"
    }
  ]
}
```

---

## 📊 **Dashboard Comparison Matrix**

| Feature | Admin | Registration | Triage | Treatment |
|---------|-------|-------------|--------|-----------|
| **Statistics Cards** | 4 | 3 | 4 | 3 |
| **Primary CTA** | Multiple | Register Patient | New Bite Case | Record Vaccination |
| **Queue Management** | View | Add/Remove | Call/Complete | View |
| **Patient Management** | Full | Create/Edit | View/Search | View |
| **Bite Cases** | View/Edit | View | Create/Edit | View |
| **Vaccinations** | View | View | Schedule | Administer |
| **Inventory** | Full | - | - | - |
| **Reports** | Full | - | - | - |
| **Bite Map** | Full | - | - | - |
| **User Management** | Full | - | - | - |
| **Activity Feed** | Yes | - | - | - |
| **System Alerts** | Yes | - | - | - |


---

## ✅ **Implementation Checklist**

### **Phase 1: Core Components** (Current - mostly done)
- [x] StatCard component
- [x] DashboardLayout
- [x] Basic role-based routing
- [x] Authentication context
- [ ] Notification system
- [ ] Activity feed component
- [ ] System alerts component

### **Phase 2: Admin Dashboard Enhancements**
- [ ] Activity feed implementation
- [ ] System alerts panel
- [ ] Bite map preview widget
- [ ] Reports summary component
- [ ] Enhanced statistics cards with trends

### **Phase 3: Registration Dashboard**
- [ ] Quick registration flow
- [ ] Patient search with autocomplete
- [ ] Queue management widget
- [ ] Recent searches history
- [ ] Today's registrations counter

### **Phase 4: Triage Dashboard**
- [x] Active cases widget (basic)
- [ ] Upcoming vaccinations widget
- [ ] Enhanced queue integration
- [ ] Quick case creation flow
- [ ] Case urgency indicators

### **Phase 5: Treatment Dashboard**
- [ ] Due now vaccinations section
- [ ] Overdue vaccinations alerts
- [ ] Completed today summary
- [ ] Upcoming schedule widget
- [ ] Quick record vaccination modal

### **Phase 6: Common Enhancements**
- [ ] Real-time updates (WebSockets/Polling)
- [ ] Notification dropdown
- [ ] Toast notifications
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Offline indicators


---

## 🎨 **UI/UX Guidelines**

### **Color Coding**
```typescript
const ROLE_COLORS = {
  admin: "#6366f1",      // Indigo - Full control
  registration: "#10b981", // Green - New entries
  triage: "#f59e0b",     // Orange - Assessment
  treatment: "#8b5cf6"   // Purple - Treatment
};

const STATUS_COLORS = {
  // Severity
  critical: "#ef4444",   // Red
  severe: "#ef4444",     // Red
  moderate: "#f59e0b",   // Orange
  minor: "#10b981",      // Green
  
  // Status
  pending: "#f59e0b",    // Orange
  active: "#3b82f6",     // Blue
  completed: "#10b981",  // Green
  overdue: "#ef4444",    // Red
  cancelled: "#6b7280",  // Gray
  
  // Queue
  waiting: "#f59e0b",    // Orange
  in_progress: "#3b82f6", // Blue
  called: "#8b5cf6"      // Purple
};
```

### **Typography Scale**
```typescript
const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 700 }, // Page titles
  h2: { fontSize: 24, fontWeight: 700 }, // Section headers
  h3: { fontSize: 20, fontWeight: 600 }, // Card titles
  h4: { fontSize: 16, fontWeight: 600 }, // Sub-headers
  body1: { fontSize: 14, fontWeight: 400 }, // Regular text
  body2: { fontSize: 12, fontWeight: 400 }, // Secondary text
  caption: { fontSize: 11, fontWeight: 400 } // Timestamps
};
```

### **Spacing System**
```typescript
const SPACING = {
  xs: 4,   // Tight elements
  sm: 8,   // Related items
  md: 16,  // Default spacing
  lg: 24,  // Section spacing
  xl: 32,  // Major sections
  xxl: 48  // Page sections
};
```


### **Responsive Breakpoints**
```typescript
const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px
  desktop: 1024,  // 1024-1439px
  wide: 1440      // 1440px+
};

// Layout adjustments
const RESPONSIVE_LAYOUT = {
  mobile: {
    statsGrid: "1 column",
    dashboardGrid: "1 column (stacked)",
    sidebar: "collapsed by default"
  },
  tablet: {
    statsGrid: "2 columns",
    dashboardGrid: "2 columns",
    sidebar: "collapsible"
  },
  desktop: {
    statsGrid: "4 columns",
    dashboardGrid: "3 columns",
    sidebar: "expanded"
  }
};
```

### **Animation Guidelines**
```typescript
const ANIMATIONS = {
  duration: {
    fast: 150,    // Micro-interactions
    normal: 300,  // Default transitions
    slow: 500     // Major state changes
  },
  easing: {
    standard: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0.0, 1, 1)"
  }
};

// Usage
const fadeIn = {
  animation: `fadeIn ${ANIMATIONS.duration.normal}ms ${ANIMATIONS.easing.standard}`
};
```

---

## 🔔 **Notification Types**

### **System Notifications**
```typescript
const NOTIFICATION_TYPES = {
  // Admin
  low_stock: {
    title: "Low Vaccine Stock",
    message: "Anti-Rabies vaccine: 10 vials remaining",
    severity: "warning",
    action: "/inventory",
    roles: ["admin"]
  },
  new_user: {
    title: "New Staff Member",
    message: "{name} has joined the team",
    severity: "info",
    action: "/users",
    roles: ["admin"]
  },
  
  // Triage
  critical_case: {
    title: "Critical Bite Case",
    message: "Category III case requires immediate attention",
    severity: "error",
    action: "/bite-cases/{id}",
    roles: ["admin", "triage"]
  },
  
  // Treatment
  overdue_vaccination: {
    title: "Overdue Vaccination",
    message: "{patient_name} - Dose {dose} is {days} days overdue",
    severity: "warning",
    action: "/vaccinations/{id}",
    roles: ["admin", "treatment"]
  },
  due_vaccination: {
    title: "Vaccination Due",
    message: "{patient_name} - Dose {dose} due today",
    severity: "info",
    action: "/vaccinations/{id}",
    roles: ["treatment"]
  },
  
  // All roles
  queue_update: {
    title: "Queue Update",
    message: "Your queue number is being called",
    severity: "info",
    action: "/queue",
    roles: ["all"]
  }
};
```


---

## 💡 **Best Practices**

### **1. Progressive Disclosure**
- Show most important information first
- Use expandable sections for details
- Provide "View All" links to full pages
- Limit initial dashboard widgets to 5-6 items each

### **2. Action-Oriented Design**
- Primary action should be prominent (large button, bright color)
- Secondary actions should be accessible but not distracting
- Use contextual actions (hover/click to reveal)
- Group related actions together

### **3. Real-Time Updates**
- Poll critical data (queue, overdue vaccinations) every 30-60 seconds
- Show loading states during updates
- Animate new items when they appear
- Highlight changes (flash animation)

### **4. Empty States**
- Always provide helpful empty states
- Suggest next action
- Use friendly, encouraging language
- Include relevant icon

### **5. Error Handling**
- Show specific error messages
- Provide retry mechanism
- Log errors for debugging
- Gracefully degrade functionality

### **6. Performance**
- Lazy load dashboard widgets
- Implement virtual scrolling for long lists
- Cache frequently accessed data
- Use optimistic UI updates

### **7. Accessibility**
- Ensure proper heading hierarchy
- Use semantic HTML
- Provide keyboard navigation
- Include ARIA labels
- Support screen readers
- Maintain sufficient color contrast


---

## 📱 **Mobile Dashboard Adaptations**

### **Mobile-First Considerations**

#### **Admin Dashboard (Mobile)**
```
┌─────────────────────────────┐
│ ☰  ABC System      Admin ▼ │
├─────────────────────────────┤
│ 👥 Total Patients    250    │
│ 🩺 Active Cases       15    │
│ 💉 Pending Vaccines   32    │
│ 📋 Today's Queue       8    │
├─────────────────────────────┤
│ [+ Quick Action Menu]       │
├─────────────────────────────┤
│ Recent Activity             │
│ • New patient (2 min ago)   │
│ • Case created (5 min ago)  │
│ [View More]                 │
├─────────────────────────────┤
│ System Alerts               │
│ ⚠️ Low vaccine stock        │
│ [View Details]              │
└─────────────────────────────┘
```

#### **Registration Dashboard (Mobile)**
```
┌─────────────────────────────┐
│ ☰  Registration    Maria ▼ │
├─────────────────────────────┤
│ Good morning! 👋            │
├─────────────────────────────┤
│ [+ Register New Patient]    │
│    (Large Primary Button)   │
├─────────────────────────────┤
│ 👥 Patients: 250            │
│ 📋 Queue: 8 waiting         │
│ 🆕 Today: 5 registered      │
├─────────────────────────────┤
│ Queue (Tap to expand)       │
│ ▼ #01 John Doe - Waiting    │
│   [Call] [Remove]           │
│ ▼ #02 Mary Smith - Progress│
│   [Complete]                │
├─────────────────────────────┤
│ [Search Patients...]        │
└─────────────────────────────┘
```

#### **Triage Dashboard (Mobile)**
```
┌─────────────────────────────┐
│ ☰  Triage       Dr. Santos ▼│
├─────────────────────────────┤
│ Good afternoon! 👋          │
├─────────────────────────────┤
│ [+ New Bite Case]           │
│    (Large Primary Button)   │
├─────────────────────────────┤
│ 🩺 Active: 15  📋 Queue: 8  │
│ 💉 Pending: 32 👥 Total: 250│
├─────────────────────────────┤
│ Queue ▼                     │
│ • #01 John Doe [Call]       │
│ • #02 Mary Smith [Complete] │
├─────────────────────────────┤
│ Active Cases ▼              │
│ • BC-2026-0045 (Category III)│
│ • BC-2026-0044 (Category II)│
├─────────────────────────────┤
│ Vaccinations ▼              │
│ • Mary Smith - Dose 2 Today │
│ • John Doe - Dose 1 Today   │
└─────────────────────────────┘
```

#### **Treatment Dashboard (Mobile)**
```
┌─────────────────────────────┐
│ ☰  Treatment    Nurse Maria▼│
├─────────────────────────────┤
│ Good evening! 👋            │
├─────────────────────────────┤
│ [💉 Record Vaccination]     │
│    (Large Primary Button)   │
├─────────────────────────────┤
│ 💉 Pending: 32              │
│ ✅ Today: 12 completed      │
│ 📋 Queue: 8 waiting         │
├─────────────────────────────┤
│ Due Now (5) ▼               │
│ • John Doe - Dose 2         │
│   [Record] [Reschedule]     │
│ • Mary Santos - Dose 1      │
│   [Record] [Reschedule]     │
├─────────────────────────────┤
│ ⚠️ Overdue (3) ▼            │
│ • Peter Smith - 2 days late │
│   [Record Now] [Call]       │
├─────────────────────────────┤
│ Schedule ▼                  │
│ Tomorrow: 8 | Week: 45      │
│ [View Full Schedule]        │
└─────────────────────────────┘
```

### **Mobile Navigation Pattern**
```typescript
// Bottom navigation for mobile
const MOBILE_NAV = {
  admin: [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "👥", label: "Patients", path: "/patients" },
    { icon: "📊", label: "Reports", path: "/reports" },
    { icon: "⚙️", label: "More", path: "/menu" } // Opens drawer
  ],
  registration: [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "➕", label: "Register", path: "/patients/new" },
    { icon: "📋", label: "Queue", path: "/queue" },
    { icon: "🔍", label: "Search", path: "/patients" }
  ],
  triage: [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "🩺", label: "Cases", path: "/bite-cases" },
    { icon: "📋", label: "Queue", path: "/queue" },
    { icon: "💉", label: "Vaccines", path: "/vaccinations" }
  ],
  treatment: [
    { icon: "🏠", label: "Home", path: "/dashboard" },
    { icon: "💉", label: "Record", path: "/vaccinations/record" },
    { icon: "📅", label: "Schedule", path: "/vaccinations" },
    { icon: "📋", label: "Queue", path: "/queue" }
  ]
};
```


---

## 🎭 **Role Switching Scenarios**

### **When Users Have Multiple Roles**

```typescript
// Some users might have dual roles
const USER_SCENARIOS = {
  // Small clinic: Admin also does triage
  admin_triage: {
    primary_dashboard: "admin",
    role_switcher: true,
    available_dashboards: ["admin", "triage"],
    quick_switch_button: {
      label: "Switch to Triage Mode",
      icon: "🩺",
      position: "top-right"
    }
  },
  
  // Nurse does both triage and treatment
  triage_treatment: {
    primary_dashboard: "triage",
    role_switcher: true,
    available_dashboards: ["triage", "treatment"],
    quick_switch_button: {
      label: "Switch to Treatment Mode",
      icon: "💉",
      position: "top-right"
    }
  }
};

// Role switcher UI
const RoleSwitcher = {
  type: "dropdown",
  trigger: "👤 Current Role: {role_name}",
  options: [
    {
      role: "admin",
      label: "Admin Dashboard",
      icon: "👑",
      description: "Full system access"
    },
    {
      role: "triage",
      label: "Triage Dashboard",
      icon: "🩺",
      description: "Case assessment"
    }
  ],
  onSwitch: (newRole) => {
    // Switch context
    setActiveRole(newRole);
    navigate(`/dashboard?role=${newRole}`);
    // Reload dashboard data
    loadDashboardData(newRole);
  }
};
```

---

## 🔐 **Permission Matrix**

### **Dashboard Feature Access by Role**

| Feature | Admin | Registration | Triage | Treatment |
|---------|:-----:|:------------:|:------:|:---------:|
| **View Statistics** | ✅ Full | ✅ Limited | ✅ Clinical | ✅ Limited |
| **Activity Feed** | ✅ All | ❌ | ❌ | ❌ |
| **System Alerts** | ✅ All | ❌ | ⚠️ Clinical | ⚠️ Clinical |
| **Quick Actions** | ✅ All | ✅ Limited | ✅ Clinical | ✅ Treatment |
| **Patient List** | ✅ Full | ✅ Create/Edit | ✅ View | ✅ View |
| **Bite Cases** | ✅ Full | ✅ View | ✅ Create/Edit | ✅ View |
| **Vaccinations** | ✅ Full | ✅ View | ✅ Schedule | ✅ Administer |
| **Queue Management** | ✅ Full | ✅ Add/Remove | ✅ Call/Complete | ✅ View |
| **Inventory** | ✅ Full | ❌ | ❌ | ⚠️ View Stock |
| **Reports** | ✅ Full | ❌ | ❌ | ❌ |
| **Bite Map** | ✅ Full | ❌ | ❌ | ❌ |
| **User Management** | ✅ Full | ❌ | ❌ | ❌ |
| **Settings** | ✅ Full | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Full access
- ⚠️ Limited/View only
- ❌ No access


---

## 📊 **Dashboard Widgets Library**

### **Reusable Widget Components**

#### **1. StatCardWidget**
```typescript
interface StatCardWidgetProps {
  label: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'red' | 'yellow' | 'green' | 'purple';
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  loading?: boolean;
}

// Usage
<StatCardWidget
  label="Active Cases"
  value={15}
  icon="🩺"
  color="red"
  trend={{ value: "+3", direction: "up" }}
  onClick={() => navigate('/bite-cases')}
/>
```

#### **2. ListWidget**
```typescript
interface ListWidgetProps {
  title: string;
  subtitle?: string;
  items: Array<{
    id: string | number;
    primary: string;
    secondary?: string;
    avatar?: string;
    badge?: { label: string; color: string };
    actions?: Array<{ label: string; onClick: () => void }>;
  }>;
  maxItems?: number;
  onViewAll?: () => void;
  emptyState?: {
    icon: string;
    message: string;
    action?: { label: string; onClick: () => void };
  };
}

// Usage
<ListWidget
  title="Today's Queue"
  subtitle="8 patients waiting"
  items={queueItems}
  maxItems={5}
  onViewAll={() => navigate('/queue')}
  emptyState={{
    icon: "📋",
    message: "No patients in queue",
    action: { label: "Add Patient", onClick: openAddModal }
  }}
/>
```

#### **3. ActivityFeedWidget**
```typescript
interface ActivityFeedWidgetProps {
  title: string;
  activities: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    icon: string;
    link?: string;
    user?: { name: string; avatar?: string };
  }>;
  maxItems?: number;
  onViewAll?: () => void;
  refreshInterval?: number; // Auto-refresh in ms
}

// Usage
<ActivityFeedWidget
  title="Recent Activity"
  activities={recentActivities}
  maxItems={10}
  onViewAll={() => navigate('/activity')}
  refreshInterval={30000} // Refresh every 30s
/>
```


#### **4. AlertWidget**
```typescript
interface AlertWidgetProps {
  title: string;
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info' | 'success';
    severity: 'high' | 'medium' | 'low';
    message: string;
    icon?: string;
    action?: { label: string; onClick: () => void };
    dismissible?: boolean;
  }>;
  maxItems?: number;
  onDismiss?: (id: string) => void;
}

// Usage
<AlertWidget
  title="System Alerts"
  alerts={systemAlerts}
  maxItems={5}
  onDismiss={(id) => dismissAlert(id)}
/>
```

#### **5. QuickActionsWidget**
```typescript
interface QuickActionsWidgetProps {
  title?: string;
  actions: Array<{
    label: string;
    icon: string;
    color: string;
    onClick?: () => void;
    link?: string;
    disabled?: boolean;
    badge?: number;
  }>;
  layout: 'grid' | 'list';
  columns?: number;
}

// Usage
<QuickActionsWidget
  title="Quick Actions"
  actions={quickActions}
  layout="grid"
  columns={2}
/>
```

#### **6. ChartWidget**
```typescript
interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  type: 'line' | 'bar' | 'pie' | 'donut';
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showLegend?: boolean;
  onViewDetails?: () => void;
}

// Usage
<ChartWidget
  title="Cases by Category"
  type="donut"
  data={[
    { label: "Category I", value: 10, color: "#10b981" },
    { label: "Category II", value: 20, color: "#f59e0b" },
    { label: "Category III", value: 5, color: "#ef4444" }
  ]}
  showLegend={true}
/>
```

#### **7. CalendarWidget**
```typescript
interface CalendarWidgetProps {
  title: string;
  events: Array<{
    id: string;
    date: Date;
    title: string;
    type: string;
    color?: string;
  }>;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: any) => void;
  highlightToday?: boolean;
}

// Usage
<CalendarWidget
  title="Vaccination Schedule"
  events={vaccinationSchedule}
  onDateClick={(date) => viewScheduleForDate(date)}
  onEventClick={(event) => viewEventDetails(event)}
  highlightToday={true}
/>
```


---

## 🚀 **Implementation Priority**

### **Phase 1: Foundation (Week 1)** ⭐ HIGHEST PRIORITY
**Goal**: Get basic role-based dashboards working

**Admin Dashboard**
- [x] Statistics cards (4 cards) - DONE
- [x] Recent patients list - DONE
- [x] Quick actions - DONE
- [ ] Activity feed - NEW
- [ ] System alerts panel - NEW

**Registration Dashboard**
- [ ] Statistics cards (3 cards)
- [ ] Large "Register Patient" button
- [ ] Queue list widget
- [ ] Patient search

**Triage Dashboard**
- [x] Statistics cards (4 cards) - MOSTLY DONE
- [x] Primary CTA button - DONE
- [ ] Queue widget - ENHANCE
- [ ] Active cases widget - ENHANCE
- [ ] Upcoming vaccinations widget

**Treatment Dashboard**
- [ ] Statistics cards (3 cards)
- [ ] Due now vaccinations
- [ ] Overdue vaccinations alerts
- [ ] Quick record button

**Estimated Time**: 20-25 hours

---

### **Phase 2: Enhancements (Week 2)** ⭐ HIGH PRIORITY
**Goal**: Add real-time features and polish

- [ ] Real-time queue updates (polling every 30s)
- [ ] Notification system
- [ ] Toast notifications
- [ ] Loading skeletons
- [ ] Empty states for all widgets
- [ ] Error boundaries
- [ ] Mobile responsive layouts

**Estimated Time**: 15-20 hours

---

### **Phase 3: Advanced Features (Week 3)** ⭐ MEDIUM PRIORITY
**Goal**: Add data visualization and analytics

**Admin Dashboard**
- [ ] Bite map preview widget
- [ ] Reports summary with charts
- [ ] Trends and analytics
- [ ] Export functionality

**All Dashboards**
- [ ] Calendar widgets for schedules
- [ ] Advanced filters
- [ ] Customizable widgets
- [ ] Dashboard preferences

**Estimated Time**: 15-20 hours

---

### **Phase 4: Optimization (Week 4)** ⭐ LOW PRIORITY
**Goal**: Performance and user experience polish

- [ ] Performance optimization
- [ ] Caching strategies
- [ ] Offline support
- [ ] PWA features
- [ ] Accessibility audit
- [ ] User onboarding tours
- [ ] Keyboard shortcuts

**Estimated Time**: 10-15 hours


---

## 🔄 **Data Refresh Strategies**

### **Refresh Intervals by Widget**

```typescript
const REFRESH_INTERVALS = {
  // Real-time critical data
  queue_status: 30000,           // 30 seconds
  overdue_vaccinations: 60000,   // 1 minute
  system_alerts: 60000,          // 1 minute
  
  // Near real-time
  due_vaccinations: 120000,      // 2 minutes
  active_cases: 120000,          // 2 minutes
  today_stats: 300000,           // 5 minutes
  
  // Periodic updates
  activity_feed: 300000,         // 5 minutes
  statistics_cards: 300000,      // 5 minutes
  recent_patients: 600000,       // 10 minutes
  
  // Static/manual refresh
  reports_summary: null,         // Manual only
  completed_today: 600000        // 10 minutes
};
```

### **Smart Refresh Logic**

```typescript
// Auto-refresh when dashboard is active
const useDashboardRefresh = (fetchData: () => void, interval: number) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Initial load
    fetchData();
    
    // Setup visibility listener
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      if (!document.hidden) {
        // Refresh when user returns to tab
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Auto-refresh interval
    const intervalId = isVisible && interval 
      ? setInterval(fetchData, interval) 
      : null;
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isVisible, interval]);
};

// Usage
const DashboardWidget = () => {
  const fetchQueueData = async () => {
    const data = await api.get('/queue');
    setQueueData(data);
  };
  
  useDashboardRefresh(fetchQueueData, REFRESH_INTERVALS.queue_status);
  
  return <QueueWidget data={queueData} />;
};
```


---

## 📝 **Backend API Requirements**

### **Dashboard Endpoints Needed**

```php
// Admin Dashboard
GET /api/dashboard/admin/stats
Response: {
  total_patients: 250,
  active_cases: 15,
  pending_vaccinations: 32,
  today_queue: 8,
  recent_patients: [...],
  activity_feed: [...],
  system_alerts: [...]
}

// Registration Dashboard
GET /api/dashboard/registration/stats
Response: {
  total_patients: 250,
  queue_waiting: 8,
  today_registrations: 5,
  queue_list: [...],
  recent_searches: [...]
}

// Triage Dashboard
GET /api/dashboard/triage/stats
Response: {
  active_cases: 15,
  queue_waiting: 8,
  pending_vaccinations: 32,
  total_patients: 250,
  queue_list: [...],
  active_cases_list: [...],
  upcoming_vaccinations: [...]
}

// Treatment Dashboard
GET /api/dashboard/treatment/stats
Response: {
  pending_vaccinations: 32,
  today_completed: 12,
  queue_waiting: 8,
  due_now: [...],
  overdue: [...],
  upcoming_schedule: {...},
  completed_today: [...]
}
```

### **Activity Feed Endpoint**

```php
GET /api/activity-feed?limit=10
Response: {
  activities: [
    {
      id: 1,
      type: "patient_registered",
      message: "New patient registered: John Doe",
      timestamp: "2026-07-27T10:30:00Z",
      user: { name: "Maria Santos", role: "registration" },
      link: "/patients/123"
    },
    // ...
  ]
}
```

### **System Alerts Endpoint**

```php
GET /api/system-alerts
Response: {
  alerts: [
    {
      id: 1,
      type: "warning",
      severity: "high",
      message: "Low vaccine stock: Anti-Rabies (10 vials remaining)",
      created_at: "2026-07-27T08:00:00Z",
      action_link: "/inventory",
      dismissible: true
    },
    // ...
  ]
}
```


---

## 🎯 **Success Metrics**

### **Dashboard Performance KPIs**

```typescript
const DASHBOARD_METRICS = {
  performance: {
    initial_load_time: "< 2 seconds",
    widget_load_time: "< 500ms per widget",
    time_to_interactive: "< 3 seconds",
    refresh_performance: "< 1 second"
  },
  
  usability: {
    clicks_to_primary_action: "1-2 clicks",
    time_to_complete_task: {
      register_patient: "< 2 minutes",
      create_bite_case: "< 3 minutes",
      record_vaccination: "< 1 minute",
      add_to_queue: "< 30 seconds"
    }
  },
  
  adoption: {
    daily_active_users: "> 80% of staff",
    feature_usage: {
      quick_actions: "> 60%",
      search: "> 40%",
      notifications: "> 50%"
    }
  }
};
```

### **User Satisfaction Goals**

- **Admin**: Able to monitor all clinic operations at a glance
- **Registration**: Can register patients quickly (< 2 min avg)
- **Triage**: Can assess and create cases efficiently
- **Treatment**: Can track and record vaccinations easily

---

## 📚 **Documentation References**

### **Related Guides**
- [BITE_MAP_IMPLEMENTATION.md](./BITE_MAP_IMPLEMENTATION.md) - Bite map feature
- [COMPLETE_SYSTEM_STATUS.md](../COMPLETE_SYSTEM_STATUS.md) - Overall system status
- [API_REFERENCE.md](./API_REFERENCE.md) - Backend API documentation
- [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) - Current implementation status

### **Component Documentation**
- StatCard component: `frontend/src/components/common/StatCard/`
- DashboardLayout: `frontend/src/components/Layout/DashboardLayout.tsx`
- ProtectedRoute: `frontend/src/components/ProtectedRoute.tsx`

---

## 🤝 **Contributing**

### **Adding a New Dashboard Widget**

1. **Create Widget Component**
   ```
   frontend/src/components/dashboard/widgets/YourWidget/
   ├── YourWidget.tsx
   ├── YourWidget.styles.ts
   ├── YourWidget.types.ts
   └── index.ts
   ```

2. **Define Types**
   ```typescript
   // YourWidget.types.ts
   export interface YourWidgetProps {
     title: string;
     data: any[];
     onAction?: () => void;
   }
   ```

3. **Implement Component**
   ```typescript
   // YourWidget.tsx
   import { YourWidgetProps } from './YourWidget.types';
   
   export default function YourWidget({ title, data }: YourWidgetProps) {
     return (
       <Card>
         <CardContent>
           <Typography variant="h6">{title}</Typography>
           {/* Widget content */}
         </CardContent>
       </Card>
     );
   }
   ```

4. **Add to Dashboard**
   ```typescript
   // In DashboardPage.tsx
   import YourWidget from '../components/dashboard/widgets/YourWidget';
   
   <YourWidget title="..." data={...} />
   ```


---

## 🎨 **Design System Tokens**

### **Dashboard-Specific Tokens**

```typescript
export const DASHBOARD_TOKENS = {
  // Card styling
  card: {
    borderRadius: 12,
    padding: 24,
    shadow: '0 1px 3px rgba(0,0,0,0.1)',
    hoverShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'all 0.3s ease'
  },
  
  // Statistics cards
  statCard: {
    height: 140,
    iconSize: 48,
    valueSize: 32,
    labelSize: 14,
    trendSize: 12
  },
  
  // Widget headers
  widgetHeader: {
    marginBottom: 16,
    titleSize: 18,
    subtitleSize: 14,
    actionSize: 14
  },
  
  // List items
  listItem: {
    padding: 16,
    borderRadius: 8,
    hoverBackground: 'rgba(0,0,0,0.03)'
  },
  
  // Badges
  badge: {
    borderRadius: 12,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600
  },
  
  // Buttons
  primaryButton: {
    height: 48,
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    padding: '12px 24px'
  },
  
  secondaryButton: {
    height: 40,
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 6,
    padding: '8px 16px'
  }
};
```

---

## ✅ **Testing Checklist**

### **Functional Testing**

**Admin Dashboard**
- [ ] Statistics cards display correct data
- [ ] Activity feed updates in real-time
- [ ] System alerts appear when triggered
- [ ] Recent patients list loads
- [ ] Quick actions navigate correctly
- [ ] Bite map preview loads
- [ ] Reports summary displays charts

**Registration Dashboard**
- [ ] Can register new patient
- [ ] Queue list displays patients
- [ ] Can add patient to queue
- [ ] Can remove patient from queue
- [ ] Patient search works
- [ ] Today's registrations counter accurate

**Triage Dashboard**
- [ ] Can create new bite case
- [ ] Active cases display correctly
- [ ] Can call patients from queue
- [ ] Can complete queue items
- [ ] Upcoming vaccinations load
- [ ] Statistics are accurate

**Treatment Dashboard**
- [ ] Due vaccinations display
- [ ] Overdue vaccinations highlighted
- [ ] Can record vaccination
- [ ] Can reschedule vaccination
- [ ] Completed today counter accurate
- [ ] Schedule summary displays

### **Visual Testing**

- [ ] Responsive at 375px (mobile)
- [ ] Responsive at 768px (tablet)
- [ ] Responsive at 1024px (desktop)
- [ ] Responsive at 1440px (large desktop)
- [ ] Dark mode support (if applicable)
- [ ] Print styles work
- [ ] Animations smooth
- [ ] No layout shifts
- [ ] Icons display correctly
- [ ] Colors match design system

### **Performance Testing**

- [ ] Dashboard loads in < 2 seconds
- [ ] Widgets load progressively
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Refresh doesn't block UI
- [ ] Large lists virtualized
- [ ] Images optimized
- [ ] API calls batched/cached

### **Accessibility Testing**

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Color contrast sufficient (WCAG AA)
- [ ] No flashing content
- [ ] Error messages announced
- [ ] Form labels associated


---

## 🎓 **User Training Guide**

### **Dashboard Quick Reference Card**

#### **For Admin Users**
```
YOUR DASHBOARD SHOWS:
✓ System overview with 4 key metrics
✓ Recent activity across all departments
✓ System alerts and warnings
✓ Quick access to all management tools

QUICK ACTIONS:
• Manage Users → Add/edit staff accounts
• Clinic Settings → Configure clinic info
• View Reports → Generate and export reports
• Bite Map → See geographical distribution
• Vaccine Inventory → Monitor stock levels

TIPS:
• Check system alerts daily
• Review activity feed for unusual patterns
• Use bite map to identify hotspots
• Monitor vaccine stock levels
```

#### **For Registration Staff**
```
YOUR DASHBOARD SHOWS:
✓ Total patients and today's registrations
✓ Current queue status
✓ Patient search

QUICK ACTIONS:
• Register New Patient (Big green button!)
• Add to Queue → Add patient to waiting list
• Search Patients → Find existing records

TIPS:
• Use the big button to register quickly
• Check queue before adding patients
• Keep patient contact info updated
```

#### **For Triage Staff**
```
YOUR DASHBOARD SHOWS:
✓ Active bite cases needing attention
✓ Queue of waiting patients
✓ Upcoming vaccinations to schedule

QUICK ACTIONS:
• New Bite Case → Create assessment
• View Queue → See waiting patients
• Vaccinations → Manage schedules

TIPS:
• Prioritize critical (Category III) cases
• Check overdue vaccinations daily
• Review active cases each morning
```

#### **For Treatment Staff**
```
YOUR DASHBOARD SHOWS:
✓ Vaccinations due now
✓ Overdue vaccinations (in red!)
✓ Today's completed vaccinations
✓ Upcoming schedule

QUICK ACTIONS:
• Record Vaccination → Quick entry
• View Schedule → See full calendar
• Search Patient → Find vaccination record

TIPS:
• Check "Due Now" section first
• Follow up on overdue vaccinations ASAP
• Mark completed immediately after administering
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Dashboard Not Loading**
**Symptoms**: Blank screen, endless spinner  
**Solutions**:
- Check internet connection
- Clear browser cache
- Refresh the page (F5)
- Check if backend is running
- Verify authentication token

### **Issue 2: Statistics Not Updating**
**Symptoms**: Old data showing, counts incorrect  
**Solutions**:
- Wait for auto-refresh (30-60 seconds)
- Manual refresh the page
- Check if backend API is responding
- Verify data permissions for your role

### **Issue 3: Actions Not Working**
**Symptoms**: Buttons don't respond, navigation fails  
**Solutions**:
- Check if you have permission for that action
- Verify you're using the correct role dashboard
- Check browser console for errors
- Try logging out and back in

### **Issue 4: Mobile View Issues**
**Symptoms**: Layout broken on phone/tablet  
**Solutions**:
- Use latest browser version
- Clear browser data
- Try landscape orientation
- Use desktop view if critically needed

---

## 📞 **Support & Feedback**

### **Getting Help**
- Check this guide first
- Contact your administrator
- Report bugs with screenshots
- Request features via feedback form

### **Feedback Channels**
- In-app feedback button (bottom right)
- Email: support@animalbitecenter.com
- Weekly team meetings
- Suggestion box

---

## 📌 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | July 27, 2026 | Initial dashboard plans created |
| 1.1 | TBD | After Phase 1 implementation |
| 2.0 | TBD | After all phases complete |

---

**Document Status**: ✅ Complete  
**Last Updated**: July 27, 2026  
**Next Review**: After Phase 1 implementation  
**Maintainer**: Development Team

---

**🎉 You've reached the end of the Role Dashboard Plans guide!**

This comprehensive guide covers everything needed to implement professional, role-specific dashboards for your Animal Bite Management System. Follow the implementation phases systematically, and you'll have a polished, user-friendly dashboard experience for all user roles.

**Happy Building! 🚀**
