import { EVENT_TYPES } from '../data/events';
import type { Event, EventType } from '../data';

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

interface EventHistoryProps {
  /** Name/tag of the animal or group, so the list can be labelled for context. */
  animalName: string;
  /** Events for this animal, most recent first (ordered by the data layer). */
  events: Event[];
}

/**
 * Read-only history of events for one animal or group (E2-03): a chronological
 * list, most recent first. The ordering is owned by the data layer
 * (`listEventsFor` → `mostRecentFirst`); this component only renders it.
 */
export default function EventHistory({ animalName, events }: EventHistoryProps) {
  if (events.length === 0) {
    return (
      <p className="event-history__empty settings-status">No events logged yet.</p>
    );
  }

  return (
    <ol className="event-history" aria-label={`Event history for ${animalName}`}>
      {events.map((event) => (
        <li key={event.id} className="event-history__row">
          <div className="event-history__head">
            <span className="event-history__type">{TYPE_LABELS[event.type]}</span>
            <time className="event-history__date" dateTime={new Date(event.date).toISOString()}>
              {formatEventDate(event.date)}
            </time>
          </div>
          <p className="event-history__note">{event.note}</p>
        </li>
      ))}
    </ol>
  );
}
