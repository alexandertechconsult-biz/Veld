// Livestock domain logic (E2-01). Pure of any DOM or singleton, like
// farmProfile and enterprises: the repositories are injected, so this is
// unit-testable against a fresh database and reused by the `useLivestock` hook
// at the composition root.
//
// There is ONE record type for animals (BACKLOG.md Section 9): a `count` of 1 is
// an individual with a tag, a `count` above 1 is a batch or group.

import { listEnterprises } from './enterprises';
import type { Repositories } from './index';
import type { Enterprise, ID, LivestockRecord } from './types';

/** Raised when a record is added with a blank name/tag, so the UI can prompt. */
export class EmptyLivestockNameError extends Error {
  constructor() {
    super('Enter a name or tag for the animal.');
    this.name = 'EmptyLivestockNameError';
  }
}

/** Raised when a record is added with a blank species. */
export class EmptySpeciesError extends Error {
  constructor() {
    super('Enter a species.');
    this.name = 'EmptySpeciesError';
  }
}

/** Raised when the count is not a whole number of one or more. */
export class InvalidCountError extends Error {
  constructor() {
    super('Count must be a whole number of one or more.');
    this.name = 'InvalidCountError';
  }
}

/** Raised when registering against something that is not a livestock enterprise. */
export class NoLivestockEnterpriseError extends Error {
  constructor() {
    super('Add a livestock enterprise before registering animals.');
    this.name = 'NoLivestockEnterpriseError';
  }
}

/** The fields a caller supplies to register an animal or group. */
export interface NewLivestock {
  enterpriseId: ID;
  /** Name or tag ID. */
  name: string;
  species: string;
  count: number;
}

/** Whether a record reads as one tagged animal or a batch/group. */
export type LivestockKind = 'individual' | 'group';

export interface LivestockDescription {
  kind: LivestockKind;
  /** Human label for the count, e.g. "Individual" or "Group of 40". */
  countLabel: string;
}

/**
 * How a record should read: `count === 1` is an individual with a tag, anything
 * above is a group. This is the single place the individual-vs-group rule lives,
 * so the UI never re-implements it.
 */
export function describeLivestock(record: LivestockRecord): LivestockDescription {
  return record.count > 1
    ? { kind: 'group', countLabel: `Group of ${record.count}` }
    : { kind: 'individual', countLabel: 'Individual' };
}

/** The current farm's livestock enterprises, oldest first. Empty when none. */
export async function listLivestockEnterprises(repos: Repositories): Promise<Enterprise[]> {
  const enterprises = await listEnterprises(repos);
  return enterprises.filter((enterprise) => enterprise.type === 'livestock');
}

/**
 * Every animal or group registered across the farm's livestock enterprises,
 * oldest first so the list reads in the order the farmer added them.
 */
export async function listLivestock(repos: Repositories): Promise<LivestockRecord[]> {
  const enterprises = await listLivestockEnterprises(repos);
  const perEnterprise = await Promise.all(
    enterprises.map((enterprise) => repos.livestock.listByEnterprise(enterprise.id)),
  );
  return perEnterprise.flat().sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Registers an animal or group against a livestock enterprise. Trims the name
 * and species and rejects a blank one without writing; requires the count to be
 * a whole number of one or more; requires the target enterprise to exist and be
 * a livestock enterprise (a crop enterprise cannot hold animals).
 */
export async function addLivestock(
  repos: Repositories,
  input: NewLivestock,
): Promise<LivestockRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new EmptyLivestockNameError();
  }
  const species = input.species.trim();
  if (!species) {
    throw new EmptySpeciesError();
  }
  if (!Number.isInteger(input.count) || input.count < 1) {
    throw new InvalidCountError();
  }
  const enterprise = await repos.enterprises.get(input.enterpriseId);
  if (!enterprise || enterprise.type !== 'livestock') {
    throw new NoLivestockEnterpriseError();
  }
  return repos.livestock.create({
    enterpriseId: input.enterpriseId,
    name,
    species,
    count: input.count,
  });
}
