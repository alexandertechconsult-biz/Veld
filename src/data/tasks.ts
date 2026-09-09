// Task domain logic (E4-01). Pure of any DOM or singleton, like farmProfile and
// the module domains: the repositories are injected, so this is unit-testable
// against a fresh database and reused by the `useTasks` hook at the composition
// root.
//
// A Task belongs to the farm (BACKLOG.md Section 6) with a required title, and
// may optionally link to a field or an animal/group, carry a free-text assignee,
// and a due date. This ticket creates one; marking done (E4-02) and edit/delete
// (E4-03) are separate tickets, so a new task always starts `open`.

import { loadCurrentFarm } from './farmProfile';
import { listFields } from './fields';
import { listLivestock } from './livestock';
import type { Repositories } from './index';
import type { ID, Task } from './types';

/** Raised when a task is created with a blank title, so the UI can prompt. */
export class EmptyTaskTitleError extends Error {
  constructor() {
    super('Enter a title for the task.');
    this.name = 'EmptyTaskTitleError';
  }
}

/** Raised when creating a task before the farm profile exists. */
export class NoFarmForTaskError extends Error {
  constructor() {
    super('Create your farm profile before adding a task.');
    this.name = 'NoFarmForTaskError';
  }
}

/** Raised when the supplied due date is not a real point in time. */
export class InvalidDueDateError extends Error {
  constructor() {
    super('Choose a valid due date.');
    this.name = 'InvalidDueDateError';
  }
}

/** Raised when the linked field or animal/group does not exist. */
export class TaskLinkNotFoundError extends Error {
  constructor() {
    super('The linked field or animal no longer exists.');
    this.name = 'TaskLinkNotFoundError';
  }
}

/** Raised when marking a task that no longer exists. */
export class TaskNotFoundError extends Error {
  constructor() {
    super('That task no longer exists.');
    this.name = 'TaskNotFoundError';
  }
}

/** The fields a caller supplies to create a task. Only the title is required. */
export interface NewTask {
  title: string;
  /** Optional link to a specific field/block. */
  fieldId?: ID;
  /** Optional link to a specific animal or group. */
  livestockId?: ID;
  /** Free text for MVP — no user accounts yet. */
  assignee?: string;
  /** Epoch milliseconds, optional. */
  dueDate?: number;
}

/**
 * A full snapshot of a task's editable fields (E4-03). Unlike a partial patch,
 * the caller supplies every editable field on each save — the edit form always
 * has them all — so the link, assignee and due date can be changed or cleared:
 * an omitted `fieldId`/`livestockId` clears the link, a blank assignee clears
 * the assignee, and an omitted `dueDate` clears the due date. Status is not
 * editable here — reopening is a separate call.
 */
export interface TaskEdit {
  title: string;
  fieldId?: ID;
  livestockId?: ID;
  assignee?: string;
  dueDate?: number;
}

/** What a task can be linked to: a field or an animal/group. */
export type TaskLinkKind = 'field' | 'livestock';

/** One option the link picker offers, already labelled for display. */
export interface TaskLinkOption {
  kind: TaskLinkKind;
  id: ID;
  label: string;
}

/**
 * The fields and animals/groups a task can be linked to, fields first then
 * livestock, each already labelled. Empty when the farm has none yet, in which
 * case the UI simply omits the link picker.
 */
export async function listTaskLinkOptions(repos: Repositories): Promise<TaskLinkOption[]> {
  const [fields, livestock] = await Promise.all([listFields(repos), listLivestock(repos)]);
  return [
    ...fields.map((field): TaskLinkOption => ({ kind: 'field', id: field.id, label: field.name })),
    ...livestock.map(
      (record): TaskLinkOption => ({ kind: 'livestock', id: record.id, label: record.name }),
    ),
  ];
}

/**
 * Every task on this device's farm, most recently created first so a just-added
 * task appears at the top. Empty when no farm exists yet.
 */
export async function listTasks(repos: Repositories): Promise<Task[]> {
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    return [];
  }
  const tasks = await repos.tasks.listByFarm(farm.id);
  return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Creates a task against the current farm. Trims the title and rejects a blank
 * one without writing; requires a farm to exist first. The link, assignee and
 * due date are optional: a supplied link is validated to still exist, a blank
 * assignee is omitted rather than stored as "", and a supplied due date must be
 * a real point in time. A new task always starts `open`.
 */
export async function addTask(repos: Repositories, input: NewTask): Promise<Task> {
  const title = input.title.trim();
  if (!title) {
    throw new EmptyTaskTitleError();
  }
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    throw new NoFarmForTaskError();
  }
  if (input.dueDate !== undefined && !Number.isFinite(input.dueDate)) {
    throw new InvalidDueDateError();
  }
  if (input.fieldId !== undefined && !(await repos.fields.get(input.fieldId))) {
    throw new TaskLinkNotFoundError();
  }
  if (input.livestockId !== undefined && !(await repos.livestock.get(input.livestockId))) {
    throw new TaskLinkNotFoundError();
  }
  const assignee = input.assignee?.trim();
  return repos.tasks.create({
    farmId: farm.id,
    title,
    status: 'open',
    ...(input.fieldId ? { fieldId: input.fieldId } : {}),
    ...(input.livestockId ? { livestockId: input.livestockId } : {}),
    ...(assignee ? { assignee } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
  });
}

/**
 * Marks a task done (E4-02): a single call flips its status to `done`, moving it
 * to the Done group in the UI. Requires the task to exist. Idempotent — marking
 * an already-done task done again is a harmless no-op that leaves it done.
 * Reopening a done task, and editing or deleting one, are E4-03.
 */
export async function markTaskDone(repos: Repositories, id: ID): Promise<Task> {
  const existing = await repos.tasks.get(id);
  if (!existing) {
    throw new TaskNotFoundError();
  }
  return repos.tasks.update(id, { status: 'done' });
}

/**
 * Reopens a done task (E4-03): flips its status back to `open`, moving it to the
 * Open group in the UI. Requires the task to exist. Idempotent — reopening an
 * already-open task is a harmless no-op. Leaves the title, link, assignee and
 * due date untouched.
 */
export async function reopenTask(repos: Repositories, id: ID): Promise<Task> {
  const existing = await repos.tasks.get(id);
  if (!existing) {
    throw new TaskNotFoundError();
  }
  return repos.tasks.update(id, { status: 'open' });
}

/**
 * Corrects an existing task (E4-03): title, link, assignee and due date. The
 * title is trimmed and a blank one is rejected without writing. The link,
 * assignee and due date are applied as given — a supplied link is validated to
 * still exist, a blank assignee is cleared rather than stored as "", and a
 * supplied due date must be a real point in time — so an omitted field/animal,
 * assignee or due date clears it. The task's done/open status is left untouched.
 * Requires the task to exist.
 */
export async function updateTask(
  repos: Repositories,
  id: ID,
  changes: TaskEdit,
): Promise<Task> {
  const existing = await repos.tasks.get(id);
  if (!existing) {
    throw new TaskNotFoundError();
  }
  const title = changes.title.trim();
  if (!title) {
    throw new EmptyTaskTitleError();
  }
  if (changes.dueDate !== undefined && !Number.isFinite(changes.dueDate)) {
    throw new InvalidDueDateError();
  }
  if (changes.fieldId !== undefined && !(await repos.fields.get(changes.fieldId))) {
    throw new TaskLinkNotFoundError();
  }
  if (changes.livestockId !== undefined && !(await repos.livestock.get(changes.livestockId))) {
    throw new TaskLinkNotFoundError();
  }
  const assignee = changes.assignee?.trim();
  return repos.tasks.update(id, {
    title,
    fieldId: changes.fieldId,
    livestockId: changes.livestockId,
    assignee: assignee ? assignee : undefined,
    dueDate: changes.dueDate,
  });
}

/**
 * Removes a task (E4-03). Idempotent: deleting a task that is already gone is a
 * no-op. A task has no children, so nothing cascades.
 */
export async function deleteTask(repos: Repositories, id: ID): Promise<void> {
  await repos.tasks.delete(id);
}
