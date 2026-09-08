import { Beef } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';

export default function LivestockScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Beef}
      message="No animals or groups yet. Set up your farm to add livestock."
      action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
    />
  );
}
