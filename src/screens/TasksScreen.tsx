import { useState, type FormEvent } from 'react';
import { ListTodo } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import type { Task } from '../data';
import { useTasks } from './useTasks';
import type { TaskLinkOption } from '../data/tasks';

/** The picker's "no link" sentinel and the encoding of a real link option. */
const NO_LINK = '';
const encodeLink = (option: TaskLinkOption): string => `${option.kind}:${option.id}`;

/** Split a picker value back into the field/animal ids the domain expects. */
function decodeLink(value: string): { fieldId?: string; livestockId?: string } {
  if (value === NO_LINK) return {};
  const [kind, id] = value.split(':');
  return kind === 'field' ? { fieldId: id } : { livestockId: id };
}

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

/**
 * Tasks module. Create a task (E4-01) — a required title with an optional link
 * to a field or animal/group, a free-text assignee and a due date — and list
 * the farm's tasks. Marking done (E4-02) and edit/delete (E4-03) are separate
 * tickets.
 */
export default function TasksScreen() {
  const navigate = useNavigate();
  const { tasks, linkOptions, status, createTask } = useTasks();

  const [title, setTitle] = useState('');
  const [link, setLink] = useState(NO_LINK);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  if (status.kind === 'loading') {
    return (
      <p className="settings-status" role="status">
        Loading…
      </p>
    );
  }

  // No farm means there is nothing to attach a task to yet.
  if (status.kind === 'no-farm') {
    return (
      <EmptyState
        icon={ListTodo}
        message="No farm yet. Set up your farm in Settings, then add your tasks."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  const saving = status.kind === 'saving';
  const canSubmit = !saving && title.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await createTask({
      title,
      ...decodeLink(link),
      assignee,
      // An empty date input leaves the due date off entirely.
      ...(dueDate ? { dueDate: new Date(dueDate).getTime() } : {}),
    });
    if (created) {
      setTitle('');
      setLink(NO_LINK);
      setAssignee('');
      setDueDate('');
    }
  }

  return (
    <section className="module" aria-labelledby="tasks-heading">
      <h2 id="tasks-heading" className="module__title">
        Tasks
      </h2>
      <p className="module__hint">
        Add a task with a title. Optionally link it to a field or animal, name who it's for, and
        set a due date.
      </p>

      {tasks.length === 0 ? (
        <p className="settings-status">No tasks yet. Add your first below.</p>
      ) : (
        <ul className="record-list" aria-label="Tasks">
          {tasks.map((task) => {
            const meta = metaLine(task, linkOptions);
            return (
              <li key={task.id} className="record-row">
                <div className="record-row__main">
                  <div className="record-row__text">
                    <span className="record-row__name">{task.title}</span>
                    {meta ? <span className="record-row__meta">{meta}</span> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="farm-form" onSubmit={onSubmit}>
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
            data-testid="task-title-input"
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
              data-testid="task-link-select"
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
            data-testid="task-assignee-input"
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
            data-testid="task-due-input"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Add task
        </button>
      </form>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'saved' ? (
        <p className="settings-status settings-status--success" role="status">
          {status.message}
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
