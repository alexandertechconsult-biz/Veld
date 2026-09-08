<#
.SYNOPSIS
  RALPH loop - bounded autonomous build loop (native Windows / PowerShell).
  Each iteration: fresh `claude -p` session reads PROMPT.md, does ONE ticket, exits.
  Run on a throwaway branch - it commits autonomously.
#>
[CmdletBinding()]
param(
  [int]$MaxIterations = 25,
  [string]$Branch = "",
  [string]$PromptFile = "references/PROMPT.md",
  [string]$ProgressFile = "PROGRESS.md"
)

$ErrorActionPreference = "Stop"
$LogDir = "ralph-logs"
$StopFile = "STOP"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { throw "'claude' CLI not found on PATH." }
if (-not (Test-Path $PromptFile)) { throw "Prompt file not found: $PromptFile" }
if (-not (Test-Path $ProgressFile)) { throw "$ProgressFile missing - copy references/PROGRESS.md to the repo root first." }

if ($Branch -ne "") {
  git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -ne 0) { throw "Not a git repo." }
  git checkout -B $Branch
  Write-Host "On branch: $Branch"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
if (Test-Path $StopFile) { Remove-Item $StopFile -Force }

Write-Host "RALPH starting: max $MaxIterations iterations. Create a '$StopFile' file to halt cleanly between iterations."
$prompt = Get-Content -Raw -Path $PromptFile

for ($i = 1; $i -le $MaxIterations; $i++) {
  $ts = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
  $log = Join-Path $LogDir ("iter-{0:D3}-{1}.log" -f $i, $ts)
  Write-Host "=== Iteration $i/$MaxIterations @ $ts ==="

  if (Test-Path $StopFile) { Write-Host "STOP file present - halting."; Remove-Item $StopFile -Force; break }
  if (Select-String -Path $ProgressFile -Pattern "ALL CLEAR" -Quiet) { Write-Host "PROGRESS reports ALL CLEAR - backlog complete."; break }

  # Fresh, non-interactive session. --dangerously-skip-permissions assumes a sandboxed branch.
  # Temporarily allow stderr output without terminating (native commands often write to stderr).
  $ErrorActionPreference = "Continue"
  claude -p $prompt --dangerously-skip-permissions 2>&1 | Tee-Object -FilePath $log
  $ErrorActionPreference = "Stop"

  if (Select-String -Path $ProgressFile -Pattern "ALL CLEAR" -Quiet) { Write-Host "Backlog complete."; break }
  Write-Host "--- iteration $i done; see $log ---"
}

Write-Host "RALPH stopped. Review PROGRESS.md and git log."
