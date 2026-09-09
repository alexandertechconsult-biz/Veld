import { useState, type FormEvent } from 'react';
import type { Task } from '../data';
import type { TaskEdit, TaskLinkOption } from '../data/tasks';
import { NO_LINK, currentLinkValue, decodeLink, encodeLink } from './taskLinks';
import type { TasksStatus } from './useTasks';

/** A due-date timestamp as the YYYY-MM-DD a <input type="date"> expects. */
function toDateInput(dueDate: number | undefined): string {
  if (dueDate === undefined || !Number.isFinite(dueDate)) return '';
  return new Date(dueDate).toISOString().slice(0, 10);
}

interface TaskEditFormProps {
  task: Task;
  options: TaskLinkOption[];
  status: TasksStatus;
  /** Returns true when the edit saved, so the row can close it (E4-03). */
  onSave: (changes: TaskEdit) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Presentational form to correct a task (E4-03): title, link, assignee and due
 * date, pre-filled with the task's current values. Mirrors the create form's
 * fields; all persistence lives in the `useTasks` hook. Submitting sends a full
 * snapshot, so clearing a field here clears it on the task.
 */
export default function TaskEditForm({ task, options, status, onSave, onCancel }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [link, setLink] = useState(currentLinkValue(task));
  const [assignee, setAssignee] = useState(task.assignee ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));

  const saving = status.kind === 'saving';
  const canSubmit = !saving && title.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      title,
      ...decodeLink(link),
      assignee,
      // An empty date input clears the due date entirely.
      ...(dueDate ? { dueDate: new Date(dueDate).getTime() } : {}),
    });
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label={`Edit ${task.title}`}>
      <label className="field">
        <span className="field__label">Title</span>
        <input
          className="field__input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="task-edit-title-input"
        />
      </label>

      {options.length > 0 ? (
        <label className="field">
          <span className="field__label">Link to (optional)</span>
          <select
            className="field__input"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={saving}
            data-testid="task-edit-link-select"
          >
            <option value={NO_LINK}>No link</option>
            {options.map((option) => (
              <option key={encodeLink(option)} value={encodeLink(option)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span className="field__label">Assignee (optional)</span>
        <input
          className="field__input"
          type="text"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          autoComplete="off"
          disabled={saving}
          data-testid="task-edit-assignee-input"
        />
      </label>

      <label className="field">
        <span className="field__label">Due date (optional)</span>
        <input
          className="field__input"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          disabled={saving}
          data-testid="task-edit-due-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Save changes
        </button>
      </div>

      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
