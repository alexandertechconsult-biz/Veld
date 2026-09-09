import { test, expect } from '@playwright/test';

/**
 * E5-01 — log a cost or sale. Drives the running app on both projects: create a
 * farm and a livestock enterprise so the optional enterprise link has something
 * to offer, then log a cost (farm-level) and a sale (linked to the enterprise,
 * with a note), confirm both list correctly most-recent-first, and confirm they
 * survive a reload (real IndexedDB persistence, not a unit-level check).
 */

test('logs costs and sales that persist across a reload', {
  tag: '@E5-01',
}, async ({ page }) => {
  // A transaction belongs to a farm; the optional enterprise link needs an
  // enterprise — set both up first.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Beef herd');
  await page.getByTestId('enterprise-type-select').selectOption('livestock');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  // Move to the Financials module.
  await page.goto('/#/financials');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Financials');
  await expect(page.getByText('No costs or sales yet. Log your first below.')).toBeVisible();

  // Log a farm-level cost (default type is Cost).
  await page.getByTestId('transaction-amount-input').fill('1500');
  await page.getByTestId('transaction-date-input').fill('2026-09-01');
  await page.getByTestId('transaction-note-input').fill('Diesel for the tractor');
  await page.getByRole('button', { name: 'Log transaction' }).click();
  await expect(page.getByText('Transaction logged.')).toBeVisible();

  const list = page.getByRole('list', { name: 'Transactions' });
  await expect(list).toContainText('Cost');
  await expect(list).toContainText('1,500');
  await expect(list).toContainText('Diesel for the tractor');
  // The form clears so the next entry can be logged straight away.
  await expect(page.getByTestId('transaction-amount-input')).toHaveValue('');

  // Log a later sale linked to the enterprise.
  await page.getByTestId('transaction-type-select').selectOption('sale');
  await page.getByTestId('transaction-amount-input').fill('42000');
  await page.getByTestId('transaction-date-input').fill('2026-09-05');
  await page.getByTestId('transaction-enterprise-select').selectOption({ label: 'Beef herd' });
  await page.getByTestId('transaction-note-input').fill('Weaner calves');
  await page.getByRole('button', { name: 'Log transaction' }).click();
  await expect(page.getByText('Transaction logged.')).toBeVisible();
  await expect(list).toContainText('Sale');
  await expect(list).toContainText('42,000');
  await expect(list).toContainText('Beef herd');

  // Most recent first: the later sale sits above the earlier cost.
  const rows = list.getByRole('listitem');
  await expect(rows.first()).toContainText('Sale');
  await expect(rows.nth(1)).toContainText('Cost');

  // Reload — a genuine restart of the app — and confirm both persisted.
  await page.goto('/#/financials');
  await page.reload();
  const listAfterReload = page.getByRole('list', { name: 'Transactions' });
  await expect(listAfterReload).toContainText('Diesel for the tractor');
  await expect(listAfterReload).toContainText('Weaner calves');
  await expect(listAfterReload).toContainText('42,000');
});
