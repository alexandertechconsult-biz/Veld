import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import LivestockScreen from './LivestockScreen';
import { NavigationProvider } from '../app/navigationContext';
import { db } from '../data';

// LivestockScreen talks to the singleton database; start each test from empty.
// A no-op navigate satisfies the context the screen reads for the empty state.
beforeEach(async () => {
  await db.events.clear();
  await db.livestock.clear();
  await db.enterprises.clear();
  await db.farms.clear();
});

function renderScreen() {
  return render(
    <NavigationProvider value={() => {}}>
      <LivestockScreen />
    </NavigationProvider>,
  );
}

/** Seed a farm with one livestock enterprise, returning its id. */
async function seedLivestockEnterprise(): Promise<string> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
  await db.enterprises.add({
    id: 'e1',
    createdAt: 1,
    updatedAt: 1,
    farmId: 'f1',
    type: 'livestock',
    name: 'Beef herd',
  });
  return 'e1';
}

/** Seed a livestock enterprise with one animal, returning the animal id. */
async function seedAnimal(): Promise<string> {
  await seedLivestockEnterprise();
  await db.livestock.add({
    id: 'a1',
    createdAt: 1,
    updatedAt: 1,
    enterpriseId: 'e1',
    name: 'ZA-001',
    species: 'Cattle',
    count: 1,
  });
  return 'a1';
}

describe('LivestockScreen', () => {
  it('directs the farmer to Settings when no livestock enterprise exists', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
    renderScreen();
    expect(
      await screen.findByText(
        'No livestock enterprise yet. Add one in Settings, then register your animals.',
      ),
    ).toBeInTheDocument();
  });

  it('registers an individual (count 1) and lists it as an Individual', async () => {
    await seedLivestockEnterprise();
    renderScreen();

    const button = await screen.findByRole('button', { name: 'Register' });
    fireEvent.change(screen.getByTestId('livestock-name-input'), { target: { value: 'ZA-001' } });
    fireEvent.change(screen.getByTestId('livestock-species-input'), { target: { value: 'Cattle' } });
    fireEvent.change(screen.getByTestId('livestock-count-input'), { target: { value: '1' } });
    fireEvent.click(button);

    await screen.findByText('Animal registered.');
    const list = await screen.findByRole('list', { name: 'Livestock' });
    expect(list).toHaveTextContent('ZA-001');
    expect(list).toHaveTextContent('Cattle · Individual');
    // Fields clear so the farmer can register another.
    await waitFor(() => expect(screen.getByTestId('livestock-name-input')).toHaveValue(''));
    expect(await db.livestock.toArray()).toHaveLength(1);
  });

  it('registers a group (count above 1) and lists it as a Group', async () => {
    await seedLivestockEnterprise();
    renderScreen();

    fireEvent.change(await screen.findByTestId('livestock-name-input'), {
      target: { value: 'North paddock' },
    });
    fireEvent.change(screen.getByTestId('livestock-species-input'), { target: { value: 'Cattle' } });
    fireEvent.change(screen.getByTestId('livestock-count-input'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await screen.findByText('Animal registered.');
    const list = screen.getByRole('list', { name: 'Livestock' });
    expect(list).toHaveTextContent('North paddock');
    expect(list).toHaveTextContent('Cattle · Group of 40');
  });

  it('disables the submit button until name and species are filled', async () => {
    await seedLivestockEnterprise();
    renderScreen();
    // Count pre-fills to 1, so name + species are what remain blank.
    expect(await screen.findByRole('button', { name: 'Register' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('livestock-name-input'), { target: { value: 'ZA-001' } });
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('livestock-species-input'), { target: { value: 'Cattle' } });
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('hides the enterprise picker when there is only one livestock enterprise', async () => {
    await seedLivestockEnterprise();
    renderScreen();
    await screen.findByRole('button', { name: 'Register' });
    expect(screen.queryByTestId('livestock-enterprise-select')).not.toBeInTheDocument();
  });

  it('logs an event against an animal and writes it to the database (E2-02)', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.change(screen.getByTestId('event-type-select'), { target: { value: 'movement' } });
    fireEvent.change(screen.getByTestId('event-note-input'), {
      target: { value: 'Moved to north camp' },
    });
    // The row toggle now reads "Close", so "Log event" uniquely names the submit.
    fireEvent.click(screen.getByRole('button', { name: 'Log event' }));

    await screen.findByText('Event logged.');
    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      livestockId: 'a1',
      type: 'movement',
      note: 'Moved to north camp',
    });
    // The row's meta now reflects the logged event.
    const list = screen.getByRole('list', { name: 'Livestock' });
    expect(list).toHaveTextContent('1 event');
  });

  it('keeps the log-event submit disabled until a note is entered', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    const form = screen.getByRole('form', { name: 'Log an event for ZA-001' });
    const submit = within(form).getByRole('button', { name: 'Log event' });
    // Date pre-fills to today, so the note is what remains blank.
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('event-note-input'), { target: { value: 'Vaccinated' } });
    expect(submit).toBeEnabled();
  });

  it('closes the event form without writing when Cancel is pressed', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('event-note-input')).not.toBeInTheDocument();
    expect(await db.events.toArray()).toHaveLength(0);
  });

  it('shows an animal event history most recent first when expanded (E2-03)', async () => {
    await seedAnimal();
    // Seed two events out of order; the screen must show them newest first.
    await db.events.add({
      id: 'ev-old',
      createdAt: 1,
      updatedAt: 1,
      livestockId: 'a1',
      date: Date.parse('2026-01-01'),
      type: 'health',
      note: 'Older event',
    });
    await db.events.add({
      id: 'ev-new',
      createdAt: 2,
      updatedAt: 2,
      livestockId: 'a1',
      date: Date.parse('2026-09-08'),
      type: 'movement',
      note: 'Newer event',
    });
    renderScreen();

    // The row meta reflects the two logged events before expanding.
    expect(await screen.findByText(/2 events/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Log event' }));

    const history = screen.getByRole('list', { name: 'Event history for ZA-001' });
    const rows = within(history).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Newer event');
    expect(rows[1]).toHaveTextContent('Older event');
  });

  it('logs an event and shows it in the same animal history (E2-03)', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    // The freshly opened, empty history tells the farmer nothing is logged yet.
    expect(screen.getByText('No events logged yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('event-note-input'), {
      target: { value: 'Vaccinated for lumpy skin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log event' }));

    await screen.findByText('Event logged.');
    // Re-open the row and confirm the new event is now in the history.
    fireEvent.click(screen.getByRole('button', { name: 'Log event' }));
    const history = screen.getByRole('list', { name: 'Event history for ZA-001' });
    expect(history).toHaveTextContent('Vaccinated for lumpy skin');
  });

  it('corrects an animal record (E2-06)', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit animal' }));

    fireEvent.change(screen.getByTestId('livestock-edit-name-input'), {
      target: { value: 'ZA-009' },
    });
    fireEvent.change(screen.getByTestId('livestock-edit-count-input'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Changes saved.');
    const list = screen.getByRole('list', { name: 'Livestock' });
    expect(list).toHaveTextContent('ZA-009');
    expect(list).toHaveTextContent('Group of 20');
    const stored = await db.livestock.get('a1');
    expect(stored).toMatchObject({ name: 'ZA-009', count: 20 });
  });

  it('confirms and names the animal before deleting it (E2-06)', async () => {
    await seedAnimal();
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete animal' }));

    // The confirmation names exactly what is being removed.
    expect(screen.getByText("Delete ZA-001? This can't be undone.")).toBeInTheDocument();
    // Nothing is gone until the farmer confirms.
    expect(await db.livestock.toArray()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.livestock.toArray()).toHaveLength(0));
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Livestock' })).not.toBeInTheDocument(),
    );
  });

  it('deleting an animal removes its events too (E2-06)', async () => {
    await seedAnimal();
    await db.events.add({
      id: 'ev1',
      createdAt: 1,
      updatedAt: 1,
      livestockId: 'a1',
      date: Date.parse('2026-09-08'),
      type: 'health',
      note: 'Vaccinated',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete animal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.livestock.toArray()).toHaveLength(0));
    expect(await db.events.toArray()).toHaveLength(0);
  });

  it('corrects an event note and keeps its original date (E2-06)', async () => {
    await seedAnimal();
    const date = Date.parse('2026-09-08');
    await db.events.add({
      id: 'ev1',
      createdAt: 1,
      updatedAt: 1,
      livestockId: 'a1',
      date,
      type: 'health',
      note: 'Vaccinated',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit event' }));

    const editForm = screen.getByRole('form', { name: 'Edit Health event for ZA-001' });
    fireEvent.change(within(editForm).getByTestId('event-note-input'), {
      target: { value: 'Vaccinated for lumpy skin' },
    });
    fireEvent.click(within(editForm).getByRole('button', { name: 'Save event' }));

    await waitFor(async () => {
      const stored = await db.events.get('ev1');
      expect(stored?.note).toBe('Vaccinated for lumpy skin');
    });
    // The date is untouched because only the note was corrected.
    expect((await db.events.get('ev1'))?.date).toBe(date);
  });

  it('confirms and names the event before deleting it (E2-06)', async () => {
    await seedAnimal();
    await db.events.add({
      id: 'ev1',
      createdAt: 1,
      updatedAt: 1,
      livestockId: 'a1',
      date: Date.parse('2026-09-08'),
      type: 'health',
      note: 'Vaccinated',
    });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Log event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }));

    // The confirmation names the event (type and date) being removed.
    expect(screen.getByText(/Delete this Health event from/)).toBeInTheDocument();
    expect(await db.events.toArray()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await db.events.toArray()).toHaveLength(0));
    // Wait for the reload-driven re-render before asserting the empty state, so
    // the assertion never races the delete's re-render (was intermittently red).
    expect(await screen.findByText('No events logged yet.')).toBeInTheDocument();
  });
});
