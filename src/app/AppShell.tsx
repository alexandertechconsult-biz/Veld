import { useEffect } from 'react';
import { destinationFor, DEFAULT_ROUTE } from './navigation';
import { useHashRoute } from './useHashRoute';
import { NavigationProvider } from './navigationContext';
import { SCREENS } from './screens';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import { formatDocumentTitle } from '../appInfo';

/**
 * Owns the router and lays out the responsive shell: a left sidebar at 768px and
 * up, a bottom tab bar below it (CSS decides which is visible), with the active
 * screen rendered in between. Every route resolves to a real screen — there is
 * no blank state.
 */
export default function AppShell() {
  const [route, navigate] = useHashRoute();
  const destination = destinationFor(route);
  const Screen = SCREENS[route];

  useEffect(() => {
    document.title = formatDocumentTitle(route === DEFAULT_ROUTE ? undefined : destination.label);
  }, [route, destination.label]);

  return (
    <NavigationProvider value={navigate}>
      <div className="app-shell">
        <Sidebar activeRoute={route} onNavigate={navigate} />
        <div className="app-body">
          <header className="app-header">
            <h1 className="app-header__title">{destination.label}</h1>
          </header>
          <main className="app-main">
            <div className="app-content">
              <Screen />
            </div>
          </main>
        </div>
        <BottomTabBar activeRoute={route} onNavigate={navigate} />
      </div>
    </NavigationProvider>
  );
}
