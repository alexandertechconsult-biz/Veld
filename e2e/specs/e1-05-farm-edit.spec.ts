import { test, expect } from '@playwright/test';

/**
 * E1-05 — correct the farm name from Settings (no delete). Drives the running app
 * on both projects: create a farm, then correct its name and confirm the
 * correction shows its own "Changes saved." confirmation (never the create one),
 * survives a reload through IndexedDB, and stays a single root record. Also
 * confirms there is no way to delete the farm.
 */

test('corrects the farm name and it survives a reload', { tag: '@E1-05' }, async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  // Create the farm first so there is something to correct.
  const input = page.getByTestId('farm-name-input');
  await input.fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm created.')).toBeVisible();

  // Correct the name. The correction gets its own confirmation, not the create one.
  await input.fill('Rooikraal Estate');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect(page.getByText('Farm created.')).toBeHidden();

  // The farm is the root record — the profile section offers no way to delete it.
  const farmSection = page.getByRole('region', { name: 'Farm profile' });
  await expect(farmSection.getByRole('button', { name: /delete|remove/i })).toHaveCount(0);

  // Reload — a genuine restart of the app — and confirm the correction persisted.
  await page.reload();
  await expect(page.getByTestId('farm-name-input')).toHaveValue('Rooikraal Estate');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
});
