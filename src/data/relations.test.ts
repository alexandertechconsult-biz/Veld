import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VeldDatabase } from './db';
import { createRepositories } from './index';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

describe('foreign-key finders scope to the parent', () => {
  it('enterprises.listByFarm returns only that farm', async () => {
    const a = await ctx.repos.enterprises.create({ farmId: 'farm-a', type: 'crop', name: 'A' });
    await ctx.repos.enterprises.create({ farmId: 'farm-b', type: 'crop', name: 'B' });
    const forA = await ctx.repos.enterprises.listByFarm('farm-a');
    expect(forA).toEqual([a]);
  });

  it('livestock.listByEnterprise returns only that enterprise', async () => {
    const mine = await ctx.repos.livestock.create({
      enterpriseId: 'ent-1',
      name: 'Tag 1',
      species: 'sheep',
      count: 1,
    });
    await ctx.repos.livestock.create({
      enterpriseId: 'ent-2',
      name: 'Tag 2',
      species: 'sheep',
      count: 1,
    });
    expect(await ctx.repos.livestock.listByEnterprise('ent-1')).toEqual([mine]);
  });

  it('fields.listByEnterprise returns only that enterprise', async () => {
    const mine = await ctx.repos.fields.create({
      enterpriseId: 'ent-1',
      name: 'North',
      cropType: 'maize',
    });
    await ctx.repos.fields.create({ enterpriseId: 'ent-2', name: 'South', cropType: 'wheat' });
    expect(await ctx.repos.fields.listByEnterprise('ent-1')).toEqual([mine]);
  });

  it('tasks.listByFarm returns only that farm', async () => {
    const mine = await ctx.repos.tasks.create({ farmId: 'farm-a', title: 'T', status: 'open' });
    await ctx.repos.tasks.create({ farmId: 'farm-b', title: 'U', status: 'open' });
    expect(await ctx.repos.tasks.listByFarm('farm-a')).toEqual([mine]);
  });

  it('transactions.listByFarm returns only that farm', async () => {
    const mine = await ctx.repos.transactions.create({
      farmId: 'farm-a',
      type: 'cost',
      amount: 10,
      date: 1,
    });
    await ctx.repos.transactions.create({ farmId: 'farm-b', type: 'sale', amount: 20, date: 2 });
    expect(await ctx.repos.transactions.listByFarm('farm-a')).toEqual([mine]);
  });
});

describe('event and activity history is most-recent-first', () => {
  it('events.listByLivestock orders by date descending', async () => {
    await ctx.repos.events.create({ livestockId: 'ls-1', date: 100, type: 'health', note: 'old' });
    await ctx.repos.events.create({ livestockId: 'ls-1', date: 300, type: 'health', note: 'new' });
    await ctx.repos.events.create({ livestockId: 'ls-1', date: 200, type: 'health', note: 'mid' });
    await ctx.repos.events.create({ livestockId: 'ls-2', date: 999, type: 'health', note: 'other' });

    const dates = (await ctx.repos.events.listByLivestock('ls-1')).map((e) => e.date);
    expect(dates).toEqual([300, 200, 100]);
  });

  it('activities.listByField orders by date descending', async () => {
    await ctx.repos.activities.create({ fieldId: 'f-1', date: 100, type: 'planting', note: 'a' });
    await ctx.repos.activities.create({ fieldId: 'f-1', date: 300, type: 'harvest', note: 'b' });
    await ctx.repos.activities.create({ fieldId: 'f-1', date: 200, type: 'input', note: 'c' });

    const dates = (await ctx.repos.activities.listByField('f-1')).map((a) => a.date);
    expect(dates).toEqual([300, 200, 100]);
  });
});

describe('data survives closing and reopening the database (device restart)', () => {
  it('reads back a record written by an earlier connection', async () => {
    const name = `veld-restart-${Date.now()}`;
    const first = new VeldDatabase(name);
    const firstRepos = createRepositories(first);

    const farm = await firstRepos.farms.create({ name: 'Persisted farm' });
    first.close();

    // A fresh connection to the same database — the analogue of relaunching the
    // app after the device restarted.
    const second = new VeldDatabase(name);
    const secondRepos = createRepositories(second);
    try {
      expect(await secondRepos.farms.get(farm.id)).toEqual(farm);
    } finally {
      await second.delete();
    }
  });
});
