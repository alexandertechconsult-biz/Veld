import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { APP_NAME } from './appInfo';

// Smoke test that the React + TypeScript + jsdom toolchain renders the app shell.
describe('App', () => {
  it('renders the app name as the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(APP_NAME);
  });
});
