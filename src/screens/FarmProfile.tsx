import { useEffect, useState, type FormEvent } from 'react';
import { useFarmProfile } from './useFarmProfile';

/**
 * Farm profile setup (E1-01). One field — the farm name — saved to IndexedDB so
 * the app knows the operation exists. Pre-fills the existing name when a farm is
 * already set up; otherwise prompts to create one.
 */
export default function FarmProfile() {
  const { farm, status, saveFarm } = useFarmProfile();
  const [name, setName] = useState('');

  // Seed the field from the saved farm once it loads (or after a rename).
  useEffect(() => {
    if (farm) {
      setName(farm.name);
    }
  }, [farm]);

  const loading = status.kind === 'loading';
  const saving = status.kind === 'saving';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveFarm(name);
  }

  return (
    <section className="settings-section" aria-labelledby="farm-heading">
      <h2 id="farm-heading" className="settings-section__title">
        Farm profile
      </h2>
      <p className="settings-section__hint">
        Name your farm so the app knows your operation exists. You can change it any time.
      </p>

      {loading ? (
        <p className="settings-status" role="status">
          Loading…
        </p>
      ) : (
        <form className="farm-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">Farm name</span>
            <input
              className="field__input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Rooikraal Farm"
              autoComplete="off"
              disabled={saving}
              data-testid="farm-name-input"
            />
          </label>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || name.trim().length === 0}
          >
            {farm ? 'Save changes' : 'Create farm'}
          </button>
        </form>
      )}

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'saved' ? (
        <p className="settings-status settings-status--success" role="status">
          Farm saved.
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p className="settings-status settings-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
