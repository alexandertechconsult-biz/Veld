import { test, expect } from '@playwright/test';

/**
 * E3-05 — correct or remove a field or activity. Drives the running app on both
 * projects: set up a farm, a crop enterprise and a field, log an activity, then
 * exercise every correction path — edit the field, edit the activity (confirming
 * the date is preserved when only the note changes), delete the activity behind
 * a named confirmation, and finally delete the field behind a named confirmation
 * — with a reload partway to prove it all persists. The crop analogue of E2-06.
 */

test('edits and deletes fields and activities, with named confirmations', {
  tag: '@E3-05',
}, async ({ page }) => {
  // Farm + crop enterprise, then a field to log against.
  await page.goto('/#/settings');
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

  // Log an activity to correct later, dated in the past.
  await page.getByRole('button', { name: 'Log activity' }).click();
  await page.getByTestId('activity-date-input').fill('2026-01-01');
  await page.getByTestId('activity-type-select').selectOption('planting');
  await page.getByTestId('activity-note-input').fill('Planted maize');
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(page.getByText('Activity logged.')).toBeVisible();

  // --- Correct the field record (name + crop type). ---
  await page.getByRole('button', { name: 'Log activity' }).click(); // expand the row
  await page.getByRole('button', { name: 'Edit field' }).click();
  await page.getByTestId('field-edit-name-input').fill('North paddock');
  await page.getByTestId('field-edit-crop-input').fill('Wheat');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const list = page.getByRole('list', { name: 'Fields' });
  await expect(list).toContainText('North paddock');
  await expect(list).toContainText('Wheat');

  // --- Correct the activity note; its original date must be preserved. ---
  const history = page.getByRole('list', { name: 'Activity history for North paddock' });
  await page.getByRole('button', { name: 'Edit activity' }).click();
  const editForm = page.getByRole('form', { name: 'Edit Planting activity for North paddock' });
  await expect(editForm.getByTestId('activity-date-input')).toHaveValue('2026-01-01');
  await editForm.getByTestId('activity-note-input').fill('Planted maize, 2 bags seed');
  await editForm.getByRole('button', { name: 'Save activity' }).click();
  await expect(history).toContainText('Planted maize, 2 bags seed');

  // Re-open the edit form: the original date is preserved (checked as the ISO
  // input value, which is locale-independent) because only the note changed.
  await page.getByRole('button', { name: 'Edit activity' }).click();
  const reopened = page.getByRole('form', { name: 'Edit Planting activity for North paddock' });
  await expect(reopened.getByTestId('activity-date-input')).toHaveValue('2026-01-01');
  await reopened.getByRole('button', { name: 'Cancel' }).click();

  // Reload — a genuine restart — and confirm the corrections persisted.
  await page.goto('/#/crops');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Fields' })).toContainText('North paddock');
  await page.getByRole('button', { name: 'Log activity' }).click();
  await expect(
    page.getByRole('list', { name: 'Activity history for North paddock' }),
  ).toContainText('Planted maize, 2 bags seed');

  // --- Delete the activity behind a named confirmation. ---
  await page.getByRole('button', { name: 'Delete activity' }).click();
  // The confirmation names the activity being removed (type + its date).
  await expect(page.getByText(/Delete this Planting activity from/)).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No activities logged yet.')).toBeVisible();

  // --- Delete the field behind a named confirmation. ---
  await page.getByRole('button', { name: 'Delete field' }).click();
  await expect(page.getByText("Delete North paddock? This can't be undone.")).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Fields' })).toBeHidden();
  await expect(page.getByText('No fields or blocks yet. Register your first below.')).toBeVisible();
});
