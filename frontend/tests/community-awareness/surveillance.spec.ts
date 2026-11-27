import { test, expect } from '@playwright/test';

const result = {
  can_review: true,
  latest_run: { cutoff: '2026-11-26', created_at: '2026-11-27T00:00:00Z', stale: false, summary: {
    period: { start: '2026-11-20', end: '2026-11-26', baseline_start: '2026-10-21', baseline_end: '2026-11-19' },
    baseline_adequate: false, exclusions: { unknown_or_ambiguous_location: 2 }, unknown_location_pct: 20,
    possible_duplicate_groups: 1, suspicious_count_change: true,
  } },
  signals: { current_page: 1, last_page: 1, data: [{
    id: 12, version: 4, state: 'new', priority: 'priority_review', barangay: 'Common', municipality: 'Town A', province: 'Province A',
    assigned_to: null, last_evaluated_cutoff: '2026-11-26', metrics: { current_count: 3, baseline_count: 1, ratio: null, baseline_adequate: false, awaiting_assessment: 1, priority: 'priority_review' },
  }] },
};

test('displays limitations, exact geography and versioned review without publishing', async ({ page }) => {
  const writes: { url: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', route => {
    const request = route.request();
    if (request.method() === 'POST') { writes.push({ url: request.url(), body: request.postDataJSON() }); return route.fulfill({ json: {} }); }
    return route.fulfill({ json: result });
  });
  await page.goto('/tests/community-awareness/index.html');
  await expect(page.getByText('Common, Town A, Province A')).toBeVisible();
  await expect(page.getByText(/Ratio-based review is suppressed/)).toBeVisible();
  await expect(page.getByText(/possible repeat-record groups/)).toBeVisible();
  await page.getByRole('button', { name: 'Verify data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm verify' })).toBeDisabled();
  await page.getByLabel('Review reason (internal only)').fill('Checked duplicate records and reporting coverage');
  await page.getByRole('button', { name: 'Confirm verify' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toContain('/signals/12/reviews');
  expect(writes[0].body).toMatchObject({ version: 4, action: 'verify', reason: 'Checked duplicate records and reporting coverage' });
});

test('read-only staff see insights but cannot evaluate or review', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: { ...result, can_review: false } }));
  await page.goto('/tests/community-awareness/index.html');
  await expect(page.getByText('Common, Town A, Province A')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze completed days' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verify data' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review incident evidence' })).toBeVisible();
});

test('request failure is unavailable, never an all-clear', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { message: 'Test failure' } }));
  await page.goto('/tests/community-awareness/index.html');
  await expect(page.getByText(/Surveillance is unavailable/)).toBeVisible();
  await expect(page.getByText(/No review signals match/)).toHaveCount(0);
});
