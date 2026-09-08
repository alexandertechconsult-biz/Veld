import type { ID } from './types';

/** A fresh record id. Uses the platform crypto UUID (browsers and Node 18+). */
export function newId(): ID {
  return crypto.randomUUID();
}

/** Current time in epoch milliseconds — the one place the layer reads the clock. */
export function now(): number {
  return Date.now();
}
