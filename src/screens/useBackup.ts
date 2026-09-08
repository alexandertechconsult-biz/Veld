import { useCallback, useState } from 'react';
import { db } from '../data';
import {
  backupFilename,
  countRecords,
  exportData,
  importData,
  InvalidBackupError,
  parseBackup,
  serializeBackup,
} from '../data/backup';

/** UI state for the export/import controls: exactly one thing is true at a time,
 *  so the screen can't show a spinner and an error at once. */
export type BackupStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/** Triggers a browser download of `text` under `filename`. Isolated here so the
 *  hook's logic stays testable and the DOM glue is in one obvious place. */
function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick, not synchronously: revoking mid-click can cancel an
  // in-flight download and yield an empty file in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Owns the export/import operations and their user-facing status. The heavy
 * lifting lives in the pure `data/backup` module; this hook only wires it to the
 * browser (file download, file read) and turns failures into readable messages.
 */
export function useBackup() {
  const [status, setStatus] = useState<BackupStatus>({ kind: 'idle' });

  const exportBackup = useCallback(async () => {
    setStatus({ kind: 'working' });
    try {
      const at = Date.now();
      const backup = await exportData(db, at);
      downloadTextFile(serializeBackup(backup), backupFilename(at));
      setStatus({ kind: 'success', message: `Exported ${countRecords(backup.data)} records.` });
    } catch {
      setStatus({ kind: 'error', message: 'Could not export your data. Please try again.' });
    }
  }, []);

  const importBackup = useCallback(async (file: File) => {
    setStatus({ kind: 'working' });
    try {
      const backup = parseBackup(await file.text());
      const written = await importData(db, backup);
      setStatus({ kind: 'success', message: `Imported ${written} records.` });
    } catch (error) {
      const message =
        error instanceof InvalidBackupError
          ? error.message
          : 'Could not import that file. Please try again.';
      setStatus({ kind: 'error', message });
    }
  }, []);

  return { status, exportBackup, importBackup };
}
