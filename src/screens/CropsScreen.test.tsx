import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
