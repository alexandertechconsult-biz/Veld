import { test, expect } from '@playwright/test';

/**
 * E2-02 — log an event against an animal or group. Drives the running app on
 * both projects: set up a farm, a livestock enterprise and an animal, log an
 * event (date, type, note), confirm the row reflects it, and confirm it
 * survives a reload (real IndexedDB persistence, no network call).
 */

test('logs an event against an animal that persists across a reload', {
  tag: '@E2-02',
}, async ({ page }) => {
  // Farm + livestock enterprise, then an animal to log against.
  await page.goto('/#/settings');
  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Beef herd');
  await page.getByTestId('enterprise-type-select').selectOption('livestock');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  await page.goto('/#/livestock');
  await page.getByTestId('livestock-name-input').fill('ZA-001');
  await page.getByTestId('livestock-species-input').fill('Cattle');
  await page.getByTestId('livestock-count-input').fill('1');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Animal registered.')).toBeVisible();

  // Open the log-event form for the animal and log a health event.
  await page.getByRole('button', { name: 'Log event' }).click();
  await page.getByTestId('event-type-select').selectOption('health');
  await page.getByTestId('event-note-input').fill('Vaccinated for lumpy skin');
  // The row toggle now reads "Close", so "Log event" uniquely names the submit.
  await page.getByRole('button', { name: 'Log event' }).click();

  await expect(page.getByText('Event logged.')).toBeVisible();
  const list = page.getByRole('list', { name: 'Livestock' });
  await expect(list).toContainText('1 event');

  // Reload — a genuine restart of the app — and confirm the event persisted.
  await page.goto('/#/livestock');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Livestock' })).toContainText('1 event');
});
