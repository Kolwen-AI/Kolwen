param([int]$Pr, [string]$BodyFile)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$body=[System.IO.File]::ReadAllText($BodyFile)
$p=@{body=[string]$body} | ConvertTo-Json -Compress
$null=Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($p)) -ContentType 'application/json; charset=utf-8'
$g=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr" -Headers $h
"body-match $([string]$g.body -eq $body)"
