// Manual backup: export every entity to one file, import it back into an empty
// install. This is the mitigation for having no server (BACKLOG.md Section 9) —
// if the phone is lost, the farmer still has a file. Import is destructive by
// design (it replaces what's there); the confirmation gate is E6-06.

import type { VeldDatabase } from './db';
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

/** Identifies a file as ours and pins the shape we know how to read. */
export const BACKUP_FORMAT = 'veld-backup';
export const BACKUP_VERSION = 1;

/** One array per table, keyed by the table name, so a table can never be
 *  silently dropped from a backup without failing the compiler. */
export interface BackupData {
  farms: Farm[];
  enterprises: Enterprise[];
  livestock: LivestockRecord[];
  fields: Field[];
  events: Event[];
  activities: Activity[];
  tasks: Task[];
  transactions: Transaction[];
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  data: BackupData;
}

/** The tables a backup covers, in a stable order. Kept as one list so export,
 *  import and validation can never drift apart. */
export const BACKUP_TABLES = [
  'farms',
  'enterprises',
  'livestock',
  'fields',
  'events',
  'activities',
  'tasks',
  'transactions',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Reads every table into a single serialisable object. `exportedAt` is passed
 *  in rather than read from the clock so the caller owns time (and tests are
 *  deterministic). Runs in one read transaction for a consistent snapshot. */
export async function exportData(db: VeldDatabase, exportedAt: number): Promise<Backup> {
  const data = await db.transaction('r', db.tables, async () => ({
    farms: await db.farms.toArray(),
    enterprises: await db.enterprises.toArray(),
    livestock: await db.livestock.toArray(),
    fields: await db.fields.toArray(),
    events: await db.events.toArray(),
    activities: await db.activities.toArray(),
    tasks: await db.tasks.toArray(),
    transactions: await db.transactions.toArray(),
  }));

  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data };
}

/** Total records across a backup — used for user-facing confirmation copy. */
export function countRecords(data: BackupData): number {
  return BACKUP_TABLES.reduce((total, table) => total + data[table].length, 0);
}

/** Pretty JSON so a farmer opening the file sees something legible, not one line. */
export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** Suggested download name, dated so successive backups don't clobber each other. */
export function backupFilename(exportedAt: number): string {
  const date = new Date(exportedAt).toISOString().slice(0, 10);
  return `veld-backup-${date}.json`;
}

/** Thrown when a file isn't a backup we can safely import. The message is shown
 *  to the user, so it says what's wrong in plain terms. */
export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

function isRecordArray(value: unknown): value is Array<{ id: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { id?: unknown }).id === 'string',
    )
  );
}

/** Parses and fully validates untrusted file text before any write happens, so a
 *  malformed or foreign file is rejected without ever touching the database. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new InvalidBackupError('That file is not valid JSON.');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidBackupError('That file is not a Veld backup.');
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.format !== BACKUP_FORMAT) {
    throw new InvalidBackupError('That file is not a Veld backup.');
  }

  if (candidate.version !== BACKUP_VERSION) {
    throw new InvalidBackupError(
      `This backup is version ${String(candidate.version)}, but this app reads version ${BACKUP_VERSION}.`,
    );
  }

  const data = candidate.data;
  if (typeof data !== 'object' || data === null) {
    throw new InvalidBackupError('This backup has no data.');
  }

  const dataRecord = data as Record<string, unknown>;
  for (const table of BACKUP_TABLES) {
    if (!isRecordArray(dataRecord[table])) {
      throw new InvalidBackupError(`This backup is missing or has invalid "${table}" records.`);
    }
  }

  return candidate as unknown as Backup;
}

/** Restores a validated backup, replacing whatever is present. Clear-then-insert
 *  runs in one write transaction so a failure can't leave a half-imported store.
 *  Returns the number of records written. */
export async function importData(db: VeldDatabase, backup: Backup): Promise<number> {
  const { data } = backup;
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.farms.bulkAdd(data.farms);
    await db.enterprises.bulkAdd(data.enterprises);
    await db.livestock.bulkAdd(data.livestock);
    await db.fields.bulkAdd(data.fields);
    await db.events.bulkAdd(data.events);
    await db.activities.bulkAdd(data.activities);
    await db.tasks.bulkAdd(data.tasks);
    await db.transactions.bulkAdd(data.transactions);
  });
  return countRecords(data);
}
