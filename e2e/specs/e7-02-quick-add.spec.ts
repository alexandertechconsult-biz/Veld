import { test, expect } from '@playwright/test';

/**
 * E7-02 — Home quick-add sheet. Drives the running app on both projects: set up
 * a farm with a livestock enterprise and one animal, then from the Home screen
 * use the "+" quick-add to log a task, a livestock event and a transaction —
 * each in three taps (open, pick, save) — confirm every entry lands in the Home
 * recent-activity feed, and confirm they survive a reload (real IndexedDB
 * persistence, not a unit-level check).
 */

test('logs a task, event and transaction from the Home quick-add sheet', {
  tag: '@E7-02',
}, async ({ page }) => {
  // Quick-add needs a farm, and the event flow needs an animal — set them up.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

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

  // Home: the quick-add trigger is present the moment a farm exists.
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  const trigger = page.getByTestId('quick-add-trigger');
  await expect(trigger).toBeVisible();

  // Task — three taps: open the sheet, pick Task, save (with a title in between).
  await trigger.click(); // tap 1
  const sheet = page.getByRole('dialog', { name: 'Log something' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Task' }).click(); // tap 2
  await sheet.getByTestId('quick-task-title-input').fill('Fix the north gate');
  await sheet.getByRole('button', { name: 'Add task' }).click(); // tap 3
  // The sheet closes on save and the entry appears in the feed.
  await expect(sheet).toBeHidden();
  const feed = page.getByRole('list', { name: 'Recent activity' });
  await expect(feed).toContainText('Fix the north gate');

  // Livestock event — the animal picker defaults to the only animal.
  await trigger.click();
  await sheet.getByRole('button', { name: 'Livestock event' }).click();
  await expect(sheet.getByTestId('quick-event-animal-select')).toBeVisible();
  await sheet.getByTestId('event-note-input').fill('Vaccinated for lumpy skin');
  await sheet.getByRole('button', { name: 'Log event' }).click();
  await expect(sheet).toBeHidden();
  await expect(feed).toContainText('Health event');

  // Transaction — a sale.
  await trigger.click();
  await sheet.getByRole('button', { name: 'Transaction' }).click();
  await sheet.getByTestId('quick-transaction-type-select').selectOption('sale');
  await sheet.getByTestId('quick-transaction-amount-input').fill('4200');
  await sheet.getByRole('button', { name: 'Log transaction' }).click();
  await expect(sheet).toBeHidden();
  await expect(feed).toContainText('Sale · 4,200');

  // Reload — a genuine restart of the app — and confirm all three persisted.
  await page.goto('/#/home');
  await page.reload();
  const feedAfterReload = page.getByRole('list', { name: 'Recent activity' });
  await expect(feedAfterReload).toContainText('Fix the north gate');
  await expect(feedAfterReload).toContainText('Health event');
  await expect(feedAfterReload).toContainText('Sale · 4,200');
});
