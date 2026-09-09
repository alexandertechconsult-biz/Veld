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
  /** Pre-fill the form when correcting an existing activity (E3-05). */
  initial?: ActivityFormValues;
  /** Submit button text; defaults to logging a new activity. */
  submitLabel?: string;
  /** Accessible form name; defaults to the log-an-activity phrasing. */
  title?: string;
}

/** Today as an ISO date string (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** An epoch-ms date as the YYYY-MM-DD the date input expects. */
function toDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Presentational form for one activity against a field or block. Used both to
 * log a new activity (E3-02) and, pre-filled via `initial`, to correct one
 * (E3-05). All persistence lives in the `useFields` hook — this component only
 * collects and shapes input. When editing, the activity keeps its original date
 * unless the farmer changes the date field.
 */
export default function ActivityForm({
  fieldName,
  status,
  onLog,
  onCancel,
  initial,
  submitLabel = 'Log activity',
  title,
}: ActivityFormProps) {
  const [date, setDate] = useState(() => (initial ? toDateInput(initial.date) : today()));
  const [type, setType] = useState<ActivityType>(initial?.type ?? 'planting');
  const [note, setNote] = useState(initial?.note ?? '');

  const saving = status.kind === 'saving';
  const canSubmit = !saving && date.length > 0 && note.trim().length > 0;
  const formTitle = title ?? `Log an activity for ${fieldName}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onLog({ date: new Date(date).getTime(), type, note });
    if (saved && !initial) {
      // A fresh log-form resets for the next entry; an edit form is closed by
      // its parent, so there is nothing to reset.
      setType('planting');
      setNote('');
      setDate(today());
    }
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={formTitle}>
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
          {submitLabel}
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
