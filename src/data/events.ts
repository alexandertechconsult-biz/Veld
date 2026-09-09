// Livestock event domain logic (E2-02). Pure of any DOM or singleton, like
// livestock/enterprises/farmProfile: the repositories are injected, so this is
// unit-testable against a fresh database and reused by the `useLivestock` hook
// at the composition root.
//
// An event is a dated log entry against ONE animal or group (BACKLOG.md
// Section 6): date, type (health / movement / weight / other) and a note. It is
// written straight to IndexedDB through the events repository — there is no
// network call anywhere in this path.

import type { Repositories } from './index';
import type { Event, EventType, ID } from './types';

/** The event types a farmer can log, with the label the picker shows. This is
 *  the single source for the set, so the UI never re-declares it. */
export const EVENT_TYPES: readonly { value: EventType; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'movement', label: 'Movement' },
  { value: 'weight', label: 'Weight' },
  { value: 'other', label: 'Other' },
] as const;

/** Raised when an event is logged with a blank note, so the UI can prompt. */
export class EmptyEventNoteError extends Error {
  constructor() {
    super('Enter a note describing the event.');
    this.name = 'EmptyEventNoteError';
  }
}

/** Raised when the event date is missing or not a real point in time. */
export class InvalidEventDateError extends Error {
  constructor() {
    super('Choose a valid date for the event.');
    this.name = 'InvalidEventDateError';
  }
}

/** Raised when the event type is not one of the four known types. */
export class InvalidEventTypeError extends Error {
  constructor() {
    super('Choose a valid event type.');
    this.name = 'InvalidEventTypeError';
  }
}

/** Raised when logging against an animal/group that does not exist. */
export class NoLivestockRecordError extends Error {
  constructor() {
    super('Register the animal or group before logging an event against it.');
    this.name = 'NoLivestockRecordError';
  }
}

/** The fields a caller supplies to log an event. */
export interface NewEvent {
  livestockId: ID;
  /** Epoch milliseconds the event happened. */
  date: number;
  type: EventType;
  note: string;
}

const KNOWN_TYPES: readonly EventType[] = EVENT_TYPES.map((entry) => entry.value);

/**
 * Every event logged against one animal or group, most recent first (the events
 * repository orders by `date`). Empty when none.
 */
export function listEventsFor(repos: Repositories, livestockId: ID): Promise<Event[]> {
  return repos.events.listByLivestock(livestockId);
}

/**
 * Logs an event against an animal or group. Trims the note and rejects a blank
 * one without writing; requires a real date and a known type; requires the
 * target animal/group to exist. Persists through the events repository, i.e.
 * straight to IndexedDB with no network call.
 */
export async function addEvent(repos: Repositories, input: NewEvent): Promise<Event> {
  const note = input.note.trim();
  if (!note) {
    throw new EmptyEventNoteError();
  }
  if (!Number.isFinite(input.date)) {
    throw new InvalidEventDateError();
  }
  if (!KNOWN_TYPES.includes(input.type)) {
    throw new InvalidEventTypeError();
  }
  const animal = await repos.livestock.get(input.livestockId);
  if (!animal) {
    throw new NoLivestockRecordError();
  }
  return repos.events.create({
    livestockId: input.livestockId,
    date: input.date,
    type: input.type,
    note,
  });
}
