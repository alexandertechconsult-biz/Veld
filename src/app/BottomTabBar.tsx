import { PRIMARY_DESTINATIONS, PRIMARY_FOR_ROUTE, type RouteId } from './navigation';
import type { Navigate } from './useHashRoute';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

interface BottomTabBarProps {
  activeRoute: RouteId;
  onNavigate: Navigate;
}

/** Bottom tab bar, shown below 768px (Section 8.1). */
export default function BottomTabBar({ activeRoute, onNavigate }: BottomTabBarProps) {
  const activePrimary = PRIMARY_FOR_ROUTE[activeRoute];
  return (
    <nav className="tab-bar" aria-label="Primary">
      {PRIMARY_DESTINATIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="tab-bar__item"
          aria-current={activePrimary === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span className="tab-bar__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
