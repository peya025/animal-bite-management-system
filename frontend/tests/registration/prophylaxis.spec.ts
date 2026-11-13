import { expect, test } from '@playwright/test';

test('Form 2 has only tetanus vaccine and last tetanus dose, with live stock for available brands', async ({ page }) => {
  await page.goto('/tests/registration/prophylaxis.html');

  // Verify removed assessments are not present
  await expect(page.getByRole('combobox', { name: 'Rabies immunoglobulin' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Tetanus passive protection' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Tetanus primary series' })).toHaveCount(0);

  // Verify tetanus vaccine and last dose fields are present
  const tetanusSelect = page.getByRole('combobox', { name: 'Tetanus vaccine', exact: true });
  await expect(tetanusSelect).toBeVisible();
  await expect(page.getByLabel('Last tetanus dose (if known)')).toBeVisible();

  // Verify available brands from inventory stock
  await expect(tetanusSelect.locator('option')).toContainText(['Assessment pending', 'Not indicated / not ordered', 'tetanus', 'TT']);

  // Select 'tetanus' brand
  await tetanusSelect.selectOption('tetanus');
  await expect(page.getByText('tetanus: 5 vials in 1 active batch')).toBeVisible();

  // Fill last tetanus dose
  await page.getByLabel('Last tetanus dose (if known)').fill('2025-06-15');

  // Verify Form 3 administration for the prescribed brand
  await expect(page.getByLabel('Record tetanus administered')).not.toBeChecked();
  await expect(page.getByLabel('Administration count')).toHaveText('0');

  await page.getByLabel('Record tetanus administered').check();
  await page.getByLabel('Administered volume (mL)').fill('0.5');
  await page.getByLabel('IM injection site').fill('Right deltoid');
  await page.getByRole('combobox', { name: 'Inventory batch' }).selectOption('1');
  await expect(page.getByLabel('Administration count')).toHaveText('1');

  await page.screenshot({ path: 'test-results/prophylaxis-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Simulate saved administration' }).click();
  await expect(page.getByText('Recorded: tetanus', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Record tetanus administered')).toHaveCount(0);
});

test('Tetanus assessment fields fit cleanly on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/registration/prophylaxis.html');

  await page.getByRole('combobox', { name: 'Tetanus vaccine', exact: true }).selectOption('tetanus');
  await page.getByLabel('Last tetanus dose (if known)').fill('2025-01-01');

  await page.getByLabel('Record tetanus administered').check();
  await expect(page.getByLabel('Administration count')).toHaveText('1');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/prophylaxis-mobile.png', fullPage: true });
});
