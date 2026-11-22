param([int]$Pr)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$c=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr/comments?per_page=100" -Headers $h
foreach($x in $c){ "=== $($x.id) $($x.path):$($x.line) reply_to=$($x.in_reply_to_id)"; ($x.body -replace '<!--[\s\S]*?-->','') }
