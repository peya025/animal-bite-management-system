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
      } else {
        localStorage.removeItem('abtc_walkthrough_status_admin_1');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Administrator Module-Based Interactive Walkthrough & UX Improvements', () => {
  test('1. First-time Admin login triggers Welcome Modal with simplified 5-step progress indicator and controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();

    // Verify small progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Quick Tour • 5 steps');

    // Verify close 'X' button
    const closeBtn = page.getByTestId('walkthrough-modal-close-btn');
    await expect(closeBtn).toBeVisible();

    // Verify simple description and action buttons
    await expect(page.getByTestId('walkthrough-dismiss-btn')).toHaveText('Maybe Later');
    const startBtn = page.getByTestId('walkthrough-start-btn');
    await expect(startBtn).toHaveText('Start Quick Tour');
    await startBtn.click();

    // Verify tour launches into Step 1 of 5 (Dashboard Quick Tour, NOT 116 steps!)
    const tooltip = page.getByTestId('walkthrough-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 5');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 1: Centered modal with backdrop blur and no spotlight outline
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();
    await expect(page.getByTestId('walkthrough-spotlight')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-btn-back')).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-btn-next')).toBeVisible();
    await expect(page.getByTestId('walkthrough-btn-skip')).toBeVisible();
  });

  test('2. Dashboard tour completes in 5 essential steps with restart from Step 1 and Finish button', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Click Guide Tour button to open menu
    await page.getByTestId('walkthrough-help-button').click();
    const menu = page.getByTestId('walkthrough-help-menu');
    await expect(menu).toBeVisible();

    // Click Dashboard Quick Tour
    await page.getByTestId('menu-start-dashboard-tour').click();

    // Step 1 of 5
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');

    // Step 2 of 5
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Navigation Menu');

    // Step 3 of 5
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText("Daily Patient Summary");

    // Step 4 of 5
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('View Tabs & Filters');

    // Step 5 of 5: Final step with Finish button
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Trends & Barangay Risk');

    const finishBtn = page.getByTestId('walkthrough-btn-finish');
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Verify tour closes
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('3. Module-based tour: Patient Registration runs independently (Step 1 of 6, covering all tabs)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/patients');

    // Open Guide Tour menu from Patient Registration page
    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-help-menu')).toBeVisible();

    // Click Tour This Module
    await page.getByTestId('menu-start-module-tour').click();

    // Step 1 of 6: Add Patient
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 6');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Patient Registration');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient Registration & Add Patient');

    // Step 2 of 6: Today's Queue Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText("Today's Queue Tab");

    // Step 3 of 6: All Patients Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('All Patients Tab');

    // Step 4 of 6: Online Appointments Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Online Appointments Tab');

    // Step 5 of 6: Pre-Registered (Mobile) Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Pre-Registered (Mobile) Tab');

    // Step 6 of 6: Overdue Follow-ups Tab (Final step)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Overdue Follow-ups Tab');

    // Complete the tour
    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('4. Contextual Action Button Guide modal opens and explains buttons for the current screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupAdminSession(page, true);
    await page.goto('/patients');

    // Open Guide Tour menu
    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-action-button-help').click();

    // Verify Action Button Help Modal is open
    const modal = page.getByTestId('action-button-help-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Action Button & Tab Guide');
    await expect(modal).toContainText('Patient Registration');

    // Verify key action items exist with explanations
    await expect(page.getByTestId('action-help-item-action-add-patient')).toBeVisible();
    await expect(page.getByTestId('action-help-item-action-check-in')).toBeVisible();
    await expect(page.getByTestId('action-help-item-action-view-patient')).toBeVisible();

    // Close guide
    await page.getByTestId('action-help-done-btn').click();
    await expect(modal).toHaveCount(0);
  });

  test('5. Keyboard accessibility: Escape exits active tour and closes help menu', async ({
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
