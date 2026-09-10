import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { EnterpriseType } from '../data';
import { EmptyFarmNameError, loadCurrentFarm, saveFarmProfile } from '../data/farmProfile';
import { EmptyEnterpriseNameError, NoFarmYetError, addEnterprise } from '../data/enterprises';

/** Whether the guided first-run flow is still detecting, needed, or already done. */
export type FirstRunStatus = 'loading' | 'needed' | 'complete';

/**
 * Composition root for the guided first-run flow (E1-03). Detects whether this
 * device has a farm yet — no farm means first launch, so the app walks the
 * farmer through naming their farm and adding a first enterprise before handing
 * off to the shell. Wraps the pure `saveFarmProfile` and `addEnterprise` domain
 * functions so the flow component stays presentational. Create-only: correcting
 * the farm (E1-05) and adding more enterprises (E1-02) live in Settings.
 *
 * The gate is farm-existence alone. If the farmer reloads between step one and
 * step two they land in the shell with a farm but no enterprise yet — not a dead
 * end, since the module empty states route them to Settings. Resuming mid-flow
 * would need a persisted onboarding flag, which the data model (Section 6) does
 * not carry, so it is deliberately out of scope.
 */
export function useFirstRun() {
  const [status, setStatus] = useState<FirstRunStatus>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const farm = await loadCurrentFarm(repositories);
        if (!active) return;
        setStatus(farm ? 'complete' : 'needed');
      } catch {
        // If we can't tell whether a farm exists, don't trap the farmer in
        // onboarding — fall through to the shell, whose screens surface their
        // own load errors.
        if (!active) return;
        setStatus('complete');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Creates the farm from the first step. Returns true so the flow can advance. */
  const createFarm = useCallback(async (name: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await saveFarmProfile(repositories, name);
      return true;
    } catch (err) {
      setError(
        err instanceof EmptyFarmNameError
          ? err.message
          : 'Could not save your farm. Please try again.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  /** Adds the first enterprise from the second step. Returns true to advance. */
  const addFirstEnterprise = useCallback(
    async (name: string, type: EnterpriseType): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await addEnterprise(repositories, name, type);
        return true;
      } catch (err) {
        setError(
          err instanceof EmptyEnterpriseNameError || err instanceof NoFarmYetError
            ? err.message
            : 'Could not add the enterprise. Please try again.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { status, saving, error, createFarm, addFirstEnterprise };
}
