import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_MAP_STEPS: WalkthroughStep[] = [
  // ── Step 1: Overview (Welcome Screen) ──
  {
    id: 'bitemap-overview',
    module: 'Bite Map',
    section: 'Overview & Key Numbers',
    title: 'Bite Location Map',
    content:
      'View reported animal bite incidents across Tagoloan to spot hotspots and monitor rabies risk.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-kpi-cards"], [data-walkthrough="bitemap-container"], main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // ── Step 2: KPI Stat Cards (Top Cards First) ──
  {
    id: 'bitemap-kpi-cards',
    module: 'Bite Map',
    section: 'Overview & Key Numbers',
    title: 'Case Summary Cards',
    content:
      'See counts for Total Cases alongside Category III (High), Category II (Moderate), and Category I (Low) exposures.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-kpi-cards"], [data-tour="bitemap-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },

  // ── Step 3: Map Surveillance Filters (Filters Second) ──
  {
    id: 'bitemap-filters',
    module: 'Bite Map',
    section: 'Map Controls',
    title: 'Map Filters',
    content:
      'Filter mapped cases by time range, WHO bite category, and case status.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-filters"], [data-tour="bitemap-filters"]',
    fallbackSelector: '[data-walkthrough="bitemap-container"]',
    placement: 'bottom',
  },

  // ── Step 4: View Mode Toggle ──
  {
    id: 'bitemap-view-mode',
    module: 'Bite Map',
    section: 'Map Controls',
    title: 'Map View Mode',
    content:
      'Switch between Pins & Clusters for individual locations and Density Heatmap for high-risk zones.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-view-toggle"], [data-tour="bitemap-view-toggle"]',
    fallbackSelector: '[data-walkthrough="bitemap-container"]',
    placement: 'bottom',
  },

  // ── Step 5: Incident Clusters & Area Groups ──
  {
    id: 'bitemap-clusters',
    module: 'Bite Map',
    section: 'Interactive Map',
    title: 'Incident Clusters',
    content:
      'Nearby bites group into numbered clusters. Click a cluster to zoom in and view individual pins.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-tour="bite-map-cluster"], [data-walkthrough="bitemap-cluster"], .custom-cluster-icon, [data-walkthrough="bitemap-map-view"]',
    fallbackSelector: '[data-walkthrough="bitemap-map-view"], .leaflet-container',
    placement: 'top',
  },

  // ── Step 6: Interactive Bite Incident Pins & Details Popup ──
  {
    id: 'bitemap-markers',
    module: 'Bite Map',
    section: 'Interactive Map',
    title: 'Incident Pins & Details',
    content:
      'Pins are color-coded by severity (Red: Cat III, Amber: Cat II, Green: Cat I). Click any pin to view case details.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '.leaflet-popup, [data-tour="bite-map-marker"], .custom-marker-icon, .leaflet-marker-icon, [data-walkthrough="bitemap-map-view"]',
    fallbackSelector: '[data-walkthrough="bitemap-map-view"], .leaflet-container',
    placement: 'top',
  },

  // ── Step 7: Map Legend (Bottom-Right) ──
  {
    id: 'bitemap-legend',
    module: 'Bite Map',
    section: 'Interactive Map',
    title: 'Map Legend',
    content:
      'Quick reference for severity pin colors and mixed-category cluster rings.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-legend"], [data-tour="bitemap-legend"], .MuiCard-root',
    fallbackSelector: '[data-walkthrough="bitemap-map-view"]',
    placement: 'top',
  },
];

export function getBiteMapSteps(route: string = ROUTES.BITE_CASES.MAP): WalkthroughStep[] {
  return BITE_MAP_STEPS.map(step => ({ ...step, route }));
}
