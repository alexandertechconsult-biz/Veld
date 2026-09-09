import { useState, type FormEvent } from 'react';
import { ACTIVITY_TYPES } from '../data/activities';
import type { ActivityType } from '../data';
import type { ActivityStatus } from './useFields';

/** The fields the form collects; the screen supplies which field it belongs to. */
export interface ActivityFormValues {
  date: number;
  type: ActivityType;
  note: string;
}

interface ActivityFormProps {
  /** Name of the field or block the activity is logged against, for context. */
  fieldName: string;
  status: ActivityStatus;
  /** Returns true when the activity saved, so the form can reset or close. */
  onLog: (values: ActivityFormValues) => Promise<boolean>;
  onCancel: () => void;
}

/** Today as an ISO date string (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Presentational form for one activity against a field or block (E3-02). All
 * persistence lives in the `useFields` hook — this component only collects and
 * shapes input. A fresh log resets the form for the next entry.
 */
export default function ActivityForm({ fieldName, status, onLog, onCancel }: ActivityFormProps) {
  const [date, setDate] = useState(today);
  const [type, setType] = useState<ActivityType>('planting');
  const [note, setNote] = useState('');

  const saving = status.kind === 'saving';
  const canSubmit = !saving && date.length > 0 && note.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onLog({ date: new Date(date).getTime(), type, note });
    if (saved) {
      setType('planting');
      setNote('');
      setDate(today());
    }
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={`Log an activity for ${fieldName}`}>
      <label className="field">
        <span className="field__label">Date</span>
        <input
          className="field__input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={saving}
          data-testid="activity-date-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Type</span>
        <select
          className="field__input"
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType)}
          disabled={saving}
          data-testid="activity-type-select"
        >
          {ACTIVITY_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Note</span>
        <textarea
          className="field__input event-form__note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Planted maize, 2 bags seed"
          rows={3}
          disabled={saving}
          data-testid="activity-note-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Log activity
        </button>
      </div>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
