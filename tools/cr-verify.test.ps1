# Witness for the Verify read path: Invoke-RestMethod and Invoke-WebRequest are stubs that record each call's method (no network, no comment).
# The read run must record only GET; the press run (-Press) must record exactly one POST. Run: powershell -NoProfile -File cr-verify.test.ps1
$ErrorActionPreference = 'Stop'
$global:kwCalls = @()
$global:kwFixture = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'cr-verify.fixture.json') | ConvertFrom-Json
function Invoke-RestMethod {
  param([string]$Method = 'Get', [string]$Uri, $Headers, $Body, [string]$ContentType, [int]$TimeoutSec)
  $global:kwCalls += [pscustomobject]@{ api = 'rest'; method = $Method.ToUpper(); uri = $Uri }
  if ($Method -ieq 'Post') { return [pscustomobject]@{ id = 0; created_at = 'stub' } }
  return $global:kwFixture
}
function Invoke-WebRequest {
  param([string]$Method = 'Get', [string]$Uri, $Headers, [int]$TimeoutSec, [switch]$UseBasicParsing)
  $global:kwCalls += [pscustomobject]@{ api = 'web'; method = $Method.ToUpper(); uri = $Uri }
  return [pscustomobject]@{ Content = '[]' }
}
# The read and press paths read a token by name; stub values keep the test runnable on a box without one (the network is stubbed).
if (-not $env:GITHUB_READ_TOKEN) { $env:GITHUB_READ_TOKEN = 'stub-read-token' }
if (-not $env:GITHUB_TOKEN) { $env:GITHUB_TOKEN = 'stub-write-token' }
$tool = Join-Path $PSScriptRoot 'cr-verify.ps1'
$readOut = (& $tool -Pr 213 2>&1 | Out-String)
$readCalls = @($global:kwCalls)
$global:kwCalls = @()
$null = (& $tool -Pr 213 -Press 2>&1 | Out-String)
$pressCalls = @($global:kwCalls)
$readNonGet = @($readCalls | Where-Object { $_.method -ne 'GET' })
$pressPost = @($pressCalls | Where-Object { $_.method -eq 'POST' })
Write-Output ('read path methods: ' + (($readCalls | ForEach-Object { $_.method }) -join ','))
Write-Output ('press path methods: ' + (($pressCalls | ForEach-Object { $_.method }) -join ','))
$ok = $true
if ($readCalls.Count -eq 0 -or $readNonGet.Count -ne 0) { Write-Output 'FAIL read path made a non-GET call'; $ok = $false } else { Write-Output 'PASS read path: GET only' }
if ($pressPost.Count -ne 1) { Write-Output "FAIL press path made $($pressPost.Count) POST calls, expected 1"; $ok = $false } else { Write-Output 'PASS press path: exactly one POST' }
if ($readOut -notmatch 'terminal=true') { Write-Output 'FAIL read output lacks terminal=true'; $ok = $false } else { Write-Output 'PASS read output names terminal=true' }
if ($ok) { Write-Output 'ALL PASS'; exit 0 } else { exit 1 }
