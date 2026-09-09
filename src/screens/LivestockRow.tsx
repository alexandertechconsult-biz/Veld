import { useState } from 'react';
import { Beef } from 'lucide-react';
import type { Event, ID, LivestockRecord } from '../data';
import type { LivestockEdit } from '../data/livestock';
import { describeLivestock } from '../data/livestock';
import type { EventFormValues } from './EventForm';
import EventForm from './EventForm';
import EventHistory from './EventHistory';
import LivestockEditForm from './LivestockEditForm';
import ConfirmDelete from './ConfirmDelete';
import type { EventStatus, LivestockStatus } from './useLivestock';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/** "3 events" / "1 event"; empty when none, so the meta line stays short. */
function eventCountLabel(count: number): string {
  if (count === 0) return '';
  return count === 1 ? '1 event' : `${count} events`;
}

interface LivestockRowProps {
  animal: LivestockRecord;
  /** This animal's events, most recent first. */
  history: Event[];
  status: LivestockStatus;
  eventStatus: EventStatus;
  isOpen: boolean;
  onToggle: () => void;
  onEditAnimal: (changes: LivestockEdit) => Promise<boolean>;
  onRemoveAnimal: () => Promise<boolean>;
  onLogEvent: (values: EventFormValues) => Promise<boolean>;
  onEditEvent: (id: ID, changes: EventFormValues) => Promise<boolean>;
  onRemoveEvent: (id: ID) => Promise<boolean>;
  resetEventStatus: () => void;
}

/**
 * One animal or group in the livestock list. The always-visible line shows the
 * record and its event count; expanding it reveals the event history (E2-03),
 * a log-event form (E2-02), and the correct/remove controls for both the record
 * and each event (E2-06).
 */
export default function LivestockRow({
  animal,
  history,
  status,
  eventStatus,
  isOpen,
  onToggle,
  onEditAnimal,
  onRemoveAnimal,
  onLogEvent,
  onEditEvent,
  onRemoveEvent,
  resetEventStatus,
}: LivestockRowProps) {
  const [editingAnimal, setEditingAnimal] = useState(false);
  const { countLabel } = describeLivestock(animal);
  const events = eventCountLabel(history.length);

  function toggle() {
    // A freshly opened row starts on the log form, never mid-edit.
    setEditingAnimal(false);
    onToggle();
  }

  const deleteMessage =
    history.length > 0
      ? `Delete ${animal.name} and its ${events}? This can't be undone.`
      : `Delete ${animal.name}? This can't be undone.`;

  return (
    <li className="record-row">
      <div className="record-row__main">
        <Beef size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        <span className="record-row__text">
          <span className="record-row__name">{animal.name}</span>
          <span className="record-row__meta">
            {animal.species} · {countLabel}
            {events ? ` · ${events}` : ''}
          </span>
        </span>
        <button
          type="button"
          className="btn-secondary record-row__action"
          aria-expanded={isOpen}
          onClick={toggle}
        >
          {isOpen ? 'Close' : 'Log event'}
        </button>
      </div>

      {isOpen ? (
        <div className="record-row__panel">
          {editingAnimal ? (
            <LivestockEditForm
              animal={animal}
              status={status}
              onSave={async (changes) => {
                const saved = await onEditAnimal(changes);
                if (saved) setEditingAnimal(false);
                return saved;
              }}
              onCancel={() => setEditingAnimal(false)}
            />
          ) : (
            <>
              <div className="record-row__tools">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingAnimal(true)}
                >
                  Edit animal
                </button>
                <ConfirmDelete
                  triggerLabel="Delete animal"
                  confirmMessage={deleteMessage}
                  onConfirm={onRemoveAnimal}
                />
              </div>
              <EventHistory
                animalName={animal.name}
                events={history}
                status={eventStatus}
                onEditEvent={onEditEvent}
                onDeleteEvent={onRemoveEvent}
                resetStatus={resetEventStatus}
              />
              <EventForm
                animalName={animal.name}
                status={eventStatus}
                onLog={onLogEvent}
                onCancel={onToggle}
              />
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
