param([string]$Title, [string]$Head, [string]$BodyFile)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'github-token.ps1')
$tok = Get-GitHubToken -Name GITHUB_TOKEN
$h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$body = [string](Get-Content -Raw -Encoding UTF8 $BodyFile)
$payload = @{ title = [string]$Title; head = [string]$Head; base = 'main'; body = $body } | ConvertTo-Json -Compress
$r = Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/TheColliery/Kolwen/pulls' -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType 'application/json; charset=utf-8'
$g = Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$($r.number)" -Headers $h
$same = ($g.body -replace "`r","").TrimEnd("`n") -eq ($body -replace "`r","").TrimEnd("`n")
"PR #$($r.number) head=$($g.head.sha) bodyLen sent=$($body.Length) got=$($g.body.Length) match=$same"
