import { ChevronRight } from 'lucide-react';
import { SECONDARY_DESTINATIONS } from '../app/navigation';
import { useNavigate } from '../app/navigationContext';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/** The More destination: a menu into Financials and Settings (Section 8.1). */
export default function MoreScreen() {
  const navigate = useNavigate();
  return (
    <nav className="menu-list" aria-label="More destinations">
      {SECONDARY_DESTINATIONS.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className="menu-row" onClick={() => navigate(id)}>
          <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span className="menu-row__label">{label}</span>
          <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
