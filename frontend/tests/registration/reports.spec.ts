import { test, expect } from '@playwright/test';

const fixture = (params: URLSearchParams) => ({
  period: { from: params.get('from'), to: params.get('to'), category: params.get('category'), previous_from: '2026-08-01', previous_to: '2026-08-31', as_of: '2026-09-22' },
  meta: { title: params.get('report') === 'pep' ? 'PEP Treatment Outcomes' : 'Clinic Summary', clinic: 'Synthetic Test Clinic', prepared_by: 'Registration Staff', generated_at: '2026-09-22T12:00:00+08:00', basis: 'Test reporting basis', notes: ['Test definition'] },
  stats: { patients: 20, incidents: 22, pep_starts: 20, completion: { eligible: 20, completed: 14, rate: 70, excluded: 0 }, previous_completion: { eligible: 10, completed: 5, rate: 50, excluded: 0 }, completion_change_pp: 20,
    overdue_patients: 3, overdue_doses: 4, awaiting_d0: 2, referrals: 1, referral_rate: 4.5, delay: { average: 1.2, median: 1, min: 0, max: 3, samples: 20, excluded: 0 } },
  months: [{ month: '2026-09', I: 2, II: 15, III: 5 }],
  breakdowns: { barangays: [{ label: 'Poblacion, Tagoloan', count: 10 }, { label: 'Not recorded', count: 12 }], ages: [{ label: 'Children (0–12)', count: 12 }], animals: [{ label: 'Dog', count: 20 }], ownership: [{ label: 'Owned', count: 15 }], observation: [{ label: 'Unknown', count: 22 }], weekdays: [{ label: 'Mon', count: 7 }], outcomes: [{ label: 'Completed', count: 14 }, { label: 'Overdue', count: 6 }] },
  records: { columns: { case_number: 'Case no.', patient: 'Patient' }, rows: [{ case_number: 'TEST-001', patient: 'Synthetic Patient' }], total: 1, page: 1, last_page: 1 },
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/reports/registration?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('format') === 'csv') return route.fulfill({ contentType: 'text/csv', body: 'Case,Patient\nTEST-001,Synthetic Patient' });
    return route.fulfill({ json: fixture(params) });
  });
  await page.goto('/tests/reports/index.html');
  await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible();
  await expect(page.getByText('70%', { exact: true })).toBeVisible();
});

test('registration has three clinical tabs, applied filters, and current follow-up actions', async ({ page }) => {
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByText('Inventory', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Age at incident' })).toBeVisible();
  await expect(page.getByText(/Hourly patterns are unavailable/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Treatment outcomes — selected D0 cohort' })).toBeVisible();
  await page.getByLabel('From', { exact: true }).fill('2026-01-01');
  await expect(page.getByText(/Filter changes not applied/)).toBeVisible();
  const request = page.waitForRequest(req => req.url().includes('/reports/registration') && req.url().includes('from=2026-01-01'));
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await request;
  await page.getByRole('button', { name: /View Overdue/i }).click();
  await expect(page.getByRole('tab', { name: 'PEP & Follow-up' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Overdue Doses & Follow-up' })).toBeVisible();
  await page.getByRole('tab', { name: 'Bite Surveillance' }).click();
  await expect(page.getByRole('heading', { name: 'Bite Surveillance Incident Records' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Age at incident' })).toHaveCount(0);
});

test('CSV uses the selected report and print opens a complete safe document', async ({ page }) => {
  await page.getByRole('tab', { name: 'PEP & Follow-up' }).click();
  await expect(page.getByRole('heading', { name: 'PEP Treatment Outcomes' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toContain('registration-pep');
  await page.getByRole('button', { name: 'Print Report' }).click();
  const printFrame = page.locator('iframe[data-testid="print-frame"]');
  await expect(printFrame).toBeAttached();
  const frame = printFrame.contentFrame();
  await expect(frame.getByRole('heading', { name: 'PEP Treatment Outcomes' })).toBeVisible();
  await expect(frame.getByText('Synthetic Patient')).toBeVisible();
});

test('mobile layout stays within viewport and a failed load provides retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/registration-reports-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: 'test-results/registration-reports-desktop.png', fullPage: true });
  await page.route('**/api/reports/registration?**', route => route.fulfill({ status: 500, json: { message: 'Test failure' } }));
  await page.getByRole('tab', { name: 'Bite Surveillance' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load reports');
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
