import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, Event, ID, LivestockRecord } from '../data';
import {
  EmptyLivestockNameError,
  EmptySpeciesError,
  InvalidCountError,
  LivestockNotFoundError,
  NoLivestockEnterpriseError,
  addLivestock,
  deleteLivestock,
  listLivestock,
  listLivestockEnterprises,
  updateLivestock,
  type LivestockEdit,
  type NewLivestock,
} from '../data/livestock';
import {
  EmptyEventNoteError,
  EventNotFoundError,
  InvalidEventDateError,
  InvalidEventTypeError,
  NoLivestockRecordError,
  addEvent,
  deleteEvent,
  listEventsFor,
  updateEvent,
  type EventEdit,
  type NewEvent,
} from '../data/events';

/** UI state for the livestock module: exactly one thing is true at a time. */
export type LivestockStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/** UI state for logging an event: independent of the register-animal status. */
export type EventStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** Each animal/group's events, most recent first, keyed by its id (E2-03). */
export type EventsByAnimal = Readonly<Record<string, Event[]>>;

/** Load every animal's event history (most recent first), keyed by id. */
async function loadEvents(list: LivestockRecord[]): Promise<EventsByAnimal> {
  const entries = await Promise.all(
    list.map(async (animal) => {
      const events = await listEventsFor(repositories, animal.id);
      return [animal.id, events] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Known domain errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof EmptyLivestockNameError ||
    error instanceof EmptySpeciesError ||
    error instanceof InvalidCountError ||
    error instanceof NoLivestockEnterpriseError ||
    error instanceof LivestockNotFoundError ||
    error instanceof EmptyEventNoteError ||
    error instanceof InvalidEventDateError ||
    error instanceof InvalidEventTypeError ||
    error instanceof NoLivestockRecordError ||
    error instanceof EventNotFoundError
    ? error.message
    : fallback;
}

/**
 * Owns the current farm's livestock enterprises, registered animals and their
 * event history, plus the register, log, edit and delete operations for both
 * animals and events, wiring the pure `data/livestock` and `data/events` logic
 * to the app-wide repositories. The component stays presentational; all
 * persistence lives here.
 */
export function useLivestock() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [animals, setAnimals] = useState<LivestockRecord[]>([]);
  const [eventsByAnimal, setEventsByAnimal] = useState<EventsByAnimal>({});
  const [status, setStatus] = useState<LivestockStatus>({ kind: 'loading' });
  const [eventStatus, setEventStatus] = useState<EventStatus>({ kind: 'idle' });

  /** Re-read the animals and their event history from the database into state. */
  const reload = useCallback(async () => {
    const list = await listLivestock(repositories);
    setAnimals(list);
    setEventsByAnimal(await loadEvents(list));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listLivestockEnterprises(repositories),
          listLivestock(repositories),
        ]);
        const events = await loadEvents(list);
        if (!active) return;
        setEnterprises(ents);
        setAnimals(list);
        setEventsByAnimal(events);
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
  const registerOne = useCallback(
    async (input: NewLivestock): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await addLivestock(repositories, input);
        await reload();
        setStatus({ kind: 'saved', message: 'Animal registered.' });
        return true;
      } catch (error) {
        setStatus({ kind: 'error', message: messageFor(error, 'Could not register the animal. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the edit saved, so the edit form can close itself (E2-06). */
  const editAnimal = useCallback(
    async (id: ID, changes: LivestockEdit): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await updateLivestock(repositories, id, changes);
        await reload();
        setStatus({ kind: 'saved', message: 'Changes saved.' });
        return true;
      } catch (error) {
        setStatus({ kind: 'error', message: messageFor(error, 'Could not update the animal. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the record (and its events) were removed (E2-06). */
  const removeAnimal = useCallback(
    async (id: ID): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await deleteLivestock(repositories, id);
        await reload();
        setStatus({ kind: 'saved', message: 'Animal removed.' });
        return true;
      } catch (error) {
        setStatus({ kind: 'error', message: messageFor(error, 'Could not delete the animal. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the event was logged, so the form can close itself. */
  const logEvent = useCallback(
    async (input: NewEvent): Promise<boolean> => {
      setEventStatus({ kind: 'saving' });
      try {
        await addEvent(repositories, input);
        await reload();
        setEventStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setEventStatus({ kind: 'error', message: messageFor(error, 'Could not log the event. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the event edit saved, so its form can close (E2-06). */
  const editEvent = useCallback(
    async (id: ID, changes: EventEdit): Promise<boolean> => {
      setEventStatus({ kind: 'saving' });
      try {
        await updateEvent(repositories, id, changes);
        await reload();
        setEventStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setEventStatus({ kind: 'error', message: messageFor(error, 'Could not update the event. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the event was removed (E2-06). */
  const removeEvent = useCallback(
    async (id: ID): Promise<boolean> => {
      setEventStatus({ kind: 'saving' });
      try {
        await deleteEvent(repositories, id);
        await reload();
        setEventStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setEventStatus({ kind: 'error', message: messageFor(error, 'Could not delete the event. Please try again.') });
        return false;
      }
    },
    [reload],
  );

  /** Clear any prior event status, so a freshly opened form starts clean. */
  const resetEventStatus = useCallback(() => {
    setEventStatus({ kind: 'idle' });
  }, []);

  return {
    enterprises,
    animals,
    eventsByAnimal,
    status,
    eventStatus,
    registerLivestock: registerOne,
    editAnimal,
    removeAnimal,
    logEvent,
    editEvent,
    removeEvent,
    resetEventStatus,
  };
}
