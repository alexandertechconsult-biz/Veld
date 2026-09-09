import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Enterprise, Field } from '../data';
import {
  EmptyCropTypeError,
  EmptyFieldNameError,
  NoCropEnterpriseError,
  addField,
  listCropEnterprises,
  listFields,
  type NewField,
} from '../data/fields';
import {
  EmptyActivityNoteError,
  InvalidActivityDateError,
  InvalidActivityTypeError,
  NoFieldError,
  addActivity,
  listActivitiesFor,
  type NewActivity,
} from '../data/activities';

/** UI state for the crops module: exactly one thing is true at a time. */
export type FieldsStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/** UI state for logging an activity: independent of the register-field status. */
export type ActivityStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** How many activities each field has logged, keyed by its id. */
export type ActivityCounts = Readonly<Record<string, number>>;

/** Count each field's activities, keyed by id, for the row's meta badge. */
async function loadActivityCounts(list: Field[]): Promise<ActivityCounts> {
  const entries = await Promise.all(
    list.map(async (field) => {
      const activities = await listActivitiesFor(repositories, field.id);
      return [field.id, activities.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Known field errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof EmptyFieldNameError ||
    error instanceof EmptyCropTypeError ||
    error instanceof NoCropEnterpriseError ||
    error instanceof EmptyActivityNoteError ||
    error instanceof InvalidActivityDateError ||
    error instanceof InvalidActivityTypeError ||
    error instanceof NoFieldError
    ? error.message
    : fallback;
}

/**
 * Owns the current farm's crop enterprises, registered fields and their
 * activity counts, plus the register and log operations, wiring the pure
 * `data/fields` and `data/activities` logic to the app-wide repositories. The
 * component stays presentational; all persistence lives here.
 */
export function useFields() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>({});
  const [status, setStatus] = useState<FieldsStatus>({ kind: 'loading' });
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>({ kind: 'idle' });

  /** Re-read the fields and their activity counts from the database into state. */
  const reload = useCallback(async () => {
    const list = await listFields(repositories);
    setFields(list);
    setActivityCounts(await loadActivityCounts(list));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listCropEnterprises(repositories),
          listFields(repositories),
        ]);
        const counts = await loadActivityCounts(list);
        if (!active) return;
        setEnterprises(ents);
        setFields(list);
        setActivityCounts(counts);
        setStatus({ kind: 'ready' });
      } catch {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: 'Could not load your fields. Please reload the app.',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Returns true when the field was registered, so the form can clear itself. */
  const registerField = useCallback(
    async (input: NewField): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await addField(repositories, input);
        await reload();
        setStatus({ kind: 'saved', message: 'Field registered.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not register the field. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the activity was logged, so the form can close itself. */
  const logActivity = useCallback(
    async (input: NewActivity): Promise<boolean> => {
      setActivityStatus({ kind: 'saving' });
      try {
        await addActivity(repositories, input);
        await reload();
        setActivityStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setActivityStatus({
          kind: 'error',
          message: messageFor(error, 'Could not log the activity. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Clear any prior activity status, so a freshly opened form starts clean. */
  const resetActivityStatus = useCallback(() => {
    setActivityStatus({ kind: 'idle' });
  }, []);

  return {
    enterprises,
    fields,
    activityCounts,
    status,
    activityStatus,
    registerField,
    logActivity,
    resetActivityStatus,
  };
}
