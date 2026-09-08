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
- DONE  E0-05  Deploy to Vercel — https://veld-six.vercel.app/  | tests: n/a (infra)  | e2e: e2e/recordings/E0-05/verification.md  | commit: 6550d34
- DONE  GATE-0  Phase 0 human checkpoint — cleared by Barrett, Phase 1 authorised  | evidence: e2e/recordings/E0-05/verification.md + live at https://veld-six.vercel.app/
- DONE  E6-05  Export/import all farm data to a single file  | tests: 52/52 unit, 4/4 e2e  | e2e: e2e/recordings/E6-05/20260908T165655Z  | commit: 04c819b
- DONE  E1-01  Create farm profile (name), persisted in IndexedDB  | tests: 62/62 unit, 2/2 e2e  | e2e: e2e/recordings/E1-01/20260908T200832Z  | commit: <pending>

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
- 2026-09-08 — STARTED E0-05.
- 2026-09-08 — BLOCKED E0-05. Deploy requires an authenticated Vercel account. Environment check: `vercel` CLI absent, `VERCEL_TOKEN` unset, no `.vercel`/`vercel.json` in repo, Vercel MCP server unauthorized (needs interactive OAuth, unavailable in this non-interactive loop). Git remote is `github.com/alexandertechconsult-biz/Veld`. None of the acceptance criteria (HTTPS production URL, Android Chrome install prompt, branch preview URLs) can be satisfied without credentials the loop cannot obtain, and faking the URL/`verification.md` is not permitted. No code written; tree clean. See Blocked section for the unblocking options.
- E0-05 blocks GATE-0 (Seq 6) and therefore all of Phase 1. The loop cannot advance past E0-05 until Barrett resolves the Vercel auth question above.
- 2026-09-08 — STARTED E6-05. E0-05 remains human-blocked (no VERCEL_TOKEN, no CLI, no `.vercel` link — re-verified). E6-05 (export/import) depends only on E0-03 (DONE) and is the single eligible buildable P0 ticket, so the loop picks it up out of Seq order per the dependency rule.
- 2026-09-08 — DONE E6-05. Typed backup module `src/data/backup.ts`: `exportData` snapshots all 8 tables in one read transaction into a `{format, version, exportedAt, data}` file; `parseBackup` fully validates untrusted file text (JSON, format tag, version, all 8 tables present as id-bearing arrays) before any write; `importData` clears-then-bulkAdds in one rw transaction so a failure can't half-import. DOM glue and status state isolated in `useBackup` hook (blob download deferred-revoke to avoid the sync-revoke race; `parseBackup` errors surfaced verbatim). SettingsScreen gains a Data backup section with Export/Import buttons and loading/success/error states, alongside the existing empty state (keeps E0-04 spec green). New `.btn-secondary`/`.visually-hidden`/settings CSS uses only design-system tokens (colour-guard test still passes). Vitest 52/52 (13 new: round trip, overwrite-not-merge, empty install, filename, 6 validation-failure cases incl. "does not touch DB when invalid"). Playwright 4/4 on mobile+desktop (import a crafted file → export it back → assert valid downloaded file; plus non-backup file → error alert). Typecheck + build clean, npm audit 0 vulnerabilities. Review: APPROVE_WITH_NITS (revoke-race nit applied). Evidence: e2e/recordings/E6-05/20260908T165655Z.
- Next eligible: none on the critical path — E0-05 (Vercel deploy) stays human-blocked, and it gates GATE-0 and all of Phase 1. Phase-2 tickets E8-01/E8-02 need GATE-1. The loop cannot advance until Barrett resolves the E0-05 Vercel auth question.
- 2026-09-08 — DONE E0-05. Vercel connected via dashboard; verified live with Playwright, 2 passed, manifest and sw.js reachable, cream token intact in built CSS.
- 2026-09-08 — GATE-0 reached. Awaiting human verification on a real device before Phase 1.
- 2026-09-08 — PASSED: GATE-0. Barrett authorised Phase 1. Thirteen tickets now eligible, ending at GATE-1.
- 2026-09-08 — STARTED E1-01 (Seq 7, depends GATE-0 DONE) — first Phase-1 ticket.
- 2026-09-08 — DONE E1-01. Farm-profile create/rename flow in Settings. Domain module `src/data/farmProfile.ts` (`loadCurrentFarm` + `saveFarmProfile`) is dependency-inverted — repositories injected, no DOM, unit-tested against a fresh DB; re-reads the current farm before every save so a repeated save can never create a second farm (MVP is one farm per device). `useFarmProfile` hook wires it to the singleton repositories at the composition root; `FarmProfile.tsx` is a presentational form (Input per design-system §7: 56px, label above, tokens-only CSS so the colour-guard test stays green) that pre-fills the saved name and flips the button Create farm → Save changes. Vitest 62/62 (10 new: 7 domain incl. blank-name-rejected-without-write, trim, rename-not-duplicate, and close-and-reopen persistence; 3 component). Typecheck clean; no ESLint config in project. Review: APPROVE_WITH_NITS (lingering "Farm saved." status is a deferred nit; no observability logging matches the existing useBackup pattern in this client PWA). Evidence: e2e/recordings/E1-01/20260908T200832Z — reload-persistence + rename round-trip, 2/2 on mobile+desktop. (A first record attempt failed with ERR_CONNECTION_REFUSED because E2E_DEV_SERVER_COMMAND was unset; re-run with it set per README, green.)
- Next eligible: E1-02 (add a Livestock/Crop enterprise), Seq 8, depends E1-01 which is now DONE.
