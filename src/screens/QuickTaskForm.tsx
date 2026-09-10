import { useState, type FormEvent } from 'react';
import type { NewTask, TaskLinkOption } from '../data/tasks';
import type { QuickAddStatus } from './useQuickAdd';
import { NO_LINK, decodeLink, encodeLink } from './taskLinks';

interface QuickTaskFormProps {
  linkOptions: TaskLinkOption[];
  status: QuickAddStatus;
  /** Returns true when the task saved, so the sheet can close. */
  onCreate: (input: NewTask) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Compact task form for the Home quick-add sheet (E7-02). A required title with
 * an optional link, assignee and due date — the same fields as the Tasks screen,
 * but sized for a three-tap capture. Persistence lives in `useQuickAdd`; this
 * only collects input.
 */
export default function QuickTaskForm({ linkOptions, status, onCreate, onCancel }: QuickTaskFormProps) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState(NO_LINK);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const saving = status.kind === 'saving';
  const canSubmit = !saving && title.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      title,
      ...decodeLink(link),
      assignee,
      ...(dueDate ? { dueDate: new Date(dueDate).getTime() } : {}),
    });
  }

  return (
    <form className="event-form" onSubmit={onSubmit} aria-label="Add a task">
      <label className="field">
        <span className="field__label">Title</span>
        <input
          className="field__input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Move cattle to north camp"
          autoComplete="off"
          disabled={saving}
          data-testid="quick-task-title-input"
        />
      </label>

      {linkOptions.length > 0 ? (
        <label className="field">
          <span className="field__label">Link to (optional)</span>
          <select
            className="field__input"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={saving}
            data-testid="quick-task-link-select"
          >
            <option value={NO_LINK}>No link</option>
            {linkOptions.map((option) => (
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
          placeholder="e.g. Themba"
          autoComplete="off"
          disabled={saving}
          data-testid="quick-task-assignee-input"
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
          data-testid="quick-task-due-input"
        />
      </label>

      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Back
        </button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Add task
        </button>
      </div>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
