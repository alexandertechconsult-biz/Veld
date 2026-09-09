import { useState } from 'react';
import { Sprout } from 'lucide-react';
import type { Activity, Field, ID } from '../data';
import type { FieldEdit } from '../data/fields';
import type { ActivityFormValues } from './ActivityForm';
import ActivityForm from './ActivityForm';
import ActivityHistory from './ActivityHistory';
import FieldEditForm from './FieldEditForm';
import ConfirmDelete from './ConfirmDelete';
import type { ActivityStatus, FieldsStatus } from './useFields';

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
  status: FieldsStatus;
  activityStatus: ActivityStatus;
  isOpen: boolean;
  onToggle: () => void;
  onEditField: (changes: FieldEdit) => Promise<boolean>;
  onRemoveField: () => Promise<boolean>;
  onLogActivity: (values: ActivityFormValues) => Promise<boolean>;
  onEditActivity: (id: ID, changes: ActivityFormValues) => Promise<boolean>;
  onRemoveActivity: (id: ID) => Promise<boolean>;
  resetActivityStatus: () => void;
}

/**
 * One field or block in the crops list. The always-visible line shows the field
 * and its activity count; expanding it reveals the activity history (E3-03), a
 * log-activity form (E3-02), and the correct/remove controls for both the field
 * and each activity (E3-05).
 */
export default function FieldRow({
  field,
  history,
  status,
  activityStatus,
  isOpen,
  onToggle,
  onEditField,
  onRemoveField,
  onLogActivity,
  onEditActivity,
  onRemoveActivity,
  resetActivityStatus,
}: FieldRowProps) {
  const [editingField, setEditingField] = useState(false);
  const activities = activityCountLabel(history.length);

  function toggle() {
    // A freshly opened row starts on the log form, never mid-edit.
    setEditingField(false);
    onToggle();
  }

  const deleteMessage =
    history.length > 0
      ? `Delete ${field.name} and its ${activities}? This can't be undone.`
      : `Delete ${field.name}? This can't be undone.`;

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
          onClick={toggle}
        >
          {isOpen ? 'Close' : 'Log activity'}
        </button>
      </div>

      {isOpen ? (
        <div className="record-row__panel">
          {editingField ? (
            <FieldEditForm
              field={field}
              status={status}
              onSave={async (changes) => {
                const saved = await onEditField(changes);
                if (saved) setEditingField(false);
                return saved;
              }}
              onCancel={() => setEditingField(false)}
            />
          ) : (
            <>
              <div className="record-row__tools">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingField(true)}
                >
                  Edit field
                </button>
                <ConfirmDelete
                  triggerLabel="Delete field"
                  confirmMessage={deleteMessage}
                  onConfirm={onRemoveField}
                />
              </div>
              <ActivityHistory
                fieldName={field.name}
                activities={history}
                status={activityStatus}
                onEditActivity={onEditActivity}
                onDeleteActivity={onRemoveActivity}
                resetStatus={resetActivityStatus}
              />
              <ActivityForm
                fieldName={field.name}
                status={activityStatus}
                onLog={onLogActivity}
                onCancel={onToggle}
              />
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
