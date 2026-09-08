import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FarmProfile from './FarmProfile';
import { db } from '../data';

// FarmProfile talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await db.farms.clear();
});

describe('FarmProfile', () => {
  it('creates a farm and flips the button to "Save changes"', async () => {
    render(<FarmProfile />);

    const button = await screen.findByRole('button', { name: 'Create farm' });
    fireEvent.change(screen.getByTestId('farm-name-input'), { target: { value: 'Rooikraal' } });
    fireEvent.click(button);

    await screen.findByText('Farm saved.');
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
});
