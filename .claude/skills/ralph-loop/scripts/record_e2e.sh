#!/usr/bin/env bash
# record_e2e.sh — run end-to-end checks for a ticket and save durable recordings.
# UI surfaces  -> Playwright with trace + video.
# API -> scripted request/response transcript (the "agent execution log" evidence).
# Usage: scripts/record_e2e.sh <TICKET-ID> [--ui | --api]
set -euo pipefail

TICKET="${1:-}"
MODE="${2:-auto}"   # --ui | --api | auto
[[ -n "$TICKET" ]] || { echo "Usage: $0 <TICKET-ID> [--ui|--api]"; exit 1; }

ts="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="e2e/recordings/${TICKET}/${ts}"
mkdir -p "$OUT"
echo "Recording E2E for $TICKET -> $OUT"

run_ui() {
  echo "[ui] Playwright with trace+video"
  # Expects a Playwright project with traces/video enabled in playwright.config.
  # Tag the per-ticket spec with @${TICKET} (e.g. test('...', { tag: '@TICKET-80' })).
  PLAYWRIGHT_HTML_REPORT="$OUT/report" \
    npx playwright test --grep "@${TICKET}" \
      --trace on --output "$OUT/artifacts" | tee "$OUT/playwright.log"
  # Collect traces/videos
  find "$OUT/artifacts" -name '*.zip'  -exec cp {} "$OUT/" \; 2>/dev/null || true
  find "$OUT/artifacts" -name '*.webm' -exec cp {} "$OUT/" \; 2>/dev/null || true
}

run_api() {
  echo "[api] scripted request/response transcript"
  # Expects an executable scenario at e2e/scenarios/${TICKET}.sh that exercises the
  # running service and prints JSON lines: {"step","request","response","verdict","log"}.
  SCENARIO="e2e/scenarios/${TICKET}.sh"
  if [[ -x "$SCENARIO" ]]; then
    "$SCENARIO" | tee "$OUT/transcript.jsonl"
    # Human-readable rendering
    {
      echo "# E2E transcript — ${TICKET} — ${ts}"
      echo
      jq -r '"## " + (.step // "step") + "\n**Request:** `" + (.request|tostring) + "`\n**Response:** `" + (.response|tostring) + "`\n**Verdict:** " + (.verdict // "-") + "\n**Log:** `" + (.log // "-") + "`\n"' \
        "$OUT/transcript.jsonl" 2>/dev/null || cat "$OUT/transcript.jsonl"
    } > "$OUT/transcript.md"
  else
    echo "WARN: no scenario at $SCENARIO — create one. Writing placeholder."
    echo '{"step":"missing-scenario","note":"create e2e/scenarios/'"${TICKET}"'.sh"}' > "$OUT/transcript.jsonl"
  fi
}

case "$MODE" in
  --ui)  run_ui ;;
  --api) run_api ;;
  auto)
    # Heuristic: run whichever scaffolding exists; prefer both if present.
    [[ -f playwright.config.ts || -f playwright.config.js ]] && run_ui || true
    [[ -x "e2e/scenarios/${TICKET}.sh" ]] && run_api || true
    if [[ ! -e "$OUT/transcript.jsonl" && ! -e "$OUT/playwright.log" ]]; then
      echo "ERROR: no E2E scaffolding found for $TICKET (no Playwright config, no scenario). Add one."; exit 2
    fi
    ;;
  *) echo "Unknown mode: $MODE"; exit 1 ;;
esac

echo "Saved E2E recording: $OUT"
echo "$OUT"   # last line = path, for the loop to capture into PROGRESS.md
