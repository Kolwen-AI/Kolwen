param([int]$Pr, [string]$Pattern)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$c=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments?per_page=100" -Headers $h
foreach($x in $c){ if($x.body -match $Pattern){ "=== $($x.user.login) $($x.updated_at)"; $b=($x.body -replace "<[^>]+>",""); $b.Substring(0,[Math]::Min(1500,$b.Length)) } }
