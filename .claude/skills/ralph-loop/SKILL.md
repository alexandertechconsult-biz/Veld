---
name: ralph-loop
description: Run an autonomous, bounded development loop that builds a backlog ticket-by-ticket — developing, self-reviewing, unit-testing, running and recording E2E tests, and committing — one ticket per iteration with fresh context each time. Use this whenever the user wants to "run the loop", "build out the backlog autonomously", "RALPH", or set up a develop/review/test/E2E pipeline that grinds through tickets without hand-holding. Also use it to explain or repair the loop. The loop composes the senior-programmer skill (develop) and the code-reviewer skill (review) and enforces test + E2E recording before any ticket is marked done.
---

# RALPH Loop

A RALPH loop is a deliberately simple, brute-force agentic build technique: a shell loop repeatedly invokes the coding agent with one fixed master prompt. Each invocation starts with **fresh context**, reads the persistent state files, picks **one** smallest unit of work, takes it all the way through develop → review → test → E2E → record → commit, updates the state, and exits. The shell then restarts it. Persistence lives in files on disk, not in the context window — that is what makes it robust over long runs and immune to context rot.

The whole point is discipline through repetition: every ticket goes through the same gates, every iteration is reproducible, and progress is always visible in `PROGRESS.md`.

## When to use

- Building out a backlog (or any spec) autonomously.
- Setting up the develop/review/test/E2E pipeline for the first time.
- Diagnosing why the loop stalled or repeated work.

## The three files that drive the loop

1. **`BACKLOG.md`** — the source of truth for what to build. The loop respects the critical path and dependency order in it.
2. **`PROGRESS.md`** — the append-only ledger of what's done, in progress, blocked, and what artifacts each ticket produced. This is read first and written last every iteration. Template in `references/PROGRESS.md`.
3. **`PROMPT.md`** — the master prompt fed to the agent every iteration. It encodes the cycle below. Template in `references/PROMPT.md`. Do not edit it mid-run unless the loop is stopped.

## One iteration = one ticket, through every gate

The agent, on each invocation, must:

1. **Orient.** Read `PROGRESS.md`, then `BACKLOG.md`. Select the single next ticket whose dependencies are all `DONE`, preferring the critical path. If none are eligible, write `ALL CLEAR` to `PROGRESS.md` and stop.
2. **Develop.** Apply the **senior-programmer** skill to implement exactly that ticket.
3. **Review.** Apply the **code-reviewer** skill to the diff. If the verdict is `REQUEST_CHANGES`, fix and re-review — at most 3 review rounds. If still not passing, go to *Blocked*.
4. **Unit test.** Run the test suite. Red → fix (bounded) → rerun. Never proceed on red.
5. **E2E + record.** Run the end-to-end check for the feature and **record the run** (see below). Save the recording/transcript under `e2e/recordings/<ticket-id>/`.
6. **Record progress.** Update `PROGRESS.md`: mark the ticket `DONE`, list the test result, the E2E recording path, and the commit hash.
7. **Commit.** One conventional-commit per ticket, referencing the id. Do not batch multiple tickets into one commit.
8. **Stop.** Exit cleanly so the shell restarts with fresh context.

**Blocked path:** if a ticket cannot pass review or tests after the bounded attempts, write a `BLOCKED: <ticket-id>` entry to `PROGRESS.md` with the specific reason and the smallest question that would unblock it, then stop. Do not silently skip it and grab another ticket — an unexplained skip hides real problems.

## Recording E2E tests

Record durable artifacts so a human can see the system actually running:

- **Web UI** → Playwright with trace + video on. Save the `.zip` trace and `.webm` under `e2e/recordings/<ticket-id>/`.
- **API flows** (no UI) → run a scripted request/response transcript against the running service and save the full request, response, verdict, and the structured log line as a timestamped `transcript.json` plus a human-readable `transcript.md`.

`scripts/record_e2e.ps1` (native Windows; `record_e2e.sh` for Linux) wraps both. Recordings are never overwritten — each run is timestamped — because the accumulating evidence trail is itself a deliverable.

## How to run

Run it on a **dedicated branch in a throwaway git worktree**, never against `main` in your main working copy, because the loop commits autonomously. The agent loop runs on the **native Windows host** (PowerShell); Docker is only for the app's runtime dependencies (Postgres, Redis) that tests and E2E need — not for the agent itself.

**Native Windows (PowerShell) — primary:**
```powershell
.\scripts\ralph.ps1 -MaxIterations 25 -Branch ralph/phase-0
```
If PowerShell blocks the script, launch it with `powershell -ExecutionPolicy Bypass -File .\scripts\ralph.ps1 ...` or set `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

**Linux (only if you ever run on a Linux box):**
```bash
bash scripts/ralph.sh --max-iterations 25 --branch ralph/phase-0
```

Both: read `PROMPT.md`, invoke `claude -p` per iteration, log each iteration under `ralph-logs/`, and stop when iterations are exhausted, when `PROGRESS.md` reports `ALL CLEAR`, or when a `STOP` sentinel file appears (create it to halt cleanly between iterations).

## Safety rails (do not remove)

- **Bounded, not infinite.** Always cap iterations. Infinite loops burn tokens and hide failures.
- **One ticket per commit.** Keeps history bisectable and reviews honest.
- **Never mark `DONE` without a passing test run AND saved evidence** — an E2E recording for tickets with a user-facing/API surface, or a `verification.md` note for spikes and pure-infra tickets. This is the core integrity rule of the loop.
- **Never weaken tenant isolation, secrets handling, or privacy** to make a ticket pass — those are gates, not obstacles.
- **Sandbox.** Dedicated branch in a separate git worktree (`git worktree add ..\project-ralph ralph/phase-0`). The loop can and will commit; keep it away from your main working copy.
- **Human checkpoints.** At each phase gate in the backlog, stop the loop and have a human verify the gate before continuing to the next phase.

## Reference files

- `references/PROMPT.md` — the master loop prompt (the heart of RALPH). Read and adapt paths before first run.
- `references/PROGRESS.md` — the ledger template.
- `references/loop-anatomy.md` — deeper notes on why fresh-context-per-iteration and file-based state make the loop robust, plus failure modes to watch.
- `scripts/ralph.ps1` (Windows) / `scripts/ralph.sh` (Linux) — the loop wrappers.
- `scripts/record_e2e.ps1` (Windows) / `scripts/record_e2e.sh` (Linux) — E2E run + recording helper.
