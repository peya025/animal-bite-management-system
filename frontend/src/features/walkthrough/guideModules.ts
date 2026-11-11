import { getNavItemsForRole } from '../../shared/config/navigationConfig';
import { ROUTES } from '../../shared/config/routes';
import { REGISTRATION_WALKTHROUGH_STEPS, getDashboardStepsForRole, getDashboardModuleInfoForRole } from './walkthroughSteps';
import type { GuideModule, WalkthroughStep } from './types';
import { getPatientRegistrationSteps } from './patientGuide';

const existing = (ids: string[]) => ids.map(id => REGISTRATION_WALKTHROUGH_STEPS.find(step => step.id === id)!).filter(Boolean);
const onRoute = (steps: WalkthroughStep[], route: string): WalkthroughStep[] => steps.map(step => ({ ...step, route }));

function getTreatmentQueueSteps(role?: string): WalkthroughStep[] {
  const station1Steps: WalkthroughStep[] = [
    {
      id: 'queue-station1-overview',
      module: 'Treatment Queues',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Treatment Queues · Station 1: New & Day 0',
      content: 'Monitor patients waiting for initial consultation and Day 0 vaccination intake. Track arrivals and call active tickets.',
      targetSelector: '[data-walkthrough="queue-header"]',
      fallbackSelector: '#queue-table-container',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-numbers',
      module: 'Treatment Queues',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Station 1 Queue Counters',
      content: 'Real-time counters show patients waiting, currently called to the desk, in consultation, or finished today.',
      targetSelector: '[data-walkthrough="queue-kpi-strip"]',
      fallbackSelector: '.MuiBox-root',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-display',
      module: 'Treatment Queues',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Queue Display Screen',
      content: 'Open the big-screen display for the patient waiting area showing ticket numbers actively being called.',
      targetSelector: '[data-walkthrough="queue-display-btn"]',
      fallbackSelector: 'button',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-table',
      module: 'Treatment Queues',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Station 1 Waiting List & Patient Calling',
      content: 'View waiting patients, call tickets to your desk, search by name or queue number, and manage queue priorities.',
      targetSelector: '[data-tour="queue-filter-bar"], [data-walkthrough="queue-filter-bar"]',
      fallbackSelector: '#queue-table-container',
      placement: 'bottom',
    },
  ];

  const hasStation2 = role === 'admin' || role === 'treatment' || role === 'developer';
  if (!hasStation2) {
    return station1Steps;
  }

  const station2Steps: WalkthroughStep[] = [
    {
      id: 'queue-station2-overview',
      module: 'Treatment Queues',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Treatment Queues · Station 2: Follow-up Doses',
      content: 'Station 2 manages returning patients due for scheduled follow-up vaccine doses (Day 3, Day 7, Day 14/28, and Booster doses).',
      targetSelector: 'h1, .page-header, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-tabs',
      module: 'Treatment Queues',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Doses Tabs & Filters',
      content: 'Switch between Due Today, Online Bookings, Upcoming, and Overdue doses or filter by specific target dose intervals.',
      targetSelector: '.MuiTabs-root, [role="tablist"], main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-actions',
      module: 'Treatment Queues',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Dose Administration & Records',
      content: 'Check in returning patients, click Record Dose (Form 3) to log administered vaccines, and view printable treatment cards.',
      targetSelector: '.MuiTable-root tbody tr:first-child, .MuiTable-root, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];

  return [...station1Steps, ...station2Steps];
}

function getVaccineStockSteps(role?: string): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [];
  const hasSetup = role === 'admin' || role === 'developer';

  if (hasSetup) {
    steps.push({
      id: 'vax-setup',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.TYPES,
      title: 'Vaccine Setup & Catalog',
      content: 'Configure vaccine presets, brand names, dosage volumes, standard doses per vial, dilution rules, and cold chain storage.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    });
  }

  steps.push(
    {
      id: 'vax-inventory',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Vaccine Inventory Overview',
      content: 'Summary cards show total vials in stock, active lots, opened vials nearing shelf-life limits, and low stock warnings.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-batches',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Vaccine Batches & Lot Management',
      content: 'Track lot numbers, expiration dates, remaining doses per batch, and add newly received vaccine shipments to stock.',
      targetSelector: '.MuiTableContainer-root, .MuiTable-root, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'vax-stock-cards',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Stock Cards & Vial Ledger',
      content: 'Inspect official stock card ledgers recording beginning balances, receipts, clinical disbursements, and current balances.',
      targetSelector: '.MuiTabs-root, [role="tablist"], main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-fifo',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'FIFO Compliance Report',
      content: 'Ensure First-In, First-Out stock rotation compliance so earlier-expiring vaccine batches are utilized first.',
      targetSelector: '.MuiTabs-root, [role="tablist"], main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-transactions',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.ADMINISTRATIONS,
      title: 'Inventory Transactions & Logs',
      content: 'Audit real-time transaction logs, stock deductions linked to administered doses, and manual inventory adjustments.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    }
  );

  return steps;
}

function getClinicSetupSteps(): WalkthroughStep[] {
  return [
    {
      id: 'setup-info',
      module: 'Clinic Setup',
      route: ROUTES.CLINIC_SETUP.INFO,
      title: 'Clinic Information',
      content: 'Set official clinic identification, facility code, municipal address, contact telephone/email, and print header logos.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'setup-schedule',
      module: 'Clinic Setup',
      route: ROUTES.CLINIC_SETUP.SCHEDULE,
      title: 'Operating Schedule',
      content: 'Configure daily operating hours, consultation days, shift time slots, and emergency appointment scheduling policies.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'setup-modules',
      module: 'Clinic Setup',
      route: ROUTES.CLINIC_SETUP.MODULES,
      title: 'Module Configuration',
      content: 'Customize clinical form fields for Form 1 (Intake), Form 2 (Triage), and Form 3 (Vaccination), and set station workflow rules.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'setup-staff',
      module: 'Clinic Setup',
      route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
      title: 'Staff Assignments',
      content: 'Assign healthcare personnel to specific station desks (Station 1 Day 0 Intake vs Station 2 Follow-up Doses) and manage rosters.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'setup-activity',
      module: 'Clinic Setup',
      route: ROUTES.AUDIT.ACTIVITY,
      title: 'Staff Activity Monitor',
      content: 'Track audit logs of staff logins, patient enrollments, clinical consultations, dose records, and administrative modifications.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'setup-templates',
      module: 'Clinic Setup',
      route: ROUTES.CLINIC_SETUP.TEMPLATES,
      title: 'Predefined Templates',
      content: 'Manage standard clinical advice templates, wound cleaning instructions, doctor assessment notes, and treatment guidance.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

function getUserManagementSteps(): WalkthroughStep[] {
  return [
    {
      id: 'users-roster',
      module: 'User Management',
      route: ROUTES.USERS.LIST,
      title: 'Staff Accounts Roster',
      content: 'Review all registered clinic personnel, their active roles (Doctor, Nurse, Registration Staff, Admin), and account statuses.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'users-invite',
      module: 'User Management',
      route: ROUTES.USERS.LIST,
      title: 'Add & Invite Staff',
      content: 'Create new user accounts or send invitation credentials to onboarding healthcare personnel.',
      targetSelector: 'a[href*="/users/create"], button, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'users-actions',
      module: 'User Management',
      route: ROUTES.USERS.LIST,
      title: 'Account Status & Role Permissions',
      content: 'Edit user profiles, adjust role assignments, toggle account active status, or reset credentials securely.',
      targetSelector: '.MuiTableContainer-root, .MuiTable-root, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

function getVaccinationScheduleSteps(): WalkthroughStep[] {
  return [
    {
      id: 'vaccinations-overview',
      module: 'Vaccination Schedule',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Vaccination Schedule Overview',
      content: 'View calendar schedules and list views of returning patients due for scheduled vaccination doses.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vaccinations-filters',
      module: 'Vaccination Schedule',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Date Range & Dose Filters',
      content: 'Filter appointments by date range or dose day (Day 0, Day 3, Day 7, Day 14/28, Booster) to plan daily clinic workload.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vaccinations-actions',
      module: 'Vaccination Schedule',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Patient Appointment Check-in & Actions',
      content: 'Check in returning patients for their vaccination, update attendance, and monitor follow-up completion rates.',
      targetSelector: '.MuiTableContainer-root, .MuiTable-root, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

function getDeveloperToolsSteps(): WalkthroughStep[] {
  return [
    {
      id: 'dev-diagnostics',
      module: 'Developer Tools',
      route: ROUTES.APPOINTMENT_DIAGNOSTICS,
      title: 'Appointment Bug Catcher',
      content: 'Diagnose and repair appointment calendar inconsistencies and patient scheduling data.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'dev-landing',
      module: 'Developer Tools',
      route: ROUTES.DEVELOPER_SETTINGS,
      title: 'Landing & Footer Settings',
      content: 'Manage public portal landing page copy, FAQs, and footer contact information.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'dev-database',
      module: 'Developer Tools',
      route: ROUTES.DATABASE_EXPLORER,
      title: 'Database Explorer',
      content: 'Inspect database tables, column schemas, and execute administrative diagnostic queries.',
      targetSelector: 'main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

/**
 * Build one GuideModule per main sidebar navigation item for the user's role.
 * Rule: One main sidebar module = One walkthrough card.
 */
export function getGuideModules(role?: string): GuideModule[] {
  const nav = getNavItemsForRole(role);

  return nav.map(item => {
    // 1. Dashboard
    if (item.label === 'Dashboard' || item.path === ROUTES.DASHBOARD) {
      const info = getDashboardModuleInfoForRole(role);
      const steps = getDashboardStepsForRole(role);
      return {
        id: ROUTES.DASHBOARD,
        name: info.name,
        route: ROUTES.DASHBOARD,
        description: info.description,
        steps,
      };
    }

    // 2. Patient Registration
    if (item.label === 'Patient Registration' || item.path === ROUTES.PATIENTS.LIST) {
      return {
        id: ROUTES.PATIENTS.LIST,
        name: 'Patient Registration',
        route: ROUTES.PATIENTS.LIST,
        description: 'Register walk-in patients, manage queued arrivals, and look up patient records.',
        steps: getPatientRegistrationSteps(ROUTES.PATIENTS.LIST),
      };
    }

    // 3. Treatment Queues (Station 1 + Station 2)
    if (item.label === 'Treatment Queues' || item.submenu?.some(sub => sub.path === ROUTES.QUEUE.DASHBOARD)) {
      return {
        id: 'treatment-queues',
        name: 'Treatment Queues',
        route: ROUTES.QUEUE.DASHBOARD,
        description: 'Track waiting patients, call queue numbers, and manage follow-up dose administrations.',
        steps: getTreatmentQueueSteps(role),
      };
    }

    // 4. Patient List (Doctor / Treatment)
    if (item.label === 'Patient List' || item.path === ROUTES.PATIENTS.REGISTRY) {
      return {
        id: ROUTES.PATIENTS.REGISTRY,
        name: 'Patient List',
        route: ROUTES.PATIENTS.REGISTRY,
        description: 'Search, view, and manage registered patient records and clinical history.',
        steps: getPatientRegistrationSteps(ROUTES.PATIENTS.REGISTRY),
      };
    }

    // 5. Bite Cases Summary
    if (item.label === 'Bite Cases Summary' || item.path === ROUTES.BITE_CASES.LIST) {
      return {
        id: ROUTES.BITE_CASES.LIST,
        name: 'Bite Cases Summary',
        route: ROUTES.BITE_CASES.LIST,
        description: 'Review and filter animal bite cases and priority locations.',
        steps: onRoute(existing(['bite-cases-overview', 'bite-cases-filters', 'bite-cases-table']), ROUTES.BITE_CASES.LIST),
      };
    }

    // 6. Bite Map
    if (item.label === 'Bite Map' || item.path === ROUTES.BITE_CASES.MAP) {
      return {
        id: ROUTES.BITE_CASES.MAP,
        name: 'Bite Map',
        route: ROUTES.BITE_CASES.MAP,
        description: 'Explore where bite incidents occurred across the community.',
        steps: onRoute(existing(['bitemap-overview', 'bitemap-markers', 'bitemap-heatmap', 'bitemap-filters']), ROUTES.BITE_CASES.MAP),
      };
    }

    // 7. Vaccine Stock Management
    if (item.label === 'Vaccine Stock Management' || item.submenu?.some(sub => sub.path === ROUTES.INVENTORY.LIST)) {
      const startRoute = (role === 'admin' || role === 'developer') ? ROUTES.INVENTORY.TYPES : ROUTES.INVENTORY.LIST;
      return {
        id: 'vaccine-stock-management',
        name: 'Vaccine Stock Management',
        route: startRoute,
        description: 'Oversee vaccine setup, batch lots, stock cards, FIFO compliance, and transactions.',
        steps: getVaccineStockSteps(role),
      };
    }

    // 8. Vaccination Schedule
    if (item.label === 'Vaccination Schedule' || item.path === ROUTES.VACCINATIONS.LIST) {
      return {
        id: ROUTES.VACCINATIONS.LIST,
        name: 'Vaccination Schedule',
        route: ROUTES.VACCINATIONS.LIST,
        description: 'Track upcoming appointments, monitor dose adherence, and manage return visits.',
        steps: getVaccinationScheduleSteps(),
      };
    }

    // 9. Reports & Analytics
    if (item.label === 'Reports & Analytics' || item.path === ROUTES.REPORTS.LIST) {
      return {
        id: ROUTES.REPORTS.LIST,
        name: 'Reports & Analytics',
        route: ROUTES.REPORTS.LIST,
        description: 'View, filter, and export clinic reports and surveillance charts.',
        steps: onRoute(existing(['reports-overview', 'reports-tabs', 'reports-filters', 'reports-charts', 'reports-actions']), ROUTES.REPORTS.LIST),
      };
    }

    // 10. User Management
    if (item.label === 'User Management' || item.path === ROUTES.USERS.LIST) {
      return {
        id: ROUTES.USERS.LIST,
        name: 'User Management',
        route: ROUTES.USERS.LIST,
        description: 'Manage staff accounts, user permissions, assignments, and access status.',
        steps: getUserManagementSteps(),
      };
    }

    // 11. Clinic Setup
    if (item.label === 'Clinic Setup' || item.submenu?.some(sub => sub.path === ROUTES.CLINIC_SETUP.INFO)) {
      return {
        id: 'clinic-setup',
        name: 'Clinic Setup',
        route: ROUTES.CLINIC_SETUP.INFO,
        description: 'Configure clinic information, operating schedules, clinical module forms, and staff rosters.',
        steps: getClinicSetupSteps(),
      };
    }

    // 12. Developer Tools
    if (item.label === 'Developer Tools' || item.submenu?.some(sub => sub.path === ROUTES.APPOINTMENT_DIAGNOSTICS)) {
      return {
        id: 'developer-tools',
        name: 'Developer Tools',
        route: ROUTES.APPOINTMENT_DIAGNOSTICS,
        description: 'Access developer diagnostic utilities, landing settings, and database explorer.',
        steps: getDeveloperToolsSteps(),
      };
    }

    // Fallback for any other navigation item
    const fallbackRoute = item.path || (item.submenu && item.submenu[0]?.path) || ROUTES.DASHBOARD;
    return {
      id: fallbackRoute,
      name: item.label,
      route: fallbackRoute,
      description: `Learn the main features and controls in ${item.label}.`,
      steps: [
        {
          id: `${fallbackRoute}-intro`,
          module: 'Dashboard',
          route: fallbackRoute,
          title: item.label,
          content: `This page is where you work with ${item.label.toLowerCase()}.`,
          targetSelector: 'main.page-content h1, main.page-content h2, .page-content h1, .page-content h2',
          fallbackSelector: 'main.page-content, .page-content',
          placement: 'bottom',
        },
      ],
    };
  });
}
