// Transaction domain logic (E5-01). Pure of any DOM or singleton, like the other
// module domains: the repositories are injected, so this is unit-testable against
// a fresh database and reused by the `useTransactions` hook at the composition
// root.
//
// A Transaction belongs to the farm (BACKLOG.md Section 6) and records a single
// cost or sale: a type, an amount, a date, an optional link to an enterprise (a
// missing link means farm-level overhead), and an optional note. This ticket logs
// one and lists them; a running total (E5-02) and edit/delete (E5-03) are separate
// tickets in a later phase.

import { loadCurrentFarm } from './farmProfile';
import type { Repositories } from './index';
import type { ID, Transaction, TransactionType } from './types';

/**
 * The transaction types, each with its display label. The single source consumed
 * by both the type picker and the validator, so the two can never drift.
 */
export const TRANSACTION_TYPES: readonly { value: TransactionType; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'sale', label: 'Sale' },
];

const KNOWN_TYPES: readonly TransactionType[] = TRANSACTION_TYPES.map((entry) => entry.value);

/** Raised when the type is not one of the known transaction types. */
export class InvalidTransactionTypeError extends Error {
  constructor() {
    super('Choose whether this is a cost or a sale.');
    this.name = 'InvalidTransactionTypeError';
  }
}

/** Raised when the amount is not a positive, finite number. */
export class InvalidAmountError extends Error {
  constructor() {
    super('Enter an amount greater than zero.');
    this.name = 'InvalidAmountError';
  }
}

/** Raised when the supplied date is not a real point in time. */
export class InvalidTransactionDateError extends Error {
  constructor() {
    super('Choose a valid date.');
    this.name = 'InvalidTransactionDateError';
  }
}

/** Raised when logging a transaction before the farm profile exists. */
export class NoFarmForTransactionError extends Error {
  constructor() {
    super('Create your farm profile before logging a cost or sale.');
    this.name = 'NoFarmForTransactionError';
  }
}

/** Raised when the linked enterprise does not exist. */
export class TransactionEnterpriseNotFoundError extends Error {
  constructor() {
    super('The linked enterprise no longer exists.');
    this.name = 'TransactionEnterpriseNotFoundError';
  }
}

/**
 * The fields a caller supplies to log a transaction. Type, amount and date are
 * required; the enterprise link and note are optional.
 */
export interface NewTransaction {
  type: TransactionType;
  /** A positive amount; the type (cost/sale) carries the direction. */
  amount: number;
  /** Epoch milliseconds the money moved, distinct from createdAt. */
  date: number;
  /** Optional link to an enterprise — omit for a farm-level overhead. */
  enterpriseId?: ID;
  note?: string;
}

/**
 * Every transaction on this device's farm as a running list, most recent first
 * (ties broken by creation order so the list is deterministic). Empty when no
 * farm exists yet.
 */
export async function listTransactions(repos: Repositories): Promise<Transaction[]> {
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    return [];
  }
  const transactions = await repos.transactions.listByFarm(farm.id);
  return [...transactions].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
}

/**
 * Logs a cost or sale against the current farm. Requires a farm to exist first.
 * The amount must be a positive, finite number and the date a real point in time,
 * both rejected without writing otherwise. A supplied enterprise link is
 * validated to still exist; a blank note is omitted rather than stored as "".
 * Writes straight to IndexedDB — no network call.
 */
export async function addTransaction(
  repos: Repositories,
  input: NewTransaction,
): Promise<Transaction> {
  if (!KNOWN_TYPES.includes(input.type)) {
    throw new InvalidTransactionTypeError();
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new InvalidAmountError();
  }
  const farm = await loadCurrentFarm(repos);
  if (!farm) {
    throw new NoFarmForTransactionError();
  }
  if (!Number.isFinite(input.date)) {
    throw new InvalidTransactionDateError();
  }
  if (input.enterpriseId !== undefined && !(await repos.enterprises.get(input.enterpriseId))) {
    throw new TransactionEnterpriseNotFoundError();
  }
  const note = input.note?.trim();
  return repos.transactions.create({
    farmId: farm.id,
    type: input.type,
    amount: input.amount,
    date: input.date,
    ...(input.enterpriseId ? { enterpriseId: input.enterpriseId } : {}),
    ...(note ? { note } : {}),
  });
}
