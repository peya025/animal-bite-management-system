import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_CASES_STEPS: WalkthroughStep[] = [
  {
    id: 'bite-cases-overview',
    module: 'Bite Cases Summary',
    section: 'DOH Overview & Key Numbers',
    title: 'Bite Cases Summary',
    content:
      'Review animal bite exposure records across Form 1, Form 2, and Form 3, including incomplete patient journeys.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-kpi-cards"], [data-tour="bite-cases-kpi-cards"], .page-header',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-stat-cards',
    module: 'Bite Cases Summary',
    section: 'DOH Overview & Key Numbers',
    title: 'Key Summary Cards',
    content:
      'Track recorded exposures, Category III cases, PEP started, completed courses, and pending gaps. Click any card to drill down.',
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
    title: 'Summary View Tabs',
    content:
      'Switch between Overview & DOH Summary, Treatment & Follow-up, Planning & Barangays, and Episode Drill-Down.',
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
      'Find a case by patient name, case number, or exposure location.',
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
    title: 'Case Filters',
    content:
      'Filter records by bite category, clinical stage, biting animal, date range, and reporting cutoff.',
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
      'Open the geographic map to see where animal bite incidents occurred.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-walkthrough="bite-cases-map-button"], [data-tour="bite-cases-map-button"]',
    fallbackSelector: '[data-walkthrough="bite-cases-filter-bar"]',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-table',
    module: 'Bite Cases Summary',
    section: 'Summary Tables & Export',
    title: 'Summary & Episode Tables',
    content:
      'Compare barangay DOH metrics or inspect individual bite episodes by their latest clinical stage.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-tour="bite-cases-table"], [data-walkthrough="bite-cases-table"], .MuiTable-root',
    fallbackSelector: '.MuiTableContainer-root',
    placement: 'top',
  },
  {
    id: 'bite-cases-export-csv',
    module: 'Bite Cases Summary',
    section: 'Summary Tables & Export',
    title: 'Export CSV',
    content:
      'Download the Barangay Exposure Summary or All Recorded Episodes as a CSV spreadsheet.',
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
