import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EmptyTaskTitleError,
  InvalidDueDateError,
  NoFarmForTaskError,
  TaskLinkNotFoundError,
  TaskNotFoundError,
  addTask,
  deleteTask,
  listTaskLinkOptions,
  listTasks,
  markTaskDone,
  reopenTask,
  updateTask,
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

describe('markTaskDone', () => {
  it('flips an open task to done in a single call', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Move the cattle' });
    expect(task.status).toBe('open');

    const done = await markTaskDone(ctx.repos, task.id);
    expect(done.status).toBe('done');
    expect(done.id).toBe(task.id);
  });

  it('persists the done status so the task reads done on reload', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Order feed' });
    await markTaskDone(ctx.repos, task.id);

    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.status).toBe('done');
  });

  it('leaves the task done when marked done again (idempotent)', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Spray weeds' });
    await markTaskDone(ctx.repos, task.id);

    const again = await markTaskDone(ctx.repos, task.id);
    expect(again.status).toBe('done');
  });

  it('does not touch the other fields when marking done', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const fieldId = await seedField();
    const task = await addTask(ctx.repos, {
      title: 'Weed the north field',
      fieldId,
      assignee: 'Themba',
      dueDate: Date.parse('2026-10-01'),
    });

    const done = await markTaskDone(ctx.repos, task.id);
    expect(done.title).toBe('Weed the north field');
    expect(done.fieldId).toBe(fieldId);
    expect(done.assignee).toBe('Themba');
    expect(done.dueDate).toBe(Date.parse('2026-10-01'));
  });

  it('rejects a task that does not exist, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(markTaskDone(ctx.repos, 'no-such-task')).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect(await listTasks(ctx.repos)).toEqual([]);
  });
});

describe('reopenTask', () => {
  it('flips a done task back to open', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Order feed' });
    await markTaskDone(ctx.repos, task.id);

    const reopened = await reopenTask(ctx.repos, task.id);
    expect(reopened.status).toBe('open');
    expect(reopened.id).toBe(task.id);
  });

  it('persists the reopened status', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Order feed' });
    await markTaskDone(ctx.repos, task.id);
    await reopenTask(ctx.repos, task.id);

    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.status).toBe('open');
  });

  it('is idempotent on an already-open task', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Spray weeds' });

    const again = await reopenTask(ctx.repos, task.id);
    expect(again.status).toBe('open');
  });

  it('rejects a task that does not exist, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(reopenTask(ctx.repos, 'no-such-task')).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(await listTasks(ctx.repos)).toEqual([]);
  });
});

describe('updateTask', () => {
  it('corrects the title, trimmed', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix fence' });

    const edited = await updateTask(ctx.repos, task.id, { title: '  Fix the north fence  ' });
    expect(edited.title).toBe('Fix the north fence');
    expect(edited.id).toBe(task.id);
  });

  it('rejects a blank title, leaving the task unchanged', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix fence' });

    await expect(updateTask(ctx.repos, task.id, { title: '   ' })).rejects.toBeInstanceOf(
      EmptyTaskTitleError,
    );
    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.title).toBe('Fix fence');
  });

  it('changes the link from one field to an animal', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const fieldId = await seedField();
    const livestockId = await seedAnimal();
    const task = await addTask(ctx.repos, { title: 'Check', fieldId });

    const edited = await updateTask(ctx.repos, task.id, { title: 'Check', livestockId });
    expect(edited.livestockId).toBe(livestockId);
    expect(edited.fieldId).toBeUndefined();
  });

  it('clears the link when neither field nor animal is supplied', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const fieldId = await seedField();
    const task = await addTask(ctx.repos, { title: 'Check', fieldId });

    const edited = await updateTask(ctx.repos, task.id, { title: 'Check' });
    expect(edited.fieldId).toBeUndefined();
    expect(edited.livestockId).toBeUndefined();
  });

  it('rejects a link to a field that no longer exists, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Check' });

    await expect(
      updateTask(ctx.repos, task.id, { title: 'Check', fieldId: 'ghost' }),
    ).rejects.toBeInstanceOf(TaskLinkNotFoundError);
    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.fieldId).toBeUndefined();
  });

  it('changes the assignee and clears it when blank', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Move cattle', assignee: 'Themba' });

    const renamed = await updateTask(ctx.repos, task.id, { title: 'Move cattle', assignee: 'Sipho' });
    expect(renamed.assignee).toBe('Sipho');

    const cleared = await updateTask(ctx.repos, task.id, { title: 'Move cattle', assignee: '  ' });
    expect(cleared.assignee).toBeUndefined();
  });

  it('changes the due date and clears it when omitted', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, {
      title: 'Order seed',
      dueDate: Date.parse('2026-10-01'),
    });

    const moved = await updateTask(ctx.repos, task.id, {
      title: 'Order seed',
      dueDate: Date.parse('2026-11-01'),
    });
    expect(moved.dueDate).toBe(Date.parse('2026-11-01'));

    const cleared = await updateTask(ctx.repos, task.id, { title: 'Order seed' });
    expect(cleared.dueDate).toBeUndefined();
  });

  it('rejects an unreal due date, leaving the task unchanged', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, {
      title: 'Order seed',
      dueDate: Date.parse('2026-10-01'),
    });

    await expect(
      updateTask(ctx.repos, task.id, { title: 'Order seed', dueDate: NaN }),
    ).rejects.toBeInstanceOf(InvalidDueDateError);
    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.dueDate).toBe(Date.parse('2026-10-01'));
  });

  it('leaves the done/open status untouched when editing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Order feed' });
    await markTaskDone(ctx.repos, task.id);

    const edited = await updateTask(ctx.repos, task.id, { title: 'Order more feed' });
    expect(edited.status).toBe('done');
  });

  it('rejects a task that does not exist, without writing', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    await expect(
      updateTask(ctx.repos, 'no-such-task', { title: 'Anything' }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(await listTasks(ctx.repos)).toEqual([]);
  });

  it('survives a close and reopen of the database', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix fence' });
    await updateTask(ctx.repos, task.id, { title: 'Fix the west fence', assignee: 'Themba' });

    ctx.db.close();
    await ctx.db.open();

    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.title).toBe('Fix the west fence');
    expect(stored?.assignee).toBe('Themba');
  });

  it('persists a cleared link, assignee and due date across a reopen', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const fieldId = await seedField();
    const task = await addTask(ctx.repos, {
      title: 'Spray weeds',
      fieldId,
      assignee: 'Themba',
      dueDate: Date.parse('2026-10-01'),
    });
    // A title-only edit clears the link, assignee and due date.
    await updateTask(ctx.repos, task.id, { title: 'Spray weeds' });

    ctx.db.close();
    await ctx.db.open();

    const stored = await ctx.repos.tasks.get(task.id);
    expect(stored?.fieldId).toBeUndefined();
    expect(stored?.assignee).toBeUndefined();
    expect(stored?.dueDate).toBeUndefined();
  });
});

describe('deleteTask', () => {
  it('removes the task', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix fence' });

    await deleteTask(ctx.repos, task.id);
    expect(await ctx.repos.tasks.get(task.id)).toBeUndefined();
    expect(await listTasks(ctx.repos)).toEqual([]);
  });

  it('is idempotent when the task is already gone', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const task = await addTask(ctx.repos, { title: 'Fix fence' });
    await deleteTask(ctx.repos, task.id);

    await expect(deleteTask(ctx.repos, task.id)).resolves.toBeUndefined();
  });

  it('removes only the named task, leaving the others', async () => {
    await saveFarmProfile(ctx.repos, 'Rooikraal');
    const keep = await addTask(ctx.repos, { title: 'Keep me' });
    const drop = await addTask(ctx.repos, { title: 'Drop me' });

    await deleteTask(ctx.repos, drop.id);
    const list = await listTasks(ctx.repos);
    expect(list.map((t) => t.id)).toEqual([keep.id]);
  });
});
