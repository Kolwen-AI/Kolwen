param([Parameter(Mandatory)][int]$Pr, [switch]$Press)
# Read by default: GET only. It prints the latest CodeRabbit Verify comment's terminal flag and its bold summary line. -Press posts '@coderabbitai verify' once;
# it is never a read. The read uses GITHUB_READ_TOKEN; only the press uses GITHUB_TOKEN.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'github-token.ps1')
if (-not $Press) {
  $rt = Get-GitHubToken -Name GITHUB_READ_TOKEN
  $h = @{ Authorization = "Bearer $rt"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
  $cs = @(Invoke-RestMethod -Method Get -TimeoutSec 60 -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments?per_page=100" -Headers $h)
  $c = @($cs | Where-Object { $_.body -match 'coderabbit-qa-agent-state' }) | Select-Object -Last 1
  if (-not $c) { 'no CodeRabbit Verify comment on this PR'; exit 0 }
  $term = if ($c.body -match 'terminal=(\S+)') { $Matches[1] } else { 'absent' }
  $summary = (($c.body -split "`n") | Where-Object { $_ -match '^\s*\*\*' } | Select-Object -First 1)
  "terminal=$term"
  "summary: $summary"
  "comment $($c.id) $($c.created_at)"
  exit 0
}
$t = Get-GitHubToken -Name GITHUB_TOKEN
$h = @{ Authorization = "Bearer $t"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$p = @{ body = '@coderabbitai verify' } | ConvertTo-Json -Compress
$r = Invoke-RestMethod -Method Post -TimeoutSec 60 -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($p)) -ContentType 'application/json; charset=utf-8'
"posted $($r.id) $($r.created_at)"
