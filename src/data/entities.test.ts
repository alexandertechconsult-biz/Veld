import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Entity } from './types';
import type { CreateInput, Repository, UpdateInput } from './repositories/base';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

/**
 * Exercises the full create/read/update/delete lifecycle for one entity and
 * asserts the invariants every repository must uphold: managed fields are
 * stamped, reads round-trip, updates merge and bump `updatedAt`, deletes remove.
 */
async function runCrudLifecycle<T extends Entity>(
  repo: Repository<T>,
  input: CreateInput<T>,
  patch: UpdateInput<T>,
): Promise<void> {
  const created = await repo.create(input);
  expect(created.id).toBeTruthy();
  expect(created.createdAt).toBeGreaterThan(0);
  expect(created.updatedAt).toBe(created.createdAt);
  expect(created).toMatchObject(input);

  expect(await repo.get(created.id)).toEqual(created);

  const all = await repo.getAll();
  expect(all).toHaveLength(1);
  expect(all[0]).toEqual(created);

  const updated = await repo.update(created.id, patch);
  expect(updated.id).toBe(created.id);
  expect(updated.createdAt).toBe(created.createdAt);
  expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  expect(updated).toMatchObject(patch);
  expect(await repo.get(created.id)).toEqual(updated);

  await repo.delete(created.id);
  expect(await repo.get(created.id)).toBeUndefined();
  expect(await repo.getAll()).toHaveLength(0);
}

describe('repository CRUD per entity', () => {
  it('farms', () =>
    runCrudLifecycle(ctx.repos.farms, { name: 'Green Acres' }, { name: 'Greener Acres' }));

  it('enterprises', () =>
    runCrudLifecycle(
      ctx.repos.enterprises,
      { farmId: 'farm-1', type: 'livestock', name: 'Cattle' },
      { name: 'Beef cattle', type: 'crop' },
    ));

  it('livestock (individual and group)', async () => {
    // count = 1 is an individual with a tag; the update promotes it to a group.
    await runCrudLifecycle(
      ctx.repos.livestock,
      { enterpriseId: 'ent-1', name: 'Tag 042', species: 'cattle', count: 1 },
      { count: 12, notes: 'moved to batch' },
    );
  });

  it('fields', () =>
    runCrudLifecycle(
      ctx.repos.fields,
      { enterpriseId: 'ent-2', name: 'North block', cropType: 'maize', size: '12 ha' },
      { cropType: 'wheat', notes: 'rotated' },
    ));

  it('events', () =>
    runCrudLifecycle(
      ctx.repos.events,
      { livestockId: 'ls-1', date: 1_700_000_000_000, type: 'health', note: 'vaccinated' },
      { type: 'weight', note: 'weighed 410kg' },
    ));

  it('activities', () =>
    runCrudLifecycle(
      ctx.repos.activities,
      { fieldId: 'field-1', date: 1_700_000_000_000, type: 'planting', note: 'sowed maize' },
      { type: 'harvest', note: 'harvested' },
    ));

  it('tasks', () =>
    runCrudLifecycle(
      ctx.repos.tasks,
      { farmId: 'farm-1', title: 'Repair fence', status: 'open', assignee: 'Sipho' },
      { status: 'done' },
    ));

  it('transactions', () =>
    runCrudLifecycle(
      ctx.repos.transactions,
      { farmId: 'farm-1', type: 'cost', amount: 1500, date: 1_700_000_000_000, note: 'feed' },
      { type: 'sale', amount: 4200 },
    ));
});

describe('update failure handling', () => {
  it('throws when updating a record that does not exist', async () => {
    await expect(ctx.repos.farms.update('missing', { name: 'x' })).rejects.toThrow(/no record/);
  });

  it('delete of a missing id is a no-op, not an error', async () => {
    await expect(ctx.repos.farms.delete('missing')).resolves.toBeUndefined();
  });
});
