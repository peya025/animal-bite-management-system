import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_CASES_STEPS: WalkthroughStep[] = [
  {
    id: 'bite-cases-overview',
    module: 'Bite Cases Summary',
    section: 'Overview & Key Numbers',
    title: 'Bite Cases Summary Overview',
    content:
      'Welcome to the Bite Cases Summary dashboard! This page helps our clinic monitor all animal bite incidents, track patient treatment progress, and spot high-risk rabies areas in our community.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-kpi-cards"], [data-tour="bite-cases-kpi-cards"], .page-header',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-stat-cards',
    module: 'Bite Cases Summary',
    section: 'Overview & Key Numbers',
    title: 'Summary Cards (Quick Numbers)',
    content:
      'These cards show clinic bite numbers at a glance: Total Cases, Active Cases (patients still in treatment), Completed cases, High-Priority Areas, Overdue Doses, and PEP Compliance rate. Tip: Click any card to quickly filter the records below!',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-kpi-cards"], [data-tour="bite-cases-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-view-tabs',
    module: 'Bite Cases Summary',
    section: 'Filter & Search Tools',
    title: 'Location Priority vs All Cases',
    content:
      'Switch between two helpful views: "Location Priority" groups cases by barangay/purok to highlight high-risk hotspots. "All Cases" lists every individual patient bite incident.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-view-tabs"], [data-tour="bite-cases-view-tabs"]',
    fallbackSelector: '[data-walkthrough="bite-cases-filter-bar"]',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-search',
    module: 'Bite Cases Summary',
    section: 'Filter & Search Tools',
    title: 'Instant Search',
    content:
      'Quickly find any case by typing the patient name, case number (e.g., BC-2026-0009), or location in this search box.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-search"], [data-tour="bite-cases-search"]',
    fallbackSelector: '[data-walkthrough="bite-cases-filter-bar"]',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-filters',
    module: 'Bite Cases Summary',
    section: 'Filter & Search Tools',
    title: 'Severity, Status, Animal & Date Filters',
    content:
      'Filter records easily: Severity (Category I, II, or III), Treatment Status (Active, Completed, Awaiting Assessment), Biting Animal (Dog, Cat, Other), and Date Range (This week, This month, or Custom dates).',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-tour="bite-cases-filter-bar"], [data-walkthrough="bite-cases-filter-bar"]',
    fallbackSelector: '.MuiPaper-root',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-map-button',
    module: 'Bite Cases Summary',
    section: 'Filter & Search Tools',
    title: 'Bite Map View',
    content:
      'Click the "Bite Map" button anytime to open the interactive map of Tagoloan. It visually displays pins and risk clusters where animal bites occurred.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-map-button"], [data-tour="bite-cases-map-button"]',
    fallbackSelector: '[data-walkthrough="bite-cases-filter-bar"]',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-table',
    module: 'Bite Cases Summary',
    section: 'Cases Table & Export',
    title: 'All Recorded Bite Cases Table',
    content:
      'This table lists all recorded bite incidents. View the case number, patient name, location, WHO severity category, biting animal, current treatment status, and incident date. Click a patient to inspect their full case record.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-tour="bite-cases-table"], [data-walkthrough="bite-cases-table"], .MuiTable-root',
    fallbackSelector: '.MuiTableContainer-root',
    placement: 'top',
  },
  {
    id: 'bite-cases-export-csv',
    module: 'Bite Cases Summary',
    section: 'Cases Table & Export',
    title: 'Export CSV (Download to Excel)',
    content:
      'Click "Export CSV" to instantly download all current table records into a spreadsheet file. You can open it in Microsoft Excel for reporting, archiving, or submitting to the Municipal Health Office (MHO).',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-export-csv"], [data-tour="bite-cases-export-csv"]',
    fallbackSelector: '[data-walkthrough="bite-cases-table"]',
    placement: 'top',
  },
];

export function getBiteCasesSteps(route: string = ROUTES.BITE_CASES.LIST): WalkthroughStep[] {
  return BITE_CASES_STEPS.map(step => ({ ...step, route }));
}
