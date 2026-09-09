import { test, expect } from '@playwright/test';

/**
 * E3-01 — register a field or block. Drives the running app on both projects:
 * create a farm and a crop enterprise, register a field with a size and one
 * without, confirm each reads correctly, and confirm they survive a reload
 * (real IndexedDB persistence, not a unit-level check).
 */

test('registers fields that persist across a reload', {
  tag: '@E3-01',
}, async ({ page }) => {
  // A field belongs to a crop enterprise, which belongs to a farm — set both
  // up first in Settings.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Maize block');
  await page.getByTestId('enterprise-type-select').selectOption('crop');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  // Move to the Crops module.
  await page.goto('/#/crops');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crops');
  await expect(page.getByText('No fields or blocks yet. Register your first below.')).toBeVisible();

  // Register a field with a size.
  await page.getByTestId('field-name-input').fill('North field');
  await page.getByTestId('field-crop-input').fill('Maize');
  await page.getByTestId('field-size-input').fill('12 ha');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Field registered.')).toBeVisible();

  const list = page.getByRole('list', { name: 'Fields' });
  await expect(list).toContainText('North field');
  await expect(list).toContainText('Maize · 12 ha');
  // Fields clear so the next field can be registered straight away.
  await expect(page.getByTestId('field-name-input')).toHaveValue('');

  // Register a field without a size (optional).
  await page.getByTestId('field-name-input').fill('River block');
  await page.getByTestId('field-crop-input').fill('Wheat');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Field registered.')).toBeVisible();
  await expect(list).toContainText('River block');
  await expect(list).toContainText('Wheat');

  // Reload — a genuine restart of the app — and confirm both persisted.
  await page.goto('/#/crops');
  await page.reload();
  const listAfterReload = page.getByRole('list', { name: 'Fields' });
  await expect(listAfterReload).toContainText('North field');
  await expect(listAfterReload).toContainText('Maize · 12 ha');
  await expect(listAfterReload).toContainText('River block');
});
