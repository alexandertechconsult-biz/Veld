import type { LucideIcon } from 'lucide-react';

/**
 * The one component every zero-data screen uses (Section 7). An icon, one line
 * saying what is missing, and an optional primary action saying exactly what to
 * do next — never a bare "No data".
 */
export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: EmptyStateAction;
}

const ICON_SIZE = 32;
const ICON_STROKE = 1.5;

export default function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon
        className="empty-state__icon"
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
      <p className="empty-state__message">{message}</p>
      {action ? (
        <button type="button" className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
