import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_CASES_STEPS: WalkthroughStep[] = [
  {
    id: 'bite-cases-overview',
    module: 'Bite Cases Summary',
    title: 'Bite Cases Summary',
    content:
      'This module summarizes animal bite cases across the municipality. It provides high-level surveillance data on bite frequency, exposure risk categories, and priority areas.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-tour="bite-cases-kpi-cards"], [data-walkthrough="bite-cases-kpi-cards"], .page-header',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-filters',
    module: 'Bite Cases Summary',
    title: 'Location Priority & Case Filters',
    content:
      'Switch between Location Priority view and All Cases, or filter records by WHO exposure category, case status, biting animal type, and incident date range.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector: '[data-tour="bite-cases-filter-bar"], [data-walkthrough="bite-cases-filter-bar"]',
    fallbackSelector: '.MuiPaper-root',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-table',
    module: 'Bite Cases Summary',
    title: 'Bite Cases & Priority Table',
    content:
      'Inspect case numbers, patient names, bite exposure categories, affected body parts, and biting animal status. Click Export CSV to download the records for public health surveillance.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector: '[data-tour="bite-cases-table"], [data-walkthrough="bite-cases-table"], .MuiTable-root',
    fallbackSelector: '.MuiTableContainer-root',
    placement: 'top',
  },
  {
    id: 'bite-cases-pagination',
    module: 'Bite Cases Summary',
    title: 'Table Pagination Controls',
    content:
      'Control the number of records displayed per page and navigate between pages of surveillance records.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector: '[data-walkthrough="table-pagination-controls"], .MuiTablePagination-root, .table-pager',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

export function getBiteCasesSteps(route: string = ROUTES.BITE_CASES.LIST): WalkthroughStep[] {
  return BITE_CASES_STEPS.map(step => ({ ...step, route }));
}
