import { test, expect } from '@playwright/test';

/**
 * E3-02 — log an activity against a field. Drives the running app on both
 * projects: set up a farm, a crop enterprise and a field, log an activity
 * (date, type, note), confirm the row reflects the running count, and confirm
 * it survives a reload (real IndexedDB persistence, no network call).
 */

test('logs an activity against a field that persists across a reload', {
  tag: '@E3-02',
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

  // Open the log-activity form for the field and log a planting activity.
  await page.getByRole('button', { name: 'Log activity' }).click();
  await page.getByTestId('activity-type-select').selectOption('planting');
  await page.getByTestId('activity-note-input').fill('Planted maize, 2 bags seed');
  // The row toggle now reads "Close", so "Log activity" uniquely names the submit.
  await page.getByRole('button', { name: 'Log activity' }).click();

  await expect(page.getByText('Activity logged.')).toBeVisible();
  const list = page.getByRole('list', { name: 'Fields' });
  await expect(list).toContainText('1 activity');

  // Reload — a genuine restart of the app — and confirm the activity persisted.
  await page.goto('/#/crops');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Fields' })).toContainText('1 activity');
});
