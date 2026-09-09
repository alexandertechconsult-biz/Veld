import { test, expect } from '@playwright/test';

/**
 * E2-06 — correct or remove a livestock record or event. Drives the running app
 * on both projects: set up a farm, a livestock enterprise and an animal, log an
 * event, then exercise every correction path — edit the animal, edit the event
 * (confirming the date is preserved when only the note changes), delete the
 * event behind a named confirmation, and finally delete the animal behind a
 * named confirmation — with a reload partway to prove it all persists.
 */

test('edits and deletes livestock records and events, with named confirmations', {
  tag: '@E2-06',
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

  // Log an event to correct later, dated in the past.
  await page.getByRole('button', { name: 'Log event' }).click();
  await page.getByTestId('event-date-input').fill('2026-01-01');
  await page.getByTestId('event-type-select').selectOption('health');
  await page.getByTestId('event-note-input').fill('Vaccinated');
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(page.getByText('Event logged.')).toBeVisible();

  // --- Correct the animal record (name + count). ---
  await page.getByRole('button', { name: 'Log event' }).click(); // expand the row
  await page.getByRole('button', { name: 'Edit animal' }).click();
  await page.getByTestId('livestock-edit-name-input').fill('ZA-009');
  await page.getByTestId('livestock-edit-count-input').fill('25');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const list = page.getByRole('list', { name: 'Livestock' });
  await expect(list).toContainText('ZA-009');
  await expect(list).toContainText('Group of 25');

  // --- Correct the event note; its original date must be preserved. ---
  const history = page.getByRole('list', { name: 'Event history for ZA-009' });
  await page.getByRole('button', { name: 'Edit event' }).click();
  const editForm = page.getByRole('form', { name: 'Edit Health event for ZA-009' });
  await expect(editForm.getByTestId('event-date-input')).toHaveValue('2026-01-01');
  await editForm.getByTestId('event-note-input').fill('Vaccinated for lumpy skin');
  await editForm.getByRole('button', { name: 'Save event' }).click();
  await expect(history).toContainText('Vaccinated for lumpy skin');

  // Re-open the edit form: the original date is preserved (checked as the ISO
  // input value, which is locale-independent) because only the note changed.
  await page.getByRole('button', { name: 'Edit event' }).click();
  const reopened = page.getByRole('form', { name: 'Edit Health event for ZA-009' });
  await expect(reopened.getByTestId('event-date-input')).toHaveValue('2026-01-01');
  await reopened.getByRole('button', { name: 'Cancel' }).click();

  // Reload — a genuine restart — and confirm the corrections persisted.
  await page.goto('/#/livestock');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Livestock' })).toContainText('ZA-009');
  await page.getByRole('button', { name: 'Log event' }).click();
  await expect(
    page.getByRole('list', { name: 'Event history for ZA-009' }),
  ).toContainText('Vaccinated for lumpy skin');

  // --- Delete the event behind a named confirmation. ---
  await page.getByRole('button', { name: 'Delete event' }).click();
  // The confirmation names the event being removed (type + its date).
  await expect(page.getByText(/Delete this Health event from/)).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No events logged yet.')).toBeVisible();

  // --- Delete the animal behind a named confirmation. ---
  await page.getByRole('button', { name: 'Delete animal' }).click();
  await expect(page.getByText("Delete ZA-009? This can't be undone.")).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Livestock' })).toBeHidden();
  await expect(page.getByText('No animals or groups yet. Register your first below.')).toBeVisible();
});
