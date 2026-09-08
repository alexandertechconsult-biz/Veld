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
});
