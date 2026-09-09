import { useCallback, useEffect, useState } from 'react';
import { repositories } from '../data';
import type { Activity, Enterprise, Field, ID } from '../data';
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
  type FieldEdit,
  type NewField,
} from '../data/fields';
import {
  ActivityNotFoundError,
  EmptyActivityNoteError,
  InvalidActivityDateError,
  InvalidActivityTypeError,
  NoFieldError,
  addActivity,
  deleteActivity,
  listActivitiesFor,
  updateActivity,
  type ActivityEdit,
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

/** Each field's activities, most recent first, keyed by its id (E3-03). */
export type ActivitiesByField = Readonly<Record<string, Activity[]>>;

/** Load every field's activity history (most recent first), keyed by id. */
async function loadActivities(list: Field[]): Promise<ActivitiesByField> {
  const entries = await Promise.all(
    list.map(async (field) => {
      const activities = await listActivitiesFor(repositories, field.id);
      return [field.id, activities] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Known field errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof EmptyFieldNameError ||
    error instanceof EmptyCropTypeError ||
    error instanceof NoCropEnterpriseError ||
    error instanceof FieldNotFoundError ||
    error instanceof EmptyActivityNoteError ||
    error instanceof InvalidActivityDateError ||
    error instanceof InvalidActivityTypeError ||
    error instanceof NoFieldError ||
    error instanceof ActivityNotFoundError
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
  const [activitiesByField, setActivitiesByField] = useState<ActivitiesByField>({});
  const [status, setStatus] = useState<FieldsStatus>({ kind: 'loading' });
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>({ kind: 'idle' });

  /** Re-read the fields and their activity history from the database into state. */
  const reload = useCallback(async () => {
    const list = await listFields(repositories);
    setFields(list);
    setActivitiesByField(await loadActivities(list));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listCropEnterprises(repositories),
          listFields(repositories),
        ]);
        const activities = await loadActivities(list);
        if (!active) return;
        setEnterprises(ents);
        setFields(list);
        setActivitiesByField(activities);
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

  /** Returns true when the edit saved, so the edit form can close itself (E3-05). */
  const editField = useCallback(
    async (id: ID, changes: FieldEdit): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await updateField(repositories, id, changes);
        await reload();
        setStatus({ kind: 'saved', message: 'Changes saved.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not update the field. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the field (and its activities) were removed (E3-05). */
  const removeField = useCallback(
    async (id: ID): Promise<boolean> => {
      setStatus({ kind: 'saving' });
      try {
        await deleteField(repositories, id);
        await reload();
        setStatus({ kind: 'saved', message: 'Field removed.' });
        return true;
      } catch (error) {
        setStatus({
          kind: 'error',
          message: messageFor(error, 'Could not delete the field. Please try again.'),
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

  /** Returns true when the activity edit saved, so its form can close (E3-05). */
  const editActivity = useCallback(
    async (id: ID, changes: ActivityEdit): Promise<boolean> => {
      setActivityStatus({ kind: 'saving' });
      try {
        await updateActivity(repositories, id, changes);
        await reload();
        setActivityStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setActivityStatus({
          kind: 'error',
          message: messageFor(error, 'Could not update the activity. Please try again.'),
        });
        return false;
      }
    },
    [reload],
  );

  /** Returns true when the activity was removed (E3-05). */
  const removeActivity = useCallback(
    async (id: ID): Promise<boolean> => {
      setActivityStatus({ kind: 'saving' });
      try {
        await deleteActivity(repositories, id);
        await reload();
        setActivityStatus({ kind: 'saved' });
        return true;
      } catch (error) {
        setActivityStatus({
          kind: 'error',
          message: messageFor(error, 'Could not delete the activity. Please try again.'),
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
    activitiesByField,
    status,
    activityStatus,
    registerField,
    editField,
    removeField,
    logActivity,
    editActivity,
    removeActivity,
    resetActivityStatus,
  };
}
