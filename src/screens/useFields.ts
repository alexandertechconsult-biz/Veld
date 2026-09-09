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

/** UI state for the crops module: exactly one thing is true at a time. */
export type FieldsStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

/** Known domain errors carry a farmer-facing message; anything else is a fallback. */
function messageFor(error: unknown, fallback: string): string {
  return error instanceof EmptyFieldNameError ||
    error instanceof EmptyCropTypeError ||
    error instanceof NoCropEnterpriseError
    ? error.message
    : fallback;
}

/**
 * Owns the current farm's crop enterprises and registered fields, plus the
 * register operation, wiring the pure `data/fields` logic to the app-wide
 * repositories. The component stays presentational; all persistence lives here.
 */
export function useFields() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [status, setStatus] = useState<FieldsStatus>({ kind: 'loading' });

  /** Re-read the fields from the database into state. */
  const reload = useCallback(async () => {
    setFields(await listFields(repositories));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ents, list] = await Promise.all([
          listCropEnterprises(repositories),
          listFields(repositories),
        ]);
        if (!active) return;
        setEnterprises(ents);
        setFields(list);
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

  return { enterprises, fields, status, registerField };
}
