import { useState, type FormEvent } from 'react';
import { Beef, Sprout } from 'lucide-react';
import type { EnterpriseType } from '../data';
import { useEnterprises } from './useEnterprises';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

const TYPE_LABELS: Record<EnterpriseType, string> = {
  livestock: 'Livestock',
  crop: 'Crop',
};

/**
 * Enterprise setup (E1-02). A farmer can add one or more Livestock or Crop
 * enterprises, each named, to log against later. Lives in Settings alongside the
 * farm profile (BACKLOG.md Section 8.2). Editing and removing come later (E1-04).
 */
export default function Enterprises() {
  const { enterprises, status, addEnterprise } = useEnterprises();
  const [name, setName] = useState('');
  const [type, setType] = useState<EnterpriseType>('livestock');

  const loading = status.kind === 'loading';
  const saving = status.kind === 'saving';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const added = await addEnterprise(name, type);
    if (added) {
      setName('');
    }
  }

  return (
    <section className="settings-section" aria-labelledby="enterprises-heading">
      <h2 id="enterprises-heading" className="settings-section__title">
        Enterprises
      </h2>
      <p className="settings-section__hint">
        Add each part of your operation you want to track — a herd, a flock, a block of maize. You
        can add as many as you need.
      </p>

      {loading ? (
        <p className="settings-status" role="status">
          Loading…
        </p>
      ) : (
        <>
          {enterprises.length === 0 ? (
            <p className="settings-status">No enterprises yet. Add your first below.</p>
          ) : (
            <ul className="enterprise-list" aria-label="Enterprises">
              {enterprises.map((enterprise) => (
                <li key={enterprise.id} className="enterprise-row">
                  {enterprise.type === 'livestock' ? (
                    <Beef size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  ) : (
                    <Sprout size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  )}
                  <span className="enterprise-row__text">
                    <span className="enterprise-row__name">{enterprise.name}</span>
                    <span className="enterprise-row__type">{TYPE_LABELS[enterprise.type]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form className="farm-form" onSubmit={onSubmit}>
            <label className="field">
              <span className="field__label">Enterprise name</span>
              <input
                className="field__input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Beef herd"
                autoComplete="off"
                disabled={saving}
                data-testid="enterprise-name-input"
              />
            </label>
            <label className="field">
              <span className="field__label">Type</span>
              <select
                className="field__input"
                value={type}
                onChange={(event) => setType(event.target.value as EnterpriseType)}
                disabled={saving}
                data-testid="enterprise-type-select"
              >
                <option value="livestock">Livestock</option>
                <option value="crop">Crop</option>
              </select>
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || name.trim().length === 0}
            >
              Add enterprise
            </button>
          </form>
        </>
      )}

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'saved' ? (
        <p className="settings-status settings-status--success" role="status">
          Enterprise added.
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
