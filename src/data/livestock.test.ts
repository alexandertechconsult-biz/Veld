import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyLivestockNameError,
  EmptySpeciesError,
  InvalidCountError,
  NoLivestockEnterpriseError,
  addLivestock,
  describeLivestock,
  listLivestock,
  listLivestockEnterprises,
} from './livestock';
import { addEnterprise } from './enterprises';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';
import type { LivestockRecord } from './types';

let ctx: TestContext;

beforeEach(async () => {
  ctx = freshContext();
  await saveFarmProfile(ctx.repos, 'Rooikraal');
});

afterEach(async () => {
  await ctx.dispose();
});

/** Convenience: a livestock record with a given count, for describe tests. */
function recordWithCount(count: number): LivestockRecord {
  return {
    id: 'x',
    createdAt: 1,
    updatedAt: 1,
    enterpriseId: 'e',
    name: 'Bella',
    species: 'Cattle',
    count,
  };
}

describe('describeLivestock', () => {
  it('reads a count of 1 as an individual', () => {
    expect(describeLivestock(recordWithCount(1))).toEqual({
      kind: 'individual',
      countLabel: 'Individual',
    });
  });

  it('reads a count above 1 as a group and names the size', () => {
    expect(describeLivestock(recordWithCount(40))).toEqual({
      kind: 'group',
      countLabel: 'Group of 40',
    });
  });
});

describe('listLivestockEnterprises', () => {
  it('returns only livestock enterprises, oldest first', async () => {
    const beef = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const sheep = await addEnterprise(ctx.repos, 'Sheep flock', 'livestock');

    const list = await listLivestockEnterprises(ctx.repos);
    expect(list.map((e) => e.id)).toEqual([beef.id, sheep.id]);
  });
});

describe('addLivestock', () => {
  it('registers an individual (count 1) linked to the livestock enterprise', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const animal = await addLivestock(ctx.repos, {
      enterpriseId: herd.id,
      name: 'ZA-001',
      species: 'Cattle',
      count: 1,
    });

    expect(animal.enterpriseId).toBe(herd.id);
    expect(animal.name).toBe('ZA-001');
    expect(animal.species).toBe('Cattle');
    expect(animal.count).toBe(1);
    expect(describeLivestock(animal).kind).toBe('individual');
  });

  it('registers a group (count above 1)', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const group = await addLivestock(ctx.repos, {
      enterpriseId: herd.id,
      name: 'North paddock',
      species: 'Cattle',
      count: 40,
    });

    expect(group.count).toBe(40);
    expect(describeLivestock(group).kind).toBe('group');
  });

  it('trims the name and species before saving', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const animal = await addLivestock(ctx.repos, {
      enterpriseId: herd.id,
      name: '  ZA-001  ',
      species: '  Cattle  ',
      count: 1,
    });

    expect(animal.name).toBe('ZA-001');
    expect(animal.species).toBe('Cattle');
  });

  it('rejects a blank name without writing', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await expect(
      addLivestock(ctx.repos, { enterpriseId: herd.id, name: '   ', species: 'Cattle', count: 1 }),
    ).rejects.toBeInstanceOf(EmptyLivestockNameError);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });

  it('rejects a blank species without writing', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await expect(
      addLivestock(ctx.repos, { enterpriseId: herd.id, name: 'ZA-001', species: ' ', count: 1 }),
    ).rejects.toBeInstanceOf(EmptySpeciesError);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });

  it('rejects a count below 1 without writing', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await expect(
      addLivestock(ctx.repos, { enterpriseId: herd.id, name: 'ZA-001', species: 'Cattle', count: 0 }),
    ).rejects.toBeInstanceOf(InvalidCountError);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });

  it('rejects a fractional count without writing', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await expect(
      addLivestock(ctx.repos, { enterpriseId: herd.id, name: 'ZA-001', species: 'Cattle', count: 2.5 }),
    ).rejects.toBeInstanceOf(InvalidCountError);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });

  it('refuses to register against a crop enterprise', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    await expect(
      addLivestock(ctx.repos, { enterpriseId: crop.id, name: 'ZA-001', species: 'Cattle', count: 1 }),
    ).rejects.toBeInstanceOf(NoLivestockEnterpriseError);
    expect(await listLivestock(ctx.repos)).toHaveLength(0);
  });

  it('refuses to register against a missing enterprise', async () => {
    await expect(
      addLivestock(ctx.repos, { enterpriseId: 'nope', name: 'ZA-001', species: 'Cattle', count: 1 }),
    ).rejects.toBeInstanceOf(NoLivestockEnterpriseError);
  });
});

describe('listLivestock', () => {
  it('returns an empty list when none are registered', async () => {
    await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    expect(await listLivestock(ctx.repos)).toEqual([]);
  });

  it('gathers animals across every livestock enterprise, oldest first', async () => {
    const beef = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const sheep = await addEnterprise(ctx.repos, 'Sheep flock', 'livestock');
    const first = await addLivestock(ctx.repos, {
      enterpriseId: beef.id,
      name: 'ZA-001',
      species: 'Cattle',
      count: 1,
    });
    const second = await addLivestock(ctx.repos, {
      enterpriseId: sheep.id,
      name: 'Flock A',
      species: 'Sheep',
      count: 120,
    });

    const list = await listLivestock(ctx.repos);
    expect(list.map((a) => a.id)).toEqual([first.id, second.id]);
  });

  it('persists a registered animal across a close and reopen', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await addLivestock(ctx.repos, {
      enterpriseId: herd.id,
      name: 'ZA-001',
      species: 'Cattle',
      count: 1,
    });

    ctx.db.close();
    await ctx.db.open();

    const list = await listLivestock(ctx.repos);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('ZA-001');
  });
});
