import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CropsScreen from './CropsScreen';
import { NavigationProvider } from '../app/navigationContext';
import { db } from '../data';

// CropsScreen talks to the singleton database; start each test from empty.
// A no-op navigate satisfies the context the screen reads for the empty state.
beforeEach(async () => {
  await db.activities.clear();
  await db.fields.clear();
  await db.enterprises.clear();
  await db.farms.clear();
});

function renderScreen() {
  return render(
    <NavigationProvider value={() => {}}>
      <CropsScreen />
    </NavigationProvider>,
  );
}

/** Seed a farm with one crop enterprise, returning its id. */
async function seedCropEnterprise(): Promise<string> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
  await db.enterprises.add({
    id: 'e1',
    createdAt: 1,
    updatedAt: 1,
    farmId: 'f1',
    type: 'crop',
    name: 'Maize block',
  });
  return 'e1';
}

describe('CropsScreen', () => {
  it('directs the farmer to Settings when no crop enterprise exists', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
    renderScreen();
    expect(
      await screen.findByText(
        'No crop enterprise yet. Add one in Settings, then register your fields.',
      ),
    ).toBeInTheDocument();
  });

  it('registers a field with a size and lists it', async () => {
    await seedCropEnterprise();
    renderScreen();

    const button = await screen.findByRole('button', { name: 'Register' });
    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: 'North field' } });
    fireEvent.change(screen.getByTestId('field-crop-input'), { target: { value: 'Maize' } });
    fireEvent.change(screen.getByTestId('field-size-input'), { target: { value: '12 ha' } });
    fireEvent.click(button);

    await screen.findByText('Field registered.');
    const list = await screen.findByRole('list', { name: 'Fields' });
    expect(list).toHaveTextContent('North field');
    expect(list).toHaveTextContent('Maize · 12 ha');
    // Fields clear so the farmer can register another.
    await waitFor(() => expect(screen.getByTestId('field-name-input')).toHaveValue(''));
    expect(await db.fields.toArray()).toHaveLength(1);
  });

  it('registers a field without a size (size is optional)', async () => {
    await seedCropEnterprise();
    renderScreen();

    fireEvent.change(await screen.findByTestId('field-name-input'), {
      target: { value: 'South block' },
    });
    fireEvent.change(screen.getByTestId('field-crop-input'), { target: { value: 'Wheat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await screen.findByText('Field registered.');
    const list = screen.getByRole('list', { name: 'Fields' });
    expect(list).toHaveTextContent('South block');
    expect(list).toHaveTextContent('Wheat');
    const stored = await db.fields.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].size).toBeUndefined();
  });

  it('disables the submit button until name and crop type are filled', async () => {
    await seedCropEnterprise();
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Register' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: 'North field' } });
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('field-crop-input'), { target: { value: 'Maize' } });
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('hides the enterprise picker when there is only one crop enterprise', async () => {
    await seedCropEnterprise();
    renderScreen();
    await screen.findByRole('button', { name: 'Register' });
    expect(screen.queryByTestId('field-enterprise-select')).not.toBeInTheDocument();
  });

  it('shows the enterprise picker when there is more than one crop enterprise', async () => {
    await seedCropEnterprise();
    await db.enterprises.add({
      id: 'e2',
      createdAt: 2,
      updatedAt: 2,
      farmId: 'f1',
      type: 'crop',
      name: 'Wheat block',
    });
    renderScreen();
    await screen.findByRole('button', { name: 'Register' });
    expect(screen.getByTestId('field-enterprise-select')).toBeInTheDocument();
  });

  /** Seed a farm, crop enterprise and one field, returning the field id. */
  async function seedField(): Promise<string> {
    await seedCropEnterprise();
    await db.fields.add({
      id: 'field1',
      createdAt: 1,
      updatedAt: 1,
      enterpriseId: 'e1',
      name: 'North field',
      cropType: 'Maize',
    });
    return 'field1';
  }

  it('logs an activity against a field and shows the activity count (E3-02)', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.change(screen.getByTestId('activity-note-input'), {
      target: { value: 'Planted maize' },
    });
    // With the panel open the toggle reads "Close", so the only "Log activity"
    // button left is the form's submit.
    fireEvent.click(screen.getByRole('button', { name: 'Log activity' }));

    await screen.findByText('Activity logged.');
    const stored = await db.activities.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ fieldId: 'field1', type: 'planting', note: 'Planted maize' });
    // The row's meta line now shows the running count.
    expect(await screen.findByText(/1 activity/)).toBeInTheDocument();
  });

  it('disables Log activity until a note is entered', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    // With the panel open the toggle reads "Close", so the remaining
    // "Log activity" button is the form's submit — disabled until a note exists.
    const submit = screen.getByRole('button', { name: 'Log activity' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('activity-note-input'), {
      target: { value: 'Sprayed herbicide' },
    });
    expect(submit).toBeEnabled();
  });

  it('does not write an activity when the form is cancelled', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.change(screen.getByTestId('activity-note-input'), {
      target: { value: 'Draft note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByTestId('activity-note-input')).not.toBeInTheDocument(),
    );
    expect(await db.activities.toArray()).toHaveLength(0);
  });

  it('shows a field activity history, most recent first (E3-03)', async () => {
    const fieldId = await seedField();
    // Seed two activities out of order; the data layer sorts most recent first.
    await db.activities.add({
      id: 'ac-old',
      createdAt: 1,
      updatedAt: 1,
      fieldId,
      date: Date.parse('2026-01-01'),
      type: 'planting',
      note: 'Planted maize',
    });
    await db.activities.add({
      id: 'ac-new',
      createdAt: 2,
      updatedAt: 2,
      fieldId,
      date: Date.parse('2026-08-20'),
      type: 'harvest',
      note: 'Harvested 40 bags',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    const history = await screen.findByRole('list', {
      name: 'Activity history for North field',
    });
    const rows = within(history).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Harvested 40 bags');
    expect(rows[1]).toHaveTextContent('Planted maize');
    expect(await screen.findByText(/2 activities/)).toBeInTheDocument();
  });

  it('logs an activity and it appears in the history (E3-03)', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    // Empty state until the first activity is logged.
    expect(screen.getByText('No activities logged yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('activity-note-input'), {
      target: { value: 'Sprayed herbicide' },
    });
    fireEvent.change(screen.getByTestId('activity-type-select'), { target: { value: 'input' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log activity' }));

    await screen.findByText('Activity logged.');
    // Reopen the panel; the new activity now shows in the history.
    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    const history = await screen.findByRole('list', {
      name: 'Activity history for North field',
    });
    expect(history).toHaveTextContent('Input');
    expect(history).toHaveTextContent('Sprayed herbicide');
  });

  it('corrects a field record (E3-05)', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit field' }));

    fireEvent.change(screen.getByTestId('field-edit-name-input'), {
      target: { value: 'North paddock' },
    });
    fireEvent.change(screen.getByTestId('field-edit-crop-input'), { target: { value: 'Wheat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Changes saved.');
    const list = screen.getByRole('list', { name: 'Fields' });
    expect(list).toHaveTextContent('North paddock');
    expect(list).toHaveTextContent('Wheat');
    const stored = await db.fields.get('field1');
    expect(stored).toMatchObject({ name: 'North paddock', cropType: 'Wheat' });
  });

  it('confirms and names the field before deleting it (E3-05)', async () => {
    await seedField();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete field' }));

    // The confirmation names exactly what is being removed.
    expect(screen.getByText("Delete North field? This can't be undone.")).toBeInTheDocument();
    // Nothing is gone until the farmer confirms.
    expect(await db.fields.toArray()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.fields.toArray()).toHaveLength(0));
    expect(screen.queryByRole('list', { name: 'Fields' })).not.toBeInTheDocument();
  });

  it('deleting a field removes its activities too (E3-05)', async () => {
    const fieldId = await seedField();
    await db.activities.add({
      id: 'ac1',
      createdAt: 1,
      updatedAt: 1,
      fieldId,
      date: Date.parse('2026-09-08'),
      type: 'planting',
      note: 'Planted maize',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.fields.toArray()).toHaveLength(0));
    expect(await db.activities.toArray()).toHaveLength(0);
  });

  it('corrects an activity note and keeps its original date (E3-05)', async () => {
    const fieldId = await seedField();
    const date = Date.parse('2026-09-08');
    await db.activities.add({
      id: 'ac1',
      createdAt: 1,
      updatedAt: 1,
      fieldId,
      date,
      type: 'planting',
      note: 'Planted maize',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit activity' }));

    const editForm = screen.getByRole('form', { name: 'Edit Planting activity for North field' });
    fireEvent.change(within(editForm).getByTestId('activity-note-input'), {
      target: { value: 'Planted maize, 2 bags seed' },
    });
    fireEvent.click(within(editForm).getByRole('button', { name: 'Save activity' }));

    await waitFor(async () => {
      const stored = await db.activities.get('ac1');
      expect(stored?.note).toBe('Planted maize, 2 bags seed');
    });
    // The date is untouched because only the note was corrected.
    expect((await db.activities.get('ac1'))?.date).toBe(date);
  });

  it('confirms and names the activity before deleting it (E3-05)', async () => {
    const fieldId = await seedField();
    await db.activities.add({
      id: 'ac1',
      createdAt: 1,
      updatedAt: 1,
      fieldId,
      date: Date.parse('2026-09-08'),
      type: 'planting',
      note: 'Planted maize',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete activity' }));

    // The confirmation names the activity (type and date) being removed.
    expect(screen.getByText(/Delete this Planting activity from/)).toBeInTheDocument();
    expect(await db.activities.toArray()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.activities.toArray()).toHaveLength(0));
    // Wait for the reload-driven re-render before asserting the empty state, so
    // the assertion never races the delete's re-render.
    expect(await screen.findByText('No activities logged yet.')).toBeInTheDocument();
  });
});
