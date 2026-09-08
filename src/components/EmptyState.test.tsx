import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sprout } from 'lucide-react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('shows the message and fires the action when the button is pressed', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Sprout}
        message="No animals or groups yet."
        action={{ label: 'Set up your farm', onClick }}
      />,
    );

    expect(screen.getByText('No animals or groups yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up your farm' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders without an action when none is given', () => {
    render(<EmptyState icon={Sprout} message="No farm set up yet." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
