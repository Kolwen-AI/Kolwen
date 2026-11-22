param([Parameter(Mandatory)][int]$Issue, [Parameter(Mandatory)][string]$BodyFile)
# Kolwen head: post one issue/PR comment by REST and read its length back.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t = Get-GitHubToken -Name GITHUB_TOKEN
$h = @{ Authorization = "Bearer $t"; Accept = 'application/vnd.github+json' }
$b = [string](Get-Content -Raw -Encoding UTF8 $BodyFile)
$p = @{ body = $b } | ConvertTo-Json -Compress
$r = Invoke-RestMethod -TimeoutSec 60 -Method Post -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Issue/comments" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($p)) -ContentType 'application/json; charset=utf-8'
"comment id=$($r.id) len sent=$($b.Length) got=$($r.body.Length)"
