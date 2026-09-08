import { Settings } from 'lucide-react';
import EmptyState from '../components/EmptyState';

/**
 * Farm setup lands here. The creation flow itself is E1-01; until then this is a
 * useful empty state, not a blank screen, and the CTA arrives with that ticket.
 */
export default function SettingsScreen() {
  return <EmptyState icon={Settings} message="No farm set up yet. Farm setup lives here." />;
}
