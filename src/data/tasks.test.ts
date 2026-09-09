import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyTaskTitleError,
  InvalidDueDateError,
  NoFarmForTaskError,
  TaskLinkNotFoundError,
  addTask,
  listTaskLinkOptions,
  listTasks,
} from './tasks';
import { addEnterprise } from './enterprises';
import { addField } from './fields';
import { addLivestock } from './livestock';
import { saveFarmProfile } from './farmProfile';
import { freshContext, type TestContext } from './testSupport';

let ctx: TestContext;

beforeEach(() => {
  ctx = freshContext();
});

afterEach(async () => {
  await ctx.dispose();
});

/** Register one field and return its id, seeding the crop enterprise it needs. */
async function seedField(): Promise<string> {
  const crop = await addEnterprise(ctx.repos, 'Maize block', 'crop');
  const field = await addField(ctx.repos, {
    enterpriseId: crop.id,
    name: 'North field',
    cropType: 'Maize',
  });
  return field.id;
}

/** Register one animal and return its id, seeding the livestock enterprise. */
async function seedAnimal(): Promise<string> {
  const herd = await addEnterprise(ctx.repos, 'Beef herd', 'livestock');
  const animal = await addLivestock(ctx.repos, {
    enterpriseId: herd.id,
    name: 'Cow 12',
    species: 'Cattle',
    count: 1,
  });
  return animal.id;
}

describe('addTask', () => {
  it('creates an open task from just a title', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix the north fence' });

    expect(task.title).toBe('Fix the north fence');
    expect(task.status).toBe('open');
    expect(task.fieldId).toBeUndefined();
    expect(task.livestockId).toBeUndefined();
    expect(task.assignee).toBeUndefined();
    expect(task.dueDate).toBeUndefined();
    expect(await ctx.repos.tasks.getAll()).toHaveLength(1);
  });

  it('trims the title', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: '  Order feed  ' });
    expect(task.title).toBe('Order feed');
  });

  it('rejects a blank title without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(addTask(ctx.repos, { title: '   ' })).rejects.toBeInstanceOf(EmptyTaskTitleError);
    expect(await ctx.repos.tasks.getAll()).toHaveLength(0);
  });

  it('requires a farm to exist, and writes nothing when there is none', async () => {
    await expect(addTask(ctx.repos, { title: 'Anything' })).rejects.toBeInstanceOf(
      NoFarmForTaskError,
    );
    expect(await ctx.repos.tasks.getAll()).toHaveLength(0);
  });

  it('links a task to a field', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const fieldId = await seedField();
    const task = await addTask(ctx.repos, { title: 'Spray weeds', fieldId });
    expect(task.fieldId).toBe(fieldId);
    expect(task.livestockId).toBeUndefined();
  });

  it('links a task to an animal or group', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const livestockId = await seedAnimal();
    const task = await addTask(ctx.repos, { title: 'Vaccinate', livestockId });
    expect(task.livestockId).toBe(livestockId);
    expect(task.fieldId).toBeUndefined();
  });

  it('rejects a link to a field that does not exist, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTask(ctx.repos, { title: 'Spray weeds', fieldId: 'ghost' }),
    ).rejects.toBeInstanceOf(TaskLinkNotFoundError);
    expect(await ctx.repos.tasks.getAll()).toHaveLength(0);
  });

  it('rejects a link to an animal that does not exist, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      addTask(ctx.repos, { title: 'Vaccinate', livestockId: 'ghost' }),
    ).rejects.toBeInstanceOf(TaskLinkNotFoundError);
    expect(await ctx.repos.tasks.getAll()).toHaveLength(0);
  });

  it('stores a free-text assignee, trimmed', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Move cattle', assignee: '  Themba  ' });
    expect(task.assignee).toBe('Themba');
  });

  it('omits a blank assignee rather than storing an empty string', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Move cattle', assignee: '   ' });
    expect(task.assignee).toBeUndefined();
  });

  it('stores a due date', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const dueDate = Date.parse('2026-10-01');
    const task = await addTask(ctx.repos, { title: 'Order seed', dueDate });
    expect(task.dueDate).toBe(dueDate);
  });

  it('rejects an unreal due date without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(addTask(ctx.repos, { title: 'Order seed', dueDate: NaN })).rejects.toBeInstanceOf(
      InvalidDueDateError,
    );
    expect(await ctx.repos.tasks.getAll()).toHaveLength(0);
  });
});

describe('listTasks', () => {
  it('returns the farm tasks, most recently created first', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const first = await addTask(ctx.repos, { title: 'First' });
    const second = await addTask(ctx.repos, { title: 'Second' });

    const list = await listTasks(ctx.repos);
    expect(list.map((t) => t.id)).toEqual([second.id, first.id]);
  });

  it('is empty when no farm exists yet', async () => {
    expect(await listTasks(ctx.repos)).toEqual([]);
  });

  it('survives a close and reopen of the database', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await addTask(ctx.repos, { title: 'Persist me' });

    ctx.db.close();
    await ctx.db.open();

    const list = await listTasks(ctx.repos);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Persist me');
  });
});

describe('listTaskLinkOptions', () => {
  it('offers fields then animals, each labelled', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await seedField();
    await seedAnimal();

    const options = await listTaskLinkOptions(ctx.repos);
    expect(options).toEqual([
      { kind: 'field', id: expect.any(String), label: 'North field' },
      { kind: 'livestock', id: expect.any(String), label: 'Cow 12' },
    ]);
  });

  it('is empty when the farm has no fields or animals', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    expect(await listTaskLinkOptions(ctx.repos)).toEqual([]);
  });
});
