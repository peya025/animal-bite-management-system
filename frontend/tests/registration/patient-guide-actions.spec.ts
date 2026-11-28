import { test, expect } from '@playwright/test';

test('patient registration guide has identical 28 steps from top to bottom for registration, admin, and developer', async ({ page }) => {
  await page.goto('/@vite/client');
  const result = await page.evaluate(async () => {
    const modulesModule = await import('/src/features/walkthrough/guideModules.ts');
    const navModule = await import('/src/shared/config/navigationConfig.ts');

    const regNav = navModule.getNavItemsForRole('registration');
    const adminNav = navModule.getNavItemsForRole('admin');
    const devNav = navModule.getNavItemsForRole('developer');

    const regPatientItem = regNav.find(item => item.path === '/patients');
    const adminPatientItem = adminNav.find(item => item.path === '/patients');
    const devPatientItem = devNav.find(item => item.path === '/patients');

    const regGuide = modulesModule.getGuideModules('registration').find(m => m.route === '/patients');
    const adminGuide = modulesModule.getGuideModules('admin').find(m => m.route === '/patients');
    const devGuide = modulesModule.getGuideModules('developer').find(m => m.route === '/patients');

    return {
      regHasNav: !!regPatientItem,
      adminHasNav: !!adminPatientItem,
      devHasNav: !!devPatientItem,
      regStepCount: regGuide?.steps.length,
      adminStepCount: adminGuide?.steps.length,
      devStepCount: devGuide?.steps.length,
      regStepIds: regGuide?.steps.map((s: any) => s.id),
      adminStepIds: adminGuide?.steps.map((s: any) => s.id),
      devStepIds: devGuide?.steps.map((s: any) => s.id),
    };
  });

  expect(result.regHasNav).toBe(true);
  expect(result.adminHasNav).toBe(true);
  expect(result.devHasNav).toBe(true);

  // Both registration and admin (and developer) have exactly 28 steps
  expect(result.regStepCount).toBe(28);
  expect(result.adminStepCount).toBe(28);
  expect(result.devStepCount).toBe(28);

  // Exact step sequence matches identically
  expect(result.adminStepIds).toEqual(result.regStepIds);
  expect(result.devStepIds).toEqual(result.regStepIds);

  // Verify the 28 steps include header and all 5 tabs with their actions from top to bottom
  expect(result.regStepIds).toEqual([
    // Top Beginning
    'patients-intro',
    'patients-add-btn',
    'patients-search-filters',
    // Tab 1: Today's Queue
    'patients-tab-today-queue',
    'today-queue-print',
    'today-queue-checkin',
    'today-queue-checkin-reassessment',
    'today-queue-view',
    // Tab 2: All Patients
    'patients-tab-all',
    'all-print',
    'all-checkin',
    'all-checkin-reassessment',
    'all-new-exposure',
    'all-portal-invite',
    'all-view',
    // Tab 3: Online Appointments
    'patients-tab-online',
    'online-print',
    'online-checkin',
    'online-view',
    // Tab 4: Pre-Registered (Mobile)
    'patients-tab-preregistered',
    'preregistered-print',
    'preregistered-checkin-mobile',
    'preregistered-view',
    // Tab 5: Overdue Follow-ups
    'patients-tab-overdue',
    'overdue-print',
    'overdue-checkin-nurse',
    'overdue-portal-invite',
    'overdue-view',
  ]);
});

test('each tab explains all visible action types before the next tab without executing actions', async ({ page }) => {
  await page.goto('/@vite/client');
  await page.setContent('<button data-patient-action="print">Print</button><button data-patient-action="view">View</button><button data-patient-action="checkin">Check In</button><button data-patient-action="view">Another View</button><button style="display:none" data-patient-action="portal-invite">Hidden invite</button>');
  const result = await page.evaluate(async () => {
    const helper = await import('/src/features/walkthrough/patientGuide.ts');
    let clicks = 0;
    document.querySelectorAll('button').forEach(button => button.addEventListener('click', () => clicks++));
    const tabs = ['today_queue', 'all', 'online', 'pre_registered', 'overdue'].map(tabKey => helper.patientTabStep({ id: tabKey, module: 'Patient Registration', route: '/patients', title: tabKey, content: tabKey, targetSelector: '[data-tab]', placement: 'bottom' }, tabKey, tabKey));
    const snapshots = Object.fromEntries(tabs.map(tab => [tab.id, helper.availablePatientActions(tab)]));
    const sequence = helper.expandPatientSteps(tabs, snapshots);
    return { clicks, sequence: sequence.map(step => ({ id: step.id, tab: step.tabKey, action: !!step.actionStep })) };
  });
  expect(result.clicks).toBe(0);
  for (const [index, tab] of ['today_queue', 'all', 'online', 'pre_registered', 'overdue'].entries()) {
    expect(result.sequence.slice(index * 4, index * 4 + 4)).toEqual([
      { id: tab, tab, action: false },
      { id: `${tab}-print`, tab, action: true },
      { id: `${tab}-checkin`, tab, action: true },
      { id: `${tab}-view`, tab, action: true },
    ]);
  }
});

test('empty tab and saved action sequence remain deterministic', async ({ page }) => {
  await page.goto('/@vite/client');
  await page.setContent('<div>No patients</div>');
  const result = await page.evaluate(async () => {
    const helper = await import('/src/features/walkthrough/patientGuide.ts');
    const tab = helper.patientTabStep({ id: 'all', module: 'Patient Registration', route: '/patients', title: 'All', content: 'All', targetSelector: '[data-tab]', placement: 'bottom' }, 'tab-all-patients', 'all');
    return { available: helper.availablePatientActions(tab), resumed: helper.expandPatientSteps([tab], { all: ['all-view', 'all-checkin'] }).map(step => step.id) };
  });
  expect(result.available).toEqual([]);
  expect(result.resumed).toEqual(['all', 'all-checkin', 'all-view']);
});

test('admin has all patient registration action permissions enabled and matching', async ({ page }) => {
  await page.goto('/@vite/client');
  await page.setContent(`
    <button data-patient-action="print">Print</button>
    <button data-patient-action="bulk-invite">Bulk Invite</button>
    <button data-patient-action="clear-selection">Clear</button>
    <button data-patient-action="checkin-mobile">Mobile Checkin</button>
    <button data-patient-action="checkin-reassessment">Reassessment Checkin</button>
    <button data-patient-action="checkin">Checkin</button>
    <button data-patient-action="checkin-nurse">Nurse Checkin</button>
    <button data-patient-action="new-exposure">New Exposure</button>
    <button data-patient-action="portal-invite">Portal Invite</button>
    <button data-patient-action="view">View</button>
  `);

  const result = await page.evaluate(async () => {
    const helper = await import('/src/features/walkthrough/patientGuide.ts');
    const tab = helper.patientTabStep(
      { id: 'tab-all', module: 'Patient Registration', route: '/patients', title: 'All Patients', content: 'All', targetSelector: '[data-tab]', placement: 'bottom' },
      'tab-all-patients',
      'all'
    );
    const available = helper.availablePatientActions(tab);
    const sequence = helper.expandPatientSteps([tab], { 'tab-all': available });
    return {
      availableCount: available.length,
      actionIds: available,
      sequenceIds: sequence.map(s => s.id),
    };
  });

  expect(result.availableCount).toBe(10);
  expect(result.actionIds).toEqual([
    'tab-all-print',
    'tab-all-checkin-mobile',
    'tab-all-checkin-reassessment',
    'tab-all-checkin',
    'tab-all-checkin-nurse',
    'tab-all-new-exposure',
    'tab-all-portal-invite',
    'tab-all-view',
    'tab-all-bulk-invite',
    'tab-all-clear-selection',
  ]);
});
