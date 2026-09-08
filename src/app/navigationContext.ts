import { createContext, useContext } from 'react';
import type { Navigate } from './useHashRoute';

/**
 * Exposes the navigate function to screens without prop-drilling it through the
 * shell. The provider lives in AppShell, which owns the router.
 */
const NavigationContext = createContext<Navigate | null>(null);

export const NavigationProvider = NavigationContext.Provider;

export function useNavigate(): Navigate {
  const navigate = useContext(NavigationContext);
  if (!navigate) {
    throw new Error('useNavigate must be used within a NavigationProvider');
  }
  return navigate;
}
