import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ActivityHistory from './ActivityHistory';
import type { Activity } from '../data';

/** An activity with sensible defaults, overridable per test. */
function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'ac1',
    createdAt: 1,
    updatedAt: 1,
    fieldId: 'field1',
    date: Date.parse('2026-09-08'),
    type: 'planting',
    note: 'Planted maize',
    ...overrides,
  };
}

describe('ActivityHistory', () => {
  it('tells the farmer when no activities have been logged yet', () => {
    render(<ActivityHistory fieldName="North field" activities={[]} />);
    expect(screen.getByText('No activities logged yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders each activity with its type label and note', () => {
    render(
      <ActivityHistory
        fieldName="North field"
        activities={[makeActivity({ id: 'ac1', type: 'harvest', note: 'Harvested 40 bags' })]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Activity history for North field' });
    expect(list).toHaveTextContent('Harvest');
    expect(list).toHaveTextContent('Harvested 40 bags');
  });

  it('preserves the order it is given (data layer sorts most recent first)', () => {
    // The caller passes activities already ordered most-recent-first; the
    // component must render them in that same order without reshuffling.
    const activities = [
      makeActivity({ id: 'ac-new', date: Date.parse('2026-09-08'), note: 'Newest' }),
      makeActivity({ id: 'ac-old', date: Date.parse('2026-01-01'), note: 'Oldest' }),
    ];
    render(<ActivityHistory fieldName="North field" activities={activities} />);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Newest');
    expect(rows[1]).toHaveTextContent('Oldest');
  });
});
