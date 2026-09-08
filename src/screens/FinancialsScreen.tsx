import { Wallet } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';

export default function FinancialsScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Wallet}
      message="No costs or sales yet. Set up your farm to start logging money."
      action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
    />
  );
}
