import type { Event, ID } from '../data';
import type { EventFormValues } from './EventForm';
import EventRow from './EventRow';
import type { EventStatus } from './useLivestock';

interface EventHistoryProps {
  /** Name/tag of the animal or group, so the list can be labelled for context. */
  animalName: string;
  /** Events for this animal, most recent first (ordered by the data layer). */
  events: Event[];
  status: EventStatus;
  onEditEvent: (id: ID, changes: EventFormValues) => Promise<boolean>;
  onDeleteEvent: (id: ID) => Promise<boolean>;
  /** Clears any stale status when an inline edit form opens. */
  resetStatus: () => void;
}

/**
 * Read-only history of events for one animal or group (E2-03): a chronological
 * list, most recent first. The ordering is owned by the data layer
 * (`listEventsFor` → `mostRecentFirst`); this component renders it and hands
 * each row its own inline edit and delete controls (E2-06).
 */
export default function EventHistory({
  animalName,
  events,
  status,
  onEditEvent,
  onDeleteEvent,
  resetStatus,
}: EventHistoryProps) {
  if (events.length === 0) {
    return <p className="event-history__empty settings-status">No events logged yet.</p>;
  }

  return (
    <ol className="event-history" aria-label={`Event history for ${animalName}`}>
      {events.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          animalName={animalName}
          status={status}
          onEdit={onEditEvent}
          onDelete={onDeleteEvent}
          resetStatus={resetStatus}
        />
      ))}
    </ol>
  );
}
