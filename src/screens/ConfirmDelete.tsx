import { useState } from 'react';

interface ConfirmDeleteProps {
  /** Button text that opens the confirmation, e.g. "Delete animal". */
  triggerLabel: string;
  /** A sentence naming exactly what will be removed (E2-06 requires naming it). */
  confirmMessage: string;
  /** Runs the delete; resolves to whether it succeeded. */
  onConfirm: () => Promise<boolean>;
  disabled?: boolean;
}

/**
 * A destructive action guarded by an inline confirmation (E2-06): the first tap
 * reveals a message that names what is about to be removed, and only a second,
 * explicit tap deletes it. Inline rather than a modal, per the design-system's
 * "no modal-heavy flows" rule. The destructive buttons use `--danger` (the
 * token the palette reserves for delete), kept as secondary buttons.
 */
export default function ConfirmDelete({
  triggerLabel,
  confirmMessage,
  onConfirm,
  disabled,
}: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-secondary btn-secondary--danger"
        onClick={() => setConfirming(true)}
        disabled={disabled}
      >
        {triggerLabel}
      </button>
    );
  }

  async function confirm() {
    setDeleting(true);
    const removed = await onConfirm();
    // On success the row usually unmounts; reset in case it stays mounted.
    if (!removed) {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="confirm-delete" role="group" aria-label="Confirm delete">
      <p className="confirm-delete__message" role="alert">
        {confirmMessage}
      </p>
      <div className="confirm-delete__actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Keep
        </button>
        <button
          type="button"
          className="btn-secondary btn-secondary--danger"
          onClick={confirm}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
