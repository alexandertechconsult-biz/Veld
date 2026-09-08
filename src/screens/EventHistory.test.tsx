import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EventHistory from './EventHistory';
import type { Event } from '../data';

/** An event with sensible defaults, overridable per test. */
function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'ev1',
    createdAt: 1,
    updatedAt: 1,
    livestockId: 'a1',
    date: Date.parse('2026-09-08'),
    type: 'health',
    note: 'Vaccinated',
    ...overrides,
  };
}

describe('EventHistory', () => {
  it('tells the farmer when no events have been logged yet', () => {
    render(<EventHistory animalName="ZA-001" events={[]} />);
    expect(screen.getByText('No events logged yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders each event with its type label and note', () => {
    render(
      <EventHistory
        animalName="ZA-001"
        events={[makeEvent({ id: 'ev1', type: 'movement', note: 'Moved to north camp' })]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Event history for ZA-001' });
    expect(list).toHaveTextContent('Movement');
    expect(list).toHaveTextContent('Moved to north camp');
  });

  it('preserves the order it is given (data layer sorts most recent first)', () => {
    // The caller passes events already ordered most-recent-first; the component
    // must render them in that same order without reshuffling.
    const events = [
      makeEvent({ id: 'ev-new', date: Date.parse('2026-09-08'), note: 'Newest' }),
      makeEvent({ id: 'ev-old', date: Date.parse('2026-01-01'), note: 'Oldest' }),
    ];
    render(<EventHistory animalName="ZA-001" events={events} />);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Newest');
    expect(rows[1]).toHaveTextContent('Oldest');
  });
});
