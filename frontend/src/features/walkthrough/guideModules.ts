import { getNavItemsForRole } from '../../shared/config/navigationConfig';
import { ROUTES } from '../../shared/config/routes';
import { REGISTRATION_WALKTHROUGH_STEPS } from './walkthroughSteps';
import type { GuideModule, WalkthroughStep } from './types';

const existing = (ids: string[]) => ids.map(id => REGISTRATION_WALKTHROUGH_STEPS.find(step => step.id === id)!).filter(Boolean);
const onRoute = (steps: WalkthroughStep[], route: string): WalkthroughStep[] => steps.map(step => ({ ...step, route }));
const patientTabs = [
  ['patients-tab-today-queue', 'tab-today-queue'],
  ['patients-tab-all', 'tab-all-patients'],
  ['patients-tab-online', 'tab-online-appointments'],
  ['patients-tab-preregistered', 'tab-pre-registered'],
  ['patients-tab-overdue', 'tab-overdue'],
] as const;

const tailored: Record<string, Pick<GuideModule, 'description' | 'steps'>> = {
  [ROUTES.DASHBOARD]: {
    description: 'Find today’s clinic activity and key numbers.',
    steps: existing(['dashboard-overview', 'dashboard-tabs', 'dashboard-patient-summary', 'dashboard-trends']),
  },
  [ROUTES.PATIENTS.LIST]: {
    description: 'Register patients and work through each patient list.',
    steps: [
      { ...existing(['patients-add-btn'])[0], id: 'patients-intro', title: 'Patient Registration', content: 'Register a walk-in patient here, or use the tabs to find an existing patient.', targetSelector: '[data-walkthrough="patients-header"]', fallbackSelector: '.pm-panel-header' },
      ...existing(['patients-add-btn']),
      ...patientTabs.map(([id, selector]) => ({ ...existing([id])[0], activateSelector: `[data-walkthrough="${selector}"]` })),
      { ...existing(['patients-search-filters'])[0], activateSelector: '[data-walkthrough="tab-all-patients"]', content: 'Search this list or narrow it by program.' },
      { ...existing(['patients-actions'])[0], activateSelector: '[data-walkthrough="tab-all-patients"]', title: 'View Patient', content: 'Select View to open a patient’s details and available actions.', targetSelector: '.pm-table .pm-btn-view', fallbackSelector: '[data-walkthrough="patients-table-actions"]' },
      { ...existing(['patients-search-filters'])[0], id: 'patients-print', title: 'Print Patient List', content: 'Print the patient list shown in this tab.', targetSelector: '.pm-print-btn', fallbackSelector: '[data-walkthrough="patients-search-filter"]', activateSelector: '[data-walkthrough="tab-all-patients"]' },
    ],
  },
  [ROUTES.QUEUE.DASHBOARD]: { description: 'Track waiting patients and manage the treatment queue.', steps: onRoute([
    { ...existing(['queue-overview'])[0], title: 'Treatment Queues', content: 'See patients waiting for treatment and follow their queue status.', targetSelector: '[data-walkthrough="queue-header"]', fallbackSelector: '#queue-table-container', placement: 'bottom' },
    ...existing(['queue-numbers', 'queue-display', 'queue-table']),
  ], ROUTES.QUEUE.DASHBOARD) },
  [ROUTES.BITE_CASES.LIST]: { description: 'Review and filter animal bite cases.', steps: existing(['bite-cases-overview', 'bite-cases-filters', 'bite-cases-table']) },
  [ROUTES.BITE_CASES.MAP]: { description: 'Explore where bite incidents occurred.', steps: existing(['bitemap-overview', 'bitemap-markers', 'bitemap-heatmap', 'bitemap-filters']) },
  [ROUTES.REPORTS.LIST]: { description: 'View, filter, and export clinic reports.', steps: existing(['reports-overview', 'reports-tabs', 'reports-filters', 'reports-actions']) },
};

const genericGuide = (name: string, route: string): Pick<GuideModule, 'description' | 'steps'> => ({
  description: `Learn the main controls in ${name}.`,
  steps: [
    { id: `${route}-intro`, module: 'Dashboard', route, title: name, content: `This page is where you work with ${name.toLowerCase()}.`, targetSelector: 'main.page-content h1, main.page-content h2, .page-content h1, .page-content h2', fallbackSelector: 'main.page-content, .page-content', placement: 'bottom' },
    { id: `${route}-workspace`, module: 'Dashboard', route, title: 'Page workspace', content: 'Use the information and controls here to complete your work. Available actions depend on your role.', targetSelector: 'main.page-content, .page-content', placement: 'top' },
  ],
});

export function getGuideModules(role?: string): GuideModule[] {
  const nav = getNavItemsForRole(role);
  const entries = nav.flatMap(item => item.submenu?.length
    ? item.submenu.map(sub => ({ name: sub.label, route: sub.path }))
    : item.path ? [{ name: item.label, route: item.path }] : []);
  const seen = new Set<string>();
  return entries.filter(entry => !seen.has(entry.route) && !!seen.add(entry.route)).map(({ name, route }) => {
    const guide = tailored[route] || genericGuide(name, route);
    return { id: route, name, route, description: guide.description, steps: guide.steps };
  });
}
