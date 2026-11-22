param([string]$Sha, [string]$Name)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$ck=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/commits/$Sha/check-runs?per_page=100" -Headers $h
foreach($r in $ck.check_runs){ if($r.name -like "*$Name*"){ "$($r.name) | $($r.conclusion) | $($r.output.title)"; [string]$r.output.summary } }
