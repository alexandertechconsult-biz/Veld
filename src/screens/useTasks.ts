import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Task } from '../data';
import { loadCurrentFarm } from '../data/farmProfile';
import {
  EmptyTaskTitleError,
  InvalidDueDateError,
  NoFarmForTaskError,
  TaskLinkNotFoundError,
  addTask,
  listTaskLinkOptions,
  listTasks,
  type NewTask,
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
    error instanceof TaskLinkNotFoundError
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

  return { tasks, linkOptions, status, createTask };
}
