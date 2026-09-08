import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyEventNoteError,
  InvalidEventDateError,
  InvalidEventTypeError,
  NoLivestockRecordError,
  addEvent,
  listEventsFor,
} from './events';
import { addLivestock } from './livestock';
import { addEnterprise } from './enterprises';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';
import type { EventType, ID } from './types';

let ctx: TestContext;

beforeEach(async () => {
  ctx = freshContext();
  await saveFarmProfile(ctx.repos, 'Rooikraal');
});

afterEach(async () => {
  await ctx.dispose();
});

/** Seed a farm with a livestock enterprise and one animal, returning its id. */
async function seedAnimal(): Promise<ID> {
  const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
  const animal = await addLivestock(ctx.repos, {
    enterpriseId: herd.id,
    name: 'ZA-001',
    species: 'Cattle',
    count: 1,
  });
  return animal.id;
}

describe('addEvent', () => {
  it('logs an event against an animal with date, type and note', async () => {
    const livestockId = await seedAnimal();
    const date = Date.UTC(2026, 8, 8);
    const event = await addEvent(ctx.repos, {
      livestockId,
      date,
      type: 'health',
      note: 'Vaccinated for lumpy skin',
    });

    expect(event.livestockId).toBe(livestockId);
    expect(event.date).toBe(date);
    expect(event.type).toBe('health');
    expect(event.note).toBe('Vaccinated for lumpy skin');
  });

  it('accepts each of the four event types', async () => {
    const livestockId = await seedAnimal();
    const types: EventType[] = ['health', 'movement', 'weight', 'other'];
    for (const type of types) {
      const event = await addEvent(ctx.repos, {
        livestockId,
        date: Date.UTC(2026, 8, 8),
        type,
        note: `A ${type} event`,
      });
      expect(event.type).toBe(type);
    }
    expect(await listEventsFor(ctx.repos, livestockId)).toHaveLength(types.length);
  });

  it('trims the note before saving', async () => {
    const livestockId = await seedAnimal();
    const event = await addEvent(ctx.repos, {
      livestockId,
      date: Date.UTC(2026, 8, 8),
      type: 'other',
      note: '  Moved to north camp  ',
    });
    expect(event.note).toBe('Moved to north camp');
  });

  it('rejects a blank note without writing', async () => {
    const livestockId = await seedAnimal();
    await expect(
      addEvent(ctx.repos, { livestockId, date: Date.UTC(2026, 8, 8), type: 'health', note: '   ' }),
    ).rejects.toBeInstanceOf(EmptyEventNoteError);
    expect(await listEventsFor(ctx.repos, livestockId)).toHaveLength(0);
  });

  it('rejects a non-finite date without writing', async () => {
    const livestockId = await seedAnimal();
    await expect(
      addEvent(ctx.repos, { livestockId, date: Number.NaN, type: 'health', note: 'Checked' }),
    ).rejects.toBeInstanceOf(InvalidEventDateError);
    expect(await listEventsFor(ctx.repos, livestockId)).toHaveLength(0);
  });

  it('rejects an unknown type without writing', async () => {
    const livestockId = await seedAnimal();
    await expect(
      addEvent(ctx.repos, {
        livestockId,
        date: Date.UTC(2026, 8, 8),
        type: 'bogus' as EventType,
        note: 'Checked',
      }),
    ).rejects.toBeInstanceOf(InvalidEventTypeError);
    expect(await listEventsFor(ctx.repos, livestockId)).toHaveLength(0);
  });

  it('refuses to log against a missing animal', async () => {
    await expect(
      addEvent(ctx.repos, { livestockId: 'nope', date: Date.UTC(2026, 8, 8), type: 'health', note: 'x' }),
    ).rejects.toBeInstanceOf(NoLivestockRecordError);
  });
});

describe('listEventsFor', () => {
  it('returns an empty list when none are logged', async () => {
    const livestockId = await seedAnimal();
    expect(await listEventsFor(ctx.repos, livestockId)).toEqual([]);
  });

  it('returns events for one animal only, most recent first', async () => {
    const livestockId = await seedAnimal();
    const other = await seedAnimal();

    await addEvent(ctx.repos, {
      livestockId,
      date: Date.UTC(2026, 8, 1),
      type: 'health',
      note: 'Older',
    });
    await addEvent(ctx.repos, {
      livestockId,
      date: Date.UTC(2026, 8, 8),
      type: 'movement',
      note: 'Newer',
    });
    await addEvent(ctx.repos, {
      livestockId: other,
      date: Date.UTC(2026, 8, 5),
      type: 'weight',
      note: 'Other animal',
    });

    const events = await listEventsFor(ctx.repos, livestockId);
    expect(events.map((e) => e.note)).toEqual(['Newer', 'Older']);
  });

  it('persists a logged event across a close and reopen', async () => {
    const livestockId = await seedAnimal();
    await addEvent(ctx.repos, {
      livestockId,
      date: Date.UTC(2026, 8, 8),
      type: 'health',
      note: 'Vaccinated',
    });

    ctx.db.close();
    await ctx.db.open();

    const events = await listEventsFor(ctx.repos, livestockId);
    expect(events).toHaveLength(1);
    expect(events[0].note).toBe('Vaccinated');
  });
});
