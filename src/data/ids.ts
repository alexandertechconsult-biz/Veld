import type { ID } from './types';

/** A fresh record id. Uses the platform crypto UUID (browsers and Node 18+). */
export function newId(): ID {
  return crypto.randomUUID();
}

let lastNow = 0;

/**
 * Current time in epoch milliseconds — the one place the layer reads the clock.
 * Strictly monotonic: two records created in the same wall-clock millisecond
 * still get increasing timestamps, so `createdAt` is a reliable tiebreaker for
 * "oldest first" ordering (Date.now() ties left list order to random UUID keys).
 */
export function now(): number {
  const wall = Date.now();
  lastNow = wall > lastNow ? wall : lastNow + 1;
  return lastNow;
}
