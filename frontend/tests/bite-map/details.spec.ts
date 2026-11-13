import { test, expect } from '@playwright/test';
const details = { incident: { bite_id: 101, bite_place: 'Selected exposure', exposure_category: 'I', transferred_to_facility: 'Referral Hospital' }, patient: { patient_id: 1, first_name: 'Selected', last_name: 'Patient', name: 'Selected Patient', details: {} }, assessments: [{ diagnosis: 'Selected diagnosis' }], nurse_records: [], schedules: [], plan: null, intake: null };
test('selected case, tabs, read-only fields, missing treatment and map preservation', async ({ page }) => {
 const requests: string[] = [];
 await page.route('**/api/cases/101/map-details', async route => { requests.push(route.request().method()); await route.fulfill({ json: details }); });
 await page.goto('/tests/bite-map/index.html');
 await page.locator('.leaflet-marker-icon').click();
 await expect(page.getByText('WHO Category:')).toBeVisible();
 const mapBefore = await page.locator('.leaflet-map-pane').getAttribute('style');
 await page.getByRole('button', { name: 'View Details' }).click();
 await expect(page.getByRole('dialog')).toContainText('Selected Patient');
 await page.getByRole('tab', { name: 'Form 2' }).click();
 await expect(page.getByRole('tabpanel')).toContainText('Selected diagnosis');
 await expect(page.getByRole('tabpanel')).toContainText('Referral Hospital');
 await page.getByRole('tab', { name: 'Form 3' }).click();
 await expect(page.getByText('No nurse treatment record available.')).toBeVisible();
 await expect(page.getByRole('dialog').locator('input,select,textarea,[contenteditable=true]')).toHaveCount(0);
 await expect(page.getByRole('button', { name: /^(Save|Update|Submit|Delete)$/ })).toHaveCount(0);
 await page.getByRole('button', { name: 'Close', exact: true }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(mapBefore);
 expect(requests).toEqual(['GET']);
});
test('loading and failure leave a usable close action', async ({ page }) => {
 await page.route('**/api/cases/101/map-details', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.fulfill({ status: 404, json: {} }); });
 await page.goto('/tests/bite-map/index.html');
 await page.locator('.leaflet-marker-icon').click();
 await page.getByRole('button', { name: 'View Details' }).click();
 await expect(page.getByText('Loading patient details…')).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Patient details could not be loaded');
 await page.getByRole('button', { name: 'Close patient details' }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('nurse treatment and responsive modal', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await page.route('**/api/cases/101/map-details', route => route.fulfill({ json: { ...details, nurse_records: [{ vaccine_brand: 'Selected vaccine', treatment_date: '2026-11-01', dose_number: 0 }], treatment_card: { registry_no: 'Selected registry' } } }));
 await page.goto('/tests/bite-map/index.html');
 await page.locator('.leaflet-marker-icon').click();
 await page.getByRole('button', { name: 'View Details' }).click();
 await page.getByRole('tab', { name: 'Form 3' }).click();
 await expect(page.getByRole('tabpanel')).toContainText('Selected vaccine');
 await expect(page.getByRole('tabpanel')).toContainText('Selected registry');
 const bounds = await page.getByRole('dialog').boundingBox();
 expect(bounds!.width).toBeLessThanOrEqual(390);
 await expect(page.getByRole('dialog').locator('input,select,textarea')).toHaveCount(0);
});
