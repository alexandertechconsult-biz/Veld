import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FarmProfile from './FarmProfile';
import { db } from '../data';

// FarmProfile talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await db.farms.clear();
});

describe('FarmProfile', () => {
  it('creates a farm, confirms "Farm created.", and flips the button to "Save changes"', async () => {
    render(<FarmProfile />);

    const button = await screen.findByRole('button', { name: 'Create farm' });
    fireEvent.change(screen.getByTestId('farm-name-input'), { target: { value: 'Rooikraal' } });
    fireEvent.click(button);

    await screen.findByText('Farm created.');
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(await db.farms.toArray()).toHaveLength(1);
  });

  it('pre-fills the saved farm name on load', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Existing Farm' });

    render(<FarmProfile />);

    const input = await screen.findByTestId('farm-name-input');
    await waitFor(() => expect(input).toHaveValue('Existing Farm'));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('disables the submit button while the name is blank', async () => {
    render(<FarmProfile />);
    expect(await screen.findByRole('button', { name: 'Create farm' })).toBeDisabled();
  });

  // E1-05: correct the farm name from Settings.
  it('corrects an existing farm name, confirms "Changes saved.", and persists it', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Old Name' });

    render(<FarmProfile />);

    const input = await screen.findByTestId('farm-name-input');
    await waitFor(() => expect(input).toHaveValue('Old Name'));

    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // Correction gets its own confirmation, never the create one.
    await screen.findByText('Changes saved.');
    expect(screen.queryByText('Farm created.')).not.toBeInTheDocument();

    // The single root record is renamed in place, not duplicated.
    const farms = await db.farms.toArray();
    expect(farms).toHaveLength(1);
    expect(farms[0]).toMatchObject({ id: 'f1', name: 'New Name' });
  });

  it('offers no way to delete the farm — it is the root record', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Existing Farm' });

    render(<FarmProfile />);
    await screen.findByRole('button', { name: 'Save changes' });

    expect(screen.queryByRole('button', { name: /delete|remove/i })).not.toBeInTheDocument();
  });
});
