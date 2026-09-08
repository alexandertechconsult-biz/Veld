# PROGRESS — build ledger

> Single source of truth for loop state. The loop reads this first and writes it last every iteration.
> Status values: `TODO` (default, implied by absence) · `STARTED` · `DONE` · `BLOCKED`.
> A ticket's dependencies must all be `DONE` before the loop will pick it up.

**Project:** Farm Management MVP — offline-first farm record-keeping PWA (see `BACKLOG.md`)
**Stack:** Vite + React + TypeScript, Dexie over IndexedDB, no server, Vercel. Decisions in BACKLOG.md Section 9.
**Ticket order:** the `Seq` column in BACKLOG.md Section 10 is the build order and breaks every priority tie.

## Gate protocol

`GATE-n` rows in the backlog are human checkpoints, not tickets. The loop must never attempt one.
On reaching a gate as the next eligible item, append `BLOCKED: GATE-n — awaiting human verification`
to the Log below and STOP. Barrett clears it by replacing that line with `PASSED: GATE-n @ <timestamp>`.

## Done
<!-- format: - DONE  <TICKET-ID>  <summary>  | tests: <pass/total>  | e2e: <path>  | commit: <hash> -->

- DONE  E0-01  Playwright E2E harness with trace and video recording  | tests: 2/2  | e2e: e2e/recordings/E0-01/20260908T153336Z  | commit: 83f0e37
- DONE  E0-02  Vite + React + TypeScript scaffold with vite-plugin-pwa and Vitest  | tests: 5/5 unit, 2/2 e2e  | e2e: e2e/recordings/E0-02/20260908T162320Z  | commit: eb8cd8c

## In progress
<!-- the loop writes STARTED here on entry; should be empty between iterations -->

_Empty._

## Blocked
<!-- format: - BLOCKED  <TICKET-ID>  — <reason>  — <smallest unblocking question> -->

_None._

## Log
<!-- chronological, append-only; STARTED, DONE, BLOCKED and completion markers with timestamps -->

- 2026-09-08 — repo initialised, ledger created.
- 2026-09-08 — stack decisions recorded in BACKLOG.md Section 9; backlog restructured into phases with Seq ordering, explicit dependencies, and gates.
- 2026-09-08 — DONE E0-01. Verified by running `record_e2e.sh E0-01 --ui`: 2 passed, trace.zip and video.webm saved.
- 2026-09-08 — STARTED E0-02.
- 2026-09-08 — DONE E0-02. Vite 7 + React 18 + TS scaffold, vite-plugin-pwa emits `dist/manifest.webmanifest` and `dist/sw.js` on build, Vitest passes 5/5 (formatDocumentTitle + App render), README documents `E2E_DEV_SERVER_COMMAND`. Toolchain moved to Vite 7 / Vitest 3 / vite-plugin-pwa 1 to clear the esbuild dev-server advisory (npm audit: 0 vulnerabilities). E2E boot spec green on mobile and desktop.
- Next eligible: E0-03 (Dexie schema + typed data layer), Seq 3, depends E0-02 which is DONE. (E0-05 also unblocked, Seq 5.)
