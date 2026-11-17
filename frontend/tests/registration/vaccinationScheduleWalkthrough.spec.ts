import { test, expect, Page } from '@playwright/test';

async function setupTreatmentSession(page: Page, seen = true) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 77,
        name: 'Nurse Elena Cruz, RN',
        email: 'nurse@abtc.local',
        role: 'treatment',
        notifications: [],
        unread_count: 0,
      }),
    });
  });

  await page.addInitScript(
    ({ seenVal }) => {
      localStorage.setItem('authToken', 'test-nurse-token');
      localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 77,
          name: 'Nurse Elena Cruz, RN',
          email: 'nurse@abtc.local',
          role: 'treatment',
        }),
      );
      if (seenVal) {
        localStorage.setItem('abtc_walkthrough_status_77', 'completed');
        localStorage.setItem('abtc_walkthrough_indicator_dismissed_77', 'true');
      } else {
        localStorage.removeItem('abtc_walkthrough_status_77');
        localStorage.removeItem('abtc_guides_v3_77');
        localStorage.removeItem('abtc_walkthrough_indicator_dismissed_77');
      }
    },
    { seenVal: seen },
  );
}

test.describe('Vaccination Schedule Interactive Walkthrough - Enhanced Clinical Tour', () => {
  test('1. Full 14-step Vaccination Schedule walkthrough covers recall automation, consolidated KPI cards, filters, patient cards, and defaulter outreach', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupTreatmentSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Navigate to Vaccination Schedule
    await page.locator('[data-tour="nav-item-vaccinations"]').click();
    await expect(page.getByTestId('vax-sched-header')).toBeVisible();

    // Open guide menu and start Vaccination Schedule tour
    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();

    // Welcome modal opens
    const welcomeModal = page.getByTestId('walkthrough-welcome-modal');
    await expect(welcomeModal).toBeVisible();
    await expect(welcomeModal).toContainText('Vaccination Schedule');
    await page.getByTestId('walkthrough-start-btn').click();

    // -------------------------------------------------------------------------
    // Section 1: Overview & Recall Automation (Steps 1-4)
    // -------------------------------------------------------------------------
    // Step 1: Vaccination Schedule Header
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Vaccination Schedule');
    await expect(page.getByTestId('walkthrough-module-badge')).toHaveText('Vaccination Schedule');

    // Step 2: Run Auto-Recall Sweep (Image 1)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Run Auto-Recall Sweep');

    // Step 3: Recall All Missed Patients (Image 2)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Recall All Missed Patients');

    // Step 4: Sync & Refresh Schedule
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 4 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Sync & Refresh Schedule');

    // -------------------------------------------------------------------------
    // Section 2: PEP Adherence & Compliance Indicators (Consolidated KPI Cards, Step 5)
    // -------------------------------------------------------------------------
    // Step 5: PEP Compliance & Adherence Summary Cards (All 5 KPI cards in one walkthrough step)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 5 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('PEP Compliance & Adherence Summary Cards');

    // -------------------------------------------------------------------------
    // Section 3: Filter & Search Controls (Steps 6-9)
    // -------------------------------------------------------------------------
    // Step 6: Status Filter
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 6 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Status Filter');

    // Step 7: Channel Filter
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 7 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Channel Filter');

    // Step 8: Dose Stage Filter
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 8 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Dose Stage Filter');

    // Step 9: Live Patient Search
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 9 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Live Patient Search');

    // -------------------------------------------------------------------------
    // Section 4: Patient Records & Treatment Cards (Steps 10-12)
    // -------------------------------------------------------------------------
    // Step 10: Batch Print Selection
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 10 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Batch Print Selection');

    // Step 11: Patient Profile & Incident Summary
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 11 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Patient Profile & Incident Summary');

    // Step 12: Tagoloan Treatment Card
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 12 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Tagoloan Treatment Card');

    // -------------------------------------------------------------------------
    // Section 5: Defaulter Management & Outreach (Steps 13-14)
    // -------------------------------------------------------------------------
    // Step 13: Defaulter Alert & Overdue Notice
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 13 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Defaulter Alert & Overdue Notice');

    // Step 14: Direct Patient Recall Action (Last Step)
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 14 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Direct Patient Recall Action');

    // Complete the guide via the Finish button on the final step
    const finishBtn = page.getByTestId('walkthrough-btn-finish');
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Tour ends and overlay closes
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });

  test('2. Step back navigation and skip tour controls work properly in Vaccination Schedule', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupTreatmentSession(page, true);
    await page.goto('/tests/registration/walkthrough.html');

    // Navigate to Vaccination Schedule
    await page.locator('[data-tour="nav-item-vaccinations"]').click();
    await page.getByTestId('walkthrough-help-button').click();
    await page.getByTestId('menu-start-module-tour').click();
    await page.getByTestId('walkthrough-start-btn').click();

    // Advance to Step 3
    await page.getByTestId('walkthrough-btn-next').click();
    await page.getByTestId('walkthrough-btn-next').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 3 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Recall All Missed Patients');

    // Navigate Back to Step 2 using walkthrough-btn-back
    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 2 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Run Auto-Recall Sweep');

    // Navigate Back to Step 1
    await page.getByTestId('walkthrough-btn-back').click();
    await expect(page.getByTestId('walkthrough-step-counter')).toHaveText('Step 1 of 14');
    await expect(page.getByTestId('walkthrough-step-title')).toHaveText('Vaccination Schedule');

    // Skip Tour
    await page.getByTestId('walkthrough-btn-skip').click();
    await expect(page.getByTestId('walkthrough-tooltip')).toHaveCount(0);
  });
});
