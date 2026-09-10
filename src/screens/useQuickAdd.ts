import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, Field, LivestockRecord } from '../data';
import { loadCurrentFarm } from '../data/farmProfile';
import { addEvent } from '../data/events';
import { addActivity } from '../data/activities';
import { addTask, listTaskLinkOptions, type NewTask, type TaskLinkOption } from '../data/tasks';
import { addTransaction, type NewTransaction } from '../data/transactions';
import { listLivestock } from '../data/livestock';
import { listFields } from '../data/fields';
import { listEnterprises } from '../data/enterprises';
import type { EventFormValues } from './EventForm';
import type { ActivityFormValues } from './ActivityForm';

/**
 * UI state for a single quick-add save. Structurally identical to the module
 * screens' event/activity statuses, so the reused `EventForm`/`ActivityForm`
 * accept it directly.
 */
export type QuickAddStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** The picker targets the quick-add sheet needs, loaded once when it opens. */
interface QuickAddTargets {
  animals: LivestockRecord[];
  fields: Field[];
  enterprises: Enterprise[];
  linkOptions: TaskLinkOption[];
}

const NO_TARGETS: QuickAddTargets = { animals: [], fields: [], enterprises: [], linkOptions: [] };

const GENERIC_ERROR = 'Could not save. Please try again.';

/** A thrown domain error already carries a farmer-facing message; fall back generically. */
function messageFor(error: unknown): string {
  return error instanceof Error && error.message ? error.message : GENERIC_ERROR;
}

/**
 * Composition root for the Home quick-add sheet (E7-02). Loads the farm's
 * animals, fields and enterprises so every log target is one tap away, and wraps
 * the four pure domain `add*` functions behind create handlers that report a
 * single save status. Focused on create only — edit/delete stay in the module
 * screens — so the sheet depends on a small interface, not four screen hooks.
 */
export function useQuickAdd(open: boolean) {
  const [loading, setLoading] = useState(true);
  const [hasFarm, setHasFarm] = useState(false);
  const [targets, setTargets] = useState<QuickAddTargets>(NO_TARGETS);
  const [status, setStatus] = useState<QuickAddStatus>({ kind: 'idle' });

  // Load the pickers each time the sheet opens, so a target added elsewhere
  // (e.g. a new animal in Settings) shows up without a full app reload.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setStatus({ kind: 'idle' });
    void (async () => {
      try {
        const [farm, animals, fields, enterprises, linkOptions] = await Promise.all([
          loadCurrentFarm(repositories),
          listLivestock(repositories),
          listFields(repositories),
          listEnterprises(repositories),
          listTaskLinkOptions(repositories),
        ]);
        if (!active) return;
        setHasFarm(farm !== null);
        setTargets({ animals, fields, enterprises, linkOptions });
      } catch {
        if (!active) return;
        setStatus({ kind: 'error', message: 'Could not open quick add. Please reload the app.' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const resetStatus = useCallback(() => setStatus({ kind: 'idle' }), []);

  // One save runner: all four handlers share the saving/saved/error transitions
  // and return true only when the write landed, so a form can close on success.
  const run = useCallback(async (save: () => Promise<unknown>): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await save();
      setStatus({ kind: 'saved' });
      return true;
    } catch (error) {
      setStatus({ kind: 'error', message: messageFor(error) });
      return false;
    }
  }, []);

  const logEvent = useCallback(
    (livestockId: string, values: EventFormValues) =>
      run(() => addEvent(repositories, { livestockId, ...values })),
    [run],
  );

  const logActivity = useCallback(
    (fieldId: string, values: ActivityFormValues) =>
      run(() => addActivity(repositories, { fieldId, ...values })),
    [run],
  );

  const createTask = useCallback(
    (input: NewTask) => run(() => addTask(repositories, input)),
    [run],
  );

  const logTransaction = useCallback(
    (input: NewTransaction) => run(() => addTransaction(repositories, input)),
    [run],
  );

  return {
    loading,
    hasFarm,
    animals: targets.animals,
    fields: targets.fields,
    enterprises: targets.enterprises,
    linkOptions: targets.linkOptions,
    status,
    resetStatus,
    logEvent,
    logActivity,
    createTask,
    logTransaction,
  };
}
