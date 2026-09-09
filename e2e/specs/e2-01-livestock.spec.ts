import { test, expect } from '@playwright/test';

/**
 * E2-01 — register an animal or group. Drives the running app on both projects:
 * create a farm and a livestock enterprise, register an individual (count 1) and
 * a group (count > 1), confirm each reads correctly, and confirm they survive a
 * reload (real IndexedDB persistence, not a unit-level check).
 */

test('registers an individual and a group that persist across a reload', {
  tag: '@E2-01',
}, async ({ page }) => {
  // A livestock record belongs to a livestock enterprise, which belongs to a
  // farm — set both up first in Settings.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Beef herd');
  await page.getByTestId('enterprise-type-select').selectOption('livestock');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  // Move to the Livestock module.
  await page.goto('/#/livestock');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Livestock');
  await expect(page.getByText('No animals or groups yet. Register your first below.')).toBeVisible();

  // Register an individual (count 1).
  await page.getByTestId('livestock-name-input').fill('ZA-001');
  await page.getByTestId('livestock-species-input').fill('Cattle');
  await page.getByTestId('livestock-count-input').fill('1');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Animal registered.')).toBeVisible();

  const list = page.getByRole('list', { name: 'Livestock' });
  await expect(list).toContainText('ZA-001');
  await expect(list).toContainText('Cattle · Individual');
  // Fields clear so the next animal can be registered straight away.
  await expect(page.getByTestId('livestock-name-input')).toHaveValue('');

  // Register a group (count > 1).
  await page.getByTestId('livestock-name-input').fill('North paddock');
  await page.getByTestId('livestock-species-input').fill('Cattle');
  await page.getByTestId('livestock-count-input').fill('40');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Animal registered.')).toBeVisible();
  await expect(list).toContainText('North paddock');
  await expect(list).toContainText('Cattle · Group of 40');

  // Reload — a genuine restart of the app — and confirm both persisted.
  await page.goto('/#/livestock');
  await page.reload();
  const listAfterReload = page.getByRole('list', { name: 'Livestock' });
  await expect(listAfterReload).toContainText('Cattle · Individual');
  await expect(listAfterReload).toContainText('Cattle · Group of 40');
});
