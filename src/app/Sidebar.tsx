import { APP_NAME } from '../appInfo';
import { PRIMARY_DESTINATIONS, PRIMARY_FOR_ROUTE, type RouteId } from './navigation';
import type { Navigate } from './useHashRoute';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

interface SidebarProps {
  activeRoute: RouteId;
  onNavigate: Navigate;
}

/** Left sidebar, shown at 768px and up (Section 8.1). Same five destinations. */
export default function Sidebar({ activeRoute, onNavigate }: SidebarProps) {
  const activePrimary = PRIMARY_FOR_ROUTE[activeRoute];
  return (
    <div className="sidebar">
      <div className="sidebar__brand">{APP_NAME}</div>
      <nav className="sidebar__nav" aria-label="Primary">
        {PRIMARY_DESTINATIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sidebar__item"
            aria-current={activePrimary === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
