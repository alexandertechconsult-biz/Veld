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

/** The fields a caller supplies to log an activity. */
export interface NewActivity {
  fieldId: ID;
  /** Epoch milliseconds the activity happened. */
  date: number;
  type: ActivityType;
  note: string;
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
