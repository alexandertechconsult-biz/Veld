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
- Offline-first capture with background sync
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

**Open question for farmer conversation:** actual crop/livestock balance, animal count, number of fields/blocks, and whether livestock is individually tracked (named/tagged animals) or managed as batches/groups. This materially affects the Livestock module's data shape and should be confirmed before that module is built in depth.

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

## 9. Epics & Backlog

Priority key: **P0** = MVP-critical, **P1** = MVP-important, **P2** = post-MVP / nice-to-have
Estimate: T-shirt sizes (S / M / L) for planning-poker-style sizing later

### Epic 1: Farm & Enterprise Setup

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E1-01 | As a farmer, I want to create my farm profile so the app knows my operation exists | Farm name saved; farm persists across app restarts | P0 | S |
| E1-02 | As a farmer, I want to add a Livestock or Crop enterprise so I can start logging against it | Can add 1+ enterprises of either type, each with a name | P0 | S |
| E1-03 | As a farmer, I want a guided first-run flow so I'm not staring at an empty app | First launch walks through farm name → first enterprise → done | P0 | M |
| E1-04 | As a farmer, I want to edit or remove an enterprise later | Edit/delete available from Settings; delete requires confirmation | P1 | S |

### Epic 2: Livestock Module

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E2-01 | As a farmer, I want to register an animal or group so I can track it | Create record with name/tag, species, count if group | P0 | M |
| E2-02 | As a farmer, I want to log an event against an animal/group | Event has date, type, note; saved offline instantly | P0 | M |
| E2-03 | As a farmer, I want to see a history of events per animal/group | Chronological list, most recent first | P0 | S |
| E2-04 | As a farmer, I want to attach a photo to an event (e.g. injury) | Photo stored locally, syncs when online | P1 | M |
| E2-05 | As a farmer, I want to search/filter my livestock list | Search by name/tag; filter by species | P1 | S |

### Epic 3: Crop Module

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E3-01 | As a farmer, I want to register a field/block so I can track it | Create record with name, crop type, optional size | P0 | M |
| E3-02 | As a farmer, I want to log an activity against a field | Activity has date, type, note; saved offline instantly | P0 | M |
| E3-03 | As a farmer, I want to see a history of activities per field | Chronological list, most recent first | P0 | S |
| E3-04 | As a farmer, I want to attach a photo to an activity (e.g. crop damage) | Photo stored locally, syncs when online | P1 | M |

### Epic 4: Task Management

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E4-01 | As a farmer, I want to create a task so I don't forget what needs doing | Title required; optional link to field/animal group, assignee, due date | P0 | S |
| E4-02 | As a farmer, I want to mark a task done | Single tap; task moves to Done list | P0 | S |
| E4-03 | As a farmer, I want to see today's/overdue tasks on the home screen | Home screen surfaces open tasks due today or overdue | P1 | S |

### Epic 5: Financial Tracking

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E5-01 | As a farmer, I want to log a cost or sale so I have a running record | Date, type, amount, optional enterprise link, note | P0 | S |
| E5-02 | As a farmer, I want to see a running total per enterprise and overall | Simple sum display, no charts required for MVP | P1 | S |
| E5-03 | As a farmer, I want to edit or delete a transaction I logged in error | Edit/delete from transaction list | P1 | S |

### Epic 6: Offline-First Architecture & Sync

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E6-01 | As a farmer, I want every action to work with no signal | All create/edit actions write to local storage first, no network dependency | P0 | L |
| E6-02 | As a farmer, I want my data to sync automatically once I'm back online | Background sync on reconnect; no manual "sync" button required | P0 | L |
| E6-03 | As a farmer, I want to see if anything hasn't synced yet | Small, non-blocking indicator (e.g. "2 pending") | P1 | S |
| E6-04 | As a developer, I want conflict handling defined for the (unlikely, single-user) case of divergent offline edits | Last-write-wins acceptable for MVP given single-user assumption | P1 | S |

### Epic 7: Home / Dashboard

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E7-01 | As a farmer, I want a home screen showing recent activity across all modules | Shows last 5 entries, mixed types, most recent first | P0 | M |
| E7-02 | As a farmer, I want a fast way to log something without hunting through menus | "+" button opens quick-add sheet with 4 options | P0 | M |

### Epic 8: Demo & Onboarding (for showing the farmer)

| ID | User Story | Acceptance Criteria | Priority | Est. |
|---|---|---|---|---|
| E8-01 | As Barrett, I want a pre-populated demo farm so I can show the concept without the farmer's real data | Seed data: sample enterprise, a few animals/fields, sample events | P0 | S |
| E8-02 | As Barrett, I want the demo to work on my phone with no setup friction in front of the farmer | Installable PWA, loads demo data on first open with one tap | P0 | S |

---

## 10. Non-Functional Requirements

- **Performance:** all local actions (add/edit/view) complete in under 300ms with no network dependency
- **Data usage:** sync payloads kept minimal — this matters for rural/limited-data connections
- **Device support:** modern mobile browsers (Android priority given SA farm-worker device patterns) and desktop browsers, installable as a PWA
- **Data safety:** local data must survive app close/reopen and device restart before first sync

---

## 11. Open Questions (resolve with the farmer)

1. Actual crop/livestock split and scale (how many fields, how many animals — individually tracked or batch/group?)
2. Which of the 4 modules is causing the most real pain today — determines what gets built with more depth after MVP validation
3. Are there other people (workers, family) who'd need to log data, even informally, in the first weeks?
4. What device(s) does the farmer actually carry/use daily — this confirms the mobile-first assumption

---

## 12. Suggested Demo Flow (for the farmer meeting)

1. Open the pre-seeded demo farm — show the Home screen with a few days of realistic sample activity
2. Log a live event in front of them (e.g. add a livestock health event) — show it saves instantly, no spinner, no signal required
3. Toggle phone to airplane mode, log another entry, show it still works — this is the single most convincing moment for a farmer who's skeptical of "another app"
4. Switch to Financials, show the running total updating from the entries just logged
5. Ask them directly: "what would you have written down today, and where?" — use their real answer to validate or challenge the module priority in Section 9
