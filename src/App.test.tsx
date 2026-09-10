import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { db } from './data';

// App decides between the guided first-run flow and the shell based on whether a
// farm exists on this device; start each test from a known farm state.
beforeEach(async () => {
  window.location.hash = '';
  await Promise.all([db.enterprises.clear(), db.farms.clear()]);
});

describe('App', () => {
  it('runs the guided first-run flow when no farm exists yet (E1-03)', async () => {
    render(<App />);

    // Instead of an empty app, the farmer is walked through setup.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Name your farm');
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('renders the shell on the Home screen once a farm exists', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });

    render(<App />);

    // The shell defaults to Home (empty hash) with its recent-activity feed.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Home');
    expect(
      await screen.findByText(
        'No activity yet. Log an event, activity, task, or cost and it will show up here.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the five primary destinations in the navigation once set up', async () => {
    await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });

    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    // Sidebar and bottom tab bar each render the five, so each label appears twice.
    for (const label of ['Home', 'Livestock', 'Crops', 'Tasks', 'More']) {
      expect(screen.getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
    }
  });
});
