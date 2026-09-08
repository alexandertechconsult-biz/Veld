import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshContext, type TestContext } from './testSupport';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  InvalidBackupError,
  backupFilename,
  countRecords,
  exportData,
  importData,
  parseBackup,
  serializeBackup,
} from './backup';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

/** Seeds one record in every table so a backup exercises all entities. */
async function seedEveryEntity(context: TestContext) {
  const farm = await context.repos.farms.create({ name: 'Rooikraal' });
  const livestockEnt = await context.repos.enterprises.create({
    farmId: farm.id,
    type: 'livestock',
    name: 'Sheep',
  });
  const cropEnt = await context.repos.enterprises.create({
    farmId: farm.id,
    type: 'crop',
    name: 'Maize',
  });
  const animal = await context.repos.livestock.create({
    enterpriseId: livestockEnt.id,
    name: 'Ewe 12',
    species: 'sheep',
    count: 1,
  });
  const field = await context.repos.fields.create({
    enterpriseId: cropEnt.id,
    name: 'North block',
    cropType: 'maize',
    size: '12 ha',
  });
  await context.repos.events.create({
    livestockId: animal.id,
    date: 1_700_000_000_000,
    type: 'health',
    note: 'Vaccinated',
  });
  await context.repos.activities.create({
    fieldId: field.id,
    date: 1_700_000_100_000,
    type: 'planting',
    note: 'Planted maize',
  });
  await context.repos.tasks.create({ farmId: farm.id, title: 'Fix fence', status: 'open' });
  await context.repos.transactions.create({
    farmId: farm.id,
    enterpriseId: cropEnt.id,
    type: 'cost',
    amount: 1500,
    date: 1_700_000_200_000,
    note: 'Seed',
  });
}

describe('exportData', () => {
  it('captures every entity with the format header', async () => {
    await seedEveryEntity(ctx);

    const backup = await exportData(ctx.db, 1_700_000_500_000);

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe(1_700_000_500_000);
    expect(backup.data.farms).toHaveLength(1);
    expect(backup.data.enterprises).toHaveLength(2);
    expect(backup.data.livestock).toHaveLength(1);
    expect(backup.data.fields).toHaveLength(1);
    expect(backup.data.events).toHaveLength(1);
    expect(backup.data.activities).toHaveLength(1);
    expect(backup.data.tasks).toHaveLength(1);
    expect(backup.data.transactions).toHaveLength(1);
    expect(countRecords(backup.data)).toBe(9);
  });

  it('exports empty arrays from an empty install', async () => {
    const backup = await exportData(ctx.db, 0);
    expect(countRecords(backup.data)).toBe(0);
  });
});

describe('round trip', () => {
  it('restores an exported file into an empty install byte-for-byte', async () => {
    await seedEveryEntity(ctx);
    const original = await exportData(ctx.db, 1_700_000_500_000);
    const file = serializeBackup(original);

    const target = freshContext();
    try {
      const parsed = parseBackup(file);
      const written = await importData(target.db, parsed);

      const restored = await exportData(target.db, 1_700_000_500_000);
      expect(restored).toEqual(original);
      expect(written).toBe(countRecords(original.data));
    } finally {
      await target.dispose();
    }
  });

  it('replaces existing data rather than merging it', async () => {
    // Target starts with its own unrelated farm that must not survive the import.
    const target = freshContext();
    try {
      await target.repos.farms.create({ name: 'Stale farm' });

      await seedEveryEntity(ctx);
      const backup = await exportData(ctx.db, 1_700_000_500_000);
      await importData(target.db, backup);

      const farms = await target.repos.farms.getAll();
      expect(farms).toHaveLength(1);
      expect(farms[0]?.name).toBe('Rooikraal');
    } finally {
      await target.dispose();
    }
  });
});

describe('backupFilename', () => {
  it('dates the file so successive backups do not clobber', () => {
    expect(backupFilename(1_700_000_500_000)).toBe('veld-backup-2023-11-14.json');
  });
});

describe('parseBackup validation', () => {
  it('rejects non-JSON text', () => {
    expect(() => parseBackup('not json {')).toThrow(InvalidBackupError);
  });

  it('rejects JSON that is not an object', () => {
    expect(() => parseBackup('42')).toThrow(InvalidBackupError);
  });

  it('rejects a file with the wrong format tag', () => {
    const text = JSON.stringify({ format: 'something-else', version: 1, data: {} });
    expect(() => parseBackup(text)).toThrow(/not a Veld backup/);
  });

  it('rejects an unsupported version', () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: 99, data: {} });
    expect(() => parseBackup(text)).toThrow(/version 99/);
  });

  it('rejects a backup missing a table', () => {
    const data = {
      farms: [],
      enterprises: [],
      livestock: [],
      fields: [],
      events: [],
      activities: [],
      tasks: [],
      // transactions omitted
    };
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, data });
    expect(() => parseBackup(text)).toThrow(/transactions/);
  });

  it('rejects a table whose records lack string ids', () => {
    const data = {
      farms: [{ name: 'no id here' }],
      enterprises: [],
      livestock: [],
      fields: [],
      events: [],
      activities: [],
      tasks: [],
      transactions: [],
    };
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, data });
    expect(() => parseBackup(text)).toThrow(/farms/);
  });

  it('accepts a well-formed backup', () => {
    const empty = {
      farms: [],
      enterprises: [],
      livestock: [],
      fields: [],
      events: [],
      activities: [],
      tasks: [],
      transactions: [],
    };
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: 1,
      data: empty,
    });
    expect(() => parseBackup(text)).not.toThrow();
  });

  it('does not touch the database when the file is invalid', async () => {
    await seedEveryEntity(ctx);
    expect(() => parseBackup('garbage')).toThrow(InvalidBackupError);
    // Parsing failed before any write, so existing data is intact.
    const farms = await ctx.repos.farms.getAll();
    expect(farms).toHaveLength(1);
  });
});
