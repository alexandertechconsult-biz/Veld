import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Farm } from '../data';
import { EmptyFarmNameError, loadCurrentFarm, saveFarmProfile } from '../data/farmProfile';

/** UI state for the farm-profile form: exactly one thing is true at a time, so
 *  the screen can't show a spinner and an error at once. */
export type FarmProfileStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/**
 * Owns the current farm and the save operation, wiring the pure
 * `data/farmProfile` logic to the app-wide repositories. The component stays
 * presentational; all persistence and status live here.
 */
export function useFarmProfile() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [status, setStatus] = useState<FarmProfileStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const current = await loadCurrentFarm(repositories);
        if (!active) return;
        setFarm(current);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({ kind: 'error', message: 'Could not load your farm. Please reload the app.' });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveFarm = useCallback(
    async (name: string) => {
      // Whether this is the first-ever save (create) or a correction (E1-05)
      // decides which confirmation the farmer sees. Read it before the write.
      const correcting = farm !== null;
      setStatus({ kind: 'saving' });
      try {
        const saved = await saveFarmProfile(repositories, name);
        setFarm(saved);
        setStatus({
          kind: 'saved',
          message: correcting ? 'Changes saved.' : 'Farm created.',
        });
      } catch (error) {
        const message =
          error instanceof EmptyFarmNameError
            ? error.message
            : 'Could not save your farm. Please try again.';
        setStatus({ kind: 'error', message });
      }
    },
    [farm],
  );

  return { farm, status, saveFarm };
}
