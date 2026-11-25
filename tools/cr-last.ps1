param([Parameter(Mandatory)][int]$Pr, [Parameter(Mandatory)][string]$Sha)
# The latest CodeRabbit comments on a PR (their text, markup stripped, first 4000 characters), then the CodeRabbit check run on a commit. Read only: GET.
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN_KOLWEN_AI; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$c=Invoke-RestMethod -Uri "https://api.github.com/repos/Kolwen-AI/Kolwen/issues/$Pr/comments?per_page=100" -Headers $h
foreach($x in $c){ if($x.user.login -like 'coderabbit*'){ $b=($x.body -replace '<!--[\s\S]*?-->','' -replace '<[^>]+>',''); "=== $($x.id) $($x.updated_at)"; $b.Substring(0,[Math]::Min(4000,$b.Length)) } }
# check runs are readable only with GITHUB_TOKEN; GET only (main's rule, 2026-11-25)
$tc=Get-GitHubToken -Name GITHUB_TOKEN; $hc=@{Authorization="Bearer $tc";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$ck=Invoke-RestMethod -Uri "https://api.github.com/repos/Kolwen-AI/Kolwen/commits/$Sha/check-runs" -Headers $hc
foreach($r in $ck.check_runs){ if($r.name -eq 'CodeRabbit'){ "CHECK: $($r.output.title) | $($r.output.summary)" } }
