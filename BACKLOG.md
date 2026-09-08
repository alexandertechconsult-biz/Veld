# Farm Management MVP — Product Specification

**Working name:** [TBD]
**Owner:** Barrett, Alexander Tech Consultants
**Stage:** Pre-discovery — spec drafted ahead of first farmer conversation
**Doc purpose:** Demo-ready spec to walk a mixed crop/livestock farmer through, and a build-ready backlog for development

---

## 1. Vision

A single, dead-simple place for a mixed crop-and-livestock farmer to log what's happening on their farm — animals, fields, tasks, money — from their phone in the field or a tablet/desktop at the end of the day, with or without signal. Where tools like Farmworks or AgriWebb solve this for teams that want full compliance and reporting suites, this is built for a single farmer (or small operation) who currently runs the farm on paper, WhatsApp, and spreadsheets, and needs something simpler than enterprise farm software, not more powerful.

**Differentiation is simplicity, not feature breadth.** The competitive risk on this build is scope creep toward "just as complex as the tools already on the market." Every epic below should be read with that in mind.

---

## 2. Problem Statement

Mixed-operation farmers (crops + livestock) currently track day-to-day operations across disconnected paper records, WhatsApp messages to workers/family, and ad hoc spreadsheets. This causes:

- Lost or forgotten records (animal health events, input applications, tasks)
- No single view of what's happening across the farm
- Difficulty reconstructing financial picture at tax/season-end
- No usable history to make decisions from (breeding, input timing, cost trends)

Existing farm management software (Farmworks, AgriWebb, Farmbrite, FarmWizard) solves this but is built for larger or more compliance-driven operations, and is more software than a single mixed farmer needs to get started.

---

## 3. Target User

**Primary persona (MVP):** A single farmer or small family operation running both crops and livestock (exact mix TBD — pending first farmer conversation). Works both in the field (often without signal) and at a desk/kitchen table at day's end. Not necessarily technical; low tolerance for complex software, high tolerance for simple, fast data entry.

**Future persona (post-MVP):** Same profile, but crops-only or livestock-only operations, once the platform is validated and generalized.

---

## 4. Goals & Success Metrics

**MVP goal:** Prove the farmer will voluntarily use the app daily for at least 2–4 weeks, in preference to their current paper/WhatsApp/spreadsheet habits.

Success signals:
- Daily or near-daily entries logged across at least 2 of the 4 modules (livestock, crops, tasks, financials)
- Farmer can recall/find a past record faster via the app than via their old method
- Farmer voluntarily requests a feature — a strong signal of real adoption, not politeness

**Explicitly not MVP goals:** compliance certification, multi-user roles, reporting dashboards, breeding/genetics planning, financial statements. These come later, informed by real usage.

---

## 5. Scope

### In scope (MVP)
- Farm and enterprise setup (configure whether the farm runs livestock, crops, or both, and how many of each)
- Livestock: basic register + event logging (health, movement)
- Crops: basic field/block register + activity logging (planting, input, harvest)
- Tasks: simple to-do/log tied to a farm area, assignable to a person
- Financials: basic cost/sale capture tied to an enterprise
- Offline-first capture, local-only for MVP (no server sync — see Section 9)
- Manual export and import so data survives a lost or replaced device
- Works on mobile (in-field) and desktop/tablet (end-of-day review)

### Out of scope (MVP) — explicitly deferred
- Multi-user accounts / permissions / worker logins
- Compliance frameworks (GlobalGAP, SIZA, HACCP)
- Breeding and genetics planning
- Weather integration, satellite/NDVI imagery
- Financial reporting (P&L, cash flow statements)
- Multi-farm management
- Native app store distribution (PWA only for MVP)

---

## 6. Data Model (Core Entities)

Designed generic from day one — even for one farmer — so the same model serves a livestock-only or crops-only farmer later without rework.

```
Farm
 └─ Enterprise (type: Livestock | Crop)
     ├─ Livestock Enterprise
     │    ├─ Animal / Group (individual or batch-tracked)
     │    ├─ Event (health, movement, weight, breeding-flag)
     │    └─ linked Transactions
     └─ Crop Enterprise
          ├─ Field / Block
          ├─ Activity (planting, input application, harvest)
          └─ linked Transactions

Task
 ├─ linked to: Farm, and optionally an Enterprise or Field/Animal group
 ├─ assigned_to (free text for MVP — no user accounts yet)
 └─ status: open | done

Transaction
 ├─ type: cost | sale
 ├─ amount, date, note
 └─ linked to: an Enterprise (optional — can be farm-level overhead)
```

**Resolved 2026-09-08 (see Section 9):** livestock is one record type carrying a `count` field. A `count` of 1 is an individual with a tag, a `count` above 1 is a batch or group. This holds whichever way the farmer answers, so E2-01 is no longer blocked on the conversation.

**Still open for the farmer:** actual crop/livestock balance, animal count, and number of fields or blocks. These affect how much depth the Livestock module needs after MVP validation, not its data shape.

---

## 7. UX Principles

1. **Field-first, not desk-first.** Every core action (log an event, add a task, capture a cost) must be completable in under 3 taps from the home screen, one-handed, in bright sunlight, potentially with gloves on.
2. **Offline is the default state, not an edge case.** No action should ever be blocked by lack of signal. Sync status is visible but never blocking.
3. **No empty-state dead ends.** Every screen with no data yet should tell the farmer exactly what to do next, not just show a blank list.
4. **Same app, two contexts.** Mobile = fast capture. Desktop/tablet = the same data, reviewed and cleaned up at day's end. No separate "desktop-only" features in MVP — one responsive experience.
5. **Boring is good.** No dashboards, charts, or gamification in MVP. Farmers don't need to be sold on the app; they need it to save them time immediately.

---

## 8. UI/UX Spec

### 8.1 Navigation

- **Mobile:** bottom tab bar — Home | Livestock | Crops | Tasks | More (Financials, Settings)
- **Desktop/tablet:** left sidebar with the same 5 destinations, main content area shows list + detail side-by-side where screen width allows

### 8.2 Screens

**Home / Dashboard**
- "Today" view: open tasks, most recent 5 entries across all modules
- One prominent "+" action that opens a quick-add sheet (choose: Livestock event / Crop activity / Task / Transaction)
- Sync status indicator (small, unobtrusive — e.g. "Synced" / "3 items pending sync")

**Livestock module**
- List screen: animals/groups, searchable, filterable by type
- Add/Edit animal or group: name/tag ID, species, count (if group), notes
- Event log per animal/group: date, event type (health / movement / weight / other), free-text note, optional photo
- Quick-add from list: tap an animal → "+ Event" → 2 fields (type, note) → save

**Crops module**
- List screen: fields/blocks, searchable
- Add/Edit field: name, crop type, size (optional), notes
- Activity log per field: date, activity type (planting / input / harvest / other), free-text note, optional photo
- Quick-add mirrors Livestock module for consistency

**Tasks module**
- Simple list, grouped by Open / Done
- Add task: title, optional link to a field/animal group, optional assignee (free text), optional due date
- Tap to mark done — no multi-step workflow

**Financials module**
- Simple running list: date, type (cost/sale), amount, linked enterprise (optional), note
- Add transaction: 4 fields, one screen, no categories/chart of accounts in MVP
- Running total shown per enterprise and farm-wide (sum only — no charts)

**Settings / Farm Setup**
- Farm name
- Enterprises: add/remove Livestock or Crop enterprises, name each
- This screen doubles as onboarding — first-run experience walks the farmer through creating their farm and first enterprise(s)

### 8.3 Visual direction

- Large tap targets (minimum 44px), high-contrast text for outdoor visibility
- Muted, farm-appropriate palette (earth tones / greens) rather than generic SaaS blue — avoid looking like "enterprise software"
- Icons over text labels where possible for fast recognition
- No modal-heavy flows — prefer full-screen or bottom-sheet quick-add over stacked dialogs

---

## 9. Technical Decisions

Decided 2026-09-08, ahead of the first build iteration. Recorded here because the loop starts with fresh context every iteration and would otherwise re-litigate them.

| Area | Decision | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript, `vite-plugin-pwa` for the installable shell | Boring and well-trodden, best Playwright support, easiest to hand off later |
| Local storage | Dexie.js over IndexedDB | Survives close/reopen and device restart, satisfies the Section 10 data-safety requirement without a server |
| Sync | **None for MVP.** Local-only, single device | Deliberate cut. See "Deferred from the original backlog" below |
| Backup | Manual export to a file, and import to restore | The mitigation for having no server. If the phone is lost, the farmer has a file |
| Unit tests | Vitest | Ships with Vite, no extra config |
| E2E | Playwright, trace and video on, via `record_e2e.sh` | Already built and verified. See `e2e/recordings/E0-01/` |
| Hosting | Vercel | PWA install needs a real HTTPS URL for the demo; branch previews suit the loop |
| Livestock shape | One record type with a `count` field. `count = 1` is an individual with a tag, `count > 1` is a batch | Defers the unresolved Section 11 question without guessing wrong |
| Auth | None. No user accounts in MVP | Already out of scope in Section 5; with no server there is nothing to authenticate against |

**The sync cut is a change to Section 5,** which lists offline sync as in scope. It was two L-sized tickets that required a backend, auth, and conflict handling for a single farmer on a single device. The MVP goal in Section 4 is voluntary daily use for 2 to 4 weeks, which is fully testable on one device. Revisit the moment a second person needs to log data.

---

## 10. Epics & Backlog

Priority key: **P0** = MVP-critical, **P1** = MVP-important, **P2** = post-MVP
Estimate: T-shirt sizes (S / M / L)

**How the loop reads this section.** `Seq` is the build order and breaks every priority tie, so the loop always has exactly one correct next ticket. `Depends` must all be `DONE` in `PROGRESS.md` before a ticket is eligible. `GATE-n` rows are human checkpoints: the loop must not attempt them. On reaching a gate it appends `BLOCKED: GATE-n — awaiting human verification` to `PROGRESS.md` and stops.

### Phase 0: Foundation

Nothing in Epics 1 to 8 can be built before this phase. The original backlog had no scaffolding tickets at all, so iteration one would have tried to register an animal into an empty directory.

| ID | Seq | Depends | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|---|---|
| E0-01 | 1 | — | As a developer, I want an E2E harness that records durable evidence, so tickets can be proven done | Playwright configured with trace and video on; `record_e2e.sh <ID> --ui` writes `trace.zip`, `video.webm` and a log under `e2e/recordings/<ID>/`; canary spec passes on mobile and desktop projects | P0 | M |
| E0-02 | 2 | E0-01 | As a developer, I want the app scaffold so there is something to build into | Vite + React + TypeScript app boots; `vite-plugin-pwa` emits a manifest and service worker on build; Vitest runs and passes one real unit test; `E2E_DEV_SERVER_COMMAND` documented in README | P0 | M |
| E0-03 | 3 | E0-02 | As a developer, I want the Dexie schema and a typed data layer, so every module writes through one place | Schema covers Farm, Enterprise, LivestockRecord, Field, Event, Activity, Task, Transaction per Section 6; all reads and writes go through typed repository functions; no `any`; data survives reload and a device restart; unit tests cover create, read, update, delete per entity | P0 | L |
| E0-04 | 4 | E0-03 | As a farmer, I want the app shell and navigation so I can move between modules | Bottom tab bar below 768px, left sidebar at 768px and above; five destinations per Section 8.1; tap targets 44px minimum; earth-tone palette tokens defined once; every route renders a useful empty state, no blank screens | P0 | M |
| E0-05 | 5 | E0-02 | As Barrett, I want the app deployed so I can open it on my phone in front of the farmer | Production URL serves over HTTPS and passes an install prompt on Android Chrome; branch pushes produce preview URLs; `verification.md` records the commands run and the observed result | P0 | S |
| **GATE-0** | 6 | E0-01…E0-05 | Human checkpoint | Barrett opens the deployed shell on his own phone and confirms navigation and install work before any feature work starts | — | — |

### Phase 1: Core capture

The vertical slice that proves the concept. Every ticket here is P0.

| ID | Seq | Depends | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|---|---|
| E1-01 | 7 | GATE-0 | As a farmer, I want to create my farm profile so the app knows my operation exists | Farm name saved; persists across app restarts | P0 | S |
| E1-02 | 8 | E1-01 | As a farmer, I want to add a Livestock or Crop enterprise so I can log against it | Can add one or more enterprises of either type, each named | P0 | S |
| E2-01 | 9 | E1-02 | As a farmer, I want to register an animal or group so I can track it | One record type with name or tag, species, and `count`; `count = 1` renders as an individual, `count > 1` as a group; both paths tested | P0 | M |
| E2-02 | 10 | E2-01 | As a farmer, I want to log an event against an animal or group | Event has date, type (health / movement / weight / other) and note; written to IndexedDB with no network call | P0 | M |
| E2-03 | 11 | E2-02 | As a farmer, I want to see a history of events per animal or group | Chronological list, most recent first | P0 | S |
| E3-01 | 12 | E1-02 | As a farmer, I want to register a field or block so I can track it | Record with name, crop type, optional size | P0 | M |
| E3-02 | 13 | E3-01 | As a farmer, I want to log an activity against a field | Activity has date, type (planting / input / harvest / other) and note; written locally with no network call | P0 | M |
| E3-03 | 14 | E3-02 | As a farmer, I want to see a history of activities per field | Chronological list, most recent first | P0 | S |
| E4-01 | 15 | E1-01 | As a farmer, I want to create a task so I don't forget what needs doing | Title required; optional link to a field or animal group, free-text assignee, due date | P0 | S |
| E4-02 | 16 | E4-01 | As a farmer, I want to mark a task done | Single tap; moves to the Done group | P0 | S |
| E5-01 | 17 | E1-02 | As a farmer, I want to log a cost or sale so I have a running record | Date, type, amount, optional enterprise link, note; one screen, four fields | P0 | S |
| E7-01 | 18 | E2-02, E3-02, E4-01, E5-01 | As a farmer, I want a home screen showing recent activity across all modules | Last five entries, mixed types, most recent first | P0 | M |
| E7-02 | 19 | E7-01 | As a farmer, I want a fast way to log something without hunting through menus | "+" opens a quick-add sheet with four options; any log completable in under three taps from home | P0 | M |
| E1-03 | 20 | E7-02 | As a farmer, I want a guided first-run flow so I'm not staring at an empty app | First launch walks farm name, then first enterprise, then done | P0 | M |
| **GATE-1** | 21 | E1-01…E1-03, E2-01…E2-03, E3-01…E3-03, E4-01, E4-02, E5-01, E7-01, E7-02 | Human checkpoint | Barrett logs a real day's activity end to end on his phone and confirms the three-tap rule holds before demo work starts | — | — |

### Phase 2: Demo readiness

| ID | Seq | Depends | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|---|---|
| E8-01 | 22 | GATE-1 | As Barrett, I want a pre-populated demo farm so I can show the concept without the farmer's real data | Seed data loads a sample enterprise, several animals and fields, and a few days of realistic events | P0 | S |
| E8-02 | 23 | E8-01, E0-05 | As Barrett, I want the demo to work on my phone with no setup friction in front of the farmer | Installable PWA loads demo data on first open with one tap; airplane-mode logging works, per the Section 12 demo flow | P0 | S |
| E6-05 | 24 | E0-03 | As a farmer, I want to export my data so a lost phone doesn't mean lost records | Export writes every entity to a single file; import restores it to an empty install; round-trip covered by a test | P0 | M |
| **GATE-2** | 25 | E8-01, E8-02, E6-05 | Human checkpoint | Barrett runs the full Section 12 demo flow, airplane mode included, before it goes in front of the farmer | — | — |

### Phase 3: Polish

Everything P1. Build only after the farmer has seen it, so real feedback can reorder this list.

| ID | Seq | Depends | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|---|---|
| E7-03 | 26 | GATE-2 | As a farmer, I want today's and overdue tasks on the home screen | Home surfaces open tasks due today or overdue | P1 | S |
| E5-02 | 27 | E5-01 | As a farmer, I want a running total per enterprise and overall | Sum display only, no charts | P1 | S |
| E5-03 | 28 | E5-01 | As a farmer, I want to edit or delete a transaction I logged in error | Edit and delete from the transaction list | P1 | S |
| E2-04 | 29 | E2-02 | As a farmer, I want to attach a photo to an event, for example an injury | Photo stored in IndexedDB alongside the event and included in export | P1 | M |
| E3-04 | 30 | E3-02 | As a farmer, I want to attach a photo to an activity, for example crop damage | Photo stored in IndexedDB alongside the activity and included in export | P1 | M |
| E2-05 | 31 | E2-01 | As a farmer, I want to search and filter my livestock list | Search by name or tag; filter by species | P1 | S |
| E1-04 | 32 | E1-02 | As a farmer, I want to edit or remove an enterprise later | Edit and delete from Settings; delete requires confirmation | P1 | S |
| E6-06 | 33 | E6-05 | As a farmer, I want to be warned before an import overwrites what's there | Import shows what will be replaced and requires confirmation | P1 | S |

### Deferred from the original backlog

Removed from MVP by the Section 9 decisions. Recorded so the loop does not resurrect them and so the reasoning survives.

| Original ID | Was | Why it's gone |
|---|---|---|
| E6-01 | Every action works with no signal | Folded into E0-03. With Dexie and no server, local-first is the only write path that exists, so it is not a separate ticket |
| E6-02 | Background sync on reconnect | Cut with the sync decision. Replaced by export and import, which are new tickets E6-05 and E6-06 |
| E6-03 | Pending-sync indicator | Nothing to sync, so nothing to indicate |
| E6-04 | Conflict handling, last-write-wins | No second writer and no server, so no conflicts are possible |
| E4-03 | Today's and overdue tasks on home | Kept, renumbered to E7-03 because it is a Home screen change, not a Tasks one |

---

## 11. Non-Functional Requirements

- **Performance:** all local actions (add/edit/view) complete in under 300ms with no network dependency
- **Data usage:** sync payloads kept minimal — this matters for rural/limited-data connections
- **Device support:** modern mobile browsers (Android priority given SA farm-worker device patterns) and desktop browsers, installable as a PWA
- **Data safety:** local data must survive app close/reopen and device restart before first sync

---

## 12. Open Questions (resolve with the farmer)

1. Actual crop/livestock split and scale (how many fields, how many animals?). The individual-vs-batch part is resolved in Section 9; the scale question remains
2. Which of the 4 modules is causing the most real pain today — determines what gets built with more depth after MVP validation
3. Are there other people (workers, family) who'd need to log data, even informally, in the first weeks? A yes here is what would reopen the server-sync decision in Section 9
4. What device(s) does the farmer actually carry/use daily — this confirms the mobile-first assumption

---

## 13. Suggested Demo Flow (for the farmer meeting)

1. Open the pre-seeded demo farm — show the Home screen with a few days of realistic sample activity
2. Log a live event in front of them (e.g. add a livestock health event) — show it saves instantly, no spinner, no signal required
3. Toggle phone to airplane mode, log another entry, show it still works — this is the single most convincing moment for a farmer who's skeptical of "another app"
4. Switch to Financials, show the running total updating from the entries just logged
5. Ask them directly: "what would you have written down today, and where?" — use their real answer to validate or challenge the module priority in Section 9
