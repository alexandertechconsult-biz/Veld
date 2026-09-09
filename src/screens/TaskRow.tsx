import { useState } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import type { ID, Task } from '../data';
import type { TaskEdit, TaskLinkOption } from '../data/tasks';
import ConfirmDelete from './ConfirmDelete';
import TaskEditForm from './TaskEditForm';
import type { TasksStatus } from './useTasks';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/** The label of the field/animal a task links to, or null when it links to none. */
function linkLabel(task: Task, options: TaskLinkOption[]): string | null {
  const linkedId = task.fieldId ?? task.livestockId;
  if (!linkedId) return null;
  return options.find((option) => option.id === linkedId)?.label ?? null;
}

/** The one-line summary under a task title: link, assignee and due date. */
function metaLine(task: Task, options: TaskLinkOption[]): string {
  const parts: string[] = [];
  const linked = linkLabel(task, options);
  if (linked) parts.push(linked);
  if (task.assignee) parts.push(task.assignee);
  if (task.dueDate !== undefined) parts.push(`Due ${new Date(task.dueDate).toLocaleDateString()}`);
  return parts.join(' · ');
}

interface TaskRowProps {
  task: Task;
  options: TaskLinkOption[];
  status: TasksStatus;
  /** Present only for open tasks — a single tap marks the task done (E4-02). */
  onMarkDone?: (id: ID) => void;
  /** Present only for done tasks — reopens the task (E4-03). */
  onReopen?: (id: ID) => void;
  onEdit: (id: ID, changes: TaskEdit) => Promise<boolean>;
  onDelete: (id: ID) => Promise<boolean>;
  /** True while a write is in flight, so the controls can't double-fire. */
  busy?: boolean;
}

/**
 * One task in the list. Open tasks carry a single-tap control that marks them
 * done; done tasks show a completed marker and a Reopen control instead (E4-03).
 * Every task can be edited inline or deleted behind a naming confirmation.
 */
export default function TaskRow({
  task,
  options,
  status,
  onMarkDone,
  onReopen,
  onEdit,
  onDelete,
  busy,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const meta = metaLine(task, options);
  const done = task.status === 'done';

  if (editing) {
    return (
      <li className="record-row">
        <div className="record-row__panel">
          <TaskEditForm
            task={task}
            options={options}
            status={status}
            onSave={async (changes) => {
              const saved = await onEdit(task.id, changes);
              if (saved) setEditing(false);
              return saved;
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="record-row">
      <div className="record-row__main">
        {done ? (
          <CheckCircle2
            className="task-row__done-icon"
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
          />
        ) : (
          <button
            type="button"
            className="task-row__check"
            onClick={() => onMarkDone?.(task.id)}
            disabled={busy}
            aria-label={`Mark "${task.title}" done`}
          >
            <Circle size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        )}
        <div className="record-row__text">
          <span className={done ? 'record-row__name task-row__name--done' : 'record-row__name'}>
            {task.title}
          </span>
          {meta ? <span className="record-row__meta">{meta}</span> : null}
        </div>
      </div>
      <div className="record-row__tools">
        {done ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onReopen?.(task.id)}
            disabled={busy}
          >
            Reopen
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Edit task
        </button>
        <ConfirmDelete
          triggerLabel="Delete task"
          confirmMessage={`Delete "${task.title}"? This can't be undone.`}
          onConfirm={() => onDelete(task.id)}
        />
      </div>
    </li>
  );
}
