import { test, expect } from '@playwright/test';

/**
 * E7-01 — Home screen showing recent activity across all modules. Drives the
 * running app on both projects: set up a farm with a livestock and a crop
 * enterprise, then log one entry in each of the four modules — a livestock
 * event, a crop activity, a transaction, and a task — with the event/activity/
 * transaction dated in the past. The Home feed must then show all four mixed
 * together, most recent first (the just-created task sits on top; the three
 * dated entries follow in date order), and survive a reload (real IndexedDB
 * persistence, not a unit-level check).
 */

test('shows recent activity mixed across all modules, most recent first', {
  tag: '@E7-01',
}, async ({ page }) => {
  // Farm + one livestock and one crop enterprise.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Beef herd');
  await page.getByTestId('enterprise-type-select').selectOption('livestock');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Maize block');
  await page.getByTestId('enterprise-type-select').selectOption('crop');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  // Livestock: register an animal and log a health event dated 4 Sept.
  await page.goto('/#/livestock');
  await page.getByTestId('livestock-name-input').fill('ZA-001');
  await page.getByTestId('livestock-species-input').fill('Cattle');
  await page.getByTestId('livestock-count-input').fill('1');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Animal registered.')).toBeVisible();

  await page.getByRole('button', { name: 'Log event' }).click();
  await page.getByTestId('event-type-select').selectOption('health');
  await page.getByTestId('event-date-input').fill('2026-09-04');
  await page.getByTestId('event-note-input').fill('Vaccinated for lumpy skin');
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(page.getByText('Event logged.')).toBeVisible();

  // Crops: register a field and log a planting activity dated 3 Sept.
  await page.goto('/#/crops');
  await page.getByTestId('field-name-input').fill('North field');
  await page.getByTestId('field-crop-input').fill('Maize');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Field registered.')).toBeVisible();

  await page.getByRole('button', { name: 'Log activity' }).click();
  await page.getByTestId('activity-type-select').selectOption('planting');
  await page.getByTestId('activity-date-input').fill('2026-09-03');
  await page.getByTestId('activity-note-input').fill('Sowed the maize');
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(page.getByText('Activity logged.')).toBeVisible();

  // Financials: log a cost dated 2 Sept.
  await page.goto('/#/financials');
  await page.getByTestId('transaction-amount-input').fill('1500');
  await page.getByTestId('transaction-date-input').fill('2026-09-02');
  await page.getByTestId('transaction-note-input').fill('Diesel for the tractor');
  await page.getByRole('button', { name: 'Log transaction' }).click();
  await expect(page.getByText('Transaction logged.')).toBeVisible();

  // Tasks: create a task last, so its creation time is the most recent entry.
  await page.goto('/#/tasks');
  await page.getByTestId('task-title-input').fill('Fix the water pump');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  // Home: the feed shows all four entry types, most recent first.
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  const feed = page.getByRole('list', { name: 'Recent activity' });
  await expect(feed).toContainText('Fix the water pump');
  await expect(feed).toContainText('Health event');
  await expect(feed).toContainText('Planting activity');
  await expect(feed).toContainText('Cost');

  const rows = feed.getByRole('listitem');
  await expect(rows).toHaveCount(4);
  // Task created just now is newest; the dated three follow in date order.
  await expect(rows.nth(0)).toContainText('Fix the water pump');
  await expect(rows.nth(1)).toContainText('Health event');
  await expect(rows.nth(2)).toContainText('Planting activity');
  await expect(rows.nth(3)).toContainText('Cost');

  // Reload — a genuine restart of the app — and confirm the feed persisted.
  await page.goto('/#/home');
  await page.reload();
  const feedAfterReload = page.getByRole('list', { name: 'Recent activity' });
  await expect(feedAfterReload).toContainText('Fix the water pump');
  await expect(feedAfterReload).toContainText('Health event');
  await expect(feedAfterReload).toContainText('Planting activity');
  await expect(feedAfterReload).toContainText('Cost');
});
