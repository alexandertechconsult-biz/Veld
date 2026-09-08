import { ListTodo } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';

export default function TasksScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={ListTodo}
      message="No tasks yet. Set up your farm to start adding tasks."
      action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
    />
  );
}
