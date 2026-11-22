import { test, expect, Page } from '@playwright/test';

async function setupAdminSession(page: Page, seen = false) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Admin User',
        email: 'admin@abtc.local',
        role: 'admin',
        notifications: [],
        unread_count: 0,
      }),
    });
  });

  await page.addInitScript(
    ({ seenVal }) => {
      localStorage.setItem('authToken', 'test-admin-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 1,
          name: 'Admin User',
          email: 'admin@abtc.local',
          role: 'admin',
        }),
      );
      if (seenVal) {
        localStorage.setItem('abtc_walkthrough_status_admin_1', 'completed');
        localStorage.setItem('abtc_walkthrough_status_1', 'completed');
        localStorage.setItem('abtc_walkthrough_indicator_dismissed_1', 'true');
      } else {
        localStorage.removeItem('abtc_walkthrough_status_admin_1');
        localStorage.removeItem('abtc_walkthrough_status_1');
        localStorage.removeItem('abtc_guides_v3_1');
        localStorage.removeItem('abtc_walkthrough_indicator_dismissed_1');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Administrator Module-Based Interactive Walkthrough & UX Improvements', () => {
  test('1. First-time Admin login does not popup modal; shows guide indicator and opens modal on request', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    // Automatic popup must NOT appear
    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toHaveCount(0);

    // Subtle guide indicator appears directly below walkthrough icon
    const indicator = page.getByTestId('walkthrough-guide-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Need help? Start a tour');

    // Clicking walkthrough icon opens the menu
    await page.getByTestId('walkthrough-help-button').click();
    const menu = page.getByTestId('walkthrough-help-menu');
    await expect(menu).toBeVisible();

    // Selecting "Explore Your Dashboard" opens the centered Welcome Modal
    const dashboardOption = page.getByTestId('menu-start-dashboard-tour');
    await expect(dashboardOption).toBeVisible();
    await dashboardOption.click();

    // Modal now visible
    await expect(welcomeModal).toBeVisible();
    await expect(welcomeModal).toContainText('Explore Your Dashboard');

    // Verify progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Administrator Dashboard Tour • 15 steps');

    // Verify close 'X' button
    const closeBtn = page.getByTestId('walkthrough-modal-close-btn');
    await expect(closeBtn).toBeVisible();

    // Verify simple description and action buttons
    await expect(page.getByTestId('walkthrough-dismiss-btn')).toHaveText('Skip Tour');
    const startBtn = page.getByTestId('walkthrough-start-btn');
    await expect(startBtn).toHaveText('Start Tour');

    // Interactive tour starts ONLY on clicking Start Tour
    await startBtn.click();

    // Verify tour launches into Step 1 of 15
    const tooltip = page.getByTestId('walkthrough-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 1: Centered modal with backdrop blur
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();
    await expect(page.getByTestId('walkthrough-btn-back')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-btn-next')).toBeVisible();
    await expect(page.getByTestId('walkthrough-btn-skip')).toBeVisible();
  });

  test('2. Dashboard tour completes across all 15 steps with Finish modal and viewport-safe tooltips', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Click Guide Tour button to open menu
    await page.getByTestId('walkthrough-help-button').click();
    const menu = page.getByTestId('walkthrough-help-menu');
    await expect(menu).toBeVisible();

    // Click Dashboard Tour to open modal
    await page.getByTestId('menu-start-dashboard-tour').click();
    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();
    await page.getByTestId('walkthrough-start-btn').click();

    // Step 1 of 15
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 2 of 15
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Administrator Sidebar Modules');

    // Step 3 of 15
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Header Controls & Utilities');

    // Step 4 of 15: Tabs
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Overview, Cases & Vaccination Tabs');

    // Step 5 of 15: Calendar
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Calendar & Month Navigation');

    // Step 6 of 15: All Summary Cards unified in ONE step
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Statistics & Summary Cards');

    // Step 7 of 15: Filters
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 7 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Role, Status & Date Range Filters');

    // Step 8 of 15: Cases Over Time Chart (Patients & Cases Quick Action Buttons step removed)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 8 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Cases Over Time Chart');

    // Advance to Step 13 (Cases tab) and Step 14 (Vaccinations tab)
    for (let i = 8; i < 13; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }

    const assertTooltipViewportSafe = async () => {
      const tooltipBox = await page.getByTestId('walkthrough-tooltip').boundingBox();
      const spotlightBox = await page.getByTestId('walkthrough-spotlight').boundingBox();
      expect(tooltipBox).not.toBeNull();
      expect(spotlightBox).not.toBeNull();

      // Fully inside 1366x632 viewport
      expect(tooltipBox!.y).toBeGreaterThanOrEqual(0);
      expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(632);
      expect(tooltipBox!.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(1366);

      // Must not overlap the highlighted spotlight box
      const overlaps =
        tooltipBox!.x < spotlightBox!.x + spotlightBox!.width &&
        tooltipBox!.x + tooltipBox!.width > spotlightBox!.x &&
        tooltipBox!.y < spotlightBox!.y + spotlightBox!.height &&
        tooltipBox!.y + tooltipBox!.height > spotlightBox!.y;
      expect(overlaps).toBe(false);

      // All navigation buttons must be visible inside viewport, inside tooltip bounds, and aligned on ONE horizontal row
      const btnBoxes: { id: string; box: { x: number; y: number; width: number; height: number } }[] = [];
      for (const testId of [
        'walkthrough-btn-skip',
        'walkthrough-btn-restart',
        'walkthrough-btn-back',
        'walkthrough-btn-next',
      ]) {
        const btnBox = await page.getByTestId(testId).boundingBox();
        expect(btnBox).not.toBeNull();
        expect(btnBox!.y).toBeGreaterThanOrEqual(0);
        expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(632);
        expect(btnBox!.x).toBeGreaterThanOrEqual(tooltipBox!.x);
        expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(tooltipBox!.x + tooltipBox!.width + 1);
        btnBoxes.push({ id: testId, box: btnBox! });
      }
      const baseCenterY = btnBoxes[0].box.y + btnBoxes[0].box.height / 2;
      for (let i = 1; i < btnBoxes.length; i++) {
        const centerY = btnBoxes[i].box.y + btnBoxes[i].box.height / 2;
        expect(Math.abs(centerY - baseCenterY)).toBeLessThanOrEqual(3);
        expect(btnBoxes[i].box.x).toBeGreaterThanOrEqual(btnBoxes[i - 1].box.x + btnBoxes[i - 1].box.width - 1);
      }
      const closeBtnBox = await page.locator('.walkthrough-close-btn').boundingBox();
      expect(closeBtnBox).not.toBeNull();
      expect(closeBtnBox!.y).toBeGreaterThanOrEqual(0);
      expect(closeBtnBox!.y + closeBtnBox!.height).toBeLessThanOrEqual(632);
    };

    // Step 13 of 15: Recent Bite Incident Cases Tab & Table
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 13 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Recent Bite Incident Cases Tab & Table');
    await page.waitForTimeout(250);
    await assertTooltipViewportSafe();

    // Step 14 of 15: Recent Vaccinations & Scheduled Doses Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 14 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Recent Vaccinations & Scheduled Doses Tab');
    await page.waitForTimeout(250);
    await assertTooltipViewportSafe();

    // Step 15 of 15: Final step
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 15 of 15');

    // Clicking Finish on final tooltip step triggers the completion modal
    await page.getByTestId('walkthrough-btn-finish').click();

    const completionModal = page.getByTestId('walkthrough-completion-modal');
    await expect(completionModal).toBeVisible();
    await expect(completionModal).toContainText("You've Explored Your Dashboard!");

    // Clicking Finish Tour on completion modal closes it
    await completionModal.getByTestId('walkthrough-btn-finish').click();

    // Verify tour closes
    await expect(completionModal).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('3. Section organization, previous step navigation, and skip tour controls work properly', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Open Guide Tour menu and start Dashboard tour
    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-dashboard-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    // Verify Step 1
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');

    // Advance to Step 2
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');

    // Test Back button restores Step 1
    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Test Skip Tour button exits tour
    await page.getByTestId('walkthrough-btn-skip').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('4. Keyboard accessibility: Escape exits active tour and closes help menu', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Open menu then press Escape
    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-help-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('walkthrough-help-menu')).toHaveCount(0);

    // Launch tour then press Escape to skip
    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-dashboard-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('5. Guide indicator is dismissible via close button and persists', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const indicator = page.getByTestId('walkthrough-guide-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Need help? Start a tour');

    // Click dismiss 'x'
    await page.getByTestId('walkthrough-indicator-dismiss').click();
    await expect(page.getByTestId('walkthrough-guide-indicator')).toHaveCount(0);

    // Verify localStorage has persisted dismissal for this user
    const isDismissed = await page.evaluate(() => localStorage.getItem('abtc_walkthrough_indicator_dismissed_1'));
    expect(isDismissed).toBe('true');

    // But guide button remains completely functional
    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-help-menu')).toBeVisible();
  });
});
