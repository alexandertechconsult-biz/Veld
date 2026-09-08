import type { Table } from 'dexie';
import type { Entity, ID } from '../types';
import { newId, now } from '../ids';

/** Fields the repository owns and callers must never set themselves. */
type Managed = 'id' | 'createdAt' | 'updatedAt';

/** Shape accepted by `create`: the entity minus its managed fields. */
export type CreateInput<T extends Entity> = Omit<T, Managed>;

/** Shape accepted by `update`: any subset of the caller-owned fields. */
export type UpdateInput<T extends Entity> = Partial<Omit<T, Managed>>;

/** The typed CRUD surface every entity gets. New entities reuse this — they do
 * not re-implement persistence, and no existing branch is edited to add one. */
export interface Repository<T extends Entity> {
  create(input: CreateInput<T>): Promise<T>;
  get(id: ID): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  update(id: ID, changes: UpdateInput<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}

/**
 * Builds a typed repository over one Dexie table. `create` stamps the id and
 * timestamps; `update` reads-then-puts so the returned record is always the
 * persisted one and a missing id fails loudly rather than silently no-op'ing.
 */
export function createRepository<T extends Entity>(table: Table<T, ID>): Repository<T> {
  return {
    async create(input) {
      const timestamp = now();
      const record: T = { ...input, id: newId(), createdAt: timestamp, updatedAt: timestamp } as T;
      await table.add(record);
      return record;
    },

    get(id) {
      return table.get(id);
    },

    getAll() {
      return table.toArray();
    },

    async update(id, changes) {
      const existing = await table.get(id);
      if (!existing) {
        throw new Error(`Cannot update ${table.name}: no record with id ${id}`);
      }
      const record: T = { ...existing, ...changes, updatedAt: now() };
      await table.put(record);
      return record;
    },

    async delete(id) {
      await table.delete(id);
    },
  };
}

/** Returns rows sorted by their `date` field, most recent first. */
export function mostRecentFirst<T extends { date: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.date - a.date);
}
