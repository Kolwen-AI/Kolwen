param([Parameter(Mandatory)][int]$Pr, [Parameter(Mandatory)][string]$HeadPrefix, [Parameter(Mandatory)][string]$Title, [Parameter(Mandatory)][string]$MsgFile)
# Kolwen head: squash-merge one PR by REST after checking open CodeQL alerts on its merge ref, that the head has not moved, and that every check run on the head SHA is green
# (all-green success, no failing run). The check is Assert-GreenRuns in kw-check-runs.ps1; no flag or parameter bypasses it.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'kw-check-runs.ps1')
$tok = [Environment]::GetEnvironmentVariable('GITHUB_TOKEN','User')
$h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$a = @((Invoke-WebRequest -TimeoutSec 60 -UseBasicParsing -Uri "https://api.github.com/repos/TheColliery/Kolwen/code-scanning/alerts?ref=refs/pull/$Pr/merge&state=open&per_page=50" -Headers $h).Content | ConvertFrom-Json | ForEach-Object { $_ })
"codeql open on PR ref: $($a.Count)"
if ($a.Count -ne 0) { throw 'CodeQL alerts open' }
$msg = [string](Get-Content -Raw -Encoding UTF8 $MsgFile)
$p = Invoke-RestMethod -TimeoutSec 60 -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr" -Headers $h
if (-not $p.head.sha.StartsWith($HeadPrefix)) { throw "head moved: $($p.head.sha)" }
$runs = @((Invoke-RestMethod -TimeoutSec 60 -Uri "https://api.github.com/repos/TheColliery/Kolwen/commits/$($p.head.sha)/check-runs?per_page=100" -Headers $h).check_runs)
Assert-GreenRuns -Runs $runs
"check runs green on $($p.head.sha.Substring(0,7)): $($runs.Count)"
$payload = @{ merge_method = 'squash'; sha = $p.head.sha; commit_title = [string]$Title; commit_message = $msg } | ConvertTo-Json -Compress
$r = Invoke-RestMethod -TimeoutSec 60 -Method Put -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr/merge" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType 'application/json; charset=utf-8'
"merged=$($r.merged) sha=$($r.sha)"
