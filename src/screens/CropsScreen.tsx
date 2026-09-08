import { Sprout } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';

export default function CropsScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Sprout}
      message="No fields or blocks yet. Set up your farm to add crops."
      action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
    />
  );
}
