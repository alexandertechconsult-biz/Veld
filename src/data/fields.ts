// Field/block domain logic (E3-01). Pure of any DOM or singleton, like
// livestock and enterprises: the repositories are injected, so this is
// unit-testable against a fresh database and reused by the `useFields` hook at
// the composition root.
//
// A Field belongs to a crop enterprise (BACKLOG.md Section 6). This ticket
// registers one — name, crop type, and an optional free-text size. Activity
// logging (E3-02), history (E3-03) and edit/delete (E3-05) are separate tickets.

import { listEnterprises } from './enterprises';
import type { Repositories } from './index';
import type { Enterprise, Field, ID } from './types';

/** Raised when a field is added with a blank name, so the UI can prompt. */
export class EmptyFieldNameError extends Error {
  constructor() {
    super('Enter a name for the field or block.');
    this.name = 'EmptyFieldNameError';
  }
}

/** Raised when a field is added with a blank crop type. */
export class EmptyCropTypeError extends Error {
  constructor() {
    super('Enter a crop type.');
    this.name = 'EmptyCropTypeError';
  }
}

/** Raised when registering against something that is not a crop enterprise. */
export class NoCropEnterpriseError extends Error {
  constructor() {
    super('Add a crop enterprise before registering fields.');
    this.name = 'NoCropEnterpriseError';
  }
}

/** Raised when editing or deleting a field that no longer exists (E3-05). */
export class FieldNotFoundError extends Error {
  constructor() {
    super('That field or block no longer exists.');
    this.name = 'FieldNotFoundError';
  }
}

/** The fields a caller supplies to register a field or block. */
export interface NewField {
  enterpriseId: ID;
  name: string;
  cropType: string;
  /** Free-text size (e.g. "12 ha") — optional per the spec. */
  size?: string;
}

/**
 * A correction to an existing field (E3-05): every field is optional, so a
 * caller can change just the name or just the crop type. An omitted field is
 * left exactly as it was — only what is supplied is validated and written. A
 * supplied but blank `size` clears the optional size rather than storing "".
 */
export interface FieldEdit {
  name?: string;
  cropType?: string;
  size?: string;
}

/** The current farm's crop enterprises, oldest first. Empty when none. */
export async function listCropEnterprises(repos: Repositories): Promise<Enterprise[]> {
  const enterprises = await listEnterprises(repos);
  return enterprises.filter((enterprise) => enterprise.type === 'crop');
}

/**
 * Every field or block registered across the farm's crop enterprises, oldest
 * first so the list reads in the order the farmer added them.
 */
export async function listFields(repos: Repositories): Promise<Field[]> {
  const enterprises = await listCropEnterprises(repos);
  const perEnterprise = await Promise.all(
    enterprises.map((enterprise) => repos.fields.listByEnterprise(enterprise.id)),
  );
  return perEnterprise.flat().sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Registers a field or block against a crop enterprise. Trims the name and crop
 * type and rejects a blank one without writing; trims the optional size and
 * omits it when blank; requires the target enterprise to exist and be a crop
 * enterprise (a livestock enterprise cannot hold fields).
 */
export async function addField(repos: Repositories, input: NewField): Promise<Field> {
  const name = input.name.trim();
  if (!name) {
    throw new EmptyFieldNameError();
  }
  const cropType = input.cropType.trim();
  if (!cropType) {
    throw new EmptyCropTypeError();
  }
  const enterprise = await repos.enterprises.get(input.enterpriseId);
  if (!enterprise || enterprise.type !== 'crop') {
    throw new NoCropEnterpriseError();
  }
  const size = input.size?.trim();
  return repos.fields.create({
    enterpriseId: input.enterpriseId,
    name,
    cropType,
    ...(size ? { size } : {}),
  });
}

/**
 * Corrects an existing field or block (E3-05). Validates only the fields the
 * caller supplies — trims and rejects a blank name/crop type without writing —
 * then leaves every other field untouched. A supplied but blank `size` clears
 * the optional size (stored as `undefined`, never ""). Requires the field to
 * exist.
 */
export async function updateField(
  repos: Repositories,
  id: ID,
  changes: FieldEdit,
): Promise<Field> {
  const existing = await repos.fields.get(id);
  if (!existing) {
    throw new FieldNotFoundError();
  }
  const patch: FieldEdit = {};
  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) {
      throw new EmptyFieldNameError();
    }
    patch.name = name;
  }
  if (changes.cropType !== undefined) {
    const cropType = changes.cropType.trim();
    if (!cropType) {
      throw new EmptyCropTypeError();
    }
    patch.cropType = cropType;
  }
  if (changes.size !== undefined) {
    const size = changes.size.trim();
    patch.size = size ? size : undefined;
  }
  return repos.fields.update(id, patch);
}

/**
 * Removes a field or block and every activity logged against it, so deleting a
 * field never leaves orphaned activities behind (E3-05). Idempotent: deleting a
 * field that is already gone is a no-op.
 */
export async function deleteField(repos: Repositories, id: ID): Promise<void> {
  const activities = await repos.activities.listByField(id);
  await Promise.all(activities.map((activity) => repos.activities.delete(activity.id)));
  await repos.fields.delete(id);
}
