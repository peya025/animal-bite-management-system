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
    placement: 'bottom',
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

export const CLINIC_SETUP_STEPS: WalkthroughStep[] = CLINIC_INFO_STEPS;

export function getClinicSetupSteps(route: string = ROUTES.CLINIC_SETUP.INFO): WalkthroughStep[] {
  return CLINIC_INFO_STEPS.map(step => ({ ...step, route }));
}
