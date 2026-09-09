import { test, expect } from '@playwright/test';

/**
 * E1-02 — add a Livestock or Crop enterprise. Drives the running app on both
 * projects: create the farm, add one enterprise of each type, confirm both list
 * with the right type label, and confirm they survive a reload (real IndexedDB
 * persistence, not a unit-level check).
 */

test('adds livestock and crop enterprises that persist across a reload', {
  tag: '@E1-02',
}, async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  // An enterprise belongs to a farm, so create the farm first.
  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await expect(page.getByText('No enterprises yet. Add your first below.')).toBeVisible();

  // Add a livestock enterprise.
  await page.getByTestId('enterprise-name-input').fill('Beef herd');
  await page.getByTestId('enterprise-type-select').selectOption('livestock');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  const list = page.getByRole('list', { name: 'Enterprises' });
  await expect(list).toContainText('Beef herd');
  await expect(list).toContainText('Livestock');
  // The name field clears so a second one can be added straight away.
  await expect(page.getByTestId('enterprise-name-input')).toHaveValue('');

  // Add a crop enterprise.
  await page.getByTestId('enterprise-name-input').fill('Maize block');
  await page.getByTestId('enterprise-type-select').selectOption('crop');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();
  await expect(list).toContainText('Maize block');
  await expect(list).toContainText('Crop');

  // Reload — a genuine restart of the app — and confirm both persisted.
  await page.reload();
  const listAfterReload = page.getByRole('list', { name: 'Enterprises' });
  await expect(listAfterReload).toContainText('Beef herd');
  await expect(listAfterReload).toContainText('Maize block');
});
