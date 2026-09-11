import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DemoDataExistsError, seedDemoData } from './demoData';
import { loadCurrentFarm, saveFarmProfile } from './farmProfile';
import { listEnterprises } from './enterprises';
import { listLivestock } from './livestock';
import { listFields } from './fields';
import { listEventsFor } from './events';
import { listActivitiesFor } from './activities';
import { listTasks } from './tasks';
import { listTransactions } from './transactions';
import { freshContext, type TestContext } from './testSupport';
import { VeldDatabase } from './db';
import { createRepositories } from './index';

let ctx: TestContext;

// A fixed clock so the derived event/activity/transaction dates are deterministic.
const NOW = Date.UTC(2026, 8, 11);
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

describe('seedDemoData', () => {
  it('creates a farm with a livestock and a crop enterprise', async () => {
    await seedDemoData(ctx.repos, NOW);

    const farm = await loadCurrentFarm(ctx.repos);
    expect(farm?.name).toBe('Rietvlei Mixed Farm');

    const enterprises = await listEnterprises(ctx.repos);
    expect(enterprises.map((e) => e.type).sort()).toEqual(['crop', 'livestock']);
  });

  it('seeds several animals — individuals and a group — all under the livestock enterprise', async () => {
    await seedDemoData(ctx.repos, NOW);

    const animals = await listLivestock(ctx.repos);
    expect(animals.length).toBeGreaterThanOrEqual(3);
    // Both the individual (count 1) and the group (count > 1) paths are present.
    expect(animals.some((a) => a.count === 1)).toBe(true);
    expect(animals.some((a) => a.count > 1)).toBe(true);
  });

  it('seeds several fields', async () => {
    await seedDemoData(ctx.repos, NOW);

    const fields = await listFields(ctx.repos);
    expect(fields.length).toBeGreaterThanOrEqual(3);
    expect(fields.some((f) => f.size)).toBe(true);
  });

  it('seeds a few days of events against animals, dated relative to now', async () => {
    await seedDemoData(ctx.repos, NOW);

    const animals = await listLivestock(ctx.repos);
    const allEvents = (
      await Promise.all(animals.map((a) => listEventsFor(ctx.repos, a.id)))
    ).flat();

    expect(allEvents.length).toBeGreaterThanOrEqual(3);
    // Every event falls within the last week and none is in the future.
    for (const event of allEvents) {
      expect(event.date).toBeLessThanOrEqual(NOW);
      expect(event.date).toBeGreaterThanOrEqual(NOW - 7 * DAY_MS);
    }
    // The events span more than one day, so Home shows a few days of history.
    const distinctDays = new Set(allEvents.map((e) => Math.round((NOW - e.date) / DAY_MS)));
    expect(distinctDays.size).toBeGreaterThan(1);
  });

  it('seeds activities against fields, dated relative to now', async () => {
    await seedDemoData(ctx.repos, NOW);

    const fields = await listFields(ctx.repos);
    const allActivities = (
      await Promise.all(fields.map((f) => listActivitiesFor(ctx.repos, f.id)))
    ).flat();

    expect(allActivities.length).toBeGreaterThanOrEqual(3);
    for (const activity of allActivities) {
      expect(activity.date).toBeLessThanOrEqual(NOW);
      expect(activity.date).toBeGreaterThanOrEqual(NOW - 7 * DAY_MS);
    }
  });

  it('seeds tasks including an open and a done one, so both groups show', async () => {
    await seedDemoData(ctx.repos, NOW);

    const tasks = await listTasks(ctx.repos);
    expect(tasks.some((t) => t.status === 'open')).toBe(true);
    expect(tasks.some((t) => t.status === 'done')).toBe(true);
  });

  it('seeds transactions — a cost, a sale, an enterprise-linked one and a farm-level one', async () => {
    await seedDemoData(ctx.repos, NOW);

    const transactions = await listTransactions(ctx.repos);
    expect(transactions.some((t) => t.type === 'cost')).toBe(true);
    expect(transactions.some((t) => t.type === 'sale')).toBe(true);
    expect(transactions.some((t) => t.enterpriseId)).toBe(true);
    expect(transactions.some((t) => t.enterpriseId === undefined)).toBe(true);
  });

  it('returns a summary matching what was written', async () => {
    const summary = await seedDemoData(ctx.repos, NOW);

    const animals = await listLivestock(ctx.repos);
    const fields = await listFields(ctx.repos);
    const tasks = await listTasks(ctx.repos);
    const transactions = await listTransactions(ctx.repos);

    expect(summary.livestock).toBe(animals.length);
    expect(summary.fields).toBe(fields.length);
    expect(summary.tasks).toBe(tasks.length);
    expect(summary.transactions).toBe(transactions.length);
    expect(summary.events).toBeGreaterThan(0);
    expect(summary.activities).toBeGreaterThan(0);
  });

  it('survives a close-and-reopen of the database (persists across restarts)', async () => {
    await seedDemoData(ctx.repos, NOW);
    ctx.db.close();

    const reopened = new VeldDatabase(ctx.db.name);
    const repos = createRepositories(reopened);

    const farm = await loadCurrentFarm(repos);
    expect(farm?.name).toBe('Rietvlei Mixed Farm');
    expect((await listLivestock(repos)).length).toBeGreaterThan(0);

    reopened.close();
  });

  it('refuses to seed when a farm already exists, writing nothing new', async () => {
    await saveFarmProfile(ctx.repos, 'My Real Farm');

    await expect(seedDemoData(ctx.repos, NOW)).rejects.toBeInstanceOf(DemoDataExistsError);

    // The real farm is untouched and no demo enterprises were added.
    const farm = await loadCurrentFarm(ctx.repos);
    expect(farm?.name).toBe('My Real Farm');
    expect(await listEnterprises(ctx.repos)).toHaveLength(0);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });
});
