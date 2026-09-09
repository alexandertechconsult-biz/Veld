import { Sprout } from 'lucide-react';
import type { Activity, Field } from '../data';
import type { ActivityFormValues } from './ActivityForm';
import ActivityForm from './ActivityForm';
import ActivityHistory from './ActivityHistory';
import type { ActivityStatus } from './useFields';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/** "3 activities" / "1 activity"; empty when none, so the meta line stays short. */
function activityCountLabel(count: number): string {
  if (count === 0) return '';
  return count === 1 ? '1 activity' : `${count} activities`;
}

interface FieldRowProps {
  field: Field;
  /** This field's activities, most recent first. */
  history: Activity[];
  activityStatus: ActivityStatus;
  isOpen: boolean;
  onToggle: () => void;
  onLogActivity: (values: ActivityFormValues) => Promise<boolean>;
}

/**
 * One field or block in the crops list. The always-visible line shows the field
 * and its activity count; expanding it reveals the activity history (E3-03) above
 * a log-activity form (E3-02). Edit/delete (E3-05) arrives in a later ticket.
 */
export default function FieldRow({
  field,
  history,
  activityStatus,
  isOpen,
  onToggle,
  onLogActivity,
}: FieldRowProps) {
  const activities = activityCountLabel(history.length);

  return (
    <li className="record-row">
      <div className="record-row__main">
        <Sprout size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        <span className="record-row__text">
          <span className="record-row__name">{field.name}</span>
          <span className="record-row__meta">
            {field.cropType}
            {field.size ? ` · ${field.size}` : ''}
            {activities ? ` · ${activities}` : ''}
          </span>
        </span>
        <button
          type="button"
          className="btn-secondary record-row__action"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          {isOpen ? 'Close' : 'Log activity'}
        </button>
      </div>

      {isOpen ? (
        <div className="record-row__panel">
          <ActivityHistory fieldName={field.name} activities={history} />
          <ActivityForm
            fieldName={field.name}
            status={activityStatus}
            onLog={onLogActivity}
            onCancel={onToggle}
          />
        </div>
      ) : null}
    </li>
  );
}
