import { test, expect } from '@playwright/test';

/**
 * E4-01 — create a task. Drives the running app on both projects: create a farm
 * and a crop enterprise with a field so the link picker has something to offer,
 * then create a task with a title, a field link, an assignee and a due date,
 * confirm it lists correctly, and confirm it survives a reload (real IndexedDB
 * persistence, not a unit-level check).
 */

test('creates tasks that persist across a reload', {
  tag: '@E4-01',
}, async ({ page }) => {
  // A task belongs to a farm; the optional field link needs a crop enterprise
  // and a field — set all three up first.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  await page.getByTestId('enterprise-name-input').fill('Maize block');
  await page.getByTestId('enterprise-type-select').selectOption('crop');
  await page.getByRole('button', { name: 'Add enterprise' }).click();
  await expect(page.getByText('Enterprise added.')).toBeVisible();

  await page.goto('/#/crops');
  await page.getByTestId('field-name-input').fill('North field');
  await page.getByTestId('field-crop-input').fill('Maize');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Field registered.')).toBeVisible();

  // Move to the Tasks module.
  await page.goto('/#/tasks');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');
  await expect(page.getByText('No tasks yet. Add your first below.')).toBeVisible();

  // Create a task with a title, a field link, an assignee and a due date.
  await page.getByTestId('task-title-input').fill('Spray weeds in the north field');
  await page.getByTestId('task-link-select').selectOption({ label: 'North field' });
  await page.getByTestId('task-assignee-input').fill('Themba');
  await page.getByTestId('task-due-input').fill('2026-10-01');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  const list = page.getByRole('list', { name: 'Tasks' });
  await expect(list).toContainText('Spray weeds in the north field');
  await expect(list).toContainText('North field');
  await expect(list).toContainText('Themba');
  // The form clears so the next task can be added straight away.
  await expect(page.getByTestId('task-title-input')).toHaveValue('');

  // Create a second, title-only task.
  await page.getByTestId('task-title-input').fill('Order feed');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();
  await expect(list).toContainText('Order feed');

  // Reload — a genuine restart of the app — and confirm both persisted.
  await page.goto('/#/tasks');
  await page.reload();
  const listAfterReload = page.getByRole('list', { name: 'Tasks' });
  await expect(listAfterReload).toContainText('Spray weeds in the north field');
  await expect(listAfterReload).toContainText('North field');
  await expect(listAfterReload).toContainText('Order feed');
});
