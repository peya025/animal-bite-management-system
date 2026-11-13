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
      } else {
        localStorage.removeItem('abtc_walkthrough_status_admin_1');
        localStorage.removeItem('abtc_walkthrough_status_1');
        localStorage.removeItem('abtc_guides_v3_1');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Administrator Module-Based Interactive Walkthrough & UX Improvements', () => {
  test('1. First-time Admin login triggers Welcome Modal with 16-step progress indicator and controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();
    await expect(welcomeModal).toContainText('Explore Your Dashboard');

    // Verify progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Administrator Dashboard Tour • 16 steps');

    // Verify close 'X' button
    const closeBtn = page.getByTestId('walkthrough-modal-close-btn');
    await expect(closeBtn).toBeVisible();

    // Verify simple description and action buttons
    await expect(page.getByTestId('walkthrough-dismiss-btn')).toHaveText('Skip Tour');
    const startBtn = page.getByTestId('walkthrough-start-btn');
    await expect(startBtn).toHaveText('Start Tour');
    await startBtn.click();

    // Verify tour launches into Step 1 of 16
    const tooltip = page.getByTestId('walkthrough-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 1: Centered modal with backdrop blur
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();
    await expect(page.getByTestId('walkthrough-btn-back')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-btn-next')).toBeVisible();
    await expect(page.getByTestId('walkthrough-btn-skip')).toBeVisible();
  });

  test('2. Dashboard tour completes across all 16 steps with Finish modal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Click Guide Tour button to open menu
    await page.getByTestId('walkthrough-help-button').click();
    const menu = page.getByTestId('walkthrough-help-menu');
    await expect(menu).toBeVisible();

    // Click Dashboard Tour
    await page.getByTestId('menu-start-dashboard-tour').click();

    // Step 1 of 16
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 2 of 16
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Administrator Sidebar Modules');

    // Step 3 of 16
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Header Controls & Utilities');

    // Step 4 of 16: Tabs
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Overview, Cases & Vaccination Tabs');

    // Step 5 of 16: Calendar
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Calendar & Month Navigation');

    // Step 6 of 16: All Summary Cards unified in ONE step
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Statistics & Summary Cards');

    // Fast-forward to final step 16
    for (let i = 6; i < 16; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }

    // Step 16 should be visible
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 16 of 16');

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

    // Verify Step 1
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');

    // Advance to Step 2
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');

    // Test Back button restores Step 1
    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
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
    await expect(page.getByTestId('walkthrough-tooltip')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });
});
