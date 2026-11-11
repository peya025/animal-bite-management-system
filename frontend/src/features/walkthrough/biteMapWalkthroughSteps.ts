import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_MAP_STEPS: WalkthroughStep[] = [
  {
    id: 'bitemap-overview',
    module: 'Bite Map',
    title: 'Geographic Bite Map',
    content:
      'Explore geospatial distribution of animal bite incidents across the community. This interactive map pinpoints bite incident locations to identify high-risk barangays and rabies transmission clusters.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-tour="bite-map-container"], [data-walkthrough="bitemap-map-view"], .leaflet-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'bitemap-markers',
    module: 'Bite Map',
    title: 'Map Markers and Incident Clusters',
    content:
      'Individual markers pinpoint specific bite incidents. Clustered numbers show concentrated areas of exposures. Click any marker or cluster to inspect incident details and patient cases.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-tour="bite-map-marker"], .custom-cluster-icon, .custom-marker-icon, .leaflet-marker-icon',
    fallbackSelector: '[data-tour="bite-map-container"], [data-walkthrough="bitemap-map-view"]',
    placement: 'top',
  },
  {
    id: 'bitemap-heatmap',
    module: 'Bite Map',
    title: 'Density Heatmap Toggle',
    content:
      'Switch between incident point markers and the density heatmap view to visualize municipal heat zones with high rabies exposure density.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-tour="bite-map-heatmap-toggle"], [data-walkthrough="bitemap-heatmap-btn"]',
    fallbackSelector: '[data-walkthrough="bitemap-view-toggle"]',
    placement: 'bottom',
  },
  {
    id: 'bitemap-filters',
    module: 'Bite Map',
    title: 'Map Surveillance Filters',
    content:
      'Filter map incidents by date range, exposure category (Category I, II, III), animal status, or vaccination completion to support targeted community interventions.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-walkthrough="bitemap-filters"], .map-filters-panel',
    fallbackSelector: '[data-tour="bite-map-container"]',
    placement: 'bottom',
  },
];

export function getBiteMapSteps(route: string = ROUTES.BITE_CASES.MAP): WalkthroughStep[] {
  return BITE_MAP_STEPS.map(step => ({ ...step, route }));
}
