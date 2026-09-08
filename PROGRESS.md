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
- DONE  E0-03  Dexie schema + typed data layer  | tests: 23/23 unit  | e2e: e2e/recordings/E0-03/verification.md  | commit: 3ab566b
- DONE  E0-04  App shell + responsive navigation  | tests: 39/39 unit, 8/8 e2e  | e2e: e2e/recordings/E0-04/20260908T164632Z  | commit: e28eb39

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
- 2026-09-08 — STARTED E0-03.
- 2026-09-08 — DONE E0-03. Dexie `VeldDatabase` schema v1 covers all 8 Section-6 entities; generic typed CRUD factory + one DI'd repository per entity behind `src/data/index.ts`; no `any`; foreign-key finders and most-recent-first history. Vitest 23/23 (CRUD per entity + update/delete failure paths + finder isolation + date ordering + close-and-reopen persistence). Typecheck and production build clean; npm audit 0 vulnerabilities. Evidence: e2e/recordings/E0-03/verification.md (infra ticket, no runtime surface). Code review: APPROVE_WITH_NITS (non-atomic update read-then-put noted as acceptable for single-user offline).
- Next eligible: E0-04 (app shell + navigation), Seq 4, depends E0-03 which is now DONE. (E0-05 also unblocked, Seq 5.)
- 2026-09-08 — STARTED E0-04.
- 2026-09-08 — DONE E0-04. Design-system tokens transcribed to `src/styles/tokens.css` (light default; dark under both `prefers-color-scheme` and `[data-theme]`), Inter self-hosted via `@fontsource-variable/inter` (woff2 bundled, works offline), 4/8/12/16/24/32/48 spacing scale. Responsive shell: bottom tab bar below 768px, left sidebar at 768px+ (`src/app/AppShell.tsx`, `Sidebar.tsx`, `BottomTabBar.tsx`); five destinations (Home, Livestock, Crops, Tasks, More→Financials/Settings). Hash router (`useHashRoute.ts`) — no dependency, no server rewrites needed. Every route renders a useful empty state; tap targets 44px min / 56px primary. Colour guard test (`tokens.test.ts`) asserts only palette colours appear in CSS; verified against the built bundle too (13 hexes + one rgba border). Vitest 39/39, Playwright 8/8 on mobile+desktop, typecheck + build clean, npm audit 0 vulnerabilities. Review: APPROVE_WITH_NITS. Evidence: e2e/recordings/E0-04/20260908T164632Z.
- Next eligible: E0-05 (deploy to Vercel), Seq 5, depends E0-02 which is DONE.
