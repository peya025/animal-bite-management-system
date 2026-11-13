import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const BITE_MAP_STEPS: WalkthroughStep[] = [
  // ── Step 1: Overview (Welcome Screen) ──
  {
    id: 'bitemap-overview',
    module: 'Bite Map',
    section: 'Overview & Key Numbers',
    title: 'Bite Location Map Overview',
    content:
      'Welcome to the Bite Location Map! This interactive surveillance map plots reported animal bite incidents across Tagoloan, helping clinic staff and health officers spot transmission hotspots and prevent rabies outbreaks.',
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
    title: 'Risk Category & Case Summary Cards',
    content:
      'These 4 cards at the top show key municipal numbers: Total Cases (with active vs completed counts), Category III (High Risk - Severe transdermal bites), Category II (Moderate - Scratches & abrasions), and Category I (Low Risk - Intact skin / minor bites).',
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
    title: 'Map Surveillance Filters',
    content:
      'Easily filter which incidents appear on the map: choose a Time Range (All Time, This Week, This Month, Last 30 Days), select WHO Categories (All, Category III Severe, Category II Moderate, Category I Minor), and filter by Case Status (All, Active PEP, or Completed).',
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
    title: 'Pins & Clusters vs Density Heatmap',
    content:
      'Switch how bite incidents are displayed: "Pins & Clusters" shows exact incident pins and grouped neighborhood circles. "Density Heatmap" highlights municipal heat zones with glowing colors to spot rabies transmission hotspots.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-walkthrough="bitemap-view-toggle"], [data-tour="bitemap-view-toggle"]',
    fallbackSelector: '[data-walkthrough="bitemap-container"]',
    placement: 'bottom',
  },

  // ── Step 5: Incident Clusters & Area Groups (Cluster "2") ──
  {
    id: 'bitemap-clusters',
    module: 'Bite Map',
    section: 'Interactive Map',
    title: 'Incident Clusters & Area Groups',
    content:
      'When multiple bites occur near each other, they bundle into a numbered circle called a Cluster (like the circle with "2"). The multi-colored ring shows the severity categories inside. Clicking the cluster circle zooms in and expands it into individual incident pins!',
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
    title: 'Interactive Incident Pins & Patient Details',
    content:
      'Each pin marks an exact bite incident: Red = Category III (Severe), Amber = Category II (Moderate), and Green = Category I (Minor). Clicking any pin opens this case popup showing the patient name, incident date, biting animal, and a "View Details" button to open full clinical records.',
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
    title: 'Bite Categories & Cluster Legend',
    content:
      'This legend card in the bottom-right corner serves as your quick reference guide. It explains the meaning of Red (Severe), Amber (Moderate), and Green (Minor) pins, as well as the mixed-category cluster rings.',
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
