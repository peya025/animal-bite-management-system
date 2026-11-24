import { test, expect, type Locator, type Page } from '@playwright/test';

async function selectComboboxOption(page: Page, trigger: Locator, optionLabel: string) {
  await trigger.click();
  const menu = page.locator('[data-combobox-menu="true"]');
  await expect(menu).toBeVisible();
  const search = menu.locator('input.ss-search-input');
  await expect(search).toBeFocused();
  await search.fill(optionLabel);
  await menu.getByRole('option', { name: optionLabel, exact: true }).click();
  await expect(menu).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  // All application and address requests are mocked; no patient records are sent.
  await page.route('**/api/**', async route => {
    if (route.request().resourceType() === 'script' || route.request().url().includes('/src/')) {
      return route.continue();
    }
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

async function referralTestRequiredFields(page: Page) {
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

test('referral fields appear only for Referral and are cleared when switching modes', async ({ page }) => {
  let patientPayload: Record<string, unknown> | undefined;
  let queueRequests = 0;
  await page.route('**/api/patients', route => {
    patientPayload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { patient_id: 101 } });
  });
  await page.route('**/api/queue', route => { queueRequests++; return route.fulfill({ json: {} }); });

  const facility = page.locator('input[name="reg_referred_by"]');
  await expect(facility).toHaveCount(0);
  await page.getByRole('radio', { name: 'Referral' }).check();
  await expect(facility).toBeVisible();
  const modeY = (await page.getByRole('radio', { name: 'Referral' }).boundingBox())!.y;
  const referralY = (await page.getByText('Referred by', { exact: true }).boundingBox())!.y;
  const consultationY = (await page.getByRole('heading', { name: /III\. Consultation Details/ }).boundingBox())!.y;
  expect(referralY).toBeGreaterThan(modeY);
  expect(referralY).toBeLessThan(consultationY);
  const municipality = page.locator('button[name="reg_referred_by_municipality"]');
  const barangay = page.locator('button[name="reg_referred_by_barangay"]');
  await expect(barangay).toBeDisabled();
  await selectComboboxOption(page, municipality, 'Tagoloan');
  await expect(barangay).toBeEnabled();
  await selectComboboxOption(page, barangay, 'Poblacion');
  await expect(facility).toHaveValue('Barangay Poblacion Health Station (BHS)');
  await facility.fill('Manual Referral Facility');
  await page.getByRole('radio', { name: 'Visited' }).check();
  await expect(facility).toHaveCount(0);
  await page.getByRole('radio', { name: 'Referral' }).check();
  await expect(facility).toHaveValue('');
  await expect(municipality).toHaveAttribute('data-value', '');
  await page.getByRole('radio', { name: 'Walk in' }).check();

  await referralTestRequiredFields(page);
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  await expect(page.getByText('Test record saved')).toBeVisible();
  expect(patientPayload).toMatchObject({ mode_of_transaction: 'walk-in', reg_referred_by: null });
  expect(queueRequests).toBe(1);
});

test('Referral saves the selected or manually entered facility', async ({ page }) => {
  let patientPayload: Record<string, unknown> | undefined;
  let queueRequests = 0;
  await page.route('**/api/patients', route => {
    patientPayload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { patient_id: 101 } });
  });
  await page.route('**/api/queue', route => { queueRequests++; return route.fulfill({ json: {} }); });

  await referralTestRequiredFields(page);
  await page.getByRole('radio', { name: 'Referral' }).check();
  await selectComboboxOption(page, page.locator('button[name="reg_referred_by_municipality"]'), 'Tagoloan');
  await selectComboboxOption(page, page.locator('button[name="reg_referred_by_barangay"]'), 'Poblacion');
  const facility = page.locator('input[name="reg_referred_by"]');
  await expect(facility).toHaveValue('Barangay Poblacion Health Station (BHS)');
  await facility.fill('Manual Referral Facility');
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  await expect(page.getByText('Test record saved')).toBeVisible();
  expect(patientPayload).toMatchObject({ mode_of_transaction: 'referral', reg_referred_by: 'Manual Referral Facility' });
  expect(queueRequests).toBe(1);
});

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
  await page.getByLabel('Middle Name', { exact: true }).press('Enter');
  await expect(page.getByLabel('Suffix', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Female', { exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Male', { exact: true })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Date of Birth')).toBeFocused();
  const prevented = await page.evaluate(() => {
    const form = document.querySelector('form')!;
    const multiline = document.createElement('textarea');
    form.append(multiline);
    const targets = [form.querySelector('input[type="radio"]')!, form.querySelector('input[type="date"]')!, multiline];
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
  expect(prevented).toEqual([false, false, false, false]);
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
  const phone = page.locator('input[name="contact_number"]');
  await phone.fill('09123');
  await page.getByRole('button', { name: 'Save Patient Record' }).click();
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAccessibleDescription('Mobile number must start with 09 and contain 11 digits.');
  await expect(last).toHaveValue('Dela Cruz');
  await expect(page.getByLabel('Barangay')).toHaveValue('Poblacion');
});

test('address dependencies, manual entry and read-only preview', async ({ page }) => {
  const municipality = page.getByLabel('City / Municipality');
  const barangay = page.getByLabel('Barangay');
  await expect(barangay).toBeDisabled();
  await expect(page.getByLabel('Purok / Zone / Street', { exact: true })).toBeDisabled();
  await expect(municipality).toBeEnabled();
  await selectComboboxOption(page, municipality, 'Tagoloan');
  await expect(barangay).toBeEnabled();
  await selectComboboxOption(page, barangay, 'Poblacion');
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
  await selectComboboxOption(page, page.getByLabel('Membership', { exact: true }), 'Others (Specify)');
  await page.getByLabel('Specify Membership Name', { exact: true }).fill('Farmers Association');
  const idField = page.getByLabel('Membership ID / Certificate No.', { exact: true });
  await idField.fill('ABC-123');
  const finalField = page.locator('input[name="reg_attending_provider"]');
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

test('searchable comboboxes support live search, keyboard navigation, checkmark, empty state, and outside click', async ({ page }) => {
  // No native <select> elements remain in Patient Registration
  await expect(page.locator('form.registration-form select')).toHaveCount(0);

  const suffixTrigger = page.getByRole('combobox', { name: 'Suffix', exact: true });
  await expect(suffixTrigger).toHaveText('None');

  // Open via click: search bar is auto-focused and selected option has a checkmark
  await suffixTrigger.click();
  const menu = page.locator('[data-combobox-menu="true"]');
  await expect(menu).toBeVisible();
  const searchInput = menu.locator('input.ss-search-input');
  await expect(searchInput).toBeFocused();
  // Ensure search icon and input text box never overlap
  const iconBox = await menu.locator('.ss-search-icon').boundingBox();
  const inputBox = await searchInput.boundingBox();
  expect(iconBox && inputBox && iconBox.x + iconBox.width <= inputBox.x).toBe(true);
  const selectedOpt = menu.getByRole('option', { name: 'None', exact: true });
  await expect(selectedOpt).toHaveAttribute('aria-selected', 'true');
  await expect(selectedOpt.locator('.ss-option-check')).toBeVisible();

  // Case-insensitive filtering & "No results found" state
  await searchInput.fill('zzz-no-match');
  await expect(menu.getByText('No results found')).toBeVisible();

  // Pressing Enter when no results match does NOT submit the form
  await searchInput.press('Enter');
  await expect(page.getByText('Test record saved')).toHaveCount(0);

  // Filter case-insensitively and select via ArrowDown + Enter without submitting form
  await searchInput.fill('jr');
  await expect(menu.getByRole('option', { name: 'Jr.', exact: true })).toBeVisible();
  await searchInput.press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(suffixTrigger).toHaveText('Jr.');
  await expect(suffixTrigger).toBeFocused();
  await expect(page.getByText('Test record saved')).toHaveCount(0);

  // Reopening resets search query and displays checkmark beside Jr.
  await suffixTrigger.press('ArrowDown');
  await expect(menu).toBeVisible();
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toHaveValue('');
  const jrOption = menu.getByRole('option', { name: 'Jr.', exact: true });
  await expect(jrOption).toHaveAttribute('aria-selected', 'true');
  await expect(jrOption.locator('.ss-option-check')).toBeVisible();

  // ArrowDown / ArrowUp navigation and Enter selection
  await searchInput.press('ArrowDown'); // Sr.
  await searchInput.press('ArrowDown'); // II
  await searchInput.press('ArrowUp');   // Sr.
  await searchInput.press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(suffixTrigger).toHaveText('Sr.');

  // Escape closes ONLY the dropdown (retaining selected value), NOT the modal
  await suffixTrigger.click();
  await expect(menu).toBeVisible();
  await searchInput.fill('IV');
  await searchInput.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Patient Registration', exact: true })).toBeVisible();
  await expect(suffixTrigger).toHaveText('Sr.');
  await expect(suffixTrigger).toBeFocused();

  // Clicking outside closes the dropdown and retains value
  await suffixTrigger.click();
  await expect(menu).toBeVisible();
  await page.getByLabel('First Name').click();
  await expect(menu).toHaveCount(0);
  await expect(suffixTrigger).toHaveText('Sr.');

  // Tab and Shift+Tab while dropdown is open close menu and move to adjacent form fields
  await suffixTrigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel('Female', { exact: true })).toBeFocused();

  await suffixTrigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel('Middle Name', { exact: true })).toBeFocused();

  // Disabled options in Government Programs cannot be selected and are skipped by Arrow keys
  await page.getByLabel('Yes', { exact: true }).check();
  const membership1 = page.locator('button[name="membership-0"]');
  await selectComboboxOption(page, membership1, 'PhilHealth');
  await page.getByRole('button', { name: /\+ Add Another Membership/ }).click();
  const membership2 = page.locator('button[name="membership-1"]');
  await membership2.click();
  const disabledPhilHealth = page.locator('[data-combobox-menu="true"] [role="option"][aria-disabled="true"]');
  await expect(disabledPhilHealth).toContainText('PhilHealth (Already added)');
  await disabledPhilHealth.click({ force: true });
  // Still open and unselected because option is disabled
  await expect(page.locator('[data-combobox-menu="true"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(membership2).toHaveAttribute('data-value', '');
});

test('combobox validation error focuses invalid combobox and clears upon selection', async ({ page }) => {
  await page.locator('input[name="last_name"]').fill('Dela Cruz');
  await page.locator('input[name="first_name"]').fill('Juan');
  await page.getByRole('radio', { name: 'Male', exact: true }).check();
  await page.locator('input[name="date_of_birth"]').fill('1990-06-12');
  await page.getByRole('button', { name: 'Save Patient Record' }).click();

  const municipality = page.getByRole('combobox', { name: 'City / Municipality' });
  await expect(municipality).toBeFocused();
  await expect(municipality).toHaveAttribute('aria-invalid', 'true');

  await selectComboboxOption(page, municipality, 'Tagoloan');
  await expect(municipality).not.toHaveAttribute('aria-invalid', 'true');
  await expect(municipality).toHaveText('Tagoloan');
});

test('selecting Male removes Pregnant from Priority Category and resets it to Normal', async ({ page }) => {
  const priorityTrigger = page.getByRole('combobox', { name: 'Priority Category' });
  const menu = page.locator('[data-combobox-menu="true"]');

  // When Female is selected, Pregnant is available and selectable
  await page.getByRole('radio', { name: 'Female', exact: true }).check();
  await selectComboboxOption(page, priorityTrigger, 'Pregnant');
  await expect(priorityTrigger).toHaveText('Pregnant');

  // Switching to Male resets Pregnant back to Normal and removes Pregnant from options
  await page.getByRole('radio', { name: 'Male', exact: true }).check();
  await expect(priorityTrigger).toHaveText('Normal');
  await priorityTrigger.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('option', { name: 'Pregnant', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('option', { name: 'Normal', exact: true })).toBeVisible();
  await expect(menu.getByRole('option', { name: 'Senior Citizen', exact: true })).toBeVisible();
  await expect(menu.getByRole('option', { name: 'PWD', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  // Switching back to Female restores Pregnant in options
  await page.getByRole('radio', { name: 'Female', exact: true }).check();
  await priorityTrigger.click();
  await expect(menu.getByRole('option', { name: 'Pregnant', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
});


test.skip('Animal uses the original options above consultation and restores draft selections', async ({ page }) => {
  const animal = page.getByRole('region', { name: 'Animal', exact: true });
  await expect(animal.getByRole('radio', { checked: true })).toHaveCount(0);
  await animal.getByRole('radio', { name: 'Dog', exact: true }).click();
  await animal.getByRole('radio', { name: 'Owned', exact: true }).click();
  await animal.getByRole('radiogroup', { name: 'Available for 14-day observation' }).getByRole('radio', { name: 'No', exact: true }).click();
  await animal.getByRole('radio', { name: 'Healthy', exact: true }).click();
  const position = await page.evaluate(() => {
    const animal = document.querySelector('section[aria-label="Animal"]')!;
    const consultation = [...document.querySelectorAll('h3')].find(el => el.textContent?.includes('III. Consultation'))!;
    return Boolean(animal.compareDocumentPosition(consultation) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(position).toBe(true);
  const species = await animal.getByRole('radiogroup', { name: 'Species', exact: true }).boundingBox();
  const ownership = await animal.getByRole('radiogroup', { name: 'Ownership', exact: true }).boundingBox();
  const observation = await animal.getByRole('radiogroup', { name: 'Available for 14-day observation' }).boundingBox();
  expect(Math.abs(species!.y - ownership!.y)).toBeLessThan(2);
  expect(observation!.y).toBeGreaterThan(species!.y);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('form_draft__add-patient'))).toContain('dog');
  await page.reload();
  await page.getByRole('button', { name: 'Open registration' }).click();
  await expect(animal.getByRole('radio', { name: 'Dog', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(animal.getByRole('radio', { name: 'Owned', exact: true })).toHaveAttribute('aria-checked', 'true');
  await animal.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/animal-registration.png' });
});
