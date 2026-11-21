import { test, expect } from '@playwright/test';

test.describe('PatientRowActions Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/registration/patient-row-actions.html');
  });

  test('Slot 1, Slot 2, and Slot 3 are always present across combinations, and View is always visible', async ({ page }) => {
    // Case 1: Reassess + Portal Invite + View
    const case1 = page.locator('#case-1 .pm-action-grid');
    await expect(case1).toBeVisible();
    await expect(case1.getByRole('button', { name: 'Reassess' })).toBeVisible();
    await expect(case1.getByRole('button', { name: 'Portal Invite' })).toBeVisible();
    await expect(case1.getByRole('button', { name: 'View patient chart' })).toBeVisible();

    // Case 2: Check In + Resend Invite + View
    const case2 = page.locator('#case-2 .pm-action-grid');
    await expect(case2).toBeVisible();
    await expect(case2.getByRole('button', { name: 'Check In' })).toBeVisible();
    await expect(case2.getByRole('button', { name: 'Resend Invite' })).toBeVisible();
    await expect(case2.getByRole('button', { name: 'View patient chart' })).toBeVisible();

    // Case 4: Neither primary nor invite -> Slots stay empty, View is visible
    const case4 = page.locator('#case-4 .pm-action-grid');
    await expect(case4).toBeVisible();
    await expect(case4.getByRole('button', { name: 'Check In' })).not.toBeAttached();
    await expect(case4.getByRole('button', { name: 'Reassess' })).not.toBeAttached();
    await expect(case4.getByRole('button', { name: 'Portal Invite' })).not.toBeAttached();
    await expect(case4.getByRole('button', { name: 'Resend Invite' })).not.toBeAttached();
    await expect(case4.getByRole('button', { name: 'View patient chart' })).toBeVisible();
  });

  test('Reassess and Check In never render together on the same row', async ({ page }) => {
    for (const caseId of ['#case-1', '#case-2', '#case-3', '#case-4']) {
      const row = page.locator(`${caseId} .pm-action-grid`);
      const hasCheckIn = await row.getByRole('button', { name: 'Check In' }).count();
      const hasReassess = await row.getByRole('button', { name: 'Reassess' }).count();
      expect(hasCheckIn > 0 && hasReassess > 0).toBe(false);
    }
  });

  test('Disabled invite button is disabled and shows tooltip', async ({ page }) => {
    const case3 = page.locator('#case-3 .pm-action-grid');
    const disabledBtn = case3.getByRole('button', { name: 'Portal Invite' });
    await expect(disabledBtn).toBeDisabled();

    // Hover to reveal tooltip
    await disabledBtn.hover({ force: true });
    await expect(page.getByRole('tooltip')).toContainText('Add a contact number first');
  });

  test('Double click on action button triggers only one request and displays loading spinner', async ({ page }) => {
    const case5 = page.locator('#case-5');
    const checkInBtn = case5.getByRole('button', { name: 'Check In' });
    const countDisplay = page.locator('#checkin-call-count');

    await expect(countDisplay).toHaveText('0');

    // Click button once
    await checkInBtn.click();

    // Verify counter became 1
    await expect(countDisplay).toHaveText('1');

    // Verify button is now disabled with spinner showing "Checking In…"
    const disabledBtn = case5.getByRole('button', { name: 'Checking In…' });
    await expect(disabledBtn).toBeDisabled();

    // Attempt second click while disabled (double click)
    await disabledBtn.click({ force: true }).catch(() => {});

    // Counter remains 1
    await expect(countDisplay).toHaveText('1');
  });
});
