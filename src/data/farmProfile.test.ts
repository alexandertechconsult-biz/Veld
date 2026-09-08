import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EmptyFarmNameError, loadCurrentFarm, saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

describe('loadCurrentFarm', () => {
  it('returns null when no farm exists yet', async () => {
    expect(await loadCurrentFarm(ctx.repos)).toBeNull();
  });

  it('returns the created farm', async () => {
    const created = await ctx.repos.farms.create({ name: 'Rooikraal' });
    expect(await loadCurrentFarm(ctx.repos)).toEqual(created);
  });
});

describe('saveFarmProfile', () => {
  it('creates the farm when none exists and persists the name', async () => {
    const saved = await saveFarmProfile(ctx.repos, 'Rooikraal');

    expect(saved.name).toBe('Rooikraal');
    expect(saved.id).toBeTruthy();
    expect(await ctx.repos.farms.getAll()).toHaveLength(1);
    expect(await loadCurrentFarm(ctx.repos)).toEqual(saved);
  });

  it('renames the existing farm instead of creating a second one', async () => {
    const first = await saveFarmProfile(ctx.repos, 'Old name');
    const renamed = await saveFarmProfile(ctx.repos, 'New name');

    expect(renamed.id).toBe(first.id);
    expect(renamed.name).toBe('New name');
    expect(await ctx.repos.farms.getAll()).toHaveLength(1);
  });

  it('trims surrounding whitespace before saving', async () => {
    const saved = await saveFarmProfile(ctx.repos, '  Rooikraal  ');
    expect(saved.name).toBe('Rooikraal');
  });

  it('rejects a blank name without writing anything', async () => {
    await expect(saveFarmProfile(ctx.repos, '   ')).rejects.toBeInstanceOf(EmptyFarmNameError);
    expect(await ctx.repos.farms.getAll()).toHaveLength(0);
  });

  it('survives a close-and-reopen of the database (persists across restarts)', async () => {
    const saved = await saveFarmProfile(ctx.repos, 'Rooikraal');

    // Simulate an app restart: reopen the same named database fresh.
    ctx.db.close();
    const { VeldDatabase } = await import('./db');
    const reopened = new VeldDatabase(ctx.db.name);
    const { createRepositories } = await import('./index');
    const repos = createRepositories(reopened);

    const afterRestart = await loadCurrentFarm(repos);
    expect(afterRestart).toEqual(saved);
    reopened.close();
  });
});
