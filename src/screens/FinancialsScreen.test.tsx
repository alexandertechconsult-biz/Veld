import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialsScreen from './FinancialsScreen';
import { NavigationProvider } from '../app/navigationContext';
import { db } from '../data';

// FinancialsScreen talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await db.transactions.clear();
  await db.enterprises.clear();
  await db.farms.clear();
});

function renderScreen() {
  return render(
    <NavigationProvider value={() => {}}>
      <FinancialsScreen />
    </NavigationProvider>,
  );
}

async function seedFarm(): Promise<void> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
}

/** Seed a farm with one enterprise the link picker can offer. */
async function seedFarmWithEnterprise(): Promise<void> {
  await seedFarm();
  await db.enterprises.add({
    id: 'e1',
    createdAt: 1,
    updatedAt: 1,
    farmId: 'f1',
    type: 'livestock',
    name: 'Beef herd',
  });
}

describe('FinancialsScreen', () => {
  it('directs the farmer to Settings when no farm exists', async () => {
    renderScreen();
    expect(
      await screen.findByText(
        'No farm yet. Set up your farm in Settings, then log your costs and sales.',
      ),
    ).toBeInTheDocument();
  });

  it('logs a cost and lists it, then clears the form', async () => {
    await seedFarm();
    renderScreen();

    const button = await screen.findByRole('button', { name: 'Log transaction' });
    fireEvent.change(screen.getByTestId('transaction-amount-input'), { target: { value: '1500' } });
    fireEvent.click(button);

    await screen.findByText('Transaction logged.');
    const list = await screen.findByRole('list', { name: 'Transactions' });
    expect(list).toHaveTextContent('Cost');
    expect(list).toHaveTextContent('1,500');
    await waitFor(() => expect(screen.getByTestId('transaction-amount-input')).toHaveValue(null));

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: 'cost', amount: 1500 });
  });

  it('disables Log transaction until a positive amount is entered', async () => {
    await seedFarm();
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Log transaction' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('transaction-amount-input'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Log transaction' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('transaction-amount-input'), { target: { value: '250' } });
    expect(screen.getByRole('button', { name: 'Log transaction' })).toBeEnabled();
  });

  it('logs a sale linked to an enterprise with a note', async () => {
    await seedFarmWithEnterprise();
    renderScreen();

    fireEvent.change(await screen.findByTestId('transaction-type-select'), {
      target: { value: 'sale' },
    });
    fireEvent.change(screen.getByTestId('transaction-amount-input'), { target: { value: '42000' } });
    fireEvent.change(screen.getByTestId('transaction-enterprise-select'), {
      target: { value: 'e1' },
    });
    fireEvent.change(screen.getByTestId('transaction-note-input'), {
      target: { value: 'Weaner calves' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log transaction' }));

    await screen.findByText('Transaction logged.');
    const list = await screen.findByRole('list', { name: 'Transactions' });
    expect(list).toHaveTextContent('Sale');
    expect(list).toHaveTextContent('Beef herd');
    expect(list).toHaveTextContent('Weaner calves');

    const stored = await db.transactions.toArray();
    expect(stored[0]).toMatchObject({
      type: 'sale',
      amount: 42000,
      enterpriseId: 'e1',
      note: 'Weaner calves',
    });
  });

  it('omits the enterprise picker when the farm has no enterprises', async () => {
    await seedFarm();
    renderScreen();
    await screen.findByRole('button', { name: 'Log transaction' });
    expect(screen.queryByTestId('transaction-enterprise-select')).not.toBeInTheDocument();
  });
});
