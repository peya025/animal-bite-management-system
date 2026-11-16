import { test, expect, type Page } from '@playwright/test';

function setupApiRoutes(page: Page, configOverrides: Record<string, any> = {}) {
  const activeConfig = {
    schema_version: 1,
    revision: 1,
    clinic_id: 1,
    can_edit: true,
    registration_module_enabled: true,
    triage_module_enabled: true,
    treatment_module_enabled: true,
    patient_registration_enabled: true,
    address_section_enabled: true,
    socioeconomic_section_enabled: true,
    gov_programs_section_enabled: true,
    bite_intake_section_enabled: true,
    triage_section_enabled: true,
    treatment_section_enabled: true,
    field_rules: {
      rig_fee: 'hidden',
      anti_rabies_fee: 'hidden',
      additional_fees: 'hidden',
      ...configOverrides,
    },
  };

  return page.route('**/api/**', async route => {
    if (route.request().resourceType() === 'script' || route.request().url().includes('/src/')) {
      return route.continue();
    }
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/clinic-module-config') || path.endsWith('/setup/module-config')) {
      return route.fulfill({ json: activeConfig });
    }
    if (path.endsWith('/cities-municipalities/')) return route.fulfill({ json: [{ code: '104324000', name: 'Tagoloan' }] });
    if (path.endsWith('/barangays/')) return route.fulfill({ json: [{ code: '104324006', name: 'Poblacion' }] });
    if (path.endsWith('/patients')) return route.fulfill({ status: 201, json: { patient_id: 101 } });
    if (path.endsWith('/queue')) return route.fulfill({ json: {} });
    return route.fulfill({ json: {} });
  });
}

async function fillMinimalRegistration(page: Page) {
  await page.locator('input[name="last_name"]').fill('Dela Cruz');
  await page.locator('input[name="first_name"]').fill('Juan');
  await page.getByRole('radio', { name: 'Male', exact: true }).check();
  await page.locator('input[name="date_of_birth"]').fill('1990-06-12');
  const manualBtn = page.getByRole('button', { name: 'Switch to Manual Typing' });
  if (await manualBtn.isVisible()) {
    await manualBtn.click();
  }
  await page.getByLabel('City / Municipality').fill('Tagoloan');
  await page.getByLabel('Barangay').fill('Poblacion');
  await page.locator('input[name="contact_number"]').fill('09123456789');
  await page.locator('input[name="emergency_contact_name"]').fill('Maria Santos');
  await page.locator('input[name="emergency_contact_phone"]').fill('09987654321');
  await page.locator('input[name="bp_systolic"]').fill('120');
  await page.locator('input[name="bp_diastolic"]').fill('80');
  await page.locator('input[name="reg_temperature"]').fill('36.5');
  await page.locator('input[name="reg_height"]').fill('170');
  await page.locator('input[name="reg_weight"]').fill('70');
  await page.locator('input[name="reg_attending_provider"]').fill('Dr. Juan Dela Cruz');
}

test.describe('Registration Fees and Payment UI', () => {
  test('RF-UI-01: When all 3 fees are hidden, section is not rendered and no fee submitted', async ({ page }) => {
    let submittedPayload: any = null;
    await setupApiRoutes(page, {
      rig_fee: 'hidden',
      anti_rabies_fee: 'hidden',
      additional_fees: 'hidden',
    });
    await page.route('**/api/patients', async route => {
      submittedPayload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { patient_id: 101 } });
    });

    await page.goto('/tests/registration/index.html');
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    // Verify Fees section is completely absent
    await expect(page.getByText('Fees and Payment')).toHaveCount(0);
    await expect(page.locator('input[name="registration_fee.rig_fee.amount"]')).toHaveCount(0);
    await expect(page.locator('input[name="registration_fee.anti_rabies_fee.amount"]')).toHaveCount(0);

    // Fill form and submit
    await fillMinimalRegistration(page);
    await page.getByRole('button', { name: 'Save Patient Record' }).click();
    await expect(page.getByText('Test record saved')).toBeVisible();

    // Assert submitted payload has no registration_fee
    expect(submittedPayload?.registration_fee).toBeUndefined();
  });

  test('RF-UI-02: Partial visibility reflows without layout gaps', async ({ page }) => {
    await setupApiRoutes(page, {
      rig_fee: 'hidden',
      anti_rabies_fee: 'optional',
      additional_fees: 'hidden',
    });

    await page.goto('/tests/registration/index.html');
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    // Fees section is visible
    await expect(page.getByText('Fees and Payment')).toBeVisible();

    // Only Anti-Rabies fee is present; RIG and Additional Fees are absent
    await expect(page.locator('input[name="registration_fee.rig_fee.amount"]')).toHaveCount(0);
    await expect(page.locator('input[name="registration_fee.anti_rabies_fee.amount"]')).toBeVisible();
    await expect(page.getByText(/Anti-Rabies Vaccine Fee/)).toBeVisible();
    await expect(page.getByText(/Additional Fees/)).toHaveCount(0);
  });

  test('RF-UI-03: Required fees enforce amount or disposition with reason', async ({ page }) => {
    await setupApiRoutes(page, {
      rig_fee: 'required',
      anti_rabies_fee: 'optional',
      additional_fees: 'required',
    });

    await page.goto('/tests/registration/index.html');
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    await fillMinimalRegistration(page);

    // Try submitting without filling required fees
    await page.getByRole('button', { name: 'Save Patient Record' }).click();
    await expect(page.getByText('RIG Fee is required.', { exact: true })).toBeVisible();

    // Change RIG disposition to Pending Assessment
    await page.locator('select[id$="-rig-disp"]').selectOption('pending_assessment');
    const reasonInput = page.locator('input[id$="-rig-reason"]');
    await expect(reasonInput).toBeVisible();
    await reasonInput.fill('Doctor will decide dose based on weight');

    // Satisfy additional fees by selecting "No additional fees"
    await page.getByRole('checkbox', { name: /No additional fees for this encounter/i }).check();

    // Verify Incomplete total badge and hint are shown because RIG is pending
    await expect(page.getByText(/Applicability or price of one or more items is pending doctor assessment/)).toBeVisible();

    // Submitting now passes validation
    await page.getByRole('button', { name: 'Save Patient Record' }).click();
    await expect(page.getByText('Test record saved')).toBeVisible();
  });

  test('RF-UI-04: Itemized additional fees and real-time payment calculation', async ({ page }) => {
    let submittedPayload: any = null;
    await setupApiRoutes(page, {
      rig_fee: 'required',
      anti_rabies_fee: 'required',
      additional_fees: 'optional',
    });
    await page.route('**/api/patients', async route => {
      submittedPayload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { patient_id: 101 } });
    });

    await page.goto('/tests/registration/index.html');
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    await fillMinimalRegistration(page);

    // Enter RIG amount
    await page.locator('input[name="registration_fee.rig_fee.amount"]').fill('500.00');

    // Enter Anti-Rabies amount
    await page.locator('input[name="registration_fee.anti_rabies_fee.amount"]').fill('650.00');

    // Add 2 Additional Fee rows
    await page.getByRole('button', { name: '+ Add Fee Item' }).click();
    const row0 = page.locator('div:has(> input[placeholder*="Description"])').nth(0);
    await row0.locator('input[placeholder*="Description"]').fill('Syringe 5ml');
    await row0.locator('input[type="number"]').fill('25.00');

    await page.getByRole('button', { name: '+ Add Fee Item' }).click();
    const row1 = page.locator('div:has(> input[placeholder*="Description"])').nth(1);
    await row1.locator('input[placeholder*="Description"]').fill('Bandage & Dressing');
    await row1.locator('input[type="number"]').fill('50.00');

    // Total: 500 + 650 + 25 + 50 = 1,225.00
    await expect(page.getByText('₱1225.00')).toBeVisible();
    await expect(page.getByText('Finalized Items')).toBeVisible();

    // Test Record Payment checkbox
    await page.getByRole('checkbox', { name: /Record manual payment received now/i }).check();
    const payAmtInput = page.locator('input[name="registration_fee.payment.amount"]');
    await expect(payAmtInput).toBeVisible();

    // Enter partial payment: 500.00
    await payAmtInput.fill('500.00');
    await page.locator('select[id$="-pay-method"]').selectOption('cash');
    await page.locator('input[id$="-pay-ref"]').fill('CASH-REC-001');

    // Real-time balance preview: 1,225.00 - 500.00 = 725.00
    await expect(page.getByText('₱725.00')).toBeVisible();

    // Submit registration
    await page.getByRole('button', { name: 'Save Patient Record' }).click();
    await expect(page.getByText('Test record saved')).toBeVisible();

    // Verify structured payload sent to backend
    expect(submittedPayload?.registration_fee).toBeDefined();
    const fee = submittedPayload.registration_fee;
    expect(fee.rig_fee).toEqual({ disposition: 'recorded', amount: '500.00', reason: '' });
    expect(fee.anti_rabies_fee).toEqual({ disposition: 'recorded', amount: '650.00', reason: '' });
    expect(fee.additional_fees).toHaveLength(2);
    expect(fee.additional_fees[0]).toMatchObject({ label: 'Syringe 5ml', disposition: 'recorded', amount: '25.00' });
    expect(fee.additional_fees[1]).toMatchObject({ label: 'Bandage & Dressing', disposition: 'recorded', amount: '50.00' });
    expect(fee.record_payment).toBe(true);
    expect(fee.payment).toMatchObject({
      amount: '500.00',
      payment_method: 'cash',
      reference_number: 'CASH-REC-001',
    });
  });

  test('RF-UI-05: Draft restoration preserves fee items but resets payment flag', async ({ page }) => {
    await setupApiRoutes(page, {
      rig_fee: 'required',
      anti_rabies_fee: 'optional',
      additional_fees: 'optional',
    });

    await page.goto('/tests/registration/index.html');
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    // Enter draft data
    await page.locator('input[name="last_name"]').fill('Reyes');
    await page.locator('input[name="registration_fee.rig_fee.amount"]').fill('350.00');
    await page.getByRole('checkbox', { name: /Record manual payment received now/i }).check();
    await page.locator('input[name="registration_fee.payment.amount"]').fill('350.00');

    // Wait for draft auto-save in localStorage (debounced at 800ms)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('form_draft__add-patient'))).toContain('Reyes');

    // Close and reopen modal to test draft restore
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Open registration' }).click();
    await expect(page.getByRole('dialog', { name: 'Patient Registration' })).toBeVisible();

    // Last name and RIG fee amount are restored from draft
    await expect(page.locator('input[name="last_name"]')).toHaveValue('Reyes');
    await expect(page.locator('input[name="registration_fee.rig_fee.amount"]')).toHaveValue('350.00');

    // SECURITY / ACCURACY REQUIREMENT: Payment checkbox must NOT be restored as checked
    await expect(page.getByRole('checkbox', { name: /Record manual payment received now/i })).not.toBeChecked();
    await expect(page.locator('input[name="registration_fee.payment.amount"]')).toHaveCount(0);
  });
});
