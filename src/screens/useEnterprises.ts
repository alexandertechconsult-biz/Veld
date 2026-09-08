import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, EnterpriseType } from '../data';
import {
  EmptyEnterpriseNameError,
  NoFarmYetError,
  addEnterprise,
  listEnterprises,
} from '../data/enterprises';

/** UI state for the enterprises section: exactly one thing is true at a time. */
export type EnterprisesStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/**
 * Owns the current farm's enterprises and the add operation, wiring the pure
 * `data/enterprises` logic to the app-wide repositories. The component stays
 * presentational; all persistence and status live here.
 */
export function useEnterprises() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [status, setStatus] = useState<EnterprisesStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await listEnterprises(repositories);
        if (!active) return;
        setEnterprises(list);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your enterprises. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Returns true when the enterprise was added, so the form can clear itself. */
  const addOne = useCallback(async (name: string, type: EnterpriseType): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await addEnterprise(repositories, name, type);
      const list = await listEnterprises(repositories);
      setEnterprises(list);
      setStatus({ kind: 'saved' });
      return true;
    } catch (error) {
      const message =
        error instanceof EmptyEnterpriseNameError || error instanceof NoFarmYetError
          ? error.message
          : 'Could not add the enterprise. Please try again.';
      setStatus({ kind: 'error', message });
      return false;
    }
  }, []);

  return { enterprises, status, addEnterprise: addOne };
}
