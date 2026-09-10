import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Beef, Sprout, ListTodo, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from '../app/navigationContext';
import type { RouteId } from '../app/navigation';
import EventForm from './EventForm';
import ActivityForm from './ActivityForm';
import QuickTaskForm from './QuickTaskForm';
import QuickTransactionForm from './QuickTransactionForm';
import { useQuickAdd } from './useQuickAdd';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/** The quick-add sheet is a chooser followed by one of four compact forms. */
type Mode = 'choose' | 'event' | 'activity' | 'task' | 'transaction';

interface QuickAddOption {
  mode: Exclude<Mode, 'choose'>;
  label: string;
  icon: LucideIcon;
}

/** The four things a farmer can log, in the order the spec lists them (§8.2). */
const OPTIONS: readonly QuickAddOption[] = [
  { mode: 'event', label: 'Livestock event', icon: Beef },
  { mode: 'activity', label: 'Crop activity', icon: Sprout },
  { mode: 'task', label: 'Task', icon: ListTodo },
  { mode: 'transaction', label: 'Transaction', icon: Wallet },
];

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful log so the Home feed can refresh. */
  onSaved: () => void;
}

/**
 * Home quick-add sheet (E7-02). A bottom sheet opened by the Home "+" action:
 * tap opens it (1), tap an option (2), then the compact form saves in one more
 * tap (3) — any log completable in under three taps from Home. Reuses the
 * module `EventForm`/`ActivityForm` for two of the four flows, and compact
 * task/transaction forms for the others; all persistence is in `useQuickAdd`.
 */
export default function QuickAddSheet({ open, onClose, onSaved }: QuickAddSheetProps) {
  const navigate = useNavigate();
  const q = useQuickAdd(open);
  const [mode, setMode] = useState<Mode>('choose');
  const [animalId, setAnimalId] = useState('');
  const [fieldId, setFieldId] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Every open starts at the chooser and takes focus for keyboard users.
  useEffect(() => {
    if (open) {
      setMode('choose');
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  // The select falls back to the first target so a log is possible without an
  // extra tap; deriving it avoids an effect racing the async target load.
  const selectedAnimalId = q.animals.some((a) => a.id === animalId)
    ? animalId
    : (q.animals[0]?.id ?? '');
  const selectedFieldId = q.fields.some((f) => f.id === fieldId)
    ? fieldId
    : (q.fields[0]?.id ?? '');
  const selectedAnimal = q.animals.find((a) => a.id === selectedAnimalId);
  const selectedField = q.fields.find((f) => f.id === selectedFieldId);

  function close() {
    setMode('choose');
    onClose();
  }

  function pick(next: Exclude<Mode, 'choose'>) {
    q.resetStatus();
    setMode(next);
  }

  function backToChoose() {
    q.resetStatus();
    setMode('choose');
  }

  function finishSave(saved: boolean): boolean {
    if (saved) {
      onSaved();
      close();
    }
    return saved;
  }

  function goto(route: RouteId) {
    close();
    navigate(route);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') close();
  }

  return (
    <div className="sheet-overlay">
      <button
        type="button"
        className="sheet-scrim"
        aria-label="Close quick add"
        onClick={close}
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Log something"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <header className="sheet__head">
          <h2 className="sheet__title">Log something</h2>
          <button type="button" className="sheet__close" aria-label="Close" onClick={close}>
            <X size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </header>

        <div className="sheet__body">
          {mode === 'choose' ? (
            <ul className="quick-add-options" aria-label="What do you want to log?">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <li key={option.mode}>
                    <button
                      type="button"
                      className="quick-add-option"
                      onClick={() => pick(option.mode)}
                    >
                      <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {mode === 'event' ? (
            q.loading ? (
              <p className="settings-status" role="status">
                Loading…
              </p>
            ) : selectedAnimal ? (
              <>
                <label className="field">
                  <span className="field__label">Animal or group</span>
                  <select
                    className="field__input"
                    value={selectedAnimalId}
                    onChange={(event) => setAnimalId(event.target.value)}
                    data-testid="quick-event-animal-select"
                  >
                    {q.animals.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.name}
                      </option>
                    ))}
                  </select>
                </label>
                <EventForm
                  animalName={selectedAnimal.name}
                  status={q.status}
                  onLog={async (values) => finishSave(await q.logEvent(selectedAnimalId, values))}
                  onCancel={backToChoose}
                />
              </>
            ) : (
              <EmptyTarget
                message="No animals yet. Register an animal or group first."
                actionLabel="Go to Livestock"
                onAction={() => goto('livestock')}
                onBack={backToChoose}
              />
            )
          ) : null}

          {mode === 'activity' ? (
            q.loading ? (
              <p className="settings-status" role="status">
                Loading…
              </p>
            ) : selectedField ? (
              <>
                <label className="field">
                  <span className="field__label">Field or block</span>
                  <select
                    className="field__input"
                    value={selectedFieldId}
                    onChange={(event) => setFieldId(event.target.value)}
                    data-testid="quick-activity-field-select"
                  >
                    {q.fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </label>
                <ActivityForm
                  fieldName={selectedField.name}
                  status={q.status}
                  onLog={async (values) => finishSave(await q.logActivity(selectedFieldId, values))}
                  onCancel={backToChoose}
                />
              </>
            ) : (
              <EmptyTarget
                message="No fields yet. Register a field or block first."
                actionLabel="Go to Crops"
                onAction={() => goto('crops')}
                onBack={backToChoose}
              />
            )
          ) : null}

          {mode === 'task' ? (
            <QuickTaskForm
              linkOptions={q.linkOptions}
              status={q.status}
              onCreate={async (input) => finishSave(await q.createTask(input))}
              onCancel={backToChoose}
            />
          ) : null}

          {mode === 'transaction' ? (
            <QuickTransactionForm
              enterprises={q.enterprises}
              status={q.status}
              onLog={async (input) => finishSave(await q.logTransaction(input))}
              onCancel={backToChoose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface EmptyTargetProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onBack: () => void;
}

/** Shown when a log needs a target the farm doesn't have yet — never a dead end. */
function EmptyTarget({ message, actionLabel, onAction, onBack }: EmptyTargetProps) {
  return (
    <div className="quick-add-empty">
      <p className="settings-status">{message}</p>
      <div className="event-form__actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
