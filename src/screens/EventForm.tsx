import { useState, type FormEvent } from 'react';
import { EVENT_TYPES } from '../data/events';
import type { EventType } from '../data';
import type { EventStatus } from './useLivestock';

/** The fields the form collects; the screen supplies which animal it belongs to. */
export interface EventFormValues {
  date: number;
  type: EventType;
  note: string;
}

interface EventFormProps {
  /** Name/tag of the animal or group the event is logged against, for context. */
  animalName: string;
  status: EventStatus;
  /** Returns true when the event saved, so the form can reset. */
  onLog: (values: EventFormValues) => Promise<boolean>;
  onCancel: () => void;
}

/** Today as an ISO date string (YYYY-MM-DD) for the date input's default. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Presentational form to log one event against an animal or group (E2-02): a
 * date (defaults to today), a type, and a note. All persistence lives in the
 * `useLivestock` hook — this component only collects and validates input shape.
 */
export default function EventForm({ animalName, status, onLog, onCancel }: EventFormProps) {
  const [date, setDate] = useState(today);
  const [type, setType] = useState<EventType>('health');
  const [note, setNote] = useState('');

  const saving = status.kind === 'saving';
  const canSubmit = !saving && date.length > 0 && note.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const logged = await onLog({ date: new Date(date).getTime(), type, note });
    if (logged) {
      setType('health');
      setNote('');
      setDate(today());
    }
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={`Log an event for ${animalName}`}>
      <label className="field">
        <span className="field__label">Date</span>
        <input
          className="field__input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={saving}
          data-testid="event-date-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Type</span>
        <select
          className="field__input"
          value={type}
          onChange={(event) => setType(event.target.value as EventType)}
          disabled={saving}
          data-testid="event-type-select"
        >
          {EVENT_TYPES.map((option) => (
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
          placeholder="e.g. Vaccinated for lumpy skin"
          rows={3}
          disabled={saving}
          data-testid="event-note-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Log event
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
