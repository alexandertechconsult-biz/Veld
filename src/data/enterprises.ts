// Enterprise domain logic (E1-02). Like farmProfile, this is pure of any DOM or
// singleton: the repositories are injected, so it is unit-testable against a
// fresh database and reused by the `useEnterprises` hook at the composition root.

import { loadCurrentFarm } from './farmProfile';
import type { Repositories } from './index';
import type { Enterprise, EnterpriseType } from './types';

/** Raised when an enterprise is added with a blank name, so the UI can prompt. */
export class EmptyEnterpriseNameError extends Error {
  constructor() {
    super('Enter a name for the enterprise.');
    this.name = 'EmptyEnterpriseNameError';
  }
}

/** Raised when adding an enterprise before the farm profile exists. */
export class NoFarmYetError extends Error {
  constructor() {
    super('Create your farm profile before adding an enterprise.');
    this.name = 'NoFarmYetError';
  }
}

/**
 * Every enterprise on this device's farm, oldest first so the list reads in the
 * order the farmer added them. Empty when no farm exists yet.
 */
export async function listEnterprises(repos: Repositories): Promise<Enterprise[]> {
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    return [];
  }
  const enterprises = await repos.enterprises.listByFarm(farm.id);
  return [...enterprises].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Adds a named enterprise of the given type to the current farm. Unlike the farm
 * profile there can be many, so this always creates a new record. Requires a
 * farm to exist first (an enterprise belongs to a farm). Trims the name and
 * rejects a blank one without writing.
 */
export async function addEnterprise(
  repos: Repositories,
  rawName: string,
  type: EnterpriseType,
): Promise<Enterprise> {
  const name = rawName.trim();
  if (!name) {
    throw new EmptyEnterpriseNameError();
  }
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    throw new NoFarmYetError();
  }
  return repos.enterprises.create({ farmId: farm.id, type, name });
}
