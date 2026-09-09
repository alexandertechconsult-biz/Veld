import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyActivityNoteError,
  InvalidActivityDateError,
  InvalidActivityTypeError,
  NoFieldError,
  addActivity,
  listActivitiesFor,
} from './activities';
import { addField } from './fields';
import { addEnterprise } from './enterprises';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';
import type { ActivityType, ID } from './types';

let ctx: TestContext;

beforeEach(async () => {
  ctx = freshContext();
  await saveFarmProfile(ctx.repos, 'Rooikraal');
});

afterEach(async () => {
  await ctx.dispose();
});

/** Seed a farm with a crop enterprise and one field, returning its id. */
async function seedField(): Promise<ID> {
  const block = await addEnterprise(ctx.repos, 'Maize block', 'crop');
  const field = await addField(ctx.repos, {
    enterpriseId: block.id,
    name: 'North field',
    cropType: 'Maize',
  });
  return field.id;
}

describe('addActivity', () => {
  it('logs an activity against a field with date, type and note', async () => {
    const fieldId = await seedField();
    const date = Date.UTC(2026, 8, 8);
    const activity = await addActivity(ctx.repos, {
      fieldId,
      date,
      type: 'planting',
      note: 'Planted maize',
    });

    expect(activity.fieldId).toBe(fieldId);
    expect(activity.date).toBe(date);
    expect(activity.type).toBe('planting');
    expect(activity.note).toBe('Planted maize');
  });

  it('accepts each of the four activity types', async () => {
    const fieldId = await seedField();
    const types: ActivityType[] = ['planting', 'input', 'harvest', 'other'];
    for (const type of types) {
      const activity = await addActivity(ctx.repos, {
        fieldId,
        date: Date.UTC(2026, 8, 8),
        type,
        note: `A ${type} activity`,
      });
      expect(activity.type).toBe(type);
    }
    expect(await listActivitiesFor(ctx.repos, fieldId)).toHaveLength(types.length);
  });

  it('trims the note before saving', async () => {
    const fieldId = await seedField();
    const activity = await addActivity(ctx.repos, {
      fieldId,
      date: Date.UTC(2026, 8, 8),
      type: 'input',
      note: '  Sprayed herbicide  ',
    });
    expect(activity.note).toBe('Sprayed herbicide');
  });

  it('rejects a blank note without writing', async () => {
    const fieldId = await seedField();
    await expect(
      addActivity(ctx.repos, { fieldId, date: Date.UTC(2026, 8, 8), type: 'planting', note: '   ' }),
    ).rejects.toBeInstanceOf(EmptyActivityNoteError);
    expect(await listActivitiesFor(ctx.repos, fieldId)).toHaveLength(0);
  });

  it('rejects a non-finite date without writing', async () => {
    const fieldId = await seedField();
    await expect(
      addActivity(ctx.repos, { fieldId, date: Number.NaN, type: 'planting', note: 'Planted' }),
    ).rejects.toBeInstanceOf(InvalidActivityDateError);
    expect(await listActivitiesFor(ctx.repos, fieldId)).toHaveLength(0);
  });

  it('rejects an unknown type without writing', async () => {
    const fieldId = await seedField();
    await expect(
      addActivity(ctx.repos, {
        fieldId,
        date: Date.UTC(2026, 8, 8),
        type: 'bogus' as ActivityType,
        note: 'Planted',
      }),
    ).rejects.toBeInstanceOf(InvalidActivityTypeError);
    expect(await listActivitiesFor(ctx.repos, fieldId)).toHaveLength(0);
  });

  it('refuses to log against a missing field', async () => {
    await expect(
      addActivity(ctx.repos, { fieldId: 'nope', date: Date.UTC(2026, 8, 8), type: 'planting', note: 'x' }),
    ).rejects.toBeInstanceOf(NoFieldError);
  });
});

describe('listActivitiesFor', () => {
  it('returns an empty list when none are logged', async () => {
    const fieldId = await seedField();
    expect(await listActivitiesFor(ctx.repos, fieldId)).toEqual([]);
  });

  it('returns activities for one field only, most recent first', async () => {
    const fieldId = await seedField();
    const other = await seedField();

    await addActivity(ctx.repos, {
      fieldId,
      date: Date.UTC(2026, 8, 1),
      type: 'planting',
      note: 'Older',
    });
    await addActivity(ctx.repos, {
      fieldId,
      date: Date.UTC(2026, 8, 8),
      type: 'input',
      note: 'Newer',
    });
    await addActivity(ctx.repos, {
      fieldId: other,
      date: Date.UTC(2026, 8, 5),
      type: 'harvest',
      note: 'Other field',
    });

    const activities = await listActivitiesFor(ctx.repos, fieldId);
    expect(activities.map((a) => a.note)).toEqual(['Newer', 'Older']);
  });

  it('persists a logged activity across a close and reopen', async () => {
    const fieldId = await seedField();
    await addActivity(ctx.repos, {
      fieldId,
      date: Date.UTC(2026, 8, 8),
      type: 'planting',
      note: 'Planted maize',
    });

    ctx.db.close();
    await ctx.db.open();

    const activities = await listActivitiesFor(ctx.repos, fieldId);
    expect(activities).toHaveLength(1);
    expect(activities[0].note).toBe('Planted maize');
  });
});
