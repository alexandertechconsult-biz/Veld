import { Sprout } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import { useRecentActivity } from './useRecentActivity';
import { describeEntry } from './recentActivityView';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/**
 * Home screen. Shows the farm's most recent activity across all four modules —
 * livestock events, crop activities, tasks and transactions — mixed and most
 * recent first (E7-01). Today's/overdue tasks (E7-03) and the quick-add sheet
 * (E7-02) are separate, later tickets.
 */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { entries, hasFarm, status } = useRecentActivity();

  if (status.kind === 'loading') {
    return (
      <p className="settings-status" role="status">
        Loading…
      </p>
    );
  }

  if (status.kind === 'error') {
    return (
      <p className="settings-status settings-status--error" role="alert">
        {status.message}
      </p>
    );
  }

  if (entries.length === 0) {
    return hasFarm ? (
      <EmptyState
        icon={Sprout}
        message="No activity yet. Log an event, activity, task, or cost and it will show up here."
      />
    ) : (
      <EmptyState
        icon={Sprout}
        message="No activity yet. Set up your farm to start logging."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  return (
    <section className="module" aria-labelledby="home-heading">
      <h2 id="home-heading" className="module__title">
        Recent activity
      </h2>
      <p className="module__hint">Your most recent entries across the whole farm.</p>

      <ul className="record-list" aria-label="Recent activity">
        {entries.map((entry) => {
          const { icon: Icon, name, meta } = describeEntry(entry);
          return (
            <li className="record-row" key={`${entry.kind}-${entry.record.id}`}>
              <div className="record-row__main">
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                <div className="record-row__text">
                  <span className="record-row__name">{name}</span>
                  {meta ? <span className="record-row__meta">{meta}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
