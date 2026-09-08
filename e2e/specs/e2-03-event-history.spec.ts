import { test, expect } from '@playwright/test';

/**
 * E2-03 — see a history of events per animal or group. Drives the running app on
 * both projects: set up a farm, a livestock enterprise and an animal, log two
 * events on different dates, then confirm the expanded row shows a chronological
 * history most recent first, and that it survives a reload (real IndexedDB).
 */

test('shows an animal event history, most recent first, that survives a reload', {
  tag: '@E2-03',
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

  const history = page.getByRole('list', { name: 'Event history for ZA-001' });

  // Log an older event first (dated in the past).
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(page.getByText('No events logged yet.')).toBeVisible();
  await page.getByTestId('event-date-input').fill('2026-01-01');
  await page.getByTestId('event-type-select').selectOption('health');
  await page.getByTestId('event-note-input').fill('Older vaccination');
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(page.getByText('Event logged.')).toBeVisible();

  // Log a newer event (dated later than the first).
  await page.getByRole('button', { name: 'Log event' }).click();
  await page.getByTestId('event-date-input').fill('2026-09-08');
  await page.getByTestId('event-type-select').selectOption('movement');
  await page.getByTestId('event-note-input').fill('Newer move to north camp');
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(page.getByText('Event logged.')).toBeVisible();

  // Re-open the row and confirm the history lists newest first.
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(history.getByRole('listitem')).toHaveCount(2);
  const rows = history.getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Newer move to north camp');
  await expect(rows.nth(1)).toContainText('Older vaccination');

  // Reload — a genuine restart — and confirm the history persisted in order.
  await page.goto('/#/livestock');
  await page.reload();
  await page.getByRole('button', { name: 'Log event' }).click();
  const reloaded = page.getByRole('list', { name: 'Event history for ZA-001' }).getByRole('listitem');
  await expect(reloaded).toHaveCount(2);
  await expect(reloaded.nth(0)).toContainText('Newer move to north camp');
  await expect(reloaded.nth(1)).toContainText('Older vaccination');
});
