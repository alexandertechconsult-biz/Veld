import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// The shell defaults to Home (empty hash). These assertions prove it mounts with
// navigation and a real screen rather than a blank content area.
describe('App shell', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders the Home screen title and its empty state', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
    // Home now loads its recent-activity feed asynchronously; with no farm it
    // settles on the set-up-your-farm empty state.
    expect(
      await screen.findByText('No activity yet. Set up your farm to start logging.'),
    ).toBeInTheDocument();
  });

  it('renders the five primary destinations in the navigation', () => {
    render(<App />);
    // Sidebar and bottom tab bar each render the five, so each label appears twice.
    for (const label of ['Home', 'Livestock', 'Crops', 'Tasks', 'More']) {
      expect(screen.getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
    }
  });
});
