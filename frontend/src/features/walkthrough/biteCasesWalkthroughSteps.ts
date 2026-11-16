import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_CASES_STEPS: WalkthroughStep[] = [
  {
    id: 'bite-cases-overview',
    module: 'Bite Cases Summary',
    section: 'DOH Overview & Key Numbers',
    title: 'DOH-Aligned Bite Cases Summary',
    content:
      'Welcome to the redesigned Bite Cases Summary! It mirrors the data needed across the Rabies Exposure Registry (Form 1), ABTC Monthly Report (Form 2), and Cohort Report (Form 3), while explicitly reporting incomplete patient journeys without hiding pending or unknown information.',
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
    title: 'DOH Indicator & Incomplete-Stage Cards',
    content:
      'Review Recorded Exposures (Form 1), Category III Exposures (Form 2), PEP Started / Given PEP, Mature Course Completion at cutoff, plus the two incomplete-stage gap cards (Assessed vs. Awaiting Assessment and No Admin Recorded & Referrals). Click any card to drill down.',
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
    title: 'Summary Tabs: Overview, Treatment, Planning & Episode Drill-Down',
    content:
      'Switch across four focused views: "Overview & DOH Summary" (executive findings, 5-stage incomplete-journey matrix, and exposure profiles), "Treatment & Follow-up" (progress strip, Form 2 & 3 cohort outcomes, denominator bridge, and review aging), "Planning & Barangays" (explicit review reasons and action guide), and "Episode Drill-Down" (authorized patient-level records, automatically hidden in Conference Mode).',
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
      'Quickly find any episode by typing the patient name, case number (e.g., BC-2026-0009), or exposure location.',
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
    title: 'Category, Journey Stage, Animal, Date Range & Cutoff Filters',
    content:
      'Filter by Exposure Category (I, II, III, or Unassessed), Clinical Stage / Status (Form 1 Awaiting Assessment through Form 3 Treatment Recorded), Biting Animal (including Unknown), Exposure Date Range, and Reporting Cutoff Date.',
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
      'Click "Bite Map" anytime to open the geographic map showing exposure locations across Tagoloan and nearby areas.',
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
    title: 'DOH Matrix, Barangay & Episode Tables',
    content:
      'Inspect what can be reported at each patient’s last completed stage, compare barangay-level DOH metrics, or review every individual episode including Form 1 and Form 2 cases where treatment has not started yet.',
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
    title: 'Export CSV (DOH-Aligned Spreadsheet)',
    content:
      'Click "Export CSV" to download either the Barangay Exposure Summary (demographics, categories, PEP, RIG, completion) or All Recorded Episodes (stage, treatment decision, administration, and RIG fields) for MHO/DOH meetings.',
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
