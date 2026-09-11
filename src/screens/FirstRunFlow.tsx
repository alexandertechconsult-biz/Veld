import { useState, type FormEvent } from 'react';
import type { EnterpriseType } from '../data';

const STEPS_TOTAL = 2;

/** The three steps of the first-run flow: name the farm, add one enterprise, done. */
type Step = 'farm' | 'enterprise' | 'done';

interface FirstRunFlowProps {
  /** True while a create is in flight, so inputs and the action disable. */
  saving: boolean;
  /** A farmer-facing error from the last create attempt, or null. */
  error: string | null;
  /** Persists the farm name; resolves true when saved so the flow advances. */
  onCreateFarm: (name: string) => Promise<boolean>;
  /** Persists the first enterprise; resolves true when saved so the flow advances. */
  onAddEnterprise: (name: string, type: EnterpriseType) => Promise<boolean>;
  /** Loads the pre-populated demo farm (E8-01) instead of manual setup. On
   *  success the app hands off to the shell, so no local step change is needed. */
  onLoadDemo: () => Promise<boolean>;
  /** Called when the farmer finishes, so the app hands off to the shell. */
  onDone: () => void;
}

/**
 * Guided first-run flow (E1-03). On the very first launch, before the shell, it
 * walks the farmer through naming their farm, then adding a first enterprise,
 * then done — so they never land on an empty app. Presentational: every write
 * goes through the `onCreateFarm`/`onAddEnterprise` callbacks wired in `App`.
 */
export default function FirstRunFlow({
  saving,
  error,
  onCreateFarm,
  onAddEnterprise,
  onLoadDemo,
  onDone,
}: FirstRunFlowProps) {
  const [step, setStep] = useState<Step>('farm');
  const [farmName, setFarmName] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseType, setEnterpriseType] = useState<EnterpriseType>('livestock');

  async function submitFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onCreateFarm(farmName)) {
      setStep('enterprise');
    }
  }

  async function submitEnterprise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onAddEnterprise(enterpriseName, enterpriseType)) {
      setStep('done');
    }
  }

  return (
    <main className="first-run" aria-labelledby="first-run-title">
      <div className="first-run__card">
        {step === 'farm' ? (
          <>
            <p className="first-run__step">Step 1 of {STEPS_TOTAL}</p>
            <h1 id="first-run-title" className="first-run__title">
              Name your farm
            </h1>
            <p className="first-run__hint">
              This is the operation the app keeps records for. You can change it any time in
              Settings.
            </p>
            <form className="farm-form" onSubmit={submitFarm}>
              <label className="field">
                <span className="field__label">Farm name</span>
                <input
                  className="field__input"
                  type="text"
                  value={farmName}
                  onChange={(event) => setFarmName(event.target.value)}
                  placeholder="e.g. Rooikraal Farm"
                  autoComplete="off"
                  disabled={saving}
                  data-testid="first-run-farm-input"
                />
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || farmName.trim().length === 0}
              >
                Continue
              </button>
            </form>
            <div className="first-run__demo">
              <p className="first-run__demo-hint">Just want to look around first?</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void onLoadDemo()}
                disabled={saving}
                data-testid="first-run-load-demo"
              >
                Load a demo farm
              </button>
            </div>
          </>
        ) : null}

        {step === 'enterprise' ? (
          <>
            <p className="first-run__step">Step 2 of {STEPS_TOTAL}</p>
            <h1 id="first-run-title" className="first-run__title">
              Add your first enterprise
            </h1>
            <p className="first-run__hint">
              An enterprise is a part of your operation — a herd, a flock, a block of maize. Add one
              to start; you can add more later.
            </p>
            <form className="farm-form" onSubmit={submitEnterprise}>
              <label className="field">
                <span className="field__label">Enterprise name</span>
                <input
                  className="field__input"
                  type="text"
                  value={enterpriseName}
                  onChange={(event) => setEnterpriseName(event.target.value)}
                  placeholder="e.g. Beef herd"
                  autoComplete="off"
                  disabled={saving}
                  data-testid="first-run-enterprise-input"
                />
              </label>
              <label className="field">
                <span className="field__label">Type</span>
                <select
                  className="field__input"
                  value={enterpriseType}
                  onChange={(event) => setEnterpriseType(event.target.value as EnterpriseType)}
                  disabled={saving}
                  data-testid="first-run-enterprise-type"
                >
                  <option value="livestock">Livestock</option>
                  <option value="crop">Crop</option>
                </select>
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || enterpriseName.trim().length === 0}
              >
                Continue
              </button>
            </form>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <h1 id="first-run-title" className="first-run__title">
              Setup complete
            </h1>
            <p className="first-run__hint">
              Your farm and first enterprise are saved on this device. Log an event, activity, task
              or cost whenever you need to.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={onDone}
              data-testid="first-run-done"
            >
              Start logging
            </button>
          </>
        ) : null}

        {error ? (
          <p className="settings-status settings-status--error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
