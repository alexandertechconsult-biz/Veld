import { test, expect } from '@playwright/test';

/**
 * E3-03 — see a history of activities per field or block. Drives the running app
 * on both projects: set up a farm, a crop enterprise and a field, log two
 * activities on different dates, then confirm the expanded row shows a
 * chronological history most recent first, and that it survives a reload (real
 * IndexedDB).
 */

test('shows a field activity history, most recent first, that survives a reload', {
  tag: '@E3-03',
}, async ({ page }) => {
  // Farm + crop enterprise, then a field to log against.
  await page.goto('/#/settings');
  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Maize block');
  await page.getByTestId('enterprise-type-select').selectOption('crop');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  await page.goto('/#/crops');
  await page.getByTestId('field-name-input').fill('North field');
  await page.getByTestId('field-crop-input').fill('Maize');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Field registered.')).toBeVisible();

  const history = page.getByRole('list', { name: 'Activity history for North field' });

  // Log an older activity first (dated in the past).
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(page.getByText('No activities logged yet.')).toBeVisible();
  await page.getByTestId('activity-date-input').fill('2026-01-01');
  await page.getByTestId('activity-type-select').selectOption('planting');
  await page.getByTestId('activity-note-input').fill('Older planting of maize');
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(page.getByText('Activity logged.')).toBeVisible();

  // Log a newer activity (dated later than the first).
  await page.getByRole('button', { name: 'Log activity' }).click();
  await page.getByTestId('activity-date-input').fill('2026-08-20');
  await page.getByTestId('activity-type-select').selectOption('harvest');
  await page.getByTestId('activity-note-input').fill('Newer harvest of 40 bags');
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(page.getByText('Activity logged.')).toBeVisible();

  // Re-open the row and confirm the history lists newest first.
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(history.getByRole('listitem')).toHaveCount(2);
  const rows = history.getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Newer harvest of 40 bags');
  await expect(rows.nth(1)).toContainText('Older planting of maize');

  // Reload — a genuine restart — and confirm the history persisted in order.
  await page.goto('/#/crops');
  await page.reload();
  await page.getByRole('button', { name: 'Log activity' }).click();
  const reloaded = page
    .getByRole('list', { name: 'Activity history for North field' })
    .getByRole('listitem');
  await expect(reloaded).toHaveCount(2);
  await expect(reloaded.nth(0)).toContainText('Newer harvest of 40 bags');
  await expect(reloaded.nth(1)).toContainText('Older planting of maize');
});
