import { useEffect, useState, type FormEvent } from 'react';
import { Beef } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useNavigate } from '../app/navigationContext';
import { useLivestock } from './useLivestock';
import type { EventFormValues } from './EventForm';
import LivestockRow from './LivestockRow';

/**
 * Livestock module. Register an animal or group (E2-01) — one record type
 * carries a `count`: 1 reads as an individual with a tag, above 1 as a group
 * (BACKLOG.md Section 9) — log a dated event against any of them (E2-02), see
 * each animal's event history most recent first (E2-03), and correct or remove
 * any record or event (E2-06).
 */
export default function LivestockScreen() {
  const navigate = useNavigate();
  const {
    enterprises,
    animals,
    eventsByAnimal,
    status,
    eventStatus,
    registerLivestock,
    editAnimal,
    removeAnimal,
    logEvent,
    editEvent,
    removeEvent,
    resetEventStatus,
  } = useLivestock();

  const [enterpriseId, setEnterpriseId] = useState('');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [count, setCount] = useState('1');
  const [openEventFor, setOpenEventFor] = useState<string | null>(null);

  // Default the enterprise picker to the first livestock enterprise once loaded.
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

  // No livestock enterprise means there is nowhere to register an animal yet.
  if (enterprises.length === 0) {
    return (
      <EmptyState
        icon={Beef}
        message="No livestock enterprise yet. Add one in Settings, then register your animals."
        action={{ label: 'Set up your farm', onClick: () => navigate('settings') }}
      />
    );
  }

  const saving = status.kind === 'saving';
  const parsedCount = Number(count);
  const countValid = Number.isInteger(parsedCount) && parsedCount >= 1;
  const canSubmit =
    !saving && name.trim().length > 0 && species.trim().length > 0 && countValid && enterpriseId;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const registered = await registerLivestock({
      enterpriseId,
      name,
      species,
      count: Number(count),
    });
    if (registered) {
      setName('');
      setSpecies('');
      setCount('1');
    }
  }

  function toggleRow(id: string) {
    const willOpen = openEventFor !== id;
    if (willOpen) resetEventStatus();
    setOpenEventFor(willOpen ? id : null);
  }

  async function onLogEvent(livestockId: string, values: EventFormValues): Promise<boolean> {
    const logged = await logEvent({ livestockId, ...values });
    if (logged) {
      setOpenEventFor(null);
    }
    return logged;
  }

  return (
    <section className="module" aria-labelledby="livestock-heading">
      <h2 id="livestock-heading" className="module__title">
        Livestock
      </h2>
      <p className="module__hint">
        Register an animal or group. Use a count of one for a tagged individual, or more for a
        batch or group.
      </p>

      {animals.length === 0 ? (
        <p className="settings-status">No animals or groups yet. Register your first below.</p>
      ) : (
        <ul className="record-list" aria-label="Livestock">
          {animals.map((animal) => (
            <LivestockRow
              key={animal.id}
              animal={animal}
              history={eventsByAnimal[animal.id] ?? []}
              status={status}
              eventStatus={eventStatus}
              isOpen={openEventFor === animal.id}
              onToggle={() => toggleRow(animal.id)}
              onEditAnimal={(changes) => editAnimal(animal.id, changes)}
              onRemoveAnimal={() => removeAnimal(animal.id)}
              onLogEvent={(values) => onLogEvent(animal.id, values)}
              onEditEvent={(id, changes) => editEvent(id, changes)}
              onRemoveEvent={(id) => removeEvent(id)}
              resetEventStatus={resetEventStatus}
            />
          ))}
        </ul>
      )}

      {eventStatus.kind === 'saved' && openEventFor === null ? (
        <p className="settings-status settings-status--success" role="status">
          Event logged.
        </p>
      ) : null}

      <form className="farm-form" onSubmit={onSubmit}>
        {enterprises.length > 1 ? (
          <label className="field">
            <span className="field__label">Enterprise</span>
            <select
              className="field__input"
              value={enterpriseId}
              onChange={(event) => setEnterpriseId(event.target.value)}
              disabled={saving}
              data-testid="livestock-enterprise-select"
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
          <span className="field__label">Name or tag</span>
          <input
            className="field__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. ZA-001 or North paddock"
            autoComplete="off"
            disabled={saving}
            data-testid="livestock-name-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Species</span>
          <input
            className="field__input"
            type="text"
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            placeholder="e.g. Cattle"
            autoComplete="off"
            disabled={saving}
            data-testid="livestock-species-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Count</span>
          <input
            className="field__input"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            disabled={saving}
            data-testid="livestock-count-input"
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
