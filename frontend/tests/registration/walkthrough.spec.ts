import { test, expect, Page } from '@playwright/test';

async function setupRegistrationSession(page: Page, seen = false) {
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
    ({ seenVal }) => {
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
        localStorage.setItem('abtc_walkthrough_status_99', 'completed');
        localStorage.setItem('abtc_walkthrough_registration_seen_v1_99', 'true');
      } else {
        localStorage.removeItem('abtc_walkthrough_status_99');
        localStorage.removeItem('abtc_walkthrough_registration_seen_v1_99');
        localStorage.removeItem('abtc_guides_v3_99');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Registration Staff Interactive Walkthrough - Modular UX & Spotlight Verification', () => {
  test('1. Dashboard Tour contains 16 essential steps with unified sidebar modules, summary cards, and completion modal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();
    await expect(welcomeModal).toContainText('Explore Your Dashboard');

    // Verify progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Registration Staff Dashboard Tour • 16 steps');

    await expect(page.getByTestId('walkthrough-dismiss-btn')).toHaveText('Skip Tour');
    await expect(page.getByTestId('walkthrough-start-btn')).toHaveText('Start Tour');
    await page.getByTestId('walkthrough-start-btn').click();

    const tooltip = page.getByTestId('walkthrough-tooltip');
    await expect(tooltip).toBeVisible();

    // Step 1: Dashboard Overview (Centered modal, blurred background)
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Registration Dashboard');
    await page.waitForTimeout(150);

    // Verify background blur is active
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();

    // Step 2: Unified Sidebar Modules for Registration Staff
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Registration Staff Sidebar Modules');

    // Step 3: Notification, Theme & Help Controls
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Notification, Theme & Help Controls');

    // Step 4: Dashboard View Tabs
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard View Tabs');

    // Step 5: Calendar
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Calendar & Daily Schedules');

    // Step 6: All Summary Cards unified in ONE step
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient & Queue Summary Cards');

    // Fast-forward to Step 16
    for (let i = 6; i < 16; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 16 of 16');

    // Final Finish click triggers completion modal
    await page.getByTestId('walkthrough-btn-finish').click();
    const completionModal = page.getByTestId('walkthrough-completion-modal');
    await expect(completionModal).toBeVisible();
    await expect(completionModal).toContainText("You've Explored Your Dashboard!");

    // Complete tour
    await completionModal.getByTestId('walkthrough-btn-finish').click();
    await expect(completionModal).toHaveCount(0);
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('2. Independent Patient Registration module tour runs independently', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/patients');

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();

    // Step 1: Patient Registration
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Patient Registration');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient Registration');

    // Close or skip tour
    await page.getByTestId('walkthrough-btn-skip').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('3. Treatment Queues Station 1 tour runs independently and does not auto-advance to Station 2', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/queue');

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();

    // Step 1 of 4: Treatment Queues Overview
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 4');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Patient Queue');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment Queues');

    // Step 2 of 4: Queue Numbers & Status
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Queue Numbers & Status');

    // Step 3 of 4: Queue Display Screen
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Queue Display Screen');

    // Step 4 of 4: Monitoring the Queue
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Monitoring the Queue');

    // Verify it finishes cleanly and DOES NOT auto-navigate to another station
    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
    expect(page.url()).toContain('/queue');
  });

  test('4. Registration Staff walkthrough supports back navigation and section grouping', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-dashboard-tour').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');

    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Registration Dashboard');

    await page.getByTestId('walkthrough-btn-skip').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('5. Doctor (triage) role is supported with unified sidebar modules and consolidated summary cards', async ({
    page,
  }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 55,
          name: 'Dr. Maria Santos',
          email: 'doctor@abtc.local',
          role: 'triage',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-doc-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 55,
          name: 'Dr. Maria Santos',
          email: 'doctor@abtc.local',
          role: 'triage',
        }),
      );
      localStorage.setItem('abtc_walkthrough_status_55', 'completed');
    });

    await page.goto('/tests/registration/walkthrough.html');

    // Doctor has Guide Tour button available
    const helpBtn = page.getByTestId('walkthrough-help-button');
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    // Doctor can start Dashboard Tour
    await expect(page.getByTestId('menu-start-dashboard-tour')).toBeVisible();
    await page.getByTestId('menu-start-dashboard-tour').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Triage Doctor Dashboard');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');

    // Advance to Step 2: Unified Sidebar Modules
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Triage Doctor Sidebar Modules');

    // Advance to Step 6: Summary cards
    for (let i = 2; i < 6; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinical Bite Cases & Queue Summary');
  });

  test('6. Treatment Nurse role is supported with unified sidebar modules and consolidated summary cards', async ({
    page,
  }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 66,
          name: 'Nurse Elena Cruz, RN',
          email: 'nurse@abtc.local',
          role: 'treatment',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-nurse-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 66,
          name: 'Nurse Elena Cruz, RN',
          email: 'nurse@abtc.local',
          role: 'treatment',
        }),
      );
      localStorage.setItem('abtc_walkthrough_status_66', 'completed');
    });

    await page.goto('/tests/registration/walkthrough.html');

    // Treatment Nurse has Guide Tour button available
    const helpBtn = page.getByTestId('walkthrough-help-button');
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    await expect(page.getByTestId('menu-start-dashboard-tour')).toBeVisible();
    await page.getByTestId('menu-start-dashboard-tour').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Treatment Nurse Dashboard');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');

    // Advance to Step 2: Unified Sidebar Modules
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment Nurse Sidebar Modules');

    // Advance to Step 6: Summary cards
    for (let i = 2; i < 6; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 16');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment & Vaccination Summary Cards');
  });
});
