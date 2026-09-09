import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { ID, Task } from '../data';
import { loadCurrentFarm } from '../data/farmProfile';
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
  type NewTask,
  type TaskEdit,
  type TaskLinkOption,
} from '../data/tasks';

/** UI state for the tasks module: exactly one thing is true at a time. */
export type TasksStatus =
  | { kind: 'loading' }
  | { kind: 'no-farm' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/** Known task errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof EmptyTaskTitleError ||
    error instanceof NoFarmForTaskError ||
    error instanceof InvalidDueDateError ||
    error instanceof TaskLinkNotFoundError ||
    error instanceof TaskNotFoundError
    ? error.message
    : fallback;
}

/**
 * Owns the current farm's tasks and the field/animal options a task can link to,
 * plus the create operation, wiring the pure `data/tasks` logic to the app-wide
 * repositories. The component stays presentational; all persistence lives here.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkOptions, setLinkOptions] = useState<TaskLinkOption[]>([]);
  const [status, setStatus] = useState<TasksStatus>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const farm = await loadCurrentFarm(repositories);
        if (!farm) {
          if (active) setStatus({ kind: 'no-farm' });
          return;
        }
        const [list, options] = await Promise.all([
          listTasks(repositories),
          listTaskLinkOptions(repositories),
        ]);
        if (!active) return;
        setTasks(list);
        setLinkOptions(options);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your tasks. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Returns true when the task was created, so the form can clear itself. */
  const createTask = useCallback(async (input: NewTask): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await addTask(repositories, input);
      setTasks(await listTasks(repositories));
      setStatus({ kind: 'saved', message: 'Task added.' });
      return true;
    } catch (error) {
      setStatus({
        kind: 'error',
        message: messageFor(error, 'Could not add the task. Please try again.'),
      });
      return false;
    }
  }, []);

  /** Reloads the task list after a mutation. */
  const reload = useCallback(async () => {
    setTasks(await listTasks(repositories));
  }, []);

  /** Marks a task done in a single call and reloads so it moves to the Done group. */
  const markDone = useCallback(
    async (id: ID): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await markTaskDone(repositories, id);
        await reload();
        setStatus({ kind: 'saved', message: 'Task marked done.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not update the task. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Reopens a done task and reloads so it moves back to the Open group (E4-03). */
  const reopen = useCallback(
    async (id: ID): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await reopenTask(repositories, id);
        await reload();
        setStatus({ kind: 'saved', message: 'Task reopened.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not update the task. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Corrects a task's title, link, assignee and due date (E4-03). */
  const editTask = useCallback(
    async (id: ID, changes: TaskEdit): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await updateTask(repositories, id, changes);
        await reload();
        setStatus({ kind: 'saved', message: 'Task updated.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not update the task. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Deletes a task and reloads so it drops out of the list (E4-03). */
  const removeTask = useCallback(
    async (id: ID): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await deleteTask(repositories, id);
        await reload();
        setStatus({ kind: 'saved', message: 'Task deleted.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not delete the task. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  return { tasks, linkOptions, status, createTask, markDone, reopen, editTask, removeTask };
}
