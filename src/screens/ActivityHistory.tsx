import type { Activity, ID } from '../data';
import type { ActivityFormValues } from './ActivityForm';
import ActivityRow from './ActivityRow';
import type { ActivityStatus } from './useFields';

interface ActivityHistoryProps {
  /** Name of the field or block, so the list can be labelled for context. */
  fieldName: string;
  /** Activities for this field, most recent first (ordered by the data layer). */
  activities: Activity[];
  status: ActivityStatus;
  onEditActivity: (id: ID, changes: ActivityFormValues) => Promise<boolean>;
  onDeleteActivity: (id: ID) => Promise<boolean>;
  /** Clears any stale status when an inline edit form opens. */
  resetStatus: () => void;
}

/**
 * Read-only history of activities for one field or block (E3-03): a
 * chronological list, most recent first. The crop analogue of EventHistory
 * (E2-03). The ordering is owned by the data layer (`listActivitiesFor` →
 * most recent first); this component renders it and hands each row its own
 * inline edit and delete controls (E3-05).
 */
export default function ActivityHistory({
  fieldName,
  activities,
  status,
  onEditActivity,
  onDeleteActivity,
  resetStatus,
}: ActivityHistoryProps) {
  if (activities.length === 0) {
    return <p className="event-history__empty settings-status">No activities logged yet.</p>;
  }

  return (
    <ol className="event-history" aria-label={`Activity history for ${fieldName}`}>
      {activities.map((activity) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          fieldName={fieldName}
          status={status}
          onEdit={onEditActivity}
          onDelete={onDeleteActivity}
          resetStatus={resetStatus}
        />
      ))}
    </ol>
  );
}
