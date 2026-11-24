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
        localStorage.setItem('abtc_walkthrough_indicator_dismissed_99', 'true');
      } else {
        localStorage.removeItem('abtc_walkthrough_status_99');
        localStorage.removeItem('abtc_walkthrough_registration_seen_v1_99');
        localStorage.removeItem('abtc_guides_v3_99');
        localStorage.removeItem('abtc_walkthrough_indicator_dismissed_99');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Registration Staff Interactive Walkthrough - Modular UX & Spotlight Verification', () => {
  test('1. Dashboard Tour contains 15 essential steps with unified sidebar modules, summary cards, and completion modal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    // Automatic popup is disabled on login
    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toHaveCount(0);

    // Subtle guide indicator appears directly below walkthrough icon
    const indicator = page.getByTestId('walkthrough-guide-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Need help? Start a tour');

    // Clicking indicator opens the centered Welcome Modal
    await indicator.click();
    await expect(welcomeModal).toBeVisible();
    await expect(welcomeModal).toContainText('Explore Your Dashboard');

    // Verify progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Registration Staff Dashboard Tour • 15 steps');

    await expect(page.getByTestId('walkthrough-dismiss-btn')).toHaveText('Skip Tour');
    await expect(page.getByTestId('walkthrough-start-btn')).toHaveText('Start Tour');
    await page.getByTestId('walkthrough-start-btn').click();

    const tooltip = page.getByTestId('walkthrough-tooltip');
    await expect(tooltip).toBeVisible();

    // Step 1: Dashboard Overview (Centered modal, blurred background)
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Registration Dashboard');
    await page.waitForTimeout(150);

    // Verify background blur is active
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();

    // Step 2: Unified Sidebar Modules for Registration Staff
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Registration Staff Sidebar Modules');

    // Step 3: Notification, Theme & Help Controls
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Notification, Theme & Help Controls');

    // Step 4: Dashboard View Tabs
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard View Tabs');

    // Step 5: Calendar
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Clinic Calendar & Daily Schedules');

    // Step 6: All Summary Cards unified in ONE step
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient & Queue Summary Cards');

    // Fast-forward to Step 15
    for (let i = 6; i < 15; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 15 of 15');

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

  test('2. Independent Patient Registration module tour runs independently with 10 concise top-to-bottom steps', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');
    await page.locator('[data-tour="nav-item-patient-registration"]').click();

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    const expectedTitles = [
      'Patient Registration',
      'Add Patient',
      'Patient Summary Cards',
      "Today's Queue",
      'All Patients',
      'Online Appointments',
      'Pre-Registered (Mobile)',
      'Overdue Patients',
      'Search, Filters & Print',
      'Patient Records Table',
    ];

    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Patient Registration');

    for (let i = 0; i < expectedTitles.length; i++) {
      await expect(page.getByTestId('walkthrough-step-counter')).toHaveText(`Step ${i + 1} of 10`);
      await expect(page.getByTestId('walkthrough-step-title')).toHaveText(expectedTitles[i]);
      if (i < expectedTitles.length - 1) {
        await page.getByTestId('walkthrough-btn-next').click();
      }
    }

    // Finish tour cleanly
    await page.getByTestId('walkthrough-btn-finish').click();
    const completionModal = page.getByTestId('walkthrough-completion-modal');
    await expect(completionModal).toBeVisible();
    await completionModal.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('3. Treatment Queues Station 1 tour runs independently and does not auto-advance to Station 2', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');
    await page.locator('[data-tour="nav-item-treatment-queues"]').click();

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    // Step 1 of 6: Station 1: New & Day 0
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 6');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Treatment Queues');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Station 1: New & Day 0');

    // Fast-forward to Step 6
    for (let i = 1; i < 6; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 6');

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
    await page.getByTestId('walkthrough-start-btn').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');

    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
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
    await page.getByTestId('walkthrough-start-btn').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Triage Doctor Dashboard');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');

    // Advance to Step 2: Unified Sidebar Modules
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Triage Doctor Sidebar Modules');

    // Advance to Step 6: Summary cards
    for (let i = 2; i < 6; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 15');
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
    await page.getByTestId('walkthrough-start-btn').click();

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Welcome to Treatment Nurse Dashboard');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Dashboard');

    // Advance to Step 2: Unified Sidebar Modules
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment Nurse Sidebar Modules');

    // Advance to Step 6: Summary cards
    for (let i = 2; i < 6; i++) {
      await page.getByTestId('walkthrough-btn-next').click();
    }
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 15');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Treatment & Vaccination Summary Cards');
  });

  test('7. Guide indicator is dismissible via close button for registration staff', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const indicator = page.getByTestId('walkthrough-guide-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('Need help? Start a tour');

    // Click dismiss 'x'
    await page.getByTestId('walkthrough-indicator-dismiss').click();
    await expect(page.getByTestId('walkthrough-guide-indicator')).toHaveCount(0);

    // Verify localStorage has persisted dismissal for this user
    const isDismissed = await page.evaluate(() => localStorage.getItem('abtc_walkthrough_indicator_dismissed_99'));
    expect(isDismissed).toBe('true');

    // Guide icon remains functional
    await page.getByTestId('walkthrough-help-button').click();
    await expect(page.getByTestId('walkthrough-help-menu')).toBeVisible();
  });

  test('8. Doctor (triage) Treatment Queues walkthrough has 6 simplified Station 1 steps without individual action buttons', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
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
      localStorage.setItem('abtc_walkthrough_indicator_dismissed_55', 'true');
    });

    await page.goto('/tests/registration/walkthrough.html');
    await page.locator('[data-tour="nav-item-treatment-queues"]').click();

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    const expectedTitles = [
      'Station 1: New & Day 0',
      'Queue Summary Counters',
      'Vaccine Availability',
      'Search & Filters',
      'Patient Queue List',
      'Today’s Queue Progress',
    ];

    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Treatment Queues');

    for (let i = 0; i < expectedTitles.length; i++) {
      await expect(page.getByTestId('walkthrough-step-counter')).toHaveText(`Step ${i + 1} of 6`);
      await expect(page.getByTestId('walkthrough-step-title')).toHaveText(expectedTitles[i]);
      if (i < expectedTitles.length - 1) {
        await page.getByTestId('walkthrough-btn-next').click();
      }
    }

    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-completion-modal')).toBeVisible();
  });

  test('9. Treatment Nurse Treatment Queues walkthrough has 11 simplified steps across Station 1 and Station 2', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
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
      localStorage.setItem('abtc_walkthrough_indicator_dismissed_66', 'true');
    });

    await page.goto('/tests/registration/walkthrough.html');
    await page.locator('[data-tour="nav-item-treatment-queues"]').click();

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    const expectedTitles = [
      'Station 1: New & Day 0',
      'Queue Summary Counters',
      'Vaccine Availability',
      'Search & Filters',
      'Patient Queue List',
      'Today’s Queue Progress',
      'Station 2 · Follow-up Doses',
      'Follow-up Queue Counters',
      'Follow-up Dose Tabs',
      'Search & Dose Filter',
      'Follow-up Patient Roster',
    ];

    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Treatment Queues');

    for (let i = 0; i < expectedTitles.length; i++) {
      await expect(page.getByTestId('walkthrough-step-counter')).toHaveText(`Step ${i + 1} of 11`);
      await expect(page.getByTestId('walkthrough-step-title')).toHaveText(expectedTitles[i]);
      if (i < expectedTitles.length - 1) {
        await page.getByTestId('walkthrough-btn-next').click();
      }
    }

    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-completion-modal')).toBeVisible();
  });
});
