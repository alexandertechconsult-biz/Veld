import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import { loadCurrentFarm } from '../data/farmProfile';
import { listRecentActivity, type ActivityEntry } from '../data/recentActivity';

/** UI state for the Home feed: exactly one thing is true at a time. */
export type HomeStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

/**
 * Owns the Home recent-activity feed, wiring the pure `data/recentActivity`
 * logic to the app-wide repositories. `hasFarm` lets the empty state point the
 * farmer at the right next step (set up a farm vs. log something). The screen
 * stays presentational.
 */
export function useRecentActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [hasFarm, setHasFarm] = useState(false);
  const [status, setStatus] = useState<HomeStatus>({ kind: 'loading' });
  // Bumped to re-run the load — e.g. after the quick-add sheet logs something.
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const farm = await loadCurrentFarm(repositories);
        const feed = await listRecentActivity(repositories);
        if (!active) return;
        setHasFarm(farm !== null);
        setEntries(feed);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your recent activity. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { entries, hasFarm, status, reload };
}
