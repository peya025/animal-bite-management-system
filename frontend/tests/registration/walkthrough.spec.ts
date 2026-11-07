import { test, expect, Page } from '@playwright/test';

async function setupRegistrationSession(page: Page, seen = false, step?: number) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 99,
        name: 'Test Registration Staff',
        email: 'reg@abtc.local',
        role: 'registration',
        notifications: [],
        unread_count: 0,
      }),
    });
  });

  await page.addInitScript(
    ({ seenVal, stepVal }) => {
      localStorage.setItem('authToken', 'test-reg-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 99,
          name: 'Test Registration Staff',
          email: 'reg@abtc.local',
          role: 'registration',
        }),
      );
      if (seenVal) {
        localStorage.setItem('abtc_walkthrough_status_99', 'dismissed');
        localStorage.setItem('abtc_walkthrough_registration_seen_v1_99', 'true');
      } else {
        localStorage.removeItem('abtc_walkthrough_status_99');
        localStorage.removeItem('abtc_walkthrough_registration_seen_v1_99');
      }
      if (stepVal !== undefined) {
        localStorage.setItem('abtc_walkthrough_registration_step_v1_99', String(stepVal));
      } else {
        localStorage.removeItem('abtc_walkthrough_registration_step_v1_99');
      }
    },
    { seenVal: seen, stepVal: step },
  );
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width <= b.x + 2 ||
    b.x + b.width <= a.x + 2 ||
    a.y + a.height <= b.y + 2 ||
    b.y + b.height <= a.y + 2
  );
}

test.describe('Registration Staff Interactive Walkthrough - Full 35-Step UI/UX & Spotlight Verification', () => {
  test('1. Dashboard Steps 1–9 (Welcome Title, Sidebar, Clinic Info, View Tabs, Calendar, Patient Summary, Filters, Trends, and Barangay Risk) highlight exact targets without overlap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();
    await page.getByTestId('walkthrough-start-btn').click();

    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    // Step 1: Dashboard Overview (Centered modal, blurred background, NO spotlight outline)
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');
    await page.waitForTimeout(150);

    // Verify background blur is active
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();
    // Verify spotlight outline is removed on Step 1
    await expect(page.getByTestId('walkthrough-spotlight')).toHaveCount(0);

    // Verify Step 1 modal is centered in viewport
    const tipBox1 = await tooltip.boundingBox();
    expect(tipBox1).not.toBeNull();
    const expectedCenterX = (1366 - tipBox1!.width) / 2;
    const expectedCenterY = (632 - tipBox1!.height) / 2;
    expect(Math.abs(tipBox1!.x - expectedCenterX)).toBeLessThanOrEqual(20);
    expect(Math.abs(tipBox1!.y - expectedCenterY)).toBeLessThanOrEqual(20);

    const tabsElBox = await page.locator('[data-tour="dashboard-tabs"]').boundingBox();

    // Step 2: Navigation Menu
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Navigation Menu');
    await expect(page.getByTestId('walkthrough-spotlight')).toBeVisible();

    // Step 3: Clinic Information
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Information');

    // Step 4: Dashboard View Tabs
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard View Tabs');
    await page.waitForTimeout(150);
    const step4Spot = await spotlight.boundingBox();
    expect(Math.abs(step4Spot!.x - tabsElBox!.x)).toBeLessThanOrEqual(20);

    // Step 5: Clinic Calendar
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Calendar');
    await page.waitForTimeout(150);
    const calBox = await page.locator('[data-tour="dashboard-calendar"]').boundingBox();
    const step5Spot = await spotlight.boundingBox();
    const step5Tip = await tooltip.boundingBox();
    expect(Math.abs(step5Spot!.x - calBox!.x)).toBeLessThanOrEqual(20);
    expect(boxesOverlap(step5Spot!, step5Tip!)).toBe(false);

    // Step 6: Patient Summary
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient Summary');
    await page.waitForTimeout(150);
    const summaryBox = await page.locator('[data-tour="dashboard-summary-cards"]').boundingBox();
    const step6Spot = await spotlight.boundingBox();
    const step6Tip = await tooltip.boundingBox();
    expect(Math.abs(step6Spot!.x - summaryBox!.x)).toBeLessThanOrEqual(20);
    expect(boxesOverlap(step6Spot!, step6Tip!)).toBe(false);

    // Step 7: Dashboard Filters & Quick Links
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 7 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Filters & Quick Links');
    await page.waitForTimeout(150);
    const step7Spot = await spotlight.boundingBox();
    const step7Tip = await tooltip.boundingBox();
    expect(boxesOverlap(step7Spot!, step7Tip!)).toBe(false);

    // Step 8: Cases & Vaccination Trends
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 8 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Cases & Vaccination Trends');
    await page.waitForTimeout(150);
    const step8Spot = await spotlight.boundingBox();
    const step8Tip = await tooltip.boundingBox();
    expect(boxesOverlap(step8Spot!, step8Tip!)).toBe(false);

    // Step 9: Case Distribution & Barangay Risk
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 9 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Case Distribution & Barangay Risk');
    await page.waitForTimeout(150);
    const step9Spot = await spotlight.boundingBox();
    const step9Tip = await tooltip.boundingBox();
    expect(boxesOverlap(step9Spot!, step9Tip!)).toBe(false);

    // Step 10: Patient Registration (Specific Sidebar Menu Item with Active Styling)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 10 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient Registration');
    await page.waitForTimeout(150);
    const navPatientBtn = page.locator('[data-tour="nav-item-patient-registration"]');
    const navPatientBox = await navPatientBtn.boundingBox();
    const step10Spot = await spotlight.boundingBox();
    const step10Tip = await tooltip.boundingBox();
    expect(navPatientBox).not.toBeNull();
    expect(step10Spot).not.toBeNull();
    expect(Math.abs(step10Spot!.x - navPatientBox!.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(step10Spot!.y - navPatientBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(step10Spot!, step10Tip!)).toBe(false);
    expect(step10Tip!.x).toBeGreaterThan(step10Spot!.x + step10Spot!.width);
  });

  test('2. Patient Queue (Step 19) and Bite Cases Summary (Steps 23–25) highlight exact containers without overlap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    // Start at index 18 (Step 19: Patient Queue)
    await setupRegistrationSession(page, true, 18);
    await page.goto('/tests/registration/walkthrough.html');

    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 19 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment Queues');

    await page.waitForTimeout(200);
    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    const queueNavBox = await page.locator('[data-tour="nav-item-treatment-queues"]').boundingBox();
    const spot19 = await spotlight.boundingBox();
    const tip19 = await tooltip.boundingBox();

    expect(Math.abs(spot19!.y - queueNavBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(spot19!, tip19!)).toBe(false);
    expect(tip19!.x).toBeGreaterThan(spot19!.x + spot19!.width);

    // Advance through Steps 20, 21, 22 to Step 23 (Bite Cases Summary)
    await page.getByTestId('walkthrough-btn-next').click(); // Step 20
    await page.getByTestId('walkthrough-btn-next').click(); // Step 21
    await page.getByTestId('walkthrough-btn-next').click(); // Step 22
    await page.getByTestId('walkthrough-btn-next').click(); // Step 23

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 23 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Bite Cases Summary');
    await page.waitForTimeout(200);

    const biteNavBox = await page.locator('[data-tour="nav-item-bite-cases-summary"]').boundingBox();
    const spot23 = await spotlight.boundingBox();
    const tip23 = await tooltip.boundingBox();
    expect(Math.abs(spot23!.y - biteNavBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(spot23!, tip23!)).toBe(false);
    expect(tip23!.x).toBeGreaterThan(spot23!.x + spot23!.width);

    // Step 24: Location Priority & Case Filters
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 24 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Location Priority & Case Filters');
    await page.waitForTimeout(150);

    const filterBox = await page.locator('[data-tour="bite-cases-filter-bar"]').boundingBox();
    const spot24 = await spotlight.boundingBox();
    const tip24 = await tooltip.boundingBox();
    expect(Math.abs(spot24!.y - filterBox!.y)).toBeLessThanOrEqual(20);
    expect(boxesOverlap(spot24!, tip24!)).toBe(false);

    // Step 25: Bite Cases & Priority Table
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 25 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Bite Cases & Priority Table');
    await page.waitForTimeout(150);

    const tableBox = await page.locator('[data-tour="bite-cases-table"]').boundingBox();
    const spot25 = await spotlight.boundingBox();
    const tip25 = await tooltip.boundingBox();
    expect(Math.abs(spot25!.y - tableBox!.y)).toBeLessThanOrEqual(24);
    expect(boxesOverlap(spot25!, tip25!)).toBe(false);
  });

  test('3. Bite Map (Steps 26, 27, 28, 29) target exact map container, markers, heatmap button, and filters', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    // Start at index 25 (Step 26: Bite Map)
    await setupRegistrationSession(page, true, 25);
    await page.goto('/tests/registration/walkthrough.html');

    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 26 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Bite Map');
    await page.waitForTimeout(250);

    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    const mapNavBox = await page.locator('[data-tour="nav-item-bite-map"]').boundingBox();
    const spot26 = await spotlight.boundingBox();
    const tip26 = await tooltip.boundingBox();
    expect(Math.abs(spot26!.y - mapNavBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(spot26!, tip26!)).toBe(false);
    expect(tip26!.x).toBeGreaterThan(spot26!.x + spot26!.width);

    // Step 27: Map Markers and Clusters
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 27 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Map Markers and Clusters');
    await page.waitForTimeout(200);

    const spot27 = await spotlight.boundingBox();
    const tip27 = await tooltip.boundingBox();
    expect(spot27!.width).toBeLessThan(120);
    expect(boxesOverlap(spot27!, tip27!)).toBe(false);

    // Step 28: Heatmap View
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 28 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Heatmap View');
    await page.waitForTimeout(200);

    const heatmapBtn = page.locator('[data-tour="bite-map-heatmap-toggle"]');
    const heatmapBox = await heatmapBtn.boundingBox();
    const spot28 = await spotlight.boundingBox();
    expect(Math.abs(spot28!.x - heatmapBox!.x)).toBeLessThanOrEqual(20);
    expect(Math.abs(spot28!.y - heatmapBox!.y)).toBeLessThanOrEqual(20);
  });

  test('4. Reports & Analytics (Steps 30–34) and Logout (Step 35) highlight exact targets without overlap on 1366x632 viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    // Start at index 29 (Step 30: Reports & Analytics Overview)
    await setupRegistrationSession(page, true, 29);
    await page.goto('/tests/registration/walkthrough.html');

    await page.getByTestId('walkthrough-help-button').click();
    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    // Step 30: Reports & Analytics
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 30 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Reports & Analytics');
    await page.waitForTimeout(250);

    const reportsNavBox = await page.locator('[data-tour="nav-item-reports-analytics"]').boundingBox();
    const spot30 = await spotlight.boundingBox();
    const tip30 = await tooltip.boundingBox();
    expect(Math.abs(spot30!.y - reportsNavBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(spot30!, tip30!)).toBe(false);
    expect(tip30!.x).toBeGreaterThan(spot30!.x + spot30!.width);

    // Step 31: Report Categories
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 31 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Report Categories');
    await page.waitForTimeout(200);

    const tabsBox = await page.locator('[data-tour="reports-category-tabs"]').boundingBox();
    const spot31 = await spotlight.boundingBox();
    expect(Math.abs(spot31!.y - tabsBox!.y)).toBeLessThanOrEqual(20);

    // Step 32: Report Filters
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 32 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Report Filters');
    await page.waitForTimeout(200);

    const filtersBox = await page.locator('[data-tour="reports-filter-controls"]').boundingBox();
    const spot32 = await spotlight.boundingBox();
    const tip32 = await tooltip.boundingBox();
    expect(Math.abs(spot32!.y - filtersBox!.y)).toBeLessThanOrEqual(20);
    expect(boxesOverlap(spot32!, tip32!)).toBe(false);

    // Step 33: Charts and Summaries
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 33 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Charts and Summaries');
    await page.waitForTimeout(200);

    const chartsBox = await page.locator('[data-tour="reports-charts"]').boundingBox();
    const spot33 = await spotlight.boundingBox();
    const tip33 = await tooltip.boundingBox();
    expect(Math.abs(spot33!.y - chartsBox!.y)).toBeLessThanOrEqual(24);
    expect(boxesOverlap(spot33!, tip33!)).toBe(false);

    // Step 34: Print & Export Reports
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 34 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Print & Export Reports');

    // Step 35: Logout
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 35 of 35');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Logout');
    await page.waitForTimeout(200);

    const logoutBox = await page.locator('[data-tour="btn-logout"]').boundingBox();
    const spot35 = await spotlight.boundingBox();
    const tip35 = await tooltip.boundingBox();
    expect(Math.abs(spot35!.x - logoutBox!.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(spot35!.y - logoutBox!.y)).toBeLessThanOrEqual(16);
    expect(boxesOverlap(spot35!, tip35!)).toBe(false);

    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-overlay')).toHaveCount(0);
  });

  test('5. Collapsed sidebar state and small viewport bounds keep spotlight and tooltip inside screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 640 });
    await setupRegistrationSession(page, true, 1);
    await page.goto('/tests/registration/walkthrough.html');

    await page.getByTestId('sidebar-collapse-btn').click();
    await page.getByTestId('walkthrough-help-button').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 35');
    await page.waitForTimeout(150);

    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    const spotBox = await spotlight.boundingBox();
    const tipBox = await tooltip.boundingBox();

    expect(spotBox).not.toBeNull();
    expect(tipBox).not.toBeNull();
    expect(spotBox!.width).toBeLessThanOrEqual(84);
    expect(tipBox!.x).toBeGreaterThanOrEqual(8);
    expect(tipBox!.y).toBeGreaterThanOrEqual(8);
    expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(900);
    expect(tipBox!.y + tipBox!.height).toBeLessThanOrEqual(640);
  });

  test('6. Non-registration roles (doctor/triage/admin) never see walkthrough UI', async ({
    page,
  }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 77,
          name: 'Dr. Triage',
          email: 'doc@abtc.local',
          role: 'triage',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-doc-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 77,
          name: 'Dr. Triage',
          email: 'doc@abtc.local',
          role: 'triage',
        }),
      );
    });
    await page.goto('/tests/registration/walkthrough.html');

    await expect(page.getByTestId('walkthrough-welcome-modal')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-help-button')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-overlay')).toHaveCount(0);
  });
});
