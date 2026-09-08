# RALPH loop anatomy

## Why it's built this way

**Fresh context every iteration.** Each loop invocation is a brand-new agent session. It does not carry the previous ticket's reasoning, half-thoughts, or accumulated confusion. Long agent sessions degrade — context fills with stale detail and the model drifts ("context rot"). By resetting every ticket and forcing all memory through `PROGRESS.md`, the loop stays as sharp on iteration 50 as on iteration 1.

**File-based state, not conversational state.** `BACKLOG.md` (what to build), `PROGRESS.md` (what's done), and the recordings on disk are the entire memory. Anyone — a human, a fresh agent, a restarted machine — can read those three things and know exactly where the build is. State survives crashes.

**One ticket, every gate, every time.** The value isn't speed, it's *consistency*: every unit of work passes develop → review → test → E2E → record → commit identically. No ticket sneaks through without a review or without a recording, because the prompt makes those steps the definition of "done."

**One commit per ticket.** History stays bisectable. If iteration 37 broke something, you can find and revert exactly that ticket.

## Failure modes to watch (and the guard for each)

- **Silent skipping** — agent can't pass a ticket so it quietly grabs an easier one, hiding the problem. *Guard:* the Blocked path is mandatory; skipping ahead is forbidden.
- **Fake-green** — marking done without really running tests/E2E. *Guard:* `DONE` requires a captured test result and a saved recording path in the ledger; no path, not done.
- **Runaway loop** — infinite iterations burning tokens. *Guard:* `--max-iterations` cap, `ALL CLEAR` stop, and the `STOP` sentinel file.
- **Scope creep** — agent refactors unrelated code mid-ticket. *Guard:* the senior-programmer skill mandates smallest-correct-change; the reviewer flags out-of-scope edits.
- **Dependency violation** — building a ticket before its prerequisites. *Guard:* the loop only selects tickets whose deps are all `DONE`.
- **Loop drift** — someone edits `PROMPT.md` mid-run and iterations stop being comparable. *Guard:* don't edit the prompt or backlog while the loop runs; stop it, edit, restart.

## Phase gates and humans

The backlog is phased with validation gates. Run the loop one phase at a time (`--branch ralph/phase-0`, then `phase-1`, …). When a phase's tickets are all `DONE`, **stop and have a human verify the gate** before pointing the loop at the next phase. The loop is a force multiplier for the grind; it is not a substitute for the human judgment at each gate.

## What a healthy run looks like

`ralph-logs/` fills with one log per iteration. `PROGRESS.md`'s Done list grows by one ticket per iteration, each with a test summary, an `e2e/recordings/...` path, and a commit hash. `git log` shows one clean conventional commit per ticket. The Blocked section stays empty; when it isn't, it contains a specific, answerable question.
