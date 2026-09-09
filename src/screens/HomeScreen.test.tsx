import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import HomeScreen from './HomeScreen';
import { NavigationProvider } from '../app/navigationContext';
import type { Navigate } from '../app/useHashRoute';
import { db } from '../data';

// HomeScreen talks to the singleton database; start each test from empty.
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

function renderScreen(navigate: Navigate = () => {}) {
  return render(
    <NavigationProvider value={navigate}>
      <HomeScreen />
    </NavigationProvider>,
  );
}

async function seedFarm(): Promise<void> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
  await db.enterprises.add({ id: 'lv', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'livestock', name: 'Herd' });
  await db.enterprises.add({ id: 'cr', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'crop', name: 'Block' });
  await db.livestock.add({ id: 'a1', createdAt: 1, updatedAt: 1, enterpriseId: 'lv', name: 'Cow 1', species: 'Cattle', count: 1 });
  await db.fields.add({ id: 'fld1', createdAt: 1, updatedAt: 1, enterpriseId: 'cr', name: 'Field 1', cropType: 'Maize' });
}

const DAY = 86_400_000;

describe('HomeScreen', () => {
  it('directs the farmer to Settings when no farm exists', async () => {
    const navigate = vi.fn();
    renderScreen(navigate);

    const button = await screen.findByRole('button', { name: 'Set up your farm' });
    expect(
      screen.getByText('No activity yet. Set up your farm to start logging.'),
    ).toBeInTheDocument();
    button.click();
    expect(navigate).toHaveBeenCalledWith('settings');
  });

  it('shows a log-something prompt when a farm exists but nothing is logged', async () => {
    await seedFarm();
    renderScreen();

    expect(
      await screen.findByText(
        'No activity yet. Log an event, activity, task, or cost and it will show up here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set up your farm' })).not.toBeInTheDocument();
  });

  it('lists mixed entry types newest first, capped at five', async () => {
    await seedFarm();
    // Six entries across all modules with increasing dates; the oldest must drop.
    await db.transactions.add({ id: 't1', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'sale', amount: 1000, date: 6 * DAY });
    await db.tasks.add({ id: 'k1', createdAt: 5 * DAY, updatedAt: 5 * DAY, farmId: 'f1', title: 'Fix the gate', status: 'open' });
    await db.events.add({ id: 'ev1', createdAt: 1, updatedAt: 1, livestockId: 'a1', date: 4 * DAY, type: 'health', note: 'Vaccinated' });
    await db.activities.add({ id: 'ac1', createdAt: 1, updatedAt: 1, fieldId: 'fld1', date: 3 * DAY, type: 'planting', note: 'Sowed maize' });
    await db.transactions.add({ id: 't2', createdAt: 1, updatedAt: 1, farmId: 'f1', type: 'cost', amount: 200, date: 2 * DAY });
    await db.events.add({ id: 'ev2', createdAt: 1, updatedAt: 1, livestockId: 'a1', date: 1 * DAY, type: 'movement', note: 'oldest — should drop' });

    renderScreen();

    const list = await screen.findByRole('list', { name: 'Recent activity' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    const names = rows.map((row) => row.querySelector('.record-row__name')?.textContent);
    expect(names).toEqual([
      'Sale · 1,000',
      'Fix the gate',
      'Health event',
      'Planting activity',
      'Cost · 200',
    ]);
    // The sixth, oldest entry is not shown.
    expect(within(list).queryByText(/oldest — should drop/)).not.toBeInTheDocument();
  });
});
