import { useState, type FormEvent } from 'react';
import type { Field } from '../data';
import type { FieldEdit } from '../data/fields';
import type { FieldsStatus } from './useFields';

interface FieldEditFormProps {
  field: Field;
  status: FieldsStatus;
  /** Returns true when the edit saved, so the form can close (E3-05). */
  onSave: (changes: FieldEdit) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Presentational form to correct a field or block record (E3-05): name, crop
 * type and optional size, pre-filled with the current values. Mirrors the
 * register form's fields and validation shape; all persistence lives in the
 * `useFields` hook. A cleared size clears the optional size on save.
 */
export default function FieldEditForm({ field, status, onSave, onCancel }: FieldEditFormProps) {
  const [name, setName] = useState(field.name);
  const [cropType, setCropType] = useState(field.cropType);
  const [size, setSize] = useState(field.size ?? '');

  const saving = status.kind === 'saving';
  const canSubmit = !saving && name.trim().length > 0 && cropType.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ name, cropType, size });
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={`Edit ${field.name}`}>
      <label className="field">
        <span className="field__label">Name</span>
        <input
          className="field__input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="field-edit-name-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Crop type</span>
        <input
          className="field__input"
          type="text"
          value={cropType}
          onChange={(event) => setCropType(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="field-edit-crop-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Size (optional)</span>
        <input
          className="field__input"
          type="text"
          value={size}
          onChange={(event) => setSize(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="field-edit-size-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Save changes
        </button>
      </div>

      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
