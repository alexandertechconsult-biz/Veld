import Dexie, { type Table } from 'dexie';
import type {
  Activity,
  Enterprise,
  Event,
  Farm,
  Field,
  LivestockRecord,
  Task,
  Transaction,
} from './types';

/**
 * The single IndexedDB database for the app. Dexie (over IndexedDB) is the
 * decided local store — see BACKLOG.md Section 9 — because it survives close,
 * reopen and device restart with no server. Every table is keyed by `id`;
 * secondary indexes exist only for the foreign keys and dates we query on.
 */
export class VeldDatabase extends Dexie {
  farms!: Table<Farm, string>;
  enterprises!: Table<Enterprise, string>;
  livestock!: Table<LivestockRecord, string>;
  fields!: Table<Field, string>;
  events!: Table<Event, string>;
  activities!: Table<Activity, string>;
  tasks!: Table<Task, string>;
  transactions!: Table<Transaction, string>;

  constructor(name = 'veld') {
    super(name);
    this.version(1).stores({
      farms: 'id',
      enterprises: 'id, farmId',
      livestock: 'id, enterpriseId',
      fields: 'id, enterpriseId',
      events: 'id, livestockId, date',
      activities: 'id, fieldId, date',
      tasks: 'id, farmId, status',
      transactions: 'id, farmId, enterpriseId, date',
    });
  }
}

/** App-wide singleton. Tests construct their own instances for isolation. */
export const db = new VeldDatabase();
