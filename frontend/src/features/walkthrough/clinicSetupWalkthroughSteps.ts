import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const CLINIC_INFO_STEPS: WalkthroughStep[] = [
  // 1. Clinic Information Header Overview
  {
    id: 'clinic-info-overview',
    module: 'Clinic Setup',
    section: 'Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Clinic Information & Facility Configuration',
    content:
      'Welcome to Clinic Information! Configure your clinic branding, print header logos, facility accreditation numbers, location address, and mobile app orientation resources.',
    targetSelector: '[data-walkthrough="clinic-info-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Card 1: Branding & Application Identity Overview (Image 1)
  {
    id: 'clinic-branding-card',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Branding & Application Identity',
    content:
      'Customize your facility logos, municipal emblems, and system titles displayed across the web application and official printed medical certificates.',
    targetSelector: '[data-walkthrough="clinic-branding-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 3. Clinic & Application Logo (Image 1)
  {
    id: 'clinic-app-logo',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Clinic & Application Logo',
    content:
      'Upload or replace the primary clinic avatar shown at the top of the sidebar, navigation bars, and mobile application header.',
    targetSelector: '[data-walkthrough="clinic-app-logo"]',
    fallbackSelector: '[data-walkthrough="clinic-branding-section"]',
    placement: 'bottom',
  },

  // 4. Left Print Logo (Image 1)
  {
    id: 'clinic-left-logo',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Left Print Logo (LGU / Municipal Seal)',
    content:
      'Upload or replace the official Left Header Logo (e.g. Municipal or City Government seal) printed on the top-left of Form 2, Form 3, and vaccination cards.',
    targetSelector: '[data-walkthrough="clinic-left-logo"]',
    fallbackSelector: '[data-walkthrough="clinic-branding-section"]',
    placement: 'bottom',
  },

  // 5. Right Print Logo (Image 1)
  {
    id: 'clinic-right-logo',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Right Print Logo (DOH / Health Agency Seal)',
    content:
      'Upload or replace the official Right Header Logo (e.g. Department of Health or Rural Health Unit seal) printed on the top-right of official medical documents.',
    targetSelector: '[data-walkthrough="clinic-right-logo"]',
    fallbackSelector: '[data-walkthrough="clinic-branding-section"]',
    placement: 'bottom',
  },

  // 6. Main Title (Clinic Name) (Image 1)
  {
    id: 'clinic-name-input',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Main Title (Clinic Name)',
    content:
      'Set the primary clinic name (e.g. Tagoloan). This name is prominently displayed at the top of the sidebar and used across all patient records and printouts.',
    targetSelector: '[data-walkthrough="clinic-name-input"]',
    fallbackSelector: '[data-walkthrough="clinic-branding-section"]',
    placement: 'bottom',
  },

  // 7. Subtitle (Application Tagline) (Image 1)
  {
    id: 'clinic-subtitle-input',
    module: 'Clinic Setup',
    section: 'Branding & Application Identity',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Subtitle (Application Tagline)',
    content:
      'Set a secondary tagline (e.g. "Tagoloan Animal Bite Treatment Application") displayed directly underneath the clinic name in the sidebar.',
    targetSelector: '[data-walkthrough="clinic-subtitle-input"]',
    fallbackSelector: '[data-walkthrough="clinic-branding-section"]',
    placement: 'bottom',
  },

  // 8. Card 2: Facility & Accreditation Information Overview (Image 2)
  {
    id: 'clinic-facility-card',
    module: 'Clinic Setup',
    section: 'Facility & Accreditation',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Facility & Accreditation Information',
    content:
      'Manage regulatory healthcare facility license numbers, Department of Health certification, PhilHealth accreditation, and location details.',
    targetSelector: '[data-walkthrough="clinic-facility-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 9. Facility Accreditation & Hospital Identifiers (Image 4 - License, Hospital, DOH, PhilHealth highlighted together as one)
  {
    id: 'clinic-accreditation-block-step',
    module: 'Clinic Setup',
    section: 'Facility & Accreditation',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Facility Accreditation & Hospital Numbers',
    content:
      'Record your official health facility License Number, Hospital Number (e.g. HOSP-9923), DOH accreditation code (e.g. 2022-10-037), and PhilHealth accreditation number (e.g. B10034377) for ABTP verification and treatment card stamping.',
    targetSelector: '[data-walkthrough="clinic-accreditation-block"]',
    fallbackSelector: '[data-walkthrough="clinic-facility-section"]',
    placement: 'bottom',
  },

  // 10. Clinic Address (Image 2 - Full Address block highlighted together as one)
  {
    id: 'clinic-address-details',
    module: 'Clinic Setup',
    section: 'Facility & Accreditation',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Clinic Address & Location Selectors',
    content:
      'Select Province, Municipality/City, Barangay, and Street/Zone from Philippine location standards to auto-generate the clinic address, or switch to freeform text.',
    targetSelector: '[data-walkthrough="clinic-address-section"]',
    fallbackSelector: '[data-walkthrough="clinic-facility-section"]',
    placement: 'bottom',
  },

  // 11. Contact Number & Email Address (Image 3 - Highlighted together as one unified container)
  {
    id: 'clinic-contact-channels',
    module: 'Clinic Setup',
    section: 'Facility & Accreditation',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Contact Number & Email Address',
    content:
      'Provide the official clinic phone hotline (must start with 09 and contain 11 digits) and public inquiry email address for patient communication.',
    targetSelector: '[data-walkthrough="clinic-contact-channels-section"]',
    fallbackSelector: '[data-walkthrough="clinic-facility-section"]',
    placement: 'bottom',
  },

  // 12. FAQs Section Overview (Image 5)
  {
    id: 'clinic-faqs-overview',
    module: 'Clinic Setup',
    section: 'Frequently Asked Questions',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Frequently Asked Questions (FAQs)',
    content:
      'Manage common bite care and rabies questions published to the patient mobile app. Review, edit, or categorize guidance topics such as first aid, PEP schedules, and PhilHealth coverage.',
    targetSelector: '[data-walkthrough="clinic-faqs-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 13. Add FAQ Action Button (Image 5)
  {
    id: 'clinic-faqs-add-button',
    module: 'Clinic Setup',
    section: 'Frequently Asked Questions',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Add New FAQ Button',
    content:
      'Click "+ Add FAQ" to append a new question block where you can specify an optional category tag, patient question, and detailed healthcare advisory answer.',
    targetSelector: '[data-walkthrough="clinic-faqs-add-btn"]',
    fallbackSelector: '[data-walkthrough="clinic-faqs-section"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 14. FAQ Accordion Questions List (Image 5)
  {
    id: 'clinic-faqs-accordion-list',
    module: 'Clinic Setup',
    section: 'Frequently Asked Questions',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'FAQ Question Accordion List',
    content:
      'Click any numbered question to expand its category, question prompt, and answer fields for in-place editing, or remove outdated entries before saving.',
    targetSelector: '[data-walkthrough="clinic-faqs-list"]',
    fallbackSelector: '[data-walkthrough="clinic-faqs-section"]',
    placement: 'top',
  },

  // 15. Save Changes Button (Clinic Information & FAQs)
  {
    id: 'clinic-save-changes',
    module: 'Clinic Setup',
    section: 'Save & Publish',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Save Clinic Information & FAQs',
    content:
      'Click "Save Changes" to apply and publish all updated branding logos, facility accreditation numbers, contact details, and FAQs across the clinic system and mobile app.',
    targetSelector: '[data-walkthrough="clinic-save-btn"]',
    fallbackSelector: 'main.page-content',
    actionStep: true,
    placement: 'top',
  },

  // 16. Card 3: Patient App Resources (Mobile "Learn More") Overview
  {
    id: 'clinic-resources-card',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Patient App Resources (Mobile "Learn More")',
    content:
      'Publish orientation videos and official health website links displayed in the patient mobile app under Home -> Learn More, below Bite Care Guide and above Clinic Information.',
    targetSelector: '[data-walkthrough="clinic-resources-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 17. Hide / Show Mobile Preview Action Button
  {
    id: 'clinic-resources-preview-toggle',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Hide / Show Mobile Preview',
    content:
      'Toggle the live smartphone preview pane on or off to inspect how resources appear on mobile devices or expand the roster table across the full screen.',
    targetSelector: '[data-walkthrough="clinic-resources-preview-toggle"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-section"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 18. Refresh Resources Action Button
  {
    id: 'clinic-resources-refresh-btn',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Refresh Resources Roster',
    content:
      'Click "Refresh" to reload the latest patient resources roster and synchronize any changes made across administrative workstations.',
    targetSelector: '[data-walkthrough="clinic-resources-refresh-btn"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-section"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 19. Add Resource Action Button
  {
    id: 'clinic-resources-add-btn',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Add New Resource Button',
    content:
      'Click "+ Add Resource" to open the configuration dialog where you can upload custom orientation videos, paste video links, or configure official health advisory URLs.',
    targetSelector: '[data-walkthrough="clinic-resources-add-btn"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-section"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 20. Quick Add by URL Input
  {
    id: 'clinic-resources-quick-input',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Quick Add by URL Input',
    content:
      'Paste any YouTube video or DOH website https:// link directly into this field for automatic type detection and swift configuration.',
    targetSelector: '[data-walkthrough="clinic-resources-quick-input"], #quick-resource-url-input',
    fallbackSelector: '[data-walkthrough="clinic-resources-quick-add"]',
    placement: 'top',
  },

  // 21. Paste & Configure Action Button
  {
    id: 'clinic-resources-paste-btn',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Paste & Configure Button',
    content:
      'Click "+ Paste & Configure" to instantly parse the pasted URL, auto-detect its video or website type, and open the resource modal with fields pre-filled.',
    targetSelector: '[data-walkthrough="clinic-resources-paste-btn"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-quick-add"]',
    actionStep: true,
    placement: 'top',
  },

  // 22. Educational Resources Table
  {
    id: 'clinic-resources-table',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Patient Educational Resources Table',
    content:
      'View and manage all published videos and links. Each row displays the resource type, title, subtitle, duration, active status toggle, and action buttons to preview, edit, or delete.',
    targetSelector: '[data-walkthrough="clinic-resources-table"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-section"]',
    placement: 'top',
  },

  // 23. Live Mobile Preview Screen
  {
    id: 'clinic-resources-mobile-preview',
    module: 'Clinic Setup',
    section: 'Patient App Resources',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Live Mobile App Preview',
    content:
      'Simulate the patient smartphone experience in real time! Watch orientation videos, test external links, and preview the "Learn More" section exactly as patients see it on their mobile devices.',
    targetSelector: '[data-walkthrough="clinic-resources-mobile-preview"]',
    fallbackSelector: '[data-walkthrough="clinic-resources-section"]',
    placement: 'left',
  },
];

export const CLINIC_OPERATING_SCHEDULE_STEPS: WalkthroughStep[] = [
  // 1. Operating Schedule Header
  {
    id: 'schedule-overview',
    module: 'Clinic Setup',
    section: 'Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    title: 'Operating Schedule & Consultation Hours',
    content:
      'Welcome to Operating Schedule! Configure weekly clinic open hours, consultation days, holiday overrides, and doctor-ordered PEP dose drift policies.',
    targetSelector: '[data-walkthrough="schedule-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Sync & Shift Existing Appointments Action Button
  {
    id: 'schedule-sync-btn',
    module: 'Clinic Setup',
    section: 'Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    title: 'Sync & Shift Existing Appointments',
    content:
      'Click this button to recalculate and shift existing booked appointments and follow-up schedules whenever clinic hours or closed days are modified.',
    targetSelector: '[data-walkthrough="schedule-sync-btn"]',
    fallbackSelector: '[data-walkthrough="schedule-header"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 3. Schedule Navigation Tabs
  {
    id: 'schedule-tabs-overview',
    module: 'Clinic Setup',
    section: 'Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    title: 'Operating Schedule Navigation Tabs',
    content:
      'Navigate between the 3 core scheduling areas: Weekly Operating Pattern, Calendar Exceptions & Holidays, and Regimen Drift & Emergency Policies.',
    targetSelector: '[data-walkthrough="schedule-tabs-nav"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 4. Weekly Operating Pattern Presets
  {
    id: 'schedule-weekly-presets',
    module: 'Clinic Setup',
    section: 'Weekly Operating Pattern',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-weekly"]',
    title: 'Quick Schedule Presets',
    content:
      'Instantly apply common operating schedules with 1-click presets: Mon–Fri (Standard), Mon & Thu Only (ABTC Session days), or Daily (7 Days open).',
    targetSelector: '[data-walkthrough="schedule-presets-toolbar"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 5. Weekly Days Configuration List
  {
    id: 'schedule-weekly-days',
    module: 'Clinic Setup',
    section: 'Weekly Operating Pattern',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-weekly"]',
    title: 'Daily Operating Hours Roster',
    content:
      'Enable or disable each day with the toggle switch. For active days, specify official clinic opening and closing times (e.g. 08:00 AM to 05:00 PM).',
    targetSelector: '[data-walkthrough="schedule-weekly-days-list"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 6. Save Weekly Schedule Button
  {
    id: 'schedule-save-weekly-btn',
    module: 'Clinic Setup',
    section: 'Weekly Operating Pattern',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-weekly"]',
    title: 'Save Weekly Operating Pattern',
    content:
      'Click "Save Weekly Schedule" to commit and apply the standard 7-day operating hours across online appointments and walk-in queues.',
    targetSelector: '[data-walkthrough="schedule-save-weekly-btn"]',
    fallbackSelector: 'main.page-content',
    actionStep: true,
    placement: 'top',
  },

  // 7. Calendar Exceptions Tab
  {
    id: 'schedule-exceptions-tab',
    module: 'Clinic Setup',
    section: 'Calendar Exceptions & Holidays',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-exceptions"]',
    title: 'Calendar Exceptions & Holiday Closures',
    content:
      'Manage special date overrides that supersede the standard weekly schedule, such as national holidays, local fiestas, or weather emergencies.',
    targetSelector: '[data-walkthrough="schedule-tab-exceptions"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 8. Add Date Override Action Button
  {
    id: 'schedule-add-override-btn',
    module: 'Clinic Setup',
    section: 'Calendar Exceptions & Holidays',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-exceptions"]',
    title: 'Add Date Override Button',
    content:
      'Click "+ Add Date Override" to schedule a single-day closure or declare a special weekend opening with custom operating hours and a public reason.',
    targetSelector: '[data-walkthrough="schedule-add-override-btn"]',
    fallbackSelector: '[data-walkthrough="schedule-overrides-header"]',
    actionStep: true,
    placement: 'bottom',
  },

  // 9. Calendar Overrides List / Empty State
  {
    id: 'schedule-overrides-list',
    module: 'Clinic Setup',
    section: 'Calendar Exceptions & Holidays',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-exceptions"]',
    title: 'Configured Exceptions Roster',
    content:
      'View active date overrides. Each entry displays the date, status badge (SPECIAL OPEN or CLOSED / HOLIDAY), reason, and edit/delete actions.',
    targetSelector: '[data-walkthrough="schedule-overrides-list"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 10. Regimen Drift & Emergency Policies Tab
  {
    id: 'schedule-policies-tab',
    module: 'Clinic Setup',
    section: 'Regimen Drift & Emergency Policies',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-policies"]',
    title: 'Regimen Drift & Emergency Policies',
    content:
      'Establish clinical guidelines for when scheduled rabies PEP doses land on closed days, and configure emergency protocols for fresh Day-0 animal bites.',
    targetSelector: '[data-walkthrough="schedule-tab-policies"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 11. PEP Regimen Date Drift Policy
  {
    id: 'schedule-drift-policy-section',
    module: 'Clinic Setup',
    section: 'Regimen Drift & Emergency Policies',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-policies"]',
    title: 'PEP Regimen Date Drift Calculation',
    content:
      'Select how doctor-ordered PEP follow-ups (Day 3, 7, 14/28) resolve when falling on a closed day: "Forward Only" (Recommended for Rabies PEP to prevent premature dosing), "Nearest Open Day", or "Backward within N days".',
    targetSelector: '[data-walkthrough="schedule-drift-policy-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 12. Urgent Day-0 Exposure Policy
  {
    id: 'schedule-emergency-policy-section',
    module: 'Clinic Setup',
    section: 'Regimen Drift & Emergency Policies',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-policies"]',
    title: 'Urgent Day-0 Exposure Directives',
    content:
      'Specify 24/7 emergency bite exposure protocol: Accept emergency walk-ins via the hospital ER Triage counter, or display designated partner referral facility contacts and first-aid instructions on the patient mobile app.',
    targetSelector: '[data-walkthrough="schedule-emergency-policy-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 13. Save Policies Button
  {
    id: 'schedule-save-policies-btn',
    module: 'Clinic Setup',
    section: 'Regimen Drift & Emergency Policies',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-policies"]',
    title: 'Save Drift & Emergency Policies',
    content:
      'Click "Save Policies" to enforce your date calculation rules and emergency referral instructions across patient portals and staff scheduling engines.',
    targetSelector: '[data-walkthrough="schedule-save-policies-btn"]',
    fallbackSelector: 'main.page-content',
    actionStep: true,
    placement: 'top',
  },
];

export const CLINIC_MODULE_CONFIG_STEPS: WalkthroughStep[] = [
  // 1. Module Configuration Overview (Centered modal with blur background)
  {
    id: 'module-config-overview',
    module: 'Clinic Setup',
    section: 'Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Clinic Module Configuration',
    content:
      'Welcome to Module Configuration! Adapt the system to your clinic workflow: turn clinical stations (Registration, Triage, Treatment) on or off, adjust section visibility, and enforce essential clinical safeguards.',
    targetSelector: '[data-walkthrough="module-config-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Audit History & Revisions
  {
    id: 'module-config-history-btn',
    module: 'Clinic Setup',
    section: 'Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Configuration History & Revision Stamping',
    content:
      'Every change is revision-stamped and recorded in the audit trail. Click "Audit History" to view the historical timeline of changes, including who made them and which form rules were altered.',
    targetSelector: '[data-walkthrough="module-config-history-btn"]',
    fallbackSelector: '[data-walkthrough="module-config-header"]',
    placement: 'bottom',
  },

  // 3. Clinical Stations Row
  {
    id: 'module-config-stations-row',
    module: 'Clinic Setup',
    section: 'Clinical Stations',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Clinical Station Workflows',
    content:
      'Enable or disable operational clinic desks: Form 1 (Patient Registration), Form 2 (Triage & Assessment), and Form 3 (Treatment & Vaccination). Disabling a station streamlines queues and removes unnecessary desks.',
    targetSelector: '[data-walkthrough="module-config-stations-row"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 4. Active Patient Flow Diagram
  {
    id: 'module-config-flow-diagram',
    module: 'Clinic Setup',
    section: 'Clinical Stations',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Real-Time Patient Flow Diagram',
    content:
      'Visualizes the step-by-step patient journey through the enabled stations. Built-in workflow policy guards prevent invalid combinations (e.g. keeping Registration open while Triage is disabled).',
    targetSelector: '[data-walkthrough="module-config-flow-diagram"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 5. Form 1: Registration Sections & Fields
  {
    id: 'module-config-registration-group',
    module: 'Clinic Setup',
    section: 'Form 1 Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Form 1 — Registration Sections & Field Rules',
    content:
      'Control which intake sections and questions appear: Demographics, Address components, Socioeconomic data, Government Programs (PhilHealth/4Ps), and Bite Incident Intake. Each field can be set to Required, Optional, or Hidden.',
    targetSelector: '[data-walkthrough="module-config-registration-group"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 6. Form 2: Triage Clinical Safeguards
  {
    id: 'module-config-triage-group',
    module: 'Clinic Setup',
    section: 'Form 2 Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Form 2 — Triage Clinical Assessment Safeguards',
    content:
      'Configure doctor assessment fields. Note that the WHO/DOH Rabies Exposure Category (Category I, II, III) is permanently locked as Required — ensuring doctors never bypass bite risk categorization.',
    targetSelector: '[data-walkthrough="module-config-triage-group"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 7. Form 3: Treatment & Vaccination Fields
  {
    id: 'module-config-treatment-group',
    module: 'Clinic Setup',
    section: 'Form 3 Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Form 3 — Treatment & Vaccination Records',
    content:
      'Customize clinical fields recorded by nurses: vaccine brand names, administration route (ID/IM), dosage volume, batch lot numbers, dilution tracking, and adverse reaction logs.',
    targetSelector: '[data-walkthrough="module-config-treatment-group"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 8. Save Configuration Button
  {
    id: 'module-config-save-btn',
    module: 'Clinic Setup',
    section: 'Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Save & Enforce Configuration',
    content:
      'Click "Save Configuration" to commit and cache your rules. Changes immediately apply across all registration staff tablets, doctor triage screens, and nurse treatment portals.',
    targetSelector: '[data-walkthrough="module-config-save-btn"]',
    fallbackSelector: 'main.page-content',
    actionStep: true,
    placement: 'top',
  },
];

export const CLINIC_STAFF_ASSIGNMENT_STEPS: WalkthroughStep[] = [
  // 1. Staff Assignments Overview (Centered modal with blur background)
  {
    id: 'staff-assignment-overview',
    module: 'Clinic Setup',
    section: 'Staff Assignments',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Staff Workstation Assignments',
    content:
      'Welcome to Staff Assignments! Allocate healthcare team members to active clinic desks: Station 1 (Day 0 Intake), Station 2 (Follow-up Doses), Doctor Consultation, and Registration Desks to ensure comprehensive shift coverage.',
    targetSelector: '[data-walkthrough="staff-assignment-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Daily Duty & Station KPIs
  {
    id: 'staff-assignment-kpi-cards',
    module: 'Clinic Setup',
    section: 'Workstation KPIs',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Workstation Duty & Coverage KPIs',
    content:
      'Monitor shift readiness at a glance: Total staff on duty, Station 1 (Day 0) coverage status, Station 2 (Follow-up) coverage status, and whether an authorized Physician/Doctor is actively present.',
    targetSelector: '[data-walkthrough="staff-assignment-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 3. Staff Member Search & Filter
  {
    id: 'staff-assignment-search',
    module: 'Clinic Setup',
    section: 'Staff Roster',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Search & Filter Team Members',
    content:
      'Quickly find staff by typing their name, email, professional license number, clinical role, or current workstation assignment.',
    targetSelector: '[data-walkthrough="staff-assignment-search"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 4. Staff Roster & Professional Qualifications
  {
    id: 'staff-assignment-table',
    module: 'Clinic Setup',
    section: 'Staff Roster',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Staff Roster & Qualifications',
    content:
      'Inspect team members, contact numbers, professional license details, and operational status. Role badges clearly indicate whether a staff member is a Registered Nurse, Doctor, or Registration Staff.',
    targetSelector: '[data-walkthrough="staff-assignment-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 5. Workstation Assignment Selector
  {
    id: 'staff-assignment-select',
    module: 'Clinic Setup',
    section: 'Workstation Allocation',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Assign Workstation Desk',
    content:
      'Use the dropdown to allocate personnel to specific stations: Station 1 (Day 0 Intake), Station 2 (Follow-up), Dual Station (Solo Nurse mode), Doctor Consultation, or Registration Desk. System guards ensure staff only access desks matching their credentials.',
    targetSelector: '[data-walkthrough="staff-assignment-select"]',
    fallbackSelector: '[data-walkthrough="staff-assignment-table"] select',
    actionStep: true,
    placement: 'top',
  },
];

export const CLINIC_STAFF_ACTIVITY_STEPS: WalkthroughStep[] = [
  // 1. Staff Activity Monitor Overview (Centered modal with blur background)
  {
    id: 'staff-activity-overview',
    module: 'Clinic Setup',
    section: 'Staff Activity Monitor',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Staff Activity Monitor',
    content:
      'Welcome to Staff Activity Monitor! Maintain oversight and audit clinical actions: track staff logins, monitor record creations or deletions, and detect after-hours system access.',
    targetSelector: '[data-walkthrough="staff-activity-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Activity & Security KPI Cards
  {
    id: 'staff-activity-kpi-cards',
    module: 'Clinic Setup',
    section: 'Activity Metrics',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Daily Activity & Security KPIs',
    content:
      'Review vital audit indicators: Total Actions Today, Active Staff Login Sessions, After-Hours Events (actions occurring before 8:00 AM or after 5:00 PM), and your Top Contributing Staff Member.',
    targetSelector: '[data-walkthrough="staff-activity-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 3. Multi-Parameter Audit Filters
  {
    id: 'staff-activity-filters',
    module: 'Clinic Setup',
    section: 'Audit Filters',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Audit Filters & Search Controls',
    content:
      'Filter event logs by individual staff member, specific action type (Login, Logout, Created, Updated, Deleted, Viewed), custom date range, or search terms like IP addresses and patient IDs.',
    targetSelector: '[data-walkthrough="staff-activity-filters"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 4. Detailed Audit Trail Table
  {
    id: 'staff-activity-table',
    module: 'Clinic Setup',
    section: 'Audit Log Records',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Comprehensive Audit Trail Table',
    content:
      'Every clinical event is immutably logged with its timestamp, performing staff member, action badge, description, and client IP address. After-hours events are clearly marked with an amber badge for supervisory review.',
    targetSelector: '[data-walkthrough="staff-activity-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

export const CLINIC_PREDEFINED_TEMPLATES_STEPS: WalkthroughStep[] = [
  // 1. Predefined Templates Overview (Centered modal with blur background)
  {
    id: 'templates-overview',
    module: 'Clinic Setup',
    section: 'Predefined Templates',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Predefined Clinic Templates',
    content:
      'Welcome to Predefined Templates! Explore and test standardized clinic operational blueprints: Public ABTC (integrated public health workflow) and Basic Template (streamlined clinical essentials).',
    targetSelector: '[data-walkthrough="templates-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },

  // 2. Preset Template Cards Grid
  {
    id: 'templates-presets-grid',
    module: 'Clinic Setup',
    section: 'Workflow Blueprints',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Workflow Blueprint Presets',
    content:
      'Compare workflow models side-by-side: Public ABTC follows the standard Philippine public health protocol, while Basic Template prioritizes clinical essentials with optional socioeconomic and government programs.',
    targetSelector: '[data-walkthrough="templates-presets-grid"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 3. Workflow & Visit Simulator
  {
    id: 'templates-workflow-preview',
    module: 'Clinic Setup',
    section: 'Workflow Simulation',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Interactive Visit & Step Simulator',
    content:
      'Simulate patient journeys in real time: toggle between "New bite visit" and "Return dose visit", and click through steps (Registration, Assessment, Treatment, Follow-up) to inspect required screen fields and actions.',
    targetSelector: '[data-walkthrough="templates-workflow-preview"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // 4. Staff Coverage Models
  {
    id: 'templates-staff-coverage',
    module: 'Clinic Setup',
    section: 'Staffing Simulation',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Staff Coverage Models',
    content:
      'Preview operational desk coverage: test "One admin desk" (single staff coordinating visits) versus "Separate desks" (dedicated counters for intake, doctor triage, and nurse vaccinations).',
    targetSelector: '[data-walkthrough="templates-staff-coverage"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },

  // 5. Template Form Fields & Optional Sections
  {
    id: 'templates-fields-config',
    module: 'Clinic Setup',
    section: 'Form Configuration',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Template Fields & Optional Sections',
    content:
      'Review mandatory clinical sections across Forms 1, 2, and 3. Easily toggle optional Form 1 modules such as Socioeconomic Information and PhilHealth / Government Programs to preview registration screen density.',
    targetSelector: '[data-walkthrough="templates-fields-config"]',
    fallbackSelector: '[data-walkthrough="templates-workflow-preview"]',
    placement: 'top',
  },

  // 6. Save & Apply Preview Action Button
  {
    id: 'templates-save-preview-btn',
    module: 'Clinic Setup',
    section: 'Predefined Templates',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Save & Apply Preview',
    content:
      'Click "Save & apply preview" to test your chosen template, desk coverage model, and optional sections while this page is open. A confirmation modal will outline your preview choices without modifying live clinic databases.',
    targetSelector: '[data-walkthrough="templates-save-preview-btn"]',
    fallbackSelector: 'main.page-content',
    actionStep: true,
    placement: 'top',
  },
];

export const CLINIC_SETUP_STEPS: WalkthroughStep[] = [
  ...CLINIC_INFO_STEPS,
  ...CLINIC_OPERATING_SCHEDULE_STEPS,
  ...CLINIC_MODULE_CONFIG_STEPS,
  ...CLINIC_STAFF_ASSIGNMENT_STEPS,
  ...CLINIC_STAFF_ACTIVITY_STEPS,
  ...CLINIC_PREDEFINED_TEMPLATES_STEPS,
];

export function getClinicSetupSteps(route?: string): WalkthroughStep[] {
  if (route === ROUTES.CLINIC_SETUP.SCHEDULE) {
    return CLINIC_OPERATING_SCHEDULE_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.MODULES) {
    return CLINIC_MODULE_CONFIG_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS) {
    return CLINIC_STAFF_ASSIGNMENT_STEPS;
  }
  if (route === ROUTES.AUDIT.ACTIVITY) {
    return CLINIC_STAFF_ACTIVITY_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.TEMPLATES) {
    return CLINIC_PREDEFINED_TEMPLATES_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.INFO) {
    return CLINIC_INFO_STEPS;
  }
  return CLINIC_SETUP_STEPS;
}

export function getClinicOperatingScheduleSteps(route: string = ROUTES.CLINIC_SETUP.SCHEDULE): WalkthroughStep[] {
  return CLINIC_OPERATING_SCHEDULE_STEPS;
}

export function getClinicModuleConfigSteps(route: string = ROUTES.CLINIC_SETUP.MODULES): WalkthroughStep[] {
  return CLINIC_MODULE_CONFIG_STEPS;
}

export function getClinicStaffAssignmentSteps(route: string = ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS): WalkthroughStep[] {
  return CLINIC_STAFF_ASSIGNMENT_STEPS;
}

export function getClinicStaffActivitySteps(route: string = ROUTES.AUDIT.ACTIVITY): WalkthroughStep[] {
  return CLINIC_STAFF_ACTIVITY_STEPS;
}

export function getClinicPredefinedTemplatesSteps(route: string = ROUTES.CLINIC_SETUP.TEMPLATES): WalkthroughStep[] {
  return CLINIC_PREDEFINED_TEMPLATES_STEPS;
}
