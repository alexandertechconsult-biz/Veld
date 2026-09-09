import { useState, type FormEvent } from 'react';
import { ListTodo } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import TaskRow from './TaskRow';
import { useTasks } from './useTasks';
import { NO_LINK, decodeLink, encodeLink } from './taskLinks';

/**
 * Tasks module. Create a task (E4-01) — a required title with an optional link
 * to a field or animal/group, a free-text assignee and a due date — list the
 * farm's tasks grouped by Open and Done, mark a task done in a single tap
 * (E4-02), and edit, delete or reopen a task (E4-03).
 */
export default function TasksScreen() {
  const navigate = useNavigate();
  const { tasks, linkOptions, status, createTask, markDone, reopen, editTask, removeTask } =
    useTasks();

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
  const openTasks = tasks.filter((task) => task.status === 'open');
  const doneTasks = tasks.filter((task) => task.status === 'done');

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
        <>
          <h3 className="task-group__title">Open</h3>
          {openTasks.length === 0 ? (
            <p className="settings-status">No open tasks.</p>
          ) : (
            <ul className="record-list" aria-label="Open tasks">
              {openTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  options={linkOptions}
                  status={status}
                  onMarkDone={markDone}
                  onEdit={editTask}
                  onDelete={removeTask}
                  busy={saving}
                />
              ))}
            </ul>
          )}

          {doneTasks.length > 0 ? (
            <>
              <h3 className="task-group__title">Done</h3>
              <ul className="record-list" aria-label="Done tasks">
                {doneTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    options={linkOptions}
                    status={status}
                    onReopen={reopen}
                    onEdit={editTask}
                    onDelete={removeTask}
                    busy={saving}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </>
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
