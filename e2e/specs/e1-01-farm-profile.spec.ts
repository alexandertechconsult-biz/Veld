import { test, expect } from '@playwright/test';

/**
 * E1-01 — create a farm profile. Drives the running app on both projects: type a
 * farm name, save it, reload the page, and confirm the name persisted through
 * IndexedDB (a real app restart, not a unit-level check). Also confirms the save
 * renames rather than creating a second farm.
 */

test('saves a farm name and it survives a reload', { tag: '@E1-01' }, async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  const input = page.getByTestId('farm-name-input');
  await input.fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();

  await expect(page.getByText('Farm created.')).toBeVisible();
  // Once a farm exists the action becomes a rename.
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

  // Reload — a genuine restart of the app — and confirm persistence.
  await page.reload();
  await expect(page.getByTestId('farm-name-input')).toHaveValue('Rooikraal Farm');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

  // Renaming keeps a single farm; the new name persists too.
  await page.getByTestId('farm-name-input').fill('Rooikraal Estate');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('farm-name-input')).toHaveValue('Rooikraal Estate');
});
