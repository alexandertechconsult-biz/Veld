import { useEffect, useState, type FormEvent } from 'react';
import { Sprout } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import { useFields } from './useFields';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/**
 * Crops module. Register a field or block (E3-01) — name, crop type, and an
 * optional free-text size — against a crop enterprise. Activity logging (E3-02),
 * history (E3-03) and edit/delete (E3-05) arrive in later tickets.
 */
export default function CropsScreen() {
  const navigate = useNavigate();
  const { enterprises, fields, status, registerField } = useFields();

  const [enterpriseId, setEnterpriseId] = useState('');
  const [name, setName] = useState('');
  const [cropType, setCropType] = useState('');
  const [size, setSize] = useState('');

  // Default the enterprise picker to the first crop enterprise once loaded.
  useEffect(() => {
    if (!enterpriseId && enterprises.length > 0) {
      setEnterpriseId(enterprises[0].id);
    }
  }, [enterprises, enterpriseId]);

  if (status.kind === 'loading') {
    return (
      <p className="settings-status" role="status">
        Loading…
      </p>
    );
  }

  // No crop enterprise means there is nowhere to register a field yet.
  if (enterprises.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        message="No crop enterprise yet. Add one in Settings, then register your fields."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  const saving = status.kind === 'saving';
  const canSubmit =
    !saving && name.trim().length > 0 && cropType.trim().length > 0 && enterpriseId;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const registered = await registerField({ enterpriseId, name, cropType, size });
    if (registered) {
      setName('');
      setCropType('');
      setSize('');
    }
  }

  return (
    <section className="module" aria-labelledby="crops-heading">
      <h2 id="crops-heading" className="module__title">
        Crops
      </h2>
      <p className="module__hint">
        Register a field or block, its crop type, and — if you want — its size.
      </p>

      {fields.length === 0 ? (
        <p className="settings-status">No fields or blocks yet. Register your first below.</p>
      ) : (
        <ul className="record-list" aria-label="Fields">
          {fields.map((field) => (
            <li key={field.id} className="record-row">
              <div className="record-row__main">
                <Sprout size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                <span className="record-row__text">
                  <span className="record-row__name">{field.name}</span>
                  <span className="record-row__meta">
                    {field.cropType}
                    {field.size ? ` · ${field.size}` : ''}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="farm-form" onSubmit={onSubmit}>
        {enterprises.length > 1 ? (
          <label className="field">
            <span className="field__label">Enterprise</span>
            <select
              className="field__input"
              value={enterpriseId}
              onChange={(event) => setEnterpriseId(event.target.value)}
              disabled={saving}
              data-testid="field-enterprise-select"
            >
              {enterprises.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {enterprise.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="field__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. North field"
            autoComplete="off"
            disabled={saving}
            data-testid="field-name-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Crop type</span>
          <input
            className="field__input"
            type="text"
            value={cropType}
            onChange={(event) => setCropType(event.target.value)}
            placeholder="e.g. Maize"
            autoComplete="off"
            disabled={saving}
            data-testid="field-crop-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Size (optional)</span>
          <input
            className="field__input"
            type="text"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            placeholder="e.g. 12 ha"
            autoComplete="off"
            disabled={saving}
            data-testid="field-size-input"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Register
        </button>
      </form>

      {saving ? (
        <p className="settings-status" role="status">
          Saving…
        </p>
      ) : null}
      {status.kind === 'saved' ? (
        <p className="settings-status settings-status--success" role="status">
          {status.message}
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
