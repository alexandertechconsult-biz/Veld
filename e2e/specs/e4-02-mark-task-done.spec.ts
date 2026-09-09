import { test, expect } from '@playwright/test';

/**
 * E4-02 — mark a task done. Drives the running app on both projects: create a
 * farm and two tasks, mark one done in a single tap, confirm it moves from the
 * Open group to the Done group, and confirm the done status survives a reload
 * (real IndexedDB persistence, not a unit-level check).
 */

test('marks a task done in a single tap, and it stays done across a reload', {
  tag: '@E4-02',
}, async ({ page }) => {
  // A task belongs to a farm — create one first.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await page.getByTestId('farm-name-input').fill('Rooikraal Farm');
  await page.getByRole('button', { name: 'Create farm' }).click();
  await expect(page.getByText('Farm saved.')).toBeVisible();

  // Add two tasks so one can be completed while the other stays open.
  await page.goto('/#/tasks');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');

  await page.getByTestId('task-title-input').fill('Move cattle to north camp');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  await page.getByTestId('task-title-input').fill('Order feed');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Task added.')).toBeVisible();

  const openList = page.getByRole('list', { name: 'Open tasks' });
  await expect(openList).toContainText('Move cattle to north camp');
  await expect(openList).toContainText('Order feed');

  // A single tap of the row's mark-done control completes the task.
  await page.getByRole('button', { name: 'Mark "Order feed" done' }).click();
  await expect(page.getByText('Task marked done.')).toBeVisible();

  // It now sits in the Done group; the other stays open.
  const doneList = page.getByRole('list', { name: 'Done tasks' });
  await expect(doneList).toContainText('Order feed');
  await expect(openList).toContainText('Move cattle to north camp');
  await expect(openList).not.toContainText('Order feed');
  // A completed task no longer offers the mark-done control.
  await expect(page.getByRole('button', { name: 'Mark "Order feed" done' })).toHaveCount(0);

  // Reload — a genuine restart of the app — and confirm the done status persisted.
  await page.reload();
  const doneAfterReload = page.getByRole('list', { name: 'Done tasks' });
  await expect(doneAfterReload).toContainText('Order feed');
  await expect(page.getByRole('list', { name: 'Open tasks' })).toContainText(
    'Move cattle to north camp',
  );
});
