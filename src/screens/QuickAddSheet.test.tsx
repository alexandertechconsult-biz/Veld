import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickAddSheet from './QuickAddSheet';
import { NavigationProvider } from '../app/navigationContext';
import type { Navigate } from '../app/useHashRoute';
import { db } from '../data';

// The sheet talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await Promise.all([
    db.events.clear(),
    db.activities.clear(),
    db.tasks.clear(),
    db.transactions.clear(),
    db.livestock.clear(),
    db.fields.clear(),
    db.enterprises.clear(),
    db.farms.clear(),
  ]);
});

function renderSheet(overrides: Partial<Parameters<typeof QuickAddSheet>[0]> = {}, navigate: Navigate = () => {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onSaved = overrides.onSaved ?? vi.fn();
  render(
    <NavigationProvider value={navigate}>
      <QuickAddSheet open onClose={onClose} onSaved={onSaved} {...overrides} />
    </NavigationProvider>,
  );
  return { onClose, onSaved };
}

/** A farm with one livestock enterprise + animal and one crop enterprise + field. */
async function seedFarm(): Promise<void> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
  await db.enterprises.add({ id: 'lv', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'livestock', name: 'Herd' });
  await db.enterprises.add({ id: 'cr', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'crop', name: 'Block' });
  await db.livestock.add({ id: 'a1', createdAt: 1, updatedAt: 1, enterpriseId: 'lv', name: 'Cow 1', species: 'Cattle', count: 1 });
  await db.fields.add({ id: 'fld1', createdAt: 1, updatedAt: 1, enterpriseId: 'cr', name: 'North field', cropType: 'Maize' });
}

describe('QuickAddSheet', () => {
  it('offers the four log options when opened', async () => {
    await seedFarm();
    renderSheet();

    expect(await screen.findByRole('dialog', { name: 'Log something' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Livestock event' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crop activity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transaction' })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <NavigationProvider value={() => {}}>
        <QuickAddSheet open={false} onClose={vi.fn()} onSaved={vi.fn()} />
      </NavigationProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('logs a task in three taps and closes on save', async () => {
    await seedFarm();
    const { onClose, onSaved } = renderSheet();

    // Tap 1 (opening) is the parent's; here: tap the option, fill, tap save.
    fireEvent.click(await screen.findByRole('button', { name: 'Task' }));
    fireEvent.change(screen.getByTestId('quick-task-title-input'), {
      target: { value: 'Fix the gate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    const tasks = await db.tasks.toArray();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ title: 'Fix the gate', status: 'open', farmId: 'f1' });
  });

  it('logs a transaction and writes it to the database', async () => {
    await seedFarm();
    const { onSaved } = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Transaction' }));
    fireEvent.change(screen.getByTestId('quick-transaction-type-select'), {
      target: { value: 'sale' },
    });
    fireEvent.change(screen.getByTestId('quick-transaction-amount-input'), {
      target: { value: '4200' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log transaction' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const transactions = await db.transactions.toArray();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ type: 'sale', amount: 4200, farmId: 'f1' });
  });

  it('logs a livestock event against the defaulted animal', async () => {
    await seedFarm();
    const { onSaved } = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Livestock event' }));
    // The animal picker defaults to the only animal, so no extra tap is needed.
    await screen.findByTestId('quick-event-animal-select');
    fireEvent.change(screen.getByTestId('event-note-input'), {
      target: { value: 'Vaccinated for lumpy skin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log event' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ livestockId: 'a1', type: 'health', note: 'Vaccinated for lumpy skin' });
  });

  it('logs a crop activity against the defaulted field', async () => {
    await seedFarm();
    const { onSaved } = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Crop activity' }));
    await screen.findByTestId('quick-activity-field-select');
    fireEvent.change(screen.getByTestId('activity-note-input'), {
      target: { value: 'Sowed maize' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log activity' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const activities = await db.activities.toArray();
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ fieldId: 'fld1', type: 'planting', note: 'Sowed maize' });
  });

  it('points to Livestock instead of dead-ending when no animals exist', async () => {
    // A farm with no animals — the event flow cannot proceed.
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
    const navigate = vi.fn();
    const { onClose } = renderSheet({}, navigate);

    fireEvent.click(await screen.findByRole('button', { name: 'Livestock event' }));
    expect(
      await screen.findByText('No animals yet. Register an animal or group first.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Livestock' }));
    expect(navigate).toHaveBeenCalledWith('livestock');
    expect(onClose).toHaveBeenCalled();
    // Nothing was logged.
    expect(await db.events.toArray()).toHaveLength(0);
  });

  it('returns to the chooser from a form without logging', async () => {
    await seedFarm();
    renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Task' }));
    expect(screen.getByTestId('quick-task-title-input')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    // Back at the four options; nothing written.
    expect(screen.getByRole('button', { name: 'Livestock event' })).toBeInTheDocument();
    expect(await db.tasks.toArray()).toHaveLength(0);
  });

  it('closes when the scrim is pressed', async () => {
    await seedFarm();
    const { onClose } = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Close quick add' }));
    expect(onClose).toHaveBeenCalled();
  });
});
