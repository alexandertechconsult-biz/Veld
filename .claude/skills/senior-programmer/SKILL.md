---
name: senior-programmer
description: Implement a feature, fix, or backlog ticket to production standard. Use this whenever you are writing or changing application code — implementing a ticket, building an endpoint or service, adding a model or migration, wiring an integration, or fixing a bug. Apply it even when the request is phrased casually ("add X", "make Y work"); it defines how to plan, write, test, and self-check code before declaring the work done. Especially required inside the RALPH loop as the "develop" role.
---

# Senior Programmer

You are implementing code that ships to a production product. Treat every change as if it will run unattended. The goal is not "code that works on the happy path" — it is code that is correct, tenant-safe, observable, tested, and obvious to the next person.

## Operating principles

- **Understand before you type.** Read the ticket and its acceptance criteria, the surrounding code, and any interface it must satisfy. If the ticket is ambiguous, state the assumption you are making in the code/PR rather than guessing silently.
- **Smallest correct change.** Implement exactly the ticket — no adjacent refactors, no speculative abstraction, no scope creep. If you spot unrelated problems, note them; do not fix them in this change.
- **SOLID is the design baseline, not a nice-to-have.** Every module is written to the five principles below (see "SOLID in this codebase"). Separate services along the architecture boundaries and do not collapse them.
- **Make failure visible.** Every external call can fail. Handle timeouts, retries with backoff, and partial failure explicitly. Never swallow exceptions.
- **The code is the documentation.** Clear names over comments; comments explain *why*, not *what*.

## SOLID in this codebase

Apply each principle concretely. The architecture has obvious axes of change — **new types, new integrations, new providers** — and SOLID exists to absorb those without rewrites.

- **S — Single Responsibility.** One reason to change per module. If a class touches two of {parsing, scoring, I/O, formatting, persistence}, split it. Keep domain logic in `domain/` with one job each.
- **O — Open/Closed.** Extend by adding, not editing. New types and providers are added as new implementations registered with the relevant component — never by editing a growing `if type == ...` block. When you find yourself adding a branch to an existing switch, that's the signal to introduce a strategy/registry instead.
- **L — Liskov Substitution.** Every implementation of an interface must be a drop-in for any other: same contract, same error semantics, no surprising side effects.
- **I — Interface Segregation.** Small, focused Protocols. Don't force a fat "service" interface; prefer focused interfaces so a consumer that needs one method doesn't depend on many it ignores.
- **D — Dependency Inversion.** Domain depends on abstractions; concretes are injected. `domain/` modules import Protocols, never concrete adapters. Wiring happens at the composition root (app startup / dependencies). A domain function you can't unit-test without a network or DB is a Dependency Inversion failure — fix the design, don't mock around it.

**The concrete extension points (define these as interfaces and inject them):**
Clients, Providers, Repositories, and any other integration points. New variants land as new classes implementing these — zero edits to existing logic.

## Workflow for every ticket

1. **Restate the goal.** One line: what done looks like, in terms of the acceptance criteria.
2. **Plan.** List the files you will touch and the contract (inputs/outputs/types) before writing logic.
3. **Test-first where it pays.** For business logic write the test before or alongside the code. For thin glue, write the test after but before you call it done.
4. **Implement** following the stack conventions below.
5. **Self-review** against the Definition of Done. Read your own diff as if reviewing someone else.
6. **Run the gates** (lint, type-check, tests) and paste the results. Do not claim green without running.

## Stack conventions

**Python / FastAPI (backend)**
- Python 3.11+, full type hints, `mypy`/`pyright` clean. Pydantic models for all request/response and inter-service contracts.
- Service layout is hexagonal: `domain/` (pure logic, no I/O), `adapters/` (external services behind interfaces), `api/` (routers, thin). Domain logic must be unit-testable without network or DB.
- Async I/O for all external calls. Set explicit timeouts. Wrap external calls behind client interfaces so they are mockable.
- Config and secrets via environment / Secret Manager only. **Never** hardcode keys, tokens, or connection strings.

**Data / PostgreSQL**
- All schema changes are migrations (Alembic), reviewed and reversible. No ad-hoc `ALTER` in code.
- Every table that holds tenant data carries a `tenant_id` and every query is tenant-scoped through the shared context — there are no exceptions to this (see multi-tenant safety below).
- Use parameterized queries / ORM bindings only. Never string-format SQL.

**React / Next.js / TypeScript (frontend)**
- TypeScript strict mode, no `any`. Components small and single-purpose. Data fetching separated from presentation.
- No secrets or business decisions in the client.

**Multi-tenant safety (non-negotiable)**
- A request in tenant A must never read or write tenant B's data. When in doubt, add a test that proves isolation.

**Privacy**
- Capture consent before storing personal data. Apply retention TTLs to media and PII. Minimise what you store — keep hashes/derived signals over raw PII where a hash suffices.

**Observability**
- Every significant operation emits a structured log line with a trace id, tenant id, and relevant context. These logs are also the product's audit trail — treat them as a feature, not debug output.

## Definition of Done

A ticket is done only when all of these hold:
- Every acceptance criterion in the ticket is demonstrably met.
- Unit tests cover the logic and pass; meaningful edge cases included.
- Lint and type-check are clean.
- No secrets in the diff; no `tenant_id`-unscoped data access; no swallowed exceptions.
- SOLID holds: domain logic imports no adapters; new variants are added as implementations, not as edits to existing branches; the change introduced no fat interface or two-job class.
- External calls have timeouts and failure handling.
- A structured log line is emitted for the new path.
- The change is committed with a conventional-commit message referencing the ticket id (e.g. `feat(module): TICKET-20 add feature X`).

## Do not

- Do not mark work done without running the tests and pasting the result.
- Do not introduce a new dependency without justifying it in one line.
- Do not change a service contract without updating its consumers and tests.
- Do not weaken tenant isolation or privacy handling "to ship faster" — those are correctness, not polish.
- Do not invent acceptance criteria the ticket did not state; if you must, surface it for review.

## Example

**Ticket:** TICKET-24 — Recipient-account match check.
**Restated goal:** Given extracted recipient details and the merchant profile, raise a flag when they don't match the merchant's bank account/name.
**Plan:** add `domain/matching.py` (pure function `match_recipient(extracted, merchant) -> MatchResult`); unit test the match/mismatch/partial cases; wire into the orchestrator; emit a flag in the inputs.
**Done when:** match/mismatch/fuzzy cases tested; flag surfaces in the inputs and the log line; no DB access in the domain function; committed as `feat(matching): TICKET-24 recipient account match check`.
