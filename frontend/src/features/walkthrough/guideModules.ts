import { getNavItemsForRole } from '../../shared/config/navigationConfig';
import { ROUTES } from '../../shared/config/routes';
import type { GuideModule, WalkthroughStep } from './types';

import { getDashboardStepsForRole, getDashboardModuleInfoForRole } from './dashboardWalkthroughSteps';
import { getPatientRegistrationSteps } from './patientRegistrationWalkthroughSteps';
import { getTreatmentQueueSteps } from './treatmentQueuesWalkthroughSteps';
import { getBiteCasesSteps } from './biteCasesWalkthroughSteps';
import { getBiteMapSteps } from './biteMapWalkthroughSteps';
import { getVaccineStockSteps } from './vaccineStockWalkthroughSteps';
import { getReportsAnalyticsSteps } from './reportsAnalyticsWalkthroughSteps';
import { getUserManagementSteps } from './userManagementWalkthroughSteps';
import { getClinicSetupSteps } from './clinicSetupWalkthroughSteps';

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
        steps: getBiteCasesSteps(ROUTES.BITE_CASES.LIST),
      };
    }

    // 6. Bite Map
    if (item.label === 'Bite Map' || item.path === ROUTES.BITE_CASES.MAP) {
      return {
        id: ROUTES.BITE_CASES.MAP,
        name: 'Bite Map',
        route: ROUTES.BITE_CASES.MAP,
        description: 'Explore where bite incidents occurred across the community.',
        steps: getBiteMapSteps(ROUTES.BITE_CASES.MAP),
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
        steps: getReportsAnalyticsSteps(role, ROUTES.REPORTS.LIST),
      };
    }

    // 10. User Management
    if (item.label === 'User Management' || item.path === ROUTES.USERS.LIST) {
      return {
        id: ROUTES.USERS.LIST,
        name: 'User Management',
        route: ROUTES.USERS.LIST,
        description: 'Manage staff accounts, user permissions, assignments, and access status.',
        steps: getUserManagementSteps(ROUTES.USERS.LIST),
      };
    }

    // 11. Clinic Setup
    if (item.label === 'Clinic Setup' || item.submenu?.some(sub => sub.path === ROUTES.CLINIC_SETUP.INFO)) {
      return {
        id: 'clinic-setup',
        name: 'Clinic Setup',
        route: ROUTES.CLINIC_SETUP.INFO,
        description: 'Configure clinic information, operating schedules, clinical module forms, and staff rosters.',
        steps: getClinicSetupSteps(ROUTES.CLINIC_SETUP.INFO),
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
