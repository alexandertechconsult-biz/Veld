import { ACTIVITY_TYPES } from '../data/activities';
import type { Activity, ActivityType } from '../data';

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

interface ActivityHistoryProps {
  /** Name of the field or block, so the list can be labelled for context. */
  fieldName: string;
  /** Activities for this field, most recent first (ordered by the data layer). */
  activities: Activity[];
}

/**
 * Read-only history of activities for one field or block (E3-03): a
 * chronological list, most recent first. The crop analogue of EventHistory
 * (E2-03). The ordering is owned by the data layer (`listActivitiesFor` →
 * most recent first); this component only renders it. Edit and delete arrive
 * in E3-05.
 */
export default function ActivityHistory({ fieldName, activities }: ActivityHistoryProps) {
  if (activities.length === 0) {
    return <p className="event-history__empty settings-status">No activities logged yet.</p>;
  }

  return (
    <ol className="event-history" aria-label={`Activity history for ${fieldName}`}>
      {activities.map((activity) => (
        <li key={activity.id} className="event-history__row">
          <div className="event-history__head">
            <span className="event-history__type">{TYPE_LABELS[activity.type]}</span>
            <time
              className="event-history__date"
              dateTime={new Date(activity.date).toISOString()}
            >
              {formatActivityDate(activity.date)}
            </time>
          </div>
          <p className="event-history__note">{activity.note}</p>
        </li>
      ))}
    </ol>
  );
}
