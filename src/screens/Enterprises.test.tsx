import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Enterprises from './Enterprises';
import { db } from '../data';

// Enterprises talks to the singleton database; start each test from empty, with
// a farm present since an enterprise belongs to a farm.
beforeEach(async () => {
  await db.enterprises.clear();
  await db.farms.clear();
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
});

describe('Enterprises', () => {
  it('shows an empty prompt before anything is added', async () => {
    render(<Enterprises />);
    expect(await screen.findByText('No enterprises yet. Add your first below.')).toBeInTheDocument();
  });

  it('adds an enterprise, lists it, and clears the name field', async () => {
    render(<Enterprises />);

    const button = await screen.findByRole('button', { name: 'Add enterprise' });
    fireEvent.change(screen.getByTestId('enterprise-name-input'), {
      target: { value: 'Beef herd' },
    });
    fireEvent.change(screen.getByTestId('enterprise-type-select'), {
      target: { value: 'livestock' },
    });
    fireEvent.click(button);

    await screen.findByText('Enterprise added.');
    const list = await screen.findByRole('list', { name: 'Enterprises' });
    expect(list).toHaveTextContent('Beef herd');
    expect(list).toHaveTextContent('Livestock');
    // Field clears so the farmer can add another.
    await waitFor(() =>
      expect(screen.getByTestId('enterprise-name-input')).toHaveValue(''),
    );
    expect(await db.enterprises.toArray()).toHaveLength(1);
  });

  it('adds a second enterprise of a different type', async () => {
    render(<Enterprises />);

    fireEvent.change(await screen.findByTestId('enterprise-name-input'), {
      target: { value: 'Beef herd' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add enterprise' }));
    await screen.findByText('Enterprise added.');

    fireEvent.change(screen.getByTestId('enterprise-name-input'), {
      target: { value: 'Maize block' },
    });
    fireEvent.change(screen.getByTestId('enterprise-type-select'), {
      target: { value: 'crop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add enterprise' }));

    await waitFor(async () => expect(await db.enterprises.toArray()).toHaveLength(2));
    const list = screen.getByRole('list', { name: 'Enterprises' });
    expect(list).toHaveTextContent('Maize block');
    expect(list).toHaveTextContent('Crop');
  });

  it('disables the submit button while the name is blank', async () => {
    render(<Enterprises />);
    expect(await screen.findByRole('button', { name: 'Add enterprise' })).toBeDisabled();
  });
});
