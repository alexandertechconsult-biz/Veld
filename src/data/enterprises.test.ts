import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyEnterpriseNameError,
  NoFarmYetError,
  addEnterprise,
  listEnterprises,
} from './enterprises';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(async () => {
  ctx = freshContext();
  await saveFarmProfile(ctx.repos, 'Rooikraal');
});

afterEach(async () => {
  await ctx.dispose();
});

describe('listEnterprises', () => {
  it('returns an empty list when none have been added', async () => {
    expect(await listEnterprises(ctx.repos)).toEqual([]);
  });

  it('returns enterprises for the current farm, oldest first', async () => {
    const first = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const second = await addEnterprise(ctx.repos, 'Maize block', 'crop');

    const list = await listEnterprises(ctx.repos);
    expect(list.map((e) => e.id)).toEqual([first.id, second.id]);
  });
});

describe('addEnterprise', () => {
  it('adds a livestock enterprise linked to the farm', async () => {
    const farm = (await ctx.repos.farms.getAll())[0];
    const added = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');

    expect(added.name).toBe('Beef herd');
    expect(added.type).toBe('livestock');
    expect(added.farmId).toBe(farm.id);
    expect(await ctx.repos.enterprises.listByFarm(farm.id)).toHaveLength(1);
  });

  it('adds a crop enterprise', async () => {
    const added = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    expect(added.type).toBe('crop');
  });

  it('allows more than one enterprise instead of overwriting', async () => {
    await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await addEnterprise(ctx.repos, 'Maize block', 'crop');

    expect(await listEnterprises(ctx.repos)).toHaveLength(2);
  });

  it('trims surrounding whitespace before saving', async () => {
    const added = await addEnterprise(ctx.repos, '  Beef herd  ', 'livestock');
    expect(added.name).toBe('Beef herd');
  });

  it('rejects a blank name without writing anything', async () => {
    await expect(addEnterprise(ctx.repos, '   ', 'livestock')).rejects.toBeInstanceOf(
      EmptyEnterpriseNameError,
    );
    expect(await listEnterprises(ctx.repos)).toHaveLength(0);
  });

  it('refuses to add an enterprise before a farm exists', async () => {
    const empty = freshContext();
    try {
      await expect(addEnterprise(empty.repos, 'Beef herd', 'livestock')).rejects.toBeInstanceOf(
        NoFarmYetError,
      );
      expect(await empty.repos.enterprises.getAll()).toHaveLength(0);
    } finally {
      await empty.dispose();
    }
  });

  it('survives a close-and-reopen of the database (persists across restarts)', async () => {
    const added = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');

    ctx.db.close();
    const { VeldDatabase } = await import('./db');
    const reopened = new VeldDatabase(ctx.db.name);
    const { createRepositories } = await import('./index');
    const repos = createRepositories(reopened);

    const afterRestart = await listEnterprises(repos);
    expect(afterRestart).toHaveLength(1);
    expect(afterRestart[0]).toEqual(added);
    reopened.close();
  });
});
