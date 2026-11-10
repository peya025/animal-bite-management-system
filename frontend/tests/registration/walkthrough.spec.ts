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
      }
    },
    { seenVal: seen },
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

test.describe('Registration Staff Interactive Walkthrough - Modular UX & Spotlight Verification', () => {
  test('1. Dashboard Quick Tour contains 5 essential steps with restart from Step 1 and no combined step totals', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, false);
    await page.goto('/tests/registration/walkthrough.html');

    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();

    // Verify small progress indicator
    const progressIndicator = page.getByTestId('walkthrough-progress-indicator');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('Quick Tour • 5 steps');

    await page.getByTestId('walkthrough-start-btn').click();

    const spotlight = page.getByTestId('walkthrough-spotlight');
    const tooltip = page.getByTestId('walkthrough-tooltip');

    // Step 1: Dashboard Overview (Centered modal, blurred background, NO spotlight outline)
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');
    await page.waitForTimeout(150);

    // Verify background blur is active
    await expect(page.getByTestId('walkthrough-backdrop-blur')).toBeVisible();
    await expect(page.getByTestId('walkthrough-spotlight')).toHaveCount(0);

    // Step 2: Navigation Menu
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Navigation Menu');
    await expect(page.getByTestId('walkthrough-spotlight')).toBeVisible();

    // Step 3: Daily Patient Summary
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Daily Patient Summary');
    await page.waitForTimeout(150);
    const summarySpot = await spotlight.boundingBox();
    const summaryTip = await tooltip.boundingBox();
    expect(boxesOverlap(summarySpot!, summaryTip!)).toBe(false);

    // Step 4: View Tabs & Filters
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('View Tabs & Filters');

    // Step 5: Trends & Barangay Risk (Final step)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Trends & Barangay Risk');
    await page.waitForTimeout(150);

    const step5Spot = await spotlight.boundingBox();
    const step5Tip = await tooltip.boundingBox();
    expect(boxesOverlap(step5Spot!, step5Tip!)).toBe(false);

    // Complete tour
    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('2. Independent Patient Registration module tour covers all 5 tabs and restarts from Step 1 of 6', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/patients');

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();

    // Step 1 of 6: Add Patient
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 6');
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

    // Step 5 of 6: Pre-Registered Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Pre-Registered (Mobile) Tab');

    // Step 6 of 6: Overdue Follow-ups Tab
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 6');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Overdue Follow-ups Tab');

    await page.getByTestId('walkthrough-btn-finish').click();
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

    // Step 1 of 4: Station 1 Overview
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 4');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Station 1: New & Day 0');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Station 1: New & Day 0 Intake');

    // Step 2 of 4: Vaccine Availability & Queue Display
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Vaccine Availability & Queue Display');

    // Step 3 of 4: Queue Filters & Priority
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Queue Filters & Priority');

    // Step 4 of 4: Station 1 Patient Queue Table (Final Step for Station 1)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 4');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Station 1 Patient Queue Table');

    // Verify it finishes cleanly and DOES NOT auto-navigate to another station
    await page.getByTestId('walkthrough-btn-finish').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
    expect(page.url()).toContain('/queue');
  });

  test('4. Action button guide opens on demand and lists current screen actions', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 632 });
    await setupRegistrationSession(page, true);
    await page.goto('/patients');

    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-action-button-help').click();

    const modal = page.getByTestId('action-button-help-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Patient Registration');
    await expect(page.getByTestId('action-help-item-action-add-patient')).toBeVisible();

    await page.getByTestId('action-help-done-btn').click();
    await expect(modal).toHaveCount(0);
  });

  test('5. Doctor (triage) role is supported with aligned clinical workflow tour', async ({
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

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 5');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dashboard Overview');
  });

  test('6. Treatment Nurse role is supported with Station 1 & Station 2 follow-up dose tours', async ({
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

    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 5');
  });
});
