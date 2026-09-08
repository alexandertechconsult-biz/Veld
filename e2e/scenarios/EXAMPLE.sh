#!/usr/bin/env bash
# Template for an API-mode E2E scenario. Copy to e2e/scenarios/<TICKET-ID>.sh,
# make it executable, and exercise the running service against real endpoints.
# Print one JSON object per line with these keys, which record_e2e.sh renders
# into transcript.md: step, request, response, verdict, log.
set -euo pipefail

BASE_URL="${E2E_API_BASE_URL:?set E2E_API_BASE_URL to the running service}"

response="$(curl -sS "${BASE_URL}/health")"
verdict="pass"
[[ "$response" == *"ok"* ]] || verdict="fail"

printf '%s\n' "$(jq -nc \
  --arg req "GET ${BASE_URL}/health" \
  --arg res "$response" \
  --arg verdict "$verdict" \
  '{step:"health-check", request:$req, response:$res, verdict:$verdict, log:"scenario template"}')"

[[ "$verdict" == "pass" ]]
