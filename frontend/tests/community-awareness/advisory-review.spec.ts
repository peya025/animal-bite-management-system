import { test, expect } from '@playwright/test';

const officialSubmitted = {
  id: 21,
  author_id: 1,
  version: 2,
  state: 'submitted',
  advisory_type: 'official_health_advisory',
  title: 'Official Rabies Prevention Notice',
  body: 'Wash any animal bite wound with soap and water and seek clinic assessment promptly.',
  expires_on: '2026-12-05',
  source_authority: 'Department of Health',
  source_reference: 'https://doh.gov.ph/advisories/2026-01',
  source_issued_on: '2026-11-26',
  source_geography_note: 'Municipality-wide',
  scheduled_for: null,
};

const approvedItem = {
  id: 22,
  author_id: 1,
  version: 3,
  state: 'approved',
  advisory_type: 'community_awareness',
  title: 'Community Bite Safety Update',
  body: 'Facility-reviewed bite prevention guidance for local households.',
  expires_on: '2026-12-05',
  scheduled_for: null,
};

const scheduledItem = {
  ...approvedItem,
  id: 23,
  version: 4,
  state: 'scheduled',
  scheduled_for: '2026-11-28T08:00:00Z',
};

test('official advisory approval shows patient preview and requires both attestations', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('lastActivityAt', String(Date.now()));
    localStorage.setItem('userData', JSON.stringify({
      id: 2,
      name: 'Dr. Reviewer',
      role: 'staff',
      roles: [{ slug: 'doctor', name: 'Doctor' }],
      clinic_id: 1,
    }));
  });

  const writes: { url: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', route => {
    const req = route.request();
    if (req.url().includes('/user')) {
      return route.fulfill({ json: { id: 2, name: 'Dr. Reviewer', role: 'staff', roles: [{ slug: 'doctor', name: 'Doctor' }], clinic_id: 1 } });
    }
    if (req.method() === 'POST') {
      writes.push({ url: req.url(), body: req.postDataJSON() });
      return route.fulfill({ json: { ...officialSubmitted, state: 'approved', version: 3 } });
    }
    return route.fulfill({ json: { data: [officialSubmitted], last_page: 1 } });
  });

  await page.goto('/tests/community-awareness/index.html?view=advisory');
  await page.getByRole('button', { name: 'Review and approve' }).click();

  // Patient preview and disclaimer are visible inside the review dialog
  const preview = page.getByLabel('Patient mobile preview');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Department of Health');
  await expect(preview).toContainText('Reports of animal bites do not by themselves confirm rabies infection');

  // Confirm button stays disabled until BOTH review and source verification are checked
  const confirmBtn = page.getByRole('button', { name: 'Confirm approve' });
  await expect(confirmBtn).toBeDisabled();
  await page.getByLabel(/I reviewed the evidence/).check();
  await expect(confirmBtn).toBeDisabled();
  await page.getByLabel(/I verified the official authority/).check();
  await expect(confirmBtn).toBeEnabled();

  await confirmBtn.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toContain('/community-advisories/21/approve');
  expect(writes[0].body).toMatchObject({ version: 2, review_confirmed: true, source_verified: true });
});

test('admin can schedule an approved advisory and withdraw a scheduled advisory', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('lastActivityAt', String(Date.now()));
    localStorage.setItem('userData', JSON.stringify({
      id: 1,
      name: 'Clinic Admin',
      role: 'admin',
      roles: [],
      clinic_id: 1,
    }));
  });

  const writes: { url: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', route => {
    const req = route.request();
    if (req.url().includes('/user')) {
      return route.fulfill({ json: { id: 1, name: 'Clinic Admin', role: 'admin', roles: [], clinic_id: 1 } });
    }
    if (req.method() === 'POST') {
      writes.push({ url: req.url(), body: req.postDataJSON() });
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [approvedItem, scheduledItem], last_page: 1 } });
  });

  await page.goto('/tests/community-awareness/index.html?view=advisory');
  await page.getByRole('button', { name: 'Schedule publication' }).click();
  const confirmSchedule = page.getByRole('button', { name: 'Confirm schedule' });
  await expect(confirmSchedule).toBeDisabled();
  await page.getByLabel('Publish at (Asia/Manila)').fill('2026-11-28T09:00');
  await expect(confirmSchedule).toBeEnabled();
  await confirmSchedule.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.getByRole('button', { name: 'Withdraw' }).click();
  const confirmWithdraw = page.getByRole('button', { name: 'Confirm withdraw' });
  await expect(confirmWithdraw).toBeDisabled();
  await page.getByLabel('Reason (internal only)').fill('Superseded by updated clinic guidance');
  await expect(confirmWithdraw).toBeEnabled();
  await confirmWithdraw.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  expect(writes).toHaveLength(2);
  expect(writes[0].url).toContain('/community-advisories/22/schedule');
  expect(writes[0].body).toMatchObject({ version: 3, scheduled_for: '2026-11-28T09:00' });
  expect(writes[1].url).toContain('/community-advisories/23/withdraw');
  expect(writes[1].body).toMatchObject({ version: 4, reason: 'Superseded by updated clinic guidance' });
});
