#!/usr/bin/env bash
# RALPH loop — bounded autonomous build loop (Linux / Docker / WSL).
# Each iteration: fresh `claude -p` session reads PROMPT.md, does ONE ticket, exits.
# Run inside a container or throwaway branch — it commits autonomously.
set -euo pipefail

MAX_ITERATIONS=25
BRANCH=""
PROMPT_FILE="references/PROMPT.md"
PROGRESS_FILE="PROGRESS.md"
LOG_DIR="ralph-logs"
STOP_FILE="STOP"

usage() { echo "Usage: $0 [--max-iterations N] [--branch NAME] [--prompt PATH] [--progress PATH]"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-iterations) MAX_ITERATIONS="$2"; shift 2;;
    --branch)         BRANCH="$2"; shift 2;;
    --prompt)         PROMPT_FILE="$2"; shift 2;;
    --progress)       PROGRESS_FILE="$2"; shift 2;;
    -h|--help)        usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not found on PATH."; exit 1; }
[[ -f "$PROMPT_FILE" ]] || { echo "ERROR: prompt file not found: $PROMPT_FILE"; exit 1; }

if [[ -n "$BRANCH" ]]; then
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: not a git repo."; exit 1; }
  git checkout -B "$BRANCH"
  echo "On branch: $BRANCH"
fi

mkdir -p "$LOG_DIR"
[[ -f "$PROGRESS_FILE" ]] || { echo "ERROR: $PROGRESS_FILE missing — copy references/PROGRESS.md to the repo root first."; exit 1; }
rm -f "$STOP_FILE"

echo "RALPH starting: max $MAX_ITERATIONS iterations. Touch '$STOP_FILE' to halt cleanly between iterations."

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  log="$LOG_DIR/iter-$(printf '%03d' "$i")-$ts.log"
  echo "=== Iteration $i/$MAX_ITERATIONS @ $ts ==="

  if [[ -f "$STOP_FILE" ]]; then echo "STOP file present — halting."; rm -f "$STOP_FILE"; break; fi
  if grep -q "ALL CLEAR" "$PROGRESS_FILE"; then echo "PROGRESS reports ALL CLEAR — backlog complete."; break; fi

  # Fresh, non-interactive session. --dangerously-skip-permissions assumes a sandboxed branch/container.
  claude -p "$(cat "$PROMPT_FILE")" \
    --dangerously-skip-permissions \
    2>&1 | tee "$log"

  if grep -q "ALL CLEAR" "$PROGRESS_FILE"; then echo "Backlog complete."; break; fi
  echo "--- iteration $i done; see $log ---"
done

echo "RALPH stopped after up to $MAX_ITERATIONS iterations. Review PROGRESS.md and git log."
