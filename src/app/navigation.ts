import { Home, Beef, Sprout, ListTodo, Menu, Wallet, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Navigation model. Kept as pure data (no React, no screens) so the router and
 * both nav surfaces read from one place, and so it is trivially unit-testable.
 */

export const ROUTE_IDS = [
  'home',
  'livestock',
  'crops',
  'tasks',
  'more',
  'financials',
  'settings',
] as const;

export type RouteId = (typeof ROUTE_IDS)[number];

export const DEFAULT_ROUTE: RouteId = 'home';

export interface Destination {
  id: RouteId;
  label: string;
  icon: LucideIcon;
}

/** The five fixed destinations shown in the tab bar and sidebar (Section 8.1). */
export const PRIMARY_DESTINATIONS: readonly Destination[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'livestock', label: 'Livestock', icon: Beef },
  { id: 'crops', label: 'Crops', icon: Sprout },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'more', label: 'More', icon: Menu },
];

/** Reached via the More menu, not the primary nav. */
export const SECONDARY_DESTINATIONS: readonly Destination[] = [
  { id: 'financials', label: 'Financials', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ALL_DESTINATIONS: readonly Destination[] = [
  ...PRIMARY_DESTINATIONS,
  ...SECONDARY_DESTINATIONS,
];

/** Which primary tab is highlighted for a given route (secondary routes → More). */
export const PRIMARY_FOR_ROUTE: Record<RouteId, RouteId> = {
  home: 'home',
  livestock: 'livestock',
  crops: 'crops',
  tasks: 'tasks',
  more: 'more',
  financials: 'more',
  settings: 'more',
};

export function destinationFor(id: RouteId): Destination {
  const match = ALL_DESTINATIONS.find((d) => d.id === id);
  if (!match) {
    throw new Error(`No destination configured for route "${id}"`);
  }
  return match;
}
