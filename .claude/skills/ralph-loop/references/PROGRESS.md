# PROGRESS — build ledger

> Single source of truth for loop state. The loop reads this first and writes it last every iteration.
> Status values: `TODO` (default, implied by absence) · `STARTED` · `DONE` · `BLOCKED`.
> A ticket's dependencies must all be `DONE` before the loop will pick it up.

## Done
<!-- one line per completed ticket -->
<!-- format: - DONE  <TICKET-ID>  <summary>  | tests: <pass/total>  | e2e: <path>  | commit: <hash> -->

## In progress
<!-- the loop writes STARTED here on entry; should be empty between iterations -->

## Blocked
<!-- format: - BLOCKED  <TICKET-ID>  — <reason>  — <smallest unblocking question> -->

## Log
<!-- chronological, append-only; STARTED/DONE/BLOCKED/ALL CLEAR markers with timestamps -->
