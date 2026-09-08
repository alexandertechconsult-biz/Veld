# RALPH master prompt

You are running ONE iteration of an autonomous build loop. You start with fresh context every time, so the files on disk are your only memory. Do exactly one ticket, all the way through the gates, then stop.

## Files (macOS checkout; run the loop from the worktree root)
- Backlog (source of truth):  `./BACKLOG.md`
- Progress ledger:            `./PROGRESS.md`
- Develop role:               skill `senior-programmer`
- Review role:                skill `code-reviewer`
- E2E recorder:               `bash ./.claude/skills/ralph-loop/scripts/record_e2e.sh`
- Design system (visual truth):`./.superdesign/design-system.md`
- E2E recordings go in:       `./e2e/recordings/<TICKET-ID>/`

## Do this, in order

1. **Orient.** Read `PROGRESS.md` first, then `BACKLOG.md`. Determine the set of tickets that are NOT done and whose dependencies are ALL marked `DONE` in `PROGRESS.md`. From that set, pick the SINGLE highest-priority ticket on the critical path. If the set is empty, append `ALL CLEAR` to `PROGRESS.md` and STOP.

2. **Announce.** Write a `STARTED: <TICKET-ID> @ <timestamp>` line to `PROGRESS.md` so a crash mid-iteration is visible.

3. **Develop.** Using the `senior-programmer` skill, implement exactly this ticket — its acceptance criteria, nothing more. Write unit tests for the logic as you go.

4. **Review.** Using the `code-reviewer` skill, review your own diff. If the verdict is `REQUEST_CHANGES`, fix the blockers/majors and review again. Maximum 3 rounds. If it still won't pass, go to step 8 (Blocked).

5. **Unit test.** Run the full test suite. If red, fix (max 3 attempts) and rerun. Never continue on a red suite. Capture the final test output.

6. **Test the running behaviour & record evidence.**
   - If the ticket adds a **user-facing or API surface**: run `bash ./.claude/skills/ralph-loop/scripts/record_e2e.sh <TICKET-ID> --ui` to exercise it end-to-end and save a durable recording under `e2e/recordings/<TICKET-ID>/`. If the E2E fails, treat it like a red test: fix (bounded) and rerun. Do not fake or skip it.
   - If the ticket is a **spike or pure-infra change with no runtime surface** (provisioning, CI, config, scaffolding): instead write a short `e2e/recordings/<TICKET-ID>/verification.md` stating exactly what you ran to confirm it works (commands + observed result). This stands in for the E2E recording.

7. **Done.** Only if review passed AND unit tests pass AND evidence was saved (an E2E recording for surface tickets, or a `verification.md` note for spikes/infra):
   - Update `PROGRESS.md`: change the ticket to `DONE`, and record the test result summary, the evidence path, and (after committing) the commit hash.
   - Commit with a single conventional-commit message referencing the id, e.g. `feat(module): TICKET-20 add feature X`.
   - STOP. Do not pick up another ticket.

8. **Blocked.** If you could not pass the gates within the bounded attempts: append `BLOCKED: <TICKET-ID> — <specific reason> — <smallest question that would unblock>` to `PROGRESS.md`, revert or stash any half-finished change so the tree is clean, and STOP. Do NOT skip ahead to a different ticket.

## Hard rules
- One ticket per iteration. One commit per ticket.
- Never mark `DONE` without BOTH a passing test run AND saved evidence (an E2E recording for surface tickets, or a `verification.md` note for spikes/infra).
- Never weaken tenant isolation, secrets handling, or privacy to make a ticket pass.
- Never edit `BACKLOG.md` or this prompt.
- Keep your reasoning short; spend the work on code, tests, and the recording.
