// Presentation mapping for the Home feed (E7-01): turn a domain ActivityEntry
// into the icon, primary line and meta line a row shows. Kept out of the screen
// component so it is a pure, testable function with one job. Type labels come
// from each module's single source, so labels never drift.

import { Beef, Sprout, ListChecks, Wallet, type LucideIcon } from 'lucide-react';
import type { ActivityEntry } from '../data/recentActivity';
import { EVENT_TYPES } from '../data/events';
import { ACTIVITY_TYPES } from '../data/activities';
import { TRANSACTION_TYPES } from '../data/transactions';

export interface EntryView {
  icon: LucideIcon;
  /** The primary line — what happened. */
  name: string;
  /** The muted second line — date and any detail. */
  meta: string;
}

function labelFrom(
  types: readonly { value: string; label: string }[],
  value: string,
): string {
  return types.find((entry) => entry.value === value)?.label ?? value;
}

function humanDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/** Joins the non-empty parts of a meta line with a middot separator. */
function metaLine(...parts: (string | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

/** Everything a Home feed row needs to render one entry. */
export function describeEntry(entry: ActivityEntry): EntryView {
  switch (entry.kind) {
    case 'event':
      return {
        icon: Beef,
        name: `${labelFrom(EVENT_TYPES, entry.record.type)} event`,
        meta: metaLine(humanDate(entry.timestamp), entry.record.note),
      };
    case 'activity':
      return {
        icon: Sprout,
        name: `${labelFrom(ACTIVITY_TYPES, entry.record.type)} activity`,
        meta: metaLine(humanDate(entry.timestamp), entry.record.note),
      };
    case 'task':
      return {
        icon: ListChecks,
        name: entry.record.title,
        meta: metaLine('Task', entry.record.status === 'done' ? 'Done' : undefined, humanDate(entry.timestamp)),
      };
    case 'transaction':
      return {
        icon: Wallet,
        name: `${labelFrom(TRANSACTION_TYPES, entry.record.type)} · ${entry.record.amount.toLocaleString()}`,
        meta: metaLine(humanDate(entry.timestamp), entry.record.note),
      };
  }
}
