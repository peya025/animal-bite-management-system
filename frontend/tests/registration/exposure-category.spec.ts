import { expect, test } from '@playwright/test';

test('Form 2 saves category and an open Form 3 refreshes without an editable category', async ({ page }) => {
  let category = 'II';
  const savedPayloads: Record<string, unknown>[] = [];
  await page.addInitScript(() => localStorage.setItem('userData', JSON.stringify({ name: 'Test Doctor', role: 'triage' })));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const incident = { bite_id: 1, severity: category === 'III' ? 'severe' : 'moderate', exposure_category: category, bite_date: '2026-10-01', episode_type: 'primary' };
    const record = { treatment_id: 1, nature_of_visit: 'new_consultation', consultation_types: ['injury'], chief_complaints: 'Animal bite', diagnosis: 'Exposure', status: 'completed' };
    let data: unknown = { data: [] };
    if (path.endsWith('/treatment-records') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      savedPayloads.push(payload);
      category = payload.exposure_category;
      data = { treatment_record: { ...record, ...payload } };
    } else if (path.includes('/treatment-records/patient/')) {
      data = { latest_treatment: record, active_bite_incident: incident, exposure_category: category, has_administered_vaccine: false };
    } else if (path.includes('/tagoloan-treatment-cards/patient/')) {
      // Deliberately stale legacy card: the assessed incident must win.
      data = { bite_incident: incident, existing_card: { exposure_category: 'I' }, latest_consultation: record, form3_ready: true };
    } else if (path.includes('/vaccination-records/patient/')) {
      data = { active_bite_incident: incident, vaccination_records: [], prophylaxis_records: [] };
    } else if (path.endsWith('/inventory/prophylaxis-stock')) {
      data = { stock: {} };
    } else if (path.endsWith('/inventory/vaccine-names')) {
      data = { vaccine_names: ['Speeda'] };
    } else if (path.includes('/cases/')) {
      data = { incident: { ...incident, treatment_plan: { plan_type: 'full_pep' } } };
    }
    await route.fulfill({ json: data });
  });
  await page.goto('/tests/registration/exposure-category.html');
  const form2 = page.getByTestId('form2');
  const form3 = page.getByTestId('form3');
  const display = form3.locator('output[aria-label="Exposure Category"]');
  await expect(display).toHaveText('Category II');
  await expect(form2.getByRole('radio', { name: 'II', exact: true })).toBeChecked();
  await expect(form3.locator('input[name="exposure_category"], select[name="exposure_category"]')).toHaveCount(0);
  const unsavedLocation = form3.getByPlaceholder('Specify exact location (optional)');
  await unsavedLocation.fill('Right ankle — unsaved');

  for (const nextCategory of ['III', 'II']) {
    await form2.getByRole('button', { name: /Edit Record/ }).first().click();
    await form2.getByRole('radio', { name: nextCategory, exact: true }).check();
    await form2.getByRole('button', { name: /Save Changes/ }).click();
    await expect(display).toHaveText(`Category ${nextCategory}`);
    await expect(unsavedLocation).toHaveValue('Right ankle — unsaved');
    expect(savedPayloads.at(-1)).toMatchObject({ patient_id: 1, bite_id: 1, exposure_category: nextCategory });
  }
  // A change saved in another session is also picked up on window focus.
  category = 'III';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(display).toHaveText('Category III');
});
