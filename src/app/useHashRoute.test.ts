import { describe, it, expect } from 'vitest';
import { parseHash, routeToHash } from './useHashRoute';

describe('parseHash', () => {
  it('defaults to home for empty or bare hashes', () => {
    expect(parseHash('')).toBe('home');
    expect(parseHash('#')).toBe('home');
    expect(parseHash('#/')).toBe('home');
  });

  it('reads a known route id', () => {
    expect(parseHash('#/livestock')).toBe('livestock');
    expect(parseHash('#/settings')).toBe('settings');
  });

  it('ignores trailing segments and keeps the first', () => {
    expect(parseHash('#/settings/farm/123')).toBe('settings');
  });

  it('falls back to home for an unknown route', () => {
    expect(parseHash('#/nonsense')).toBe('home');
  });
});

describe('routeToHash', () => {
  it('produces the canonical hash and round-trips through parseHash', () => {
    expect(routeToHash('crops')).toBe('#/crops');
    expect(parseHash(routeToHash('tasks'))).toBe('tasks');
  });
});
