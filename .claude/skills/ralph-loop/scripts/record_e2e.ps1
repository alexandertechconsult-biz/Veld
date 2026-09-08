<#
.SYNOPSIS
  record_e2e.ps1 - run end-to-end checks for a ticket and save durable recordings (native Windows).
  UI surfaces  -> Playwright with trace + video.
  API -> scripted request/response transcript (the "agent execution log" evidence).
.EXAMPLE
  .\scripts\record_e2e.ps1 TICKET-80 -Mode ui
  .\scripts\record_e2e.ps1 TICKET-20 -Mode api
  .\scripts\record_e2e.ps1 TICKET-24            # auto
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)] [string]$Ticket,
  [ValidateSet("ui", "api", "auto")] [string]$Mode = "auto"
)

$ErrorActionPreference = "Stop"
$ts  = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$out = Join-Path "e2e/recordings/$Ticket" $ts
New-Item -ItemType Directory -Force -Path $out | Out-Null
Write-Host "Recording E2E for $Ticket -> $out"

function Invoke-UI {
  Write-Host "[ui] Playwright with trace+video"
  # Expects a Playwright project with traces/video enabled in playwright.config.
  # Tag the per-ticket spec with @$Ticket (e.g. test('...', { tag: '@TICKET-80' })).
  $env:PLAYWRIGHT_HTML_REPORT = Join-Path $out "report"
  npx playwright test --grep "@$Ticket" --trace on --output (Join-Path $out "artifacts") *>&1 |
    Tee-Object -FilePath (Join-Path $out "playwright.log")
  Get-ChildItem (Join-Path $out "artifacts") -Recurse -Include *.zip, *.webm -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName $out }
}

function Invoke-Api {
  Write-Host "[api] scripted request/response transcript"
  # Expects e2e/scenarios/$Ticket.ps1 that exercises the running service and emits
  # one JSON object per step with: step, request, response, verdict, log.
  $scenario = "e2e/scenarios/$Ticket.ps1"
  $jsonl = Join-Path $out "transcript.jsonl"
  if (Test-Path $scenario) {
    & $scenario | Tee-Object -FilePath $jsonl
    # Human-readable rendering
    $md = @("# E2E transcript - $Ticket - $ts", "")
    Get-Content $jsonl | ForEach-Object {
      try {
        $o = $_ | ConvertFrom-Json
        $md += "## $($o.step)"
        $md += "**Request:** ``$($o.request)``"
        $md += "**Response:** ``$($o.response)``"
        $md += "**Verdict:** $($o.verdict)"
        $md += "**Log:** ``$($o.log)``"
        $md += ""
      } catch { $md += $_ }
    }
    $md -join "`n" | Set-Content -Path (Join-Path $out "transcript.md")
  } else {
    Write-Warning "No scenario at $scenario - create one. Writing placeholder."
    '{"step":"missing-scenario","note":"create e2e/scenarios/' + $Ticket + '.ps1"}' | Set-Content $jsonl
  }
}

switch ($Mode) {
  "ui"  { Invoke-UI }
  "api" { Invoke-Api }
  "auto" {
    if (Test-Path "playwright.config.ts") { Invoke-UI } elseif (Test-Path "playwright.config.js") { Invoke-UI }
    if (Test-Path "e2e/scenarios/$Ticket.ps1") { Invoke-Api }
    if (-not (Test-Path (Join-Path $out "transcript.jsonl")) -and -not (Test-Path (Join-Path $out "playwright.log"))) {
      throw "No E2E scaffolding found for $Ticket (no Playwright config, no scenario). Add one."
    }
  }
}

Write-Host "Saved E2E recording: $out"
Write-Output $out   # last line = path, for the loop to capture into PROGRESS.md
