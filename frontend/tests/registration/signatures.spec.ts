import { test, expect } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const signaturePath = 'signatures/11111111-1111-4111-8111-111111111111.png';
const staff = { id: 2, name: 'Test Nurse', email: 'nurse@example.test', role: 'treatment',
  roles: [{ id: 1, slug: 'intake_nurse', display_name: 'Intake Nurse' }], is_active: true, signature_path: signaturePath };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ id: 1, name: 'Test Admin', role: 'admin', clinic_id: 1 }));
    localStorage.setItem('lastActivityAt', String(Date.now()));
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/me')) return route.fulfill({ json: { id: 1, clinic: { id: 1, name: 'Test Clinic' } } });
    if (url.pathname.endsWith('/users')) return route.fulfill({ json: [staff] });
    if (url.pathname.endsWith('/staff-signature')) return route.fulfill({ json: { signature_path: signaturePath } });
    if (/\/users\/\d+\/signature$/.test(url.pathname)) return route.fulfill({ contentType: 'image/png', body: png });
    return route.fulfill({ json: [] });
  });
});

test('admin can create a staff account without a signature', async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route('**/api/users', route => {
    if (route.request().method() === 'POST') {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { user: { id: 3 } } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/tests/signatures/index.html');
  await page.getByRole('button', { name: 'Add user', exact: true }).click();
  await page.getByLabel('Full name').fill('Unsigned Nurse');
  await page.getByLabel(/^Email/).fill('unsigned@example.test');
  await page.getByLabel(/^Password/).fill('password123');
  await expect(page.getByText('No signature. You can save without one.')).toBeVisible();
  await page.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect.poll(() => payload?.name).toBe('Unsigned Nurse');
  expect(payload?.signature_path).toBeUndefined();
  expect(payload?.signature_data).toBe('');
});

test('admin previews a replacement and can explicitly remove a signature', async ({ page }, testInfo) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route('**/api/users/2', route => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({ json: { user: staff } });
  });
  await page.goto('/tests/signatures/index.html');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByAltText('Staff signature')).toBeVisible();
  await page.getByLabel('Upload optional signature').setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('New signature preview')).toBeVisible();
  await page.getByRole('dialog', { name: 'Edit user' }).screenshot({ path: testInfo.outputPath('signature-admin.png') });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, save changes', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0].signature_data).toMatch(/^data:image\/png;base64,/);
  expect(payloads[0].signature_path).toBeUndefined();
  // Reload to dismiss the success dialog and edit the persisted profile again.
  await page.reload();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Remove signature', exact: true }).click();
  await expect(page.getByText('Signature will be removed for future use.')).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, save changes', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[1].remove_signature).toBe(true);
  expect(payloads[1].signature_data).toBeUndefined();
});

test('signature consent starts unchecked and refresh clears it', async ({ page }) => {
  await page.goto('/tests/signatures/index.html?treatment');
  const consent = page.getByRole('checkbox', { name: 'I confirm this is my signature and choose to apply it to these doses.' });
  await expect(consent).toBeEnabled();
  await expect(consent).not.toBeChecked();
  await consent.check();
  await page.getByRole('button', { name: 'Refresh signature', exact: true }).click();
  await expect(consent).not.toBeChecked();
  await expect(consent).toBeEnabled();
});

test('failed signature preview does not permit consent', async ({ page }) => {
  await page.route('**/api/users/1/signature?**', route => route.fulfill({ status: 404, json: {} }));
  await page.goto('/tests/signatures/index.html?treatment');
  await expect(page.getByText('Signature preview unavailable.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'I confirm this is my signature and choose to apply it to these doses.' })).toBeDisabled();
});
