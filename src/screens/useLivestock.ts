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
import {
  EmptyEventNoteError,
  InvalidEventDateError,
  InvalidEventTypeError,
  NoLivestockRecordError,
  addEvent,
  listEventsFor,
  type NewEvent,
} from '../data/events';

/** UI state for the livestock module: exactly one thing is true at a time. */
export type LivestockStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** UI state for logging an event: independent of the register-animal status. */
export type EventStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** How many events each animal/group has, keyed by its id. */
export type EventCounts = Readonly<Record<string, number>>;

/** Load the event count for every animal in the list, keyed by id. */
async function loadEventCounts(list: LivestockRecord[]): Promise<EventCounts> {
  const entries = await Promise.all(
    list.map(async (animal) => {
      const events = await listEventsFor(repositories, animal.id);
      return [animal.id, events.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Owns the current farm's livestock enterprises, registered animals and their
 * event counts, plus the register and log-event operations, wiring the pure
 * `data/livestock` and `data/events` logic to the app-wide repositories. The
 * component stays presentational; all persistence lives here.
 */
export function useLivestock() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [animals, setAnimals] = useState<LivestockRecord[]>([]);
  const [eventCounts, setEventCounts] = useState<EventCounts>({});
  const [status, setStatus] = useState<LivestockStatus>({ kind: 'loading' });
  const [eventStatus, setEventStatus] = useState<EventStatus>({ kind: 'idle' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listLivestockEnterprises(repositories),
          listLivestock(repositories),
        ]);
        const counts = await loadEventCounts(list);
        if (!active) return;
        setEnterprises(ents);
        setAnimals(list);
        setEventCounts(counts);
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
      setEventCounts(await loadEventCounts(list));
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

  /** Returns true when the event was logged, so the form can close itself. */
  const logEvent = useCallback(async (input: NewEvent): Promise<boolean> => {
    setEventStatus({ kind: 'saving' });
    try {
      await addEvent(repositories, input);
      const list = await listLivestock(repositories);
      setEventCounts(await loadEventCounts(list));
      setEventStatus({ kind: 'saved' });
      return true;
    } catch (error) {
      const message =
        error instanceof EmptyEventNoteError ||
        error instanceof InvalidEventDateError ||
        error instanceof InvalidEventTypeError ||
        error instanceof NoLivestockRecordError
          ? error.message
          : 'Could not log the event. Please try again.';
      setEventStatus({ kind: 'error', message });
      return false;
    }
  }, []);

  /** Clear any prior event status, so a freshly opened form starts clean. */
  const resetEventStatus = useCallback(() => {
    setEventStatus({ kind: 'idle' });
  }, []);

  return {
    enterprises,
    animals,
    eventCounts,
    status,
    eventStatus,
    registerLivestock: registerOne,
    logEvent,
    resetEventStatus,
  };
}
