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

/** Raised when editing or deleting an event that no longer exists (E2-06). */
export class EventNotFoundError extends Error {
  constructor() {
    super('That event no longer exists.');
    this.name = 'EventNotFoundError';
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

/**
 * A correction to an existing event (E2-06): every field is optional. An
 * omitted field is left untouched — in particular an event keeps its original
 * date unless the date is itself the thing being corrected.
 */
export interface EventEdit {
  date?: number;
  type?: EventType;
  note?: string;
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

/**
 * Corrects an existing event (E2-06). Validates only the fields the caller
 * supplies — trims and rejects a blank note without writing, rejects a
 * non-finite date and an unknown type — and leaves the rest as they were, so
 * the original date survives any edit that does not touch it. Requires the
 * event to exist.
 */
export async function updateEvent(
  repos: Repositories,
  id: ID,
  changes: EventEdit,
): Promise<Event> {
  const existing = await repos.events.get(id);
  if (!existing) {
    throw new EventNotFoundError();
  }
  const patch: EventEdit = {};
  if (changes.note !== undefined) {
    const note = changes.note.trim();
    if (!note) {
      throw new EmptyEventNoteError();
    }
    patch.note = note;
  }
  if (changes.date !== undefined) {
    if (!Number.isFinite(changes.date)) {
      throw new InvalidEventDateError();
    }
    patch.date = changes.date;
  }
  if (changes.type !== undefined) {
    if (!KNOWN_TYPES.includes(changes.type)) {
      throw new InvalidEventTypeError();
    }
    patch.type = changes.type;
  }
  return repos.events.update(id, patch);
}

/** Removes one event. Idempotent: deleting a missing event is a no-op (E2-06). */
export async function deleteEvent(repos: Repositories, id: ID): Promise<void> {
  await repos.events.delete(id);
}
