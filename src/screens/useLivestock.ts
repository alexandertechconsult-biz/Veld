import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, LivestockRecord } from '../data';
import {
  EmptyLivestockNameError,
  EmptySpeciesError,
  InvalidCountError,
  NoLivestockEnterpriseError,
  addLivestock,
  listLivestock,
  listLivestockEnterprises,
  type NewLivestock,
} from '../data/livestock';

/** UI state for the livestock module: exactly one thing is true at a time. */
export type LivestockStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/**
 * Owns the current farm's livestock enterprises and registered animals plus the
 * register operation, wiring the pure `data/livestock` logic to the app-wide
 * repositories. The component stays presentational; all persistence lives here.
 */
export function useLivestock() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [animals, setAnimals] = useState<LivestockRecord[]>([]);
  const [status, setStatus] = useState<LivestockStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listLivestockEnterprises(repositories),
          listLivestock(repositories),
        ]);
        if (!active) return;
        setEnterprises(ents);
        setAnimals(list);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your livestock. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Returns true when the animal was registered, so the form can clear itself. */
  const registerOne = useCallback(async (input: NewLivestock): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await addLivestock(repositories, input);
      const list = await listLivestock(repositories);
      setAnimals(list);
      setStatus({ kind: 'saved' });
      return true;
    } catch (error) {
      const message =
        error instanceof EmptyLivestockNameError ||
        error instanceof EmptySpeciesError ||
        error instanceof InvalidCountError ||
        error instanceof NoLivestockEnterpriseError
          ? error.message
          : 'Could not register the animal. Please try again.';
      setStatus({ kind: 'error', message });
      return false;
    }
  }, []);

  return { enterprises, animals, status, registerLivestock: registerOne };
}
