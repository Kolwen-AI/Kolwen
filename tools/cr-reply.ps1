param([int]$Pr, [long]$Id, [string]$BodyFile)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$p=@{body=[string][System.IO.File]::ReadAllText($BodyFile)} | ConvertTo-Json -Compress
$r=Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/Kolwen-AI/Kolwen/pulls/$Pr/comments/$Id/replies" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($p)) -ContentType 'application/json; charset=utf-8'
"posted $($r.id)"
