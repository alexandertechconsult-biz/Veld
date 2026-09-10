// Recent-activity feed for the Home screen (E7-01). Pure of any DOM or
// singleton, like the other data modules: the repositories are injected, so
// this is unit-testable against a fresh database and reused by the
// `useRecentActivity` hook at the composition root.
//
// The feed mixes the four loggable entry types across the whole farm —
// livestock events, crop activities, tasks and transactions — and returns the
// most recent handful, most recent first (BACKLOG.md Section 8.2). Events,
// activities and transactions order by their own farm date (the date the thing
// happened, matching each module's own list ordering); a task has no such date,
// so it orders by when it was created. Reads only — no writes anywhere here.

import type { Repositories } from './index';
import type { Activity, Event, Task, Transaction } from './types';
import { listLivestock } from './livestock';
import { listFields } from './fields';
import { listTasks } from './tasks';
import { listTransactions } from './transactions';

/** How many entries the Home feed shows by default (Section 8.2: last five). */
export const RECENT_ACTIVITY_LIMIT = 5;

/**
 * One entry in the mixed feed. A discriminated union so the presentation layer
 * can render each kind its own way; `timestamp` is the epoch-ms the entry is
 * ordered by, carried alongside the source record.
 */
export type ActivityEntry =
  | { kind: 'event'; timestamp: number; record: Event }
  | { kind: 'activity'; timestamp: number; record: Activity }
  | { kind: 'task'; timestamp: number; record: Task }
  | { kind: 'transaction'; timestamp: number; record: Transaction };

/**
 * The most recent `limit` entries across all four modules, most recent first.
 * Ties on timestamp fall back to creation order so the feed is deterministic.
 * Empty when nothing has been logged (or no farm exists yet — the underlying
 * list functions already return empty in that case).
 */
export async function listRecentActivity(
  repos: Repositories,
  limit: number = RECENT_ACTIVITY_LIMIT,
): Promise<ActivityEntry[]> {
  const [animals, fields, tasks, transactions] = await Promise.all([
    listLivestock(repos),
    listFields(repos),
    listTasks(repos),
    listTransactions(repos),
  ]);

  // Events and activities live under animals/fields, so gather them per parent
  // the same way the module list screens do, keeping the feed farm-scoped.
  const [eventLists, activityLists] = await Promise.all([
    Promise.all(animals.map((animal) => repos.events.listByLivestock(animal.id))),
    Promise.all(fields.map((field) => repos.activities.listByField(field.id))),
  ]);

  const entries: ActivityEntry[] = [
    ...eventLists.flat().map((record): ActivityEntry => ({ kind: 'event', timestamp: record.date, record })),
    ...activityLists.flat().map((record): ActivityEntry => ({ kind: 'activity', timestamp: record.date, record })),
    ...tasks.map((record): ActivityEntry => ({ kind: 'task', timestamp: record.createdAt, record })),
    ...transactions.map((record): ActivityEntry => ({ kind: 'transaction', timestamp: record.date, record })),
  ];

  entries.sort((a, b) => b.timestamp - a.timestamp || b.record.createdAt - a.record.createdAt);
  return entries.slice(0, Math.max(0, limit));
}
