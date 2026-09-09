import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRecentActivity, RECENT_ACTIVITY_LIMIT } from './recentActivity';
import { saveFarmProfile } from './farmProfile';
import { addEnterprise } from './enterprises';
import { addLivestock } from './livestock';
import { addEvent } from './events';
import { addField } from './fields';
import { addActivity } from './activities';
import { addTask } from './tasks';
import { addTransaction } from './transactions';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

/** A farm with one livestock and one crop enterprise; returns both ids. */
async function seedFarm(): Promise<{ livestockId: string; cropId: string }> {
  await saveFarmProfile(ctx.repos, 'Rooikraal');
  const livestock = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
  const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
  return { livestockId: livestock.id, cropId: crop.id };
}

describe('listRecentActivity', () => {
  it('returns an empty feed when no farm exists yet', async () => {
    expect(await listRecentActivity(ctx.repos)).toEqual([]);
  });

  it('returns an empty feed for a farm with nothing logged', async () => {
    await seedFarm();
    expect(await listRecentActivity(ctx.repos)).toEqual([]);
  });

  it('mixes all four entry types into one feed', async () => {
    const { livestockId, cropId } = await seedFarm();
    const animal = await addLivestock(ctx.repos, { enterpriseId: livestockId, name: 'Cow 1', species: 'Cattle', count: 1 });
    const field = await addField(ctx.repos, { enterpriseId: cropId, name: 'Field 1', cropType: 'Maize' });
    await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 1), type: 'health', note: 'Vaccinated' });
    await addActivity(ctx.repos, { fieldId: field.id, date: Date.UTC(2026, 8, 2), type: 'planting', note: 'Sowed maize' });
    await addTask(ctx.repos, { title: 'Fix the gate' });
    await addTransaction(ctx.repos, { type: 'cost', amount: 500, date: Date.UTC(2026, 8, 3) });

    const feed = await listRecentActivity(ctx.repos);
    const kinds = feed.map((entry) => entry.kind).sort();
    expect(kinds).toEqual(['activity', 'event', 'task', 'transaction']);
  });

  it('orders entries most recent first by their timestamp', async () => {
    const { livestockId, cropId } = await seedFarm();
    const animal = await addLivestock(ctx.repos, { enterpriseId: livestockId, name: 'Cow 1', species: 'Cattle', count: 1 });
    const field = await addField(ctx.repos, { enterpriseId: cropId, name: 'Field 1', cropType: 'Maize' });
    // Dates deliberately out of insertion order.
    await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 5), type: 'health', note: 'newest' });
    await addActivity(ctx.repos, { fieldId: field.id, date: Date.UTC(2026, 8, 1), type: 'planting', note: 'oldest' });
    await addTransaction(ctx.repos, { type: 'sale', amount: 200, date: Date.UTC(2026, 8, 3), note: 'middle' });

    const feed = await listRecentActivity(ctx.repos);
    expect(feed.map((entry) => entry.timestamp)).toEqual([
      Date.UTC(2026, 8, 5),
      Date.UTC(2026, 8, 3),
      Date.UTC(2026, 8, 1),
    ]);
  });

  it('caps the feed at five entries by default, keeping the five most recent', async () => {
    const { livestockId } = await seedFarm();
    const animal = await addLivestock(ctx.repos, { enterpriseId: livestockId, name: 'Cow 1', species: 'Cattle', count: 1 });
    for (let day = 1; day <= 7; day += 1) {
      await addEvent(ctx.repos, {
        livestockId: animal.id,
        date: Date.UTC(2026, 8, day),
        type: 'health',
        note: `day ${day}`,
      });
    }

    const feed = await listRecentActivity(ctx.repos);
    expect(feed).toHaveLength(RECENT_ACTIVITY_LIMIT);
    expect(feed.map((entry) => entry.timestamp)).toEqual([
      Date.UTC(2026, 8, 7),
      Date.UTC(2026, 8, 6),
      Date.UTC(2026, 8, 5),
      Date.UTC(2026, 8, 4),
      Date.UTC(2026, 8, 3),
    ]);
  });

  it('honours an explicit limit', async () => {
    const { livestockId } = await seedFarm();
    const animal = await addLivestock(ctx.repos, { enterpriseId: livestockId, name: 'Cow 1', species: 'Cattle', count: 1 });
    await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 1), type: 'health', note: 'a' });
    await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 2), type: 'health', note: 'b' });
    await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 3), type: 'health', note: 'c' });

    const feed = await listRecentActivity(ctx.repos, 2);
    expect(feed).toHaveLength(2);
    expect(feed.map((entry) => (entry.record as { note: string }).note)).toEqual(['c', 'b']);
  });

  it('carries the full source record on each entry', async () => {
    const { livestockId } = await seedFarm();
    const animal = await addLivestock(ctx.repos, { enterpriseId: livestockId, name: 'Cow 1', species: 'Cattle', count: 1 });
    const event = await addEvent(ctx.repos, { livestockId: animal.id, date: Date.UTC(2026, 8, 1), type: 'movement', note: 'Moved to camp 2' });

    const [entry] = await listRecentActivity(ctx.repos);
    expect(entry.kind).toBe('event');
    expect(entry.record).toEqual(event);
  });
});
