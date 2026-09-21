import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // All application and address requests are mocked; no patient records are sent.
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/cities-municipalities/')) return route.fulfill({ json: [{ code: '104324000', name: 'Tagoloan' }] });
    if (path.endsWith('/barangays/')) return route.fulfill({ json: [{ code: '104324006', name: 'Poblacion' }] });
    if (path.endsWith('/patients')) return route.fulfill({ status: 201, json: { patient_id: 101 } });
    return route.fulfill({ json: {} });
  });
  await page.goto('/tests/registration/index.html');
  await page.getByRole('button', { name: 'Open registration' }).click();
  await expect(page.getByRole('dialog', { name: 'Patient Registration', exact: true })).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
});

async function requiredFields(page: Page) {
  await page.getByLabel('Last Name').fill('Dela Cruz');
  await page.getByLabel('First Name').fill('Juan');
  await page.getByLabel('Male', { exact: true }).check();
  await page.getByLabel('Date of Birth').fill('1990-06-12');
  await page.getByRole('button', { name: 'Switch to Manual Typing' }).click();
  await page.getByLabel('City / Municipality').fill('Tagoloan');
  await page.getByLabel('Barangay').fill('Poblacion');
}

test('Enter follows row order; Tab, Shift+Tab and native controls retain behavior', async ({ page }) => {
  const last = page.getByLabel('Last Name');
  const first = page.getByLabel('First Name');
  await expect(last).toBeFocused();
  await last.fill('Dela Cruz');
  await last.press('Enter');
  await expect(first).toBeFocused();
  await first.press('Enter');
  await expect(page.getByLabel('Middle Name', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Suffix', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByLabel('Middle Name', { exact: true })).toBeFocused();
  await page.getByLabel('Suffix', { exact: true }).press('Enter');
  await expect(page.getByLabel('Female', { exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Male', { exact: true })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Date of Birth')).toBeFocused();
  const prevented = await page.evaluate(() => {
    const form = document.querySelector('form')!;
    const multiline = document.createElement('textarea');
    form.append(multiline);
    const targets = [form.querySelector('select')!, form.querySelector('input[type="radio"]')!, form.querySelector('input[type="date"]')!, multiline];
    const result = targets.map(target => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    });
    multiline.remove();
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true });
    form.querySelector('input')!.dispatchEvent(composing);
    result.push(composing.defaultPrevented);
    return result;
  });
  expect(prevented).toEqual([false, false, false, false, false]);
  await expect(page.getByText('Test record saved')).toHaveCount(0);
});

test('required and length errors are linked to controls; corrections preserve focus and values', async ({ page }) => {
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  const last = page.getByLabel('Last Name');
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute('aria-invalid', 'true');
  await expect(last).toHaveAccessibleDescription('Last Name is required');
  await last.fill('Dela Cruz');
  await expect(last).toBeFocused();
  await requiredFields(page);
  const phone = page.getByLabel('Contact Number (Mobile)', { exact: true });
  await phone.fill('09123');
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAccessibleDescription('Contact number must be exactly 11 digits.');
  await expect(last).toHaveValue('Dela Cruz');
  await expect(page.getByLabel('Barangay')).toHaveValue('Poblacion');
});

test('address dependencies, manual entry and read-only preview', async ({ page }) => {
  const municipality = page.getByLabel('City / Municipality');
  const barangay = page.getByLabel('Barangay');
  await expect(barangay).toBeDisabled();
  await expect(page.getByLabel('Purok / Zone / Street', { exact: true })).toBeDisabled();
  await expect(municipality).toBeEnabled();
  await municipality.selectOption('104324000');
  await expect(barangay).toBeEnabled();
  await barangay.selectOption('104324006');
  await page.getByLabel('Purok / Zone / Street', { exact: true }).fill('Zone 1');
  await expect(page.getByLabel('Full Address preview')).toContainText('Zone 1, Poblacion, Tagoloan, Misamis Oriental');
  await page.getByRole('button', { name: 'Switch to Manual Typing' }).click();
  await municipality.fill('Villanueva');
  await barangay.fill('Kimaya');
  await expect(page.getByLabel('Full Address preview')).toContainText('Zone 1, Kimaya, Villanueva');
});

test('server errors appear at their fields and focus uses visual order', async ({ page }) => {
  await page.route('**/api/patients', route => route.fulfill({ status: 422, json: {
    message: 'Please check the patient details.',
    errors: { email: ['Email is invalid.'], date_of_birth: ['Please check this date.'] },
  } }));
  await requiredFields(page);
  await page.getByLabel('Email Address (Optional)', { exact: true }).fill('not-an-email');
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  await expect(page.getByLabel('Date of Birth')).toBeFocused();
  await expect(page.getByLabel('Email Address (Optional)', { exact: true })).toHaveAccessibleDescription('Email is invalid.');
  await expect(page.getByLabel('Last Name')).toHaveValue('Dela Cruz');
});

test('final text field submits once and preserves registration and queue payloads', async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  let queues = 0;
  await page.route('**/api/patients', async route => {
    payloads.push(route.request().postDataJSON());
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ status: 201, json: { patient_id: 101 } });
  });
  await page.route('**/api/queue', route => { queues++; return route.fulfill({ json: {} }); });
  await requiredFields(page);
  await page.getByLabel('Yes', { exact: true }).check();
  await page.getByLabel('Membership', { exact: true }).selectOption('others');
  await page.getByLabel('Specify Membership Name', { exact: true }).fill('Farmers Association');
  const finalField = page.getByLabel('Membership ID / Certificate No.', { exact: true });
  await finalField.fill('ABC-123');
  await finalField.press('Enter');
  await expect(page.getByText('Test record saved')).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({ last_name: 'Dela Cruz', first_name: 'Juan', gender: 'male', address_municipality: 'Tagoloan', address_barangay: 'Poblacion' });
  expect(queues).toBe(1);
});

for (const width of [1280, 768, 600, 390, 320]) {
  test('responsive layout and actions at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const last = (await page.getByLabel('Last Name').boundingBox())!;
    const first = (await page.getByLabel('First Name').boundingBox())!;
    if (width >= 600) {
      expect(Math.abs(last.y - first.y)).toBeLessThan(2);
      expect(first.x).toBeGreaterThan(last.x);
    } else {
      expect(first.y).toBeGreaterThan(last.y);
      expect(Math.abs(first.x - last.x)).toBeLessThan(2);
    }
    const overflow = await page.getByRole('dialog', { name: 'Patient Registration', exact: true })
      .evaluate(dialog => [...dialog.querySelectorAll<HTMLElement>('input, select, button, output')].some(el => {
        const rect = el.getBoundingClientRect(); return rect.right > window.innerWidth || rect.left < 0;
      }));
    expect(overflow).toBe(false);
    await page.screenshot({ path: test.info().outputPath('registration.png') });
    const save = page.getByRole('button', { name: 'Save Patient Record' });
    await expect(save).toBeInViewport();
    expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
}

test('dark theme keeps errors, labels and primary action readable', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  const contrasts = await page.evaluate(() => {
    const luminance = (color: string) => {
      const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    return [...document.querySelectorAll<HTMLElement>('.fm-section-title, .registration-field-error, .fm-label, .fm-btn--submit')].map(el => {
      let ancestor: HTMLElement | null = el;
      let background = 'rgb(255,255,255)';
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') { background = candidate; break; }
        ancestor = ancestor.parentElement;
      }
      const a = luminance(getComputedStyle(el).color);
      const b = luminance(background);
      return { text: el.textContent, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  for (const contrast of contrasts) expect(contrast.ratio, contrast.text || '').toBeGreaterThanOrEqual(4.5);
});

test('input hover is visible and keyboard focus remains distinct', async ({ page }) => {
  const field = page.getByLabel('First Name');
  const before = await field.evaluate(el => getComputedStyle(el).borderColor);
  await field.hover();
  await expect.poll(() => field.evaluate(el => getComputedStyle(el).borderColor)).not.toBe(before);
  await page.getByLabel('Last Name').press('Enter');
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS('outline-style', 'solid');
});
