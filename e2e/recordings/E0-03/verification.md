# E0-03 verification — Dexie schema + typed data layer

**Ticket:** E0-03 — As a developer, I want the Dexie schema and a typed data layer, so every module writes through one place.
**Type:** Pure infra / data layer. No user-facing or API surface yet, so this note stands in for an E2E recording (per the loop protocol).
**Date:** 2026-09-08

## What was built

- `src/data/types.ts` — typed entities for all Section-6 records: Farm, Enterprise, LivestockRecord, Field, Event, Activity, Task, Transaction (no `any`).
- `src/data/db.ts` — `VeldDatabase` (Dexie over IndexedDB), schema v1, keyed by `id` with secondary indexes on the foreign keys/dates queried.
- `src/data/repositories/base.ts` — one generic typed CRUD factory. New entities are added as new implementations, not by editing a switch (Open/Closed).
- `src/data/repositories/*.ts` — one repository per entity, each taking a `VeldDatabase` (dependency injection) plus scoped foreign-key finders.
- `src/data/index.ts` — composition root: `createRepositories(db)` and the app-wide `repositories` singleton. Every module reads/writes through here, never through Dexie directly.
- `src/test/setup.ts` — loads `fake-indexeddb/auto` so Dexie opens in the Node test environment exactly as in a browser.

## Acceptance criteria → evidence

| Criterion | How it's met |
|---|---|
| Schema covers all 8 Section-6 entities | `VeldDatabase.version(1).stores({...})` in `src/data/db.ts` |
| All reads/writes through typed repository functions | Only repositories touch Dexie; `index.ts` is the sole public entry |
| No `any` | `npm run typecheck` clean under `strict`; the only grep hit is the word "any" in a doc comment, not an `any` type |
| Data survives reload and device restart | `relations.test.ts` writes with one connection, closes it, reopens a fresh `VeldDatabase` with the same name, and reads the record back |
| Unit tests cover create, read, update, delete per entity | `entities.test.ts` runs the full CRUD lifecycle for all 8 entities + update-missing and delete-missing failure paths |

## Commands run and observed results

```
$ npm run typecheck
> tsc --noEmit
(no output — clean)

$ npm run test
 ✓ src/appInfo.test.ts (4 tests)
 ✓ src/App.test.tsx (1 test)
 ✓ src/data/relations.test.ts (8 tests)
 ✓ src/data/entities.test.ts (10 tests)
 Test Files  4 passed (4)
      Tests  23 passed (23)

$ npm run build
> tsc --noEmit && vite build
BUILD OK  (manifest + service worker emitted)

$ grep -rn ": any\| any>\|<any\|as any" src/data
src/data/repositories/base.ts:11:/** Shape accepted by `update`: any subset of the caller-owned fields. */
# single hit is the word "any" in a doc comment — no `any` types in code

$ npm audit
found 0 vulnerabilities
```

## Notes / known limitations

- `update` is a read-then-put and is non-atomic; for a single-user offline app last-writer-wins at record granularity is acceptable. Wrap in a Dexie transaction if concurrent edits ever appear.
- Event/Activity photos (Section 8.2) are intentionally deferred to E2-04/E3-04 (P1); adding an optional non-indexed field later needs no migration.
