import { Sprout } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';

export default function HomeScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Sprout}
      message="No activity yet. Set up your farm to start logging."
      action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
    />
  );
}
