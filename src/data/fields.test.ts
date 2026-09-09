import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyCropTypeError,
  EmptyFieldNameError,
  FieldNotFoundError,
  NoCropEnterpriseError,
  addField,
  deleteField,
  listCropEnterprises,
  listFields,
  updateField,
} from './fields';
import { addActivity, listActivitiesFor } from './activities';
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

describe('updateField', () => {
  /** Register a field with a size, returning it for the correction tests. */
  async function seedField() {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    return addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'North field',
      cropType: 'Maize',
      size: '12 ha',
    });
  }

  it('corrects the name, crop type and size', async () => {
    const field = await seedField();
    const updated = await updateField(ctx.repos, field.id, {
      name: 'North paddock',
      cropType: 'Wheat',
      size: '15 ha',
    });

    expect(updated.name).toBe('North paddock');
    expect(updated.cropType).toBe('Wheat');
    expect(updated.size).toBe('15 ha');
  });

  it('leaves fields that are not supplied untouched', async () => {
    const field = await seedField();
    const updated = await updateField(ctx.repos, field.id, { name: 'Renamed' });

    expect(updated.name).toBe('Renamed');
    expect(updated.cropType).toBe('Maize');
    expect(updated.size).toBe('12 ha');
  });

  it('clears the optional size when a blank size is supplied', async () => {
    const field = await seedField();
    const updated = await updateField(ctx.repos, field.id, { size: '   ' });
    expect(updated.size).toBeUndefined();
  });

  it('trims a corrected name and rejects a blank one without writing', async () => {
    const field = await seedField();
    const trimmed = await updateField(ctx.repos, field.id, { name: '  River block  ' });
    expect(trimmed.name).toBe('River block');

    await expect(updateField(ctx.repos, field.id, { name: '   ' })).rejects.toBeInstanceOf(
      EmptyFieldNameError,
    );
    // The last good value is still in place.
    const fields = await listFields(ctx.repos);
    expect(fields[0].name).toBe('River block');
  });

  it('rejects a blank crop type without writing', async () => {
    const field = await seedField();
    await expect(updateField(ctx.repos, field.id, { cropType: '  ' })).rejects.toBeInstanceOf(
      EmptyCropTypeError,
    );
    const fields = await listFields(ctx.repos);
    expect(fields[0].cropType).toBe('Maize');
  });

  it('refuses to update a field that does not exist', async () => {
    await expect(updateField(ctx.repos, 'nope', { name: 'X' })).rejects.toBeInstanceOf(
      FieldNotFoundError,
    );
  });

  it('persists a correction across a close and reopen', async () => {
    const field = await seedField();
    await updateField(ctx.repos, field.id, { name: 'Corrected' });

    ctx.db.close();
    await ctx.db.open();

    const fields = await listFields(ctx.repos);
    expect(fields[0].name).toBe('Corrected');
  });
});

describe('deleteField', () => {
  /** Register a field with two activities, returning its id. */
  async function seedFieldWithActivities(): Promise<string> {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const field = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'North field',
      cropType: 'Maize',
    });
    await addActivity(ctx.repos, {
      fieldId: field.id,
      date: Date.UTC(2026, 8, 1),
      type: 'planting',
      note: 'Planted',
    });
    await addActivity(ctx.repos, {
      fieldId: field.id,
      date: Date.UTC(2026, 8, 8),
      type: 'harvest',
      note: 'Harvested',
    });
    return field.id;
  }

  it('removes the field record', async () => {
    const id = await seedFieldWithActivities();
    await deleteField(ctx.repos, id);
    expect(await listFields(ctx.repos)).toHaveLength(0);
  });

  it('removes the activities logged against the deleted field', async () => {
    const id = await seedFieldWithActivities();
    await deleteField(ctx.repos, id);
    expect(await listActivitiesFor(ctx.repos, id)).toHaveLength(0);
  });

  it('leaves other fields and their activities in place', async () => {
    const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
    const target = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'Target field',
      cropType: 'Maize',
    });
    const survivor = await addField(ctx.repos, {
      enterpriseId: crop.id,
      name: 'Survivor field',
      cropType: 'Wheat',
    });
    await addActivity(ctx.repos, {
      fieldId: survivor.id,
      date: Date.UTC(2026, 8, 8),
      type: 'input',
      note: 'Sprayed',
    });

    await deleteField(ctx.repos, target.id);

    const fields = await listFields(ctx.repos);
    expect(fields.map((f) => f.id)).toEqual([survivor.id]);
    expect(await listActivitiesFor(ctx.repos, survivor.id)).toHaveLength(1);
  });

  it('is a no-op for a field that does not exist', async () => {
    await expect(deleteField(ctx.repos, 'nope')).resolves.toBeUndefined();
  });
});
