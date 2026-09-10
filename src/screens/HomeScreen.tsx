import { useState } from 'react';
import { Plus, Sprout } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import { useRecentActivity } from './useRecentActivity';
import { describeEntry } from './recentActivityView';
import QuickAddSheet from './QuickAddSheet';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/**
 * Home screen. Shows the farm's most recent activity across all four modules —
 * livestock events, crop activities, tasks and transactions — mixed and most
 * recent first (E7-01), and a prominent "+" quick-add action that logs any of
 * the four in under three taps (E7-02). Today's/overdue tasks (E7-03) is a later
 * ticket.
 */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { entries, hasFarm, status, reload } = useRecentActivity();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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

  // No farm is the one state where quick-add can't help — there is nothing to
  // log against yet, so point the farmer at setup instead.
  if (!hasFarm) {
    return (
      <EmptyState
        icon={Sprout}
        message="No activity yet. Set up your farm to start logging."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  const quickAddButton = (
    <button
      type="button"
      className="btn-primary quick-add-trigger"
      onClick={() => setQuickAddOpen(true)}
      data-testid="quick-add-trigger"
    >
      <Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>Log something</span>
    </button>
  );

  const sheet = (
    <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onSaved={reload} />
  );

  if (entries.length === 0) {
    return (
      <section className="module" aria-labelledby="home-heading">
        <h2 id="home-heading" className="module__title">
          Recent activity
        </h2>
        {quickAddButton}
        <p className="settings-status">
          No activity yet. Log an event, activity, task, or cost and it will show up here.
        </p>
        {sheet}
      </section>
    );
  }

  return (
    <section className="module" aria-labelledby="home-heading">
      <h2 id="home-heading" className="module__title">
        Recent activity
      </h2>
      {quickAddButton}
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
      {sheet}
    </section>
  );
}
