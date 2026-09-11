import { useState } from 'react';
import AppShell from './app/AppShell';
import FirstRunFlow from './screens/FirstRunFlow';
import { useFirstRun } from './screens/useFirstRun';

/**
 * The app root. On first launch — no farm on this device yet — it runs the
 * guided first-run flow (E1-03) so the farmer never lands on an empty app; the
 * flow walks farm name, then a first enterprise, then done. Once a farm exists
 * (or the farmer finishes the flow) it hands off to the shell for good.
 */
export default function App() {
  const { status, saving, error, createFarm, addFirstEnterprise, loadDemo } = useFirstRun();
  const [finished, setFinished] = useState(false);

  if (status === 'loading') {
    return (
      <div className="first-run">
        <p className="settings-status" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (status === 'needed' && !finished) {
    return (
      <FirstRunFlow
        saving={saving}
        error={error}
        onCreateFarm={createFarm}
        onAddEnterprise={addFirstEnterprise}
        onLoadDemo={loadDemo}
        onDone={() => setFinished(true)}
      />
    );
  }

  return <AppShell />;
}
