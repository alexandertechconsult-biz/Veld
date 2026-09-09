import { test, expect } from '@playwright/test';

/**
 * E4-03 — edit or delete a task. Drives the running app on both projects: create
 * a farm and two tasks, edit one task's title inline and confirm it persists
 * across a reload, mark a task done then reopen it (moving it back to Open), and
 * delete a task behind a naming confirmation, confirming it stays gone after a
 * reload (real IndexedDB persistence, not a unit-level check).
 */

test('edits, reopens and deletes a task, and the changes survive a reload', {
  tag: '@E4-03',
}, async ({ page }) => {
  // A task belongs to a farm — create one first.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  // Add two tasks so one can be edited and the other deleted.
  await page.goto('/#/tasks');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');

  await page.getByTestId('task-title-input').fill('Fix fence');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  await page.getByTestId('task-title-input').fill('Order feed');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  const openList = page.getByRole('list', { name: 'Open tasks' });
  await expect(openList).toContainText('Fix fence');
  await expect(openList).toContainText('Order feed');

  // Edit "Fix fence" inline into "Fix the north fence".
  const fixFenceRow = page.getByRole('listitem').filter({ hasText: 'Fix fence' });
  await fixFenceRow.getByRole('button', { name: 'Edit task' }).click();
  await page.getByTestId('task-edit-title-input').fill('Fix the north fence');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Task updated.')).toBeVisible();
  await expect(openList).toContainText('Fix the north fence');
  await expect(openList).not.toContainText('Fix fence,');

  // Mark "Order feed" done, then reopen it — it returns to the Open group.
  await page.getByRole('button', { name: 'Mark "Order feed" done' }).click();
  await expect(page.getByText('Task marked done.')).toBeVisible();
  const doneList = page.getByRole('list', { name: 'Done tasks' });
  await expect(doneList).toContainText('Order feed');

  await doneList.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByText('Task reopened.')).toBeVisible();
  await expect(openList).toContainText('Order feed');
  await expect(page.getByRole('list', { name: 'Done tasks' })).toHaveCount(0);

  // Delete "Order feed" — a first tap names it, a second tap removes it.
  const orderFeedRow = page.getByRole('listitem').filter({ hasText: 'Order feed' });
  await orderFeedRow.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByText('Delete "Order feed"? This can\'t be undone.')).toBeVisible();
  await orderFeedRow.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Task deleted.')).toBeVisible();
  await expect(openList).not.toContainText('Order feed');

  // Reload — a genuine restart — and confirm the edit persisted and the delete stuck.
  await page.reload();
  const openAfterReload = page.getByRole('list', { name: 'Open tasks' });
  await expect(openAfterReload).toContainText('Fix the north fence');
  await expect(openAfterReload).not.toContainText('Order feed');
});
