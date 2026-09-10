import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FirstRunFlow from './FirstRunFlow';

/** Renders the flow with stub callbacks; each returns true (saved) by default. */
function renderFlow(
  overrides: Partial<{
    saving: boolean;
    error: string | null;
    onCreateFarm: (name: string) => Promise<boolean>;
    onAddEnterprise: (name: string, type: string) => Promise<boolean>;
    onDone: () => void;
  }> = {},
) {
  const onCreateFarm = overrides.onCreateFarm ?? vi.fn(async () => true);
  const onAddEnterprise = overrides.onAddEnterprise ?? vi.fn(async () => true);
  const onDone = overrides.onDone ?? vi.fn();
  render(
    <FirstRunFlow
      saving={overrides.saving ?? false}
      error={overrides.error ?? null}
      onCreateFarm={onCreateFarm}
      onAddEnterprise={
        onAddEnterprise as (name: string, type: 'livestock' | 'crop') => Promise<boolean>
      }
      onDone={onDone}
    />,
  );
  return { onCreateFarm, onAddEnterprise, onDone };
}

describe('FirstRunFlow', () => {
  it('starts on the farm-name step with the continue action disabled while blank', () => {
    renderFlow();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Name your farm');
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('walks farm name, then first enterprise, then done, then hands off', async () => {
    const { onCreateFarm, onAddEnterprise, onDone } = renderFlow();

    // Step 1 — name the farm and continue.
    fireEvent.change(screen.getByTestId('first-run-farm-input'), {
      target: { value: 'Rooikraal Farm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onCreateFarm).toHaveBeenCalledWith('Rooikraal Farm'));

    // Step 2 — add the first enterprise (a crop this time) and continue.
    await screen.findByText('Add your first enterprise');
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('first-run-enterprise-input'), {
      target: { value: 'Maize block' },
    });
    fireEvent.change(screen.getByTestId('first-run-enterprise-type'), {
      target: { value: 'crop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onAddEnterprise).toHaveBeenCalledWith('Maize block', 'crop'));

    // Step 3 — done, and the start action hands off to the shell.
    await screen.findByText('Setup complete');
    fireEvent.click(screen.getByRole('button', { name: 'Start logging' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stays on the farm step and does not advance when the farm save fails', async () => {
    const onCreateFarm = vi.fn(async () => false);
    const { onAddEnterprise } = renderFlow({ onCreateFarm });

    fireEvent.change(screen.getByTestId('first-run-farm-input'), {
      target: { value: 'Rooikraal Farm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(onCreateFarm).toHaveBeenCalled());
    // Still the farm step; the enterprise step never appears and is never saved.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Name your farm');
    expect(screen.queryByText('Add your first enterprise')).not.toBeInTheDocument();
    expect(onAddEnterprise).not.toHaveBeenCalled();
  });

  it('surfaces an error message from a failed create', () => {
    renderFlow({ error: 'Could not save your farm. Please try again.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not save your farm. Please try again.',
    );
  });

  it('disables inputs and the action while a save is in flight', () => {
    renderFlow({ saving: true });

    expect(screen.getByTestId('first-run-farm-input')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
