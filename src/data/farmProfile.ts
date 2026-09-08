// Farm-profile domain logic (E1-01). Pure of any DOM or singleton: the
// repositories are injected, so this is unit-testable against a fresh database
// and reused by the `useFarmProfile` hook at the composition root.

import type { Repositories } from './index';
import type { Farm } from './types';

/** Raised when a save is attempted with a blank name, so the UI can prompt. */
export class EmptyFarmNameError extends Error {
  constructor() {
    super('Enter a farm name.');
    this.name = 'EmptyFarmNameError';
  }
}

/**
 * The single farm this device tracks, or `null` if none has been created yet.
 * MVP is one farm per device (BACKLOG.md Section 5), so the first record is it.
 */
export async function loadCurrentFarm(repos: Repositories): Promise<Farm | null> {
  const farms = await repos.farms.getAll();
  return farms[0] ?? null;
}

/**
 * Saves the farm profile: creates the farm when none exists yet, otherwise
 * renames the existing one. Re-reads the current farm each call so a repeated
 * save can never create a second farm. Trims the name and rejects a blank one.
 */
export async function saveFarmProfile(repos: Repositories, rawName: string): Promise<Farm> {
  const name = rawName.trim();
  if (!name) {
    throw new EmptyFarmNameError();
  }
  const current = await loadCurrentFarm(repos);
  return current
    ? repos.farms.update(current.id, { name })
    : repos.farms.create({ name });
}
