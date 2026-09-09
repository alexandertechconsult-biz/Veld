import { useState, type FormEvent } from 'react';
import type { LivestockRecord } from '../data';
import type { LivestockEdit } from '../data/livestock';
import type { LivestockStatus } from './useLivestock';

interface LivestockEditFormProps {
  animal: LivestockRecord;
  status: LivestockStatus;
  /** Returns true when the edit saved, so the form can close (E2-06). */
  onSave: (changes: LivestockEdit) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Presentational form to correct an animal or group record (E2-06): name/tag,
 * species and count, pre-filled with the current values. Mirrors the register
 * form's fields and validation shape; all persistence lives in the
 * `useLivestock` hook.
 */
export default function LivestockEditForm({
  animal,
  status,
  onSave,
  onCancel,
}: LivestockEditFormProps) {
  const [name, setName] = useState(animal.name);
  const [species, setSpecies] = useState(animal.species);
  const [count, setCount] = useState(String(animal.count));

  const saving = status.kind === 'saving';
  const parsedCount = Number(count);
  const countValid = Number.isInteger(parsedCount) && parsedCount >= 1;
  const canSubmit = !saving && name.trim().length > 0 && species.trim().length > 0 && countValid;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ name, species, count: Number(count) });
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={`Edit ${animal.name}`}>
      <label className="field">
        <span className="field__label">Name or tag</span>
        <input
          className="field__input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="livestock-edit-name-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Species</span>
        <input
          className="field__input"
          type="text"
          value={species}
          onChange={(event) => setSpecies(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="livestock-edit-species-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Count</span>
        <input
          className="field__input"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={count}
          onChange={(event) => setCount(event.target.value)}
          disabled={saving}
          data-testid="livestock-edit-count-input"
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
