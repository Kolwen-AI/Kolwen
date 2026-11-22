# Tests for the merge refusal (kw-check-runs.ps1: Assert-GreenRuns) over hand-built check-run lists in the REST shape. No network, no merge.
# Run: powershell -NoProfile -File kw-merge.test.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'kw-check-runs.ps1')
$script:fails = 0
function Run-Check([string]$name, [string]$conclusion = 'success', [string]$status = 'completed') {
  [pscustomobject]@{ name = $name; status = $status; conclusion = $conclusion; id = $name.Length }
}
function Expect-Refused([string]$label, $runs, [string]$mustName) {
  try { Assert-GreenRuns -Runs $runs; Write-Output "FAIL ${label}: passed through"; $script:fails++ }
  catch {
    if ($_.Exception.Message -like "*$mustName*") { Write-Output "PASS ${label}: refused, naming '$mustName'" }
    else { Write-Output "FAIL ${label}: refused without naming '$mustName': $($_.Exception.Message)"; $script:fails++ }
  }
}
Expect-Refused 'a failing run on the head SHA' @((Run-Check 'all-green'), (Run-Check 'surface (published claims)' 'failure')) 'surface (published claims) failure'
Expect-Refused 'all-green itself failing' @((Run-Check 'all-green' 'failure')) 'all-green failure'
Expect-Refused 'no all-green check at all' @((Run-Check 'surface (published claims)')) 'all-green missing'
try {
  Assert-GreenRuns -Runs @((Run-Check 'all-green'), (Run-Check 'secret scan'), (Run-Check 'optional check' 'skipped'))
  Write-Output 'PASS a green list passes through'
} catch { Write-Output "FAIL a green list was refused: $($_.Exception.Message)"; $script:fails++ }
$fx = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'fixture-fbc1164-checkruns.json') | ConvertFrom-Json
$real = @(if ($fx.check_runs) { $fx.check_runs } else { $fx })
Expect-Refused 'recorded red head fbc1164: all-green' $real 'all-green failure'
Expect-Refused 'recorded red head fbc1164: rendered' $real 'rendered'
if ($script:fails -gt 0) { Write-Output "FAILED $($script:fails)"; exit 1 }
Write-Output 'ALL PASS'
exit 0
