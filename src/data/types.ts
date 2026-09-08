// Core entities for the Veld data model (see BACKLOG.md Section 6). Designed
// generic from day one so the same shapes serve a livestock-only or crops-only
// farmer later without rework.

/** Every stored record is keyed by a string UUID. */
export type ID = string;

/**
 * Fields every entity carries. `createdAt`/`updatedAt` are epoch milliseconds,
 * set by the repository layer — callers never write them by hand.
 */
export interface Entity {
  id: ID;
  createdAt: number;
  updatedAt: number;
}

export type EnterpriseType = 'livestock' | 'crop';

export interface Farm extends Entity {
  name: string;
}

export interface Enterprise extends Entity {
  farmId: ID;
  type: EnterpriseType;
  name: string;
}

/**
 * One record type for animals, carrying a `count` (see Section 9). `count === 1`
 * is an individual with a tag; `count > 1` is a batch or group.
 */
export interface LivestockRecord extends Entity {
  enterpriseId: ID;
  /** Name or tag ID. */
  name: string;
  species: string;
  count: number;
  notes?: string;
}

export interface Field extends Entity {
  enterpriseId: ID;
  name: string;
  cropType: string;
  /** Free-text size (e.g. "12 ha") — optional per the spec. */
  size?: string;
  notes?: string;
}

export type EventType = 'health' | 'movement' | 'weight' | 'other';

/** A dated log entry against a livestock record. */
export interface Event extends Entity {
  livestockId: ID;
  /** Epoch milliseconds the event happened, distinct from createdAt. */
  date: number;
  type: EventType;
  note: string;
}

export type ActivityType = 'planting' | 'input' | 'harvest' | 'other';

/** A dated log entry against a field/block. */
export interface Activity extends Entity {
  fieldId: ID;
  date: number;
  type: ActivityType;
  note: string;
}

export type TaskStatus = 'open' | 'done';

export interface Task extends Entity {
  farmId: ID;
  title: string;
  /** Optional link to an enterprise or a specific field/animal group. */
  enterpriseId?: ID;
  fieldId?: ID;
  livestockId?: ID;
  /** Free text for MVP — no user accounts yet. */
  assignee?: string;
  /** Epoch milliseconds, optional. */
  dueDate?: number;
  status: TaskStatus;
}

export type TransactionType = 'cost' | 'sale';

export interface Transaction extends Entity {
  farmId: ID;
  /** Optional — a null enterprise link means farm-level overhead. */
  enterpriseId?: ID;
  type: TransactionType;
  amount: number;
  date: number;
  note?: string;
}
