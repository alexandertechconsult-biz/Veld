// Field activity domain logic (E3-02). Pure of any DOM or singleton, like
// events/fields/livestock: the repositories are injected, so this is
// unit-testable against a fresh database and reused by the `useFields` hook at
// the composition root.
//
// An activity is a dated log entry against ONE field or block (BACKLOG.md
// Section 6): date, type (planting / input / harvest / other) and a note. It is
// written straight to IndexedDB through the activities repository — there is no
// network call anywhere in this path. History (E3-03) and edit/delete (E3-05)
// are separate tickets.

import type { Repositories } from './index';
import type { Activity, ActivityType, ID } from './types';

/** The activity types a farmer can log, with the label the picker shows. This
 *  is the single source for the set, so the UI never re-declares it. */
export const ACTIVITY_TYPES: readonly { value: ActivityType; label: string }[] = [
  { value: 'planting', label: 'Planting' },
  { value: 'input', label: 'Input' },
  { value: 'harvest', label: 'Harvest' },
  { value: 'other', label: 'Other' },
] as const;

/** Raised when an activity is logged with a blank note, so the UI can prompt. */
export class EmptyActivityNoteError extends Error {
  constructor() {
    super('Enter a note describing the activity.');
    this.name = 'EmptyActivityNoteError';
  }
}

/** Raised when the activity date is missing or not a real point in time. */
export class InvalidActivityDateError extends Error {
  constructor() {
    super('Choose a valid date for the activity.');
    this.name = 'InvalidActivityDateError';
  }
}

/** Raised when the activity type is not one of the four known types. */
export class InvalidActivityTypeError extends Error {
  constructor() {
    super('Choose a valid activity type.');
    this.name = 'InvalidActivityTypeError';
  }
}

/** Raised when logging against a field/block that does not exist. */
export class NoFieldError extends Error {
  constructor() {
    super('Register the field before logging an activity against it.');
    this.name = 'NoFieldError';
  }
}

/** Raised when editing or deleting an activity that no longer exists (E3-05). */
export class ActivityNotFoundError extends Error {
  constructor() {
    super('That activity no longer exists.');
    this.name = 'ActivityNotFoundError';
  }
}

/** The fields a caller supplies to log an activity. */
export interface NewActivity {
  fieldId: ID;
  /** Epoch milliseconds the activity happened. */
  date: number;
  type: ActivityType;
  note: string;
}

/**
 * A correction to an existing activity (E3-05): every field is optional. An
 * omitted field is left untouched — in particular an activity keeps its
 * original date unless the date is itself the thing being corrected.
 */
export interface ActivityEdit {
  date?: number;
  type?: ActivityType;
  note?: string;
}

const KNOWN_TYPES: readonly ActivityType[] = ACTIVITY_TYPES.map((entry) => entry.value);

/**
 * Every activity logged against one field or block, most recent first (the
 * activities repository orders by `date`). Empty when none.
 */
export function listActivitiesFor(repos: Repositories, fieldId: ID): Promise<Activity[]> {
  return repos.activities.listByField(fieldId);
}

/**
 * Logs an activity against a field or block. Trims the note and rejects a blank
 * one without writing; requires a real date and a known type; requires the
 * target field to exist. Persists through the activities repository, i.e.
 * straight to IndexedDB with no network call.
 */
export async function addActivity(
  repos: Repositories,
  input: NewActivity,
): Promise<Activity> {
  const note = input.note.trim();
  if (!note) {
    throw new EmptyActivityNoteError();
  }
  if (!Number.isFinite(input.date)) {
    throw new InvalidActivityDateError();
  }
  if (!KNOWN_TYPES.includes(input.type)) {
    throw new InvalidActivityTypeError();
  }
  const field = await repos.fields.get(input.fieldId);
  if (!field) {
    throw new NoFieldError();
  }
  return repos.activities.create({
    fieldId: input.fieldId,
    date: input.date,
    type: input.type,
    note,
  });
}

/**
 * Corrects an existing activity (E3-05). Validates only the fields the caller
 * supplies — trims and rejects a blank note without writing, rejects a
 * non-finite date and an unknown type — and leaves the rest as they were, so
 * the original date survives any edit that does not touch it. Requires the
 * activity to exist.
 */
export async function updateActivity(
  repos: Repositories,
  id: ID,
  changes: ActivityEdit,
): Promise<Activity> {
  const existing = await repos.activities.get(id);
  if (!existing) {
    throw new ActivityNotFoundError();
  }
  const patch: ActivityEdit = {};
  if (changes.note !== undefined) {
    const note = changes.note.trim();
    if (!note) {
      throw new EmptyActivityNoteError();
    }
    patch.note = note;
  }
  if (changes.date !== undefined) {
    if (!Number.isFinite(changes.date)) {
      throw new InvalidActivityDateError();
    }
    patch.date = changes.date;
  }
  if (changes.type !== undefined) {
    if (!KNOWN_TYPES.includes(changes.type)) {
      throw new InvalidActivityTypeError();
    }
    patch.type = changes.type;
  }
  return repos.activities.update(id, patch);
}

/** Removes one activity. Idempotent: deleting a missing one is a no-op (E3-05). */
export async function deleteActivity(repos: Repositories, id: ID): Promise<void> {
  await repos.activities.delete(id);
}
