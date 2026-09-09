import { useState } from 'react';
import { EVENT_TYPES } from '../data/events';
import type { Event, EventType, ID } from '../data';
import EventForm, { type EventFormValues } from './EventForm';
import ConfirmDelete from './ConfirmDelete';
import type { EventStatus } from './useLivestock';

/** Label to show for each event type, derived from the single EVENT_TYPES source. */
const TYPE_LABELS: Readonly<Record<EventType, string>> = Object.fromEntries(
  EVENT_TYPES.map((entry) => [entry.value, entry.label]),
) as Record<EventType, string>;

/** Human date for an event, e.g. "8 Sep 2026". Falls back to nothing on a bad value. */
function formatEventDate(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface EventRowProps {
  event: Event;
  /** Name/tag of the animal or group, for accessible labels. */
  animalName: string;
  status: EventStatus;
  onEdit: (id: ID, changes: EventFormValues) => Promise<boolean>;
  onDelete: (id: ID) => Promise<boolean>;
  /** Clears any stale status when an inline form opens. */
  resetStatus: () => void;
}

/**
 * One event in the history (E2-03), with inline edit and delete (E2-06). Editing
 * reuses the EventForm pre-filled with this event's values, so correcting the
 * note or type leaves the original date in place unless the farmer changes it.
 * Deleting names the event before it is removed.
 */
export default function EventRow({
  event,
  animalName,
  status,
  onEdit,
  onDelete,
  resetStatus,
}: EventRowProps) {
  const [editing, setEditing] = useState(false);
  const typeLabel = TYPE_LABELS[event.type];
  const dateLabel = formatEventDate(event.date);

  function openEdit() {
    resetStatus();
    setEditing(true);
  }

  if (editing) {
    return (
      <li className="event-history__row">
        <EventForm
          animalName={animalName}
          status={status}
          initial={{ date: event.date, type: event.type, note: event.note }}
          submitLabel="Save event"
          title={`Edit ${typeLabel} event for ${animalName}`}
          onLog={async (values) => {
            const saved = await onEdit(event.id, values);
            if (saved) setEditing(false);
            return saved;
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="event-history__row">
      <div className="event-history__head">
        <span className="event-history__type">{typeLabel}</span>
        <time className="event-history__date" dateTime={new Date(event.date).toISOString()}>
          {dateLabel}
        </time>
      </div>
      <p className="event-history__note">{event.note}</p>
      <div className="event-history__actions">
        <button type="button" className="btn-secondary" onClick={openEdit}>
          Edit event
        </button>
        <ConfirmDelete
          triggerLabel="Delete event"
          confirmMessage={`Delete this ${typeLabel} event from ${dateLabel}? This can't be undone.`}
          onConfirm={() => onDelete(event.id)}
        />
      </div>
    </li>
  );
}
