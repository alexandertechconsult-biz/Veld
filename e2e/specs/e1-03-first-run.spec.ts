import { test, expect } from '@playwright/test';

/**
 * E1-03 — guided first-run flow. Drives the running app on both projects from a
 * fresh (empty) IndexedDB: the very first launch must walk the farmer through
 * naming their farm, then adding a first enterprise, then done — never an empty
 * app. Confirms the flow hands off to the shell, does not reappear on reload
 * (a real restart, farm now persisted), and that both records were saved.
 */

test('walks farm name then first enterprise then hands off to the app', {
  tag: '@E1-03',
}, async ({ page }) => {
  // First launch, no data yet: the guided flow takes over instead of the shell.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name your farm');
  await expect(page.getByText('Step 1 of 2')).toBeVisible();

  // Step 1 — name the farm.
  await page.getByTestId('first-run-farm-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2 — add the first enterprise.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Add your first enterprise');
  await page.getByTestId('first-run-enterprise-input').fill('Beef herd');
  await page.getByTestId('first-run-enterprise-type').selectOption('livestock');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3 — done, then hand off to the shell.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Setup complete');
  await page.getByTestId('first-run-done').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');

  // Reload — a genuine restart. A farm now exists, so onboarding must not return.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  await expect(page.getByText('Name your farm')).toHaveCount(0);

  // Both records persisted: Settings shows the farm name and the enterprise.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.getByTestId('farm-name-input')).toHaveValue('Rooikraal Farm');
  await expect(page.getByRole('list', { name: 'Enterprises' })).toContainText('Beef herd');
});
