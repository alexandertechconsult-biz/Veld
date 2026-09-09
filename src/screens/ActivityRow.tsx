import { useState } from 'react';
import { ACTIVITY_TYPES } from '../data/activities';
import type { Activity, ActivityType, ID } from '../data';
import ActivityForm, { type ActivityFormValues } from './ActivityForm';
import ConfirmDelete from './ConfirmDelete';
import type { ActivityStatus } from './useFields';

/** Label to show for each activity type, from the single ACTIVITY_TYPES source. */
const TYPE_LABELS: Readonly<Record<ActivityType, string>> = Object.fromEntries(
  ACTIVITY_TYPES.map((entry) => [entry.value, entry.label]),
) as Record<ActivityType, string>;

/** Human date for an activity, e.g. "8 Sep 2026". Empty on a bad value. */
function formatActivityDate(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ActivityRowProps {
  activity: Activity;
  /** Name of the field or block, for accessible labels. */
  fieldName: string;
  status: ActivityStatus;
  onEdit: (id: ID, changes: ActivityFormValues) => Promise<boolean>;
  onDelete: (id: ID) => Promise<boolean>;
  /** Clears any stale status when an inline form opens. */
  resetStatus: () => void;
}

/**
 * One activity in the history (E3-03), with inline edit and delete (E3-05). The
 * crop analogue of EventRow. Editing reuses the ActivityForm pre-filled with
 * this activity's values, so correcting the note or type leaves the original
 * date in place unless the farmer changes it. Deleting names the activity
 * before it is removed.
 */
export default function ActivityRow({
  activity,
  fieldName,
  status,
  onEdit,
  onDelete,
  resetStatus,
}: ActivityRowProps) {
  const [editing, setEditing] = useState(false);
  const typeLabel = TYPE_LABELS[activity.type];
  const dateLabel = formatActivityDate(activity.date);

  function openEdit() {
    resetStatus();
    setEditing(true);
  }

  if (editing) {
    return (
      <li className="event-history__row">
        <ActivityForm
          fieldName={fieldName}
          status={status}
          initial={{ date: activity.date, type: activity.type, note: activity.note }}
          submitLabel="Save activity"
          title={`Edit ${typeLabel} activity for ${fieldName}`}
          onLog={async (values) => {
            const saved = await onEdit(activity.id, values);
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
        <time className="event-history__date" dateTime={new Date(activity.date).toISOString()}>
          {dateLabel}
        </time>
      </div>
      <p className="event-history__note">{activity.note}</p>
      <div className="event-history__actions">
        <button type="button" className="btn-secondary" onClick={openEdit}>
          Edit activity
        </button>
        <ConfirmDelete
          triggerLabel="Delete activity"
          confirmMessage={`Delete this ${typeLabel} activity from ${dateLabel}? This can't be undone.`}
          onConfirm={() => onDelete(activity.id)}
        />
      </div>
    </li>
  );
}
