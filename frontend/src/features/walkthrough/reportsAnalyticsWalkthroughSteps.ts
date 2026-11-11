import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const REPORTS_ANALYTICS_STEPS: WalkthroughStep[] = [
  {
    id: 'reports-overview',
    module: 'Reports & Analytics',
    title: 'Reports & Analytics Overview',
    content:
      'Generate official clinic surveillance reports, animal bite epidemiology summaries, and vaccination compliance analytics for regulatory compliance and program evaluation.',
    route: ROUTES.REPORTS.LIST,
    targetSelector:
      '[data-tour="reports-summary-cards"], [data-walkthrough="reports-summary-cards"], .rr-overview-top-section',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-tabs',
    module: 'Reports & Analytics',
    title: 'Report Category Tabs',
    content:
      'Switch between patient registries, bite incident summaries, vaccine utilization reports, and geospatial surveillance charts.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-category-tabs"], [data-walkthrough="reports-tabs"], .MuiTabs-root',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-filters',
    module: 'Reports & Analytics',
    title: 'Report Period & Demographic Filters',
    content:
      'Configure reporting date ranges, barangay filters, and exposure categories to generate custom epidemiological cohorts.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-filter-controls"], [data-walkthrough="reports-filters"], .rr-filter-row',
    fallbackSelector: '.rr-filters-unified, main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-charts',
    module: 'Reports & Analytics',
    title: 'Analytical Surveillance Visualizations',
    content:
      'Interactive charts illustrate monthly bite incident trends, category distributions, and completion rates of post-exposure rabies prophylaxis.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-charts"], [data-walkthrough="reports-charts"], .rr-surveillance-row-1',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
  {
    id: 'reports-actions',
    module: 'Reports & Analytics',
    title: 'Export & Print Official Reports',
    content:
      'Export compiled surveillance data as CSV or generate clean printable PDF reports formatted for Department of Health submissions.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-walkthrough="reports-action-buttons"], .rr-header',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
];

export function getReportsAnalyticsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return REPORTS_ANALYTICS_STEPS.map(step => ({ ...step, route }));
}
