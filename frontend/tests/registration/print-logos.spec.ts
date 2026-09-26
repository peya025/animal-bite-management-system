import { test, expect } from '@playwright/test';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const clinic = { id: 1, name: 'Print Test Clinic', is_setup_complete: true,
  left_print_logo_url: 'http://old-host/storage/clinic-logos/left.png',
  right_print_logo_url: 'http://old-host/storage/clinic-logos/right.png' };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('userData', JSON.stringify({ id: 1, name: 'Test staff', role: 'admin', clinic_id: 1 }));
    localStorage.setItem('clinicData', JSON.stringify({ id: 1, name: 'Stale clinic' }));
    localStorage.setItem('lastActivityAt', String(Date.now()));
  });
  await page.route('**/api/me', route => route.fulfill({ json: { id: 1, clinic } }));
  await page.route('**/api/storage/clinic-logos/**', route => route.fulfill({ contentType: 'image/png', body: png }));
});
test('restored sessions fetch current logos and updates/removal reach the preview', async ({ page }) => {
  await page.goto('/tests/print/index.html');
  const left = page.getByAltText('Left Seal');
  const right = page.getByAltText('Right Seal');
  await expect(left).toHaveAttribute('src', /127.0.0.1:4178\/api\/storage\/clinic-logos\/left.png$/);
  await expect(right).toBeVisible();
  await expect.poll(() => left.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
  await page.evaluate((value) => window.dispatchEvent(new CustomEvent('clinic-updated', { detail: { ...value, left_print_logo_url: null, right_print_logo_url: null } })), clinic);
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.getByText('Report content')).toBeVisible();
  await page.evaluate((value) => window.dispatchEvent(new CustomEvent('clinic-updated', { detail: value })), clinic);
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
});
test('failed images keep their space and a replacement becomes visible', async ({ page }) => {
  await page.route('**/api/storage/clinic-logos/left.png', route => route.fulfill({ status: 404 }));
  await page.goto('/tests/print/index.html');
  const left = page.getByAltText('Left Seal');
  await expect(left).toHaveCSS('visibility', 'hidden');
  expect(await left.evaluate(el => el.getBoundingClientRect().width)).toBe(52);
  await page.evaluate((value) => window.dispatchEvent(new CustomEvent('clinic-updated', { detail: { ...value, left_print_logo_url: '/storage/clinic-logos/replacement.png' } })), clinic);
  await expect(left).toBeVisible();
  await expect.poll(() => left.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
});
test('browser print waits for a delayed logo and preserves an empty right slot', async ({ page }) => {
  await page.goto('/tests/print/index.html');
  await expect(page.getByAltText('Left Seal')).toBeVisible();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/storage/clinic-logos/slow.png', async route => { await pending; await route.fulfill({ contentType: 'image/png', body: png }); });
  await page.evaluate(async () => {
    const modulePath = '/src/components/print/printReady.ts';
    const { printWhenReady } = await import(modulePath);
    const frame = document.createElement('iframe');
    frame.id = 'slow-print'; document.body.appendChild(frame);
    const win = frame.contentWindow!;
    win.document.write('<img src="/api/storage/clinic-logos/slow.png" style="width:64px;height:64px"><div style="width:64px;height:64px"></div>');
    win.document.close();
    win.print = () => { frame.dataset.printed = String(win.document.images[0].naturalWidth); };
    void printWhenReady(win);
  });
  const frame = page.locator('#slow-print');
  await expect(frame).not.toHaveAttribute('data-printed');
  release();
  await expect(frame).toHaveAttribute('data-printed', '1');
});

test('embedded server headers use the API proxy and PDF includes loaded logos', async ({ page }) => {
  await page.goto('/tests/print/index.html');
  await expect(page.getByAltText('Right Seal')).toBeVisible();
  const html = await page.evaluate(async () => {
    const modulePath = '/src/components/print/printHeaderHelper.ts';
    const { resolvePrintLogoUrls } = await import(modulePath);
    return resolvePrintLogoUrls('<img src="http://internal-backend/api/storage/clinic-logos/left.png"><p>Unchanged report</p>');
  });
  expect(html).toBe('<img src="http://127.0.0.1:4178/api/storage/clinic-logos/left.png"><p>Unchanged report</p>');
  await expect.poll(() => page.getByAltText('Right Seal').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
  const pdf = await page.pdf();
  expect(pdf.toString('latin1')).toContain('/Subtype /Image');
});

test('saving two uploads immediately updates setup and print preview despite an older refresh', async ({ page }) => {
  const saved = { ...clinic, left_print_logo_url: '/storage/clinic-logos/saved-left.png', right_print_logo_url: '/storage/clinic-logos/saved-right.png' };
  let multipart = '';
  await page.route('**/api/setup/clinic', async route => {
    if (route.request().method() === 'POST') {
      multipart = route.request().postDataBuffer()!.toString();
      await route.fulfill({ json: { clinic: saved } });
    } else {
      await route.fulfill({ json: clinic });
    }
  });
  await page.goto('/tests/print/index.html?setup=1');
  await expect(page.getByRole('heading', { name: 'Clinic Information', exact: true })).toBeVisible();
  await page.locator('#left-print-logo-upload').setInputFiles({ name: 'admin-left.png', mimeType: 'image/png', buffer: png });
  await page.locator('#right-print-logo-upload').setInputFiles({ name: 'admin-right.png', mimeType: 'image/png', buffer: png });

  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/me', async route => { await pending; await route.fulfill({ json: { id: 1, clinic } }); });
  const refreshStarted = page.waitForRequest('**/api/me');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await refreshStarted;
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText('Clinic Information Saved', { exact: true })).toBeVisible();
  expect(multipart).toContain('name="left_print_logo"; filename="admin-left.png"');
  expect(multipart).toContain('name="right_print_logo"; filename="admin-right.png"');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByAltText('Left Print Logo', { exact: true })).toHaveAttribute('src', /saved-left.png$/);
  await expect(page.getByAltText('Right Print Logo', { exact: true })).toHaveAttribute('src', /saved-right.png$/);
  const refreshFinished = page.waitForResponse('**/api/me');
  release();
  await refreshFinished;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.getByRole('button', { name: 'Open print preview' }).click();
  await expect(page.getByAltText('Left Seal')).toHaveAttribute('src', /saved-left.png$/);
  await expect(page.getByAltText('Right Seal')).toHaveAttribute('src', /saved-right.png$/);
  for (const side of ['Left', 'Right']) {
    await expect.poll(() => page.getByAltText(side + ' Seal').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
  }
});
