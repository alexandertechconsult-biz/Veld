import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyCropTypeError,
  EmptyFieldNameError,
  NoCropEnterpriseError,
  addField,
  listCropEnterprises,
  listFields,
} from './fields';
import { addEnterprise } from './enterprises';
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

describe('listCropEnterprises', () => {
  it('returns only crop enterprises, oldest first', async () => {
    const maize = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    const wheat = await addEnterprise(ctx.repos, 'Wheat block', 'crop');

    const list = await listCropEnterprises(ctx.repos);
    expect(list.map((e) => e.id)).toEqual([maize.id, wheat.id]);
  });
});

describe('addField', () => {
  it('registers a field linked to the crop enterprise', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const field = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'North field',
      cropType: 'Maize',
      size: '12 ha',
    });

    expect(field.enterpriseId).toBe(crop.id);
    expect(field.name).toBe('North field');
    expect(field.cropType).toBe('Maize');
    expect(field.size).toBe('12 ha');
  });

  it('registers a field without a size (size is optional)', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const field = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'South block',
      cropType: 'Wheat',
    });

    expect(field.size).toBeUndefined();
  });

  it('omits a blank size rather than storing an empty string', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const field = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'South block',
      cropType: 'Wheat',
      size: '   ',
    });

    expect(field.size).toBeUndefined();
  });

  it('trims the name, crop type and size before saving', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const field = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: '  North field  ',
      cropType: '  Maize  ',
      size: '  12 ha  ',
    });

    expect(field.name).toBe('North field');
    expect(field.cropType).toBe('Maize');
    expect(field.size).toBe('12 ha');
  });

  it('rejects a blank name without writing', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    await expect(
      addField(ctx.repos, { enterpriseId: crop.id, name: '   ', cropType: 'Maize' }),
    ).rejects.toBeInstanceOf(EmptyFieldNameError);
    expect(await listFields(ctx.repos)).toHaveLength(0);
  });

  it('rejects a blank crop type without writing', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    await expect(
      addField(ctx.repos, { enterpriseId: crop.id, name: 'North field', cropType: ' ' }),
    ).rejects.toBeInstanceOf(EmptyCropTypeError);
    expect(await listFields(ctx.repos)).toHaveLength(0);
  });

  it('refuses to register against a livestock enterprise', async () => {
    const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
    await expect(
      addField(ctx.repos, { enterpriseId: herd.id, name: 'North field', cropType: 'Maize' }),
    ).rejects.toBeInstanceOf(NoCropEnterpriseError);
    expect(await listFields(ctx.repos)).toHaveLength(0);
  });

  it('refuses to register against a missing enterprise', async () => {
    await expect(
      addField(ctx.repos, { enterpriseId: 'nope', name: 'North field', cropType: 'Maize' }),
    ).rejects.toBeInstanceOf(NoCropEnterpriseError);
  });
});

describe('listFields', () => {
  it('returns an empty list when none are registered', async () => {
    await addEnterprise(ctx.repos, 'Maize block', 'crop');
    expect(await listFields(ctx.repos)).toEqual([]);
  });

  it('gathers fields across every crop enterprise, oldest first', async () => {
    const maize = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const wheat = await addEnterprise(ctx.repos, 'Wheat block', 'crop');
    const first = await addField(ctx.repos, {
      enterpriseId: maize.id,
      name: 'North field',
      cropType: 'Maize',
    });
    const second = await addField(ctx.repos, {
      enterpriseId: wheat.id,
      name: 'River block',
      cropType: 'Wheat',
    });

    const list = await listFields(ctx.repos);
    expect(list.map((f) => f.id)).toEqual([first.id, second.id]);
  });

  it('persists a registered field across a close and reopen', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'North field',
      cropType: 'Maize',
    });

    ctx.db.close();
    await ctx.db.open();

    const list = await listFields(ctx.repos);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('North field');
  });
});
