import { describe, it, expect } from 'vitest';
import {
  PRIMARY_DESTINATIONS,
  SECONDARY_DESTINATIONS,
  PRIMARY_FOR_ROUTE,
  destinationFor,
  type RouteId,
} from './navigation';

describe('navigation model', () => {
  it('exposes the five fixed primary destinations in order (Section 8.1)', () => {
    expect(PRIMARY_DESTINATIONS.map((d) => d.id)).toEqual([
      'home',
      'livestock',
      'crops',
      'tasks',
      'more',
    ]);
  });

  it('puts Financials and Settings behind More', () => {
    expect(SECONDARY_DESTINATIONS.map((d) => d.id)).toEqual(['financials', 'settings']);
  });

  it('highlights the More tab for secondary routes', () => {
    expect(PRIMARY_FOR_ROUTE.financials).toBe('more');
    expect(PRIMARY_FOR_ROUTE.settings).toBe('more');
    expect(PRIMARY_FOR_ROUTE.home).toBe('home');
  });

  it('resolves a destination for every route', () => {
    expect(destinationFor('livestock').label).toBe('Livestock');
    expect(destinationFor('financials').label).toBe('Financials');
  });

  it('throws for an unconfigured route', () => {
    expect(() => destinationFor('ghost' as RouteId)).toThrow();
  });
});
