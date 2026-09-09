import { Circle, CheckCircle2 } from 'lucide-react';
import type { ID, Task } from '../data';
import type { TaskLinkOption } from '../data/tasks';

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
  /** Present only for open tasks — a single tap marks the task done (E4-02). */
  onMarkDone?: (id: ID) => void;
  /** True while a mark-done write is in flight, so the control can't double-fire. */
  busy?: boolean;
}

/**
 * One task in the list. Open tasks carry a single-tap control that marks them
 * done; done tasks show a completed marker instead (reopening is E4-03).
 */
export default function TaskRow({ task, options, onMarkDone, busy }: TaskRowProps) {
  const meta = metaLine(task, options);
  const done = task.status === 'done';
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
    </li>
  );
}
