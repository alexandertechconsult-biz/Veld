import { useRef, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import FarmProfile from './FarmProfile';
import { useBackup } from './useBackup';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

/**
 * Farm setup lands here. `FarmProfile` (E1-01) lets the farmer name their farm.
 * E6-05 adds data backup: export everything on this device to a file, or restore
 * from one — the farmer's safety net for a lost phone, since there is no server
 * (BACKLOG.md Section 9).
 */
export default function SettingsScreen() {
  const { status, exportBackup, importBackup } = useBackup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status.kind === 'working';

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    event.target.value = '';
    if (file) {
      void importBackup(file);
    }
  }

  return (
    <div className="settings">
      <FarmProfile />

      <section className="settings-section" aria-labelledby="backup-heading">
        <h2 id="backup-heading" className="settings-section__title">
          Data backup
        </h2>
        <p className="settings-section__hint">
          Export everything on this device to a file, or restore from one. Importing replaces what
          is on this device.
        </p>

        <div className="settings-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void exportBackup()}
            disabled={busy}
          >
            <Download size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Export data
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <Upload size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Import data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={onFileChange}
            data-testid="import-input"
          />
        </div>

        {busy ? (
          <p className="settings-status" role="status">
            Working…
          </p>
        ) : null}
        {status.kind === 'success' ? (
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
    </div>
  );
}
