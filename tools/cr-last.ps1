param([Parameter(Mandatory)][int]$Pr, [Parameter(Mandatory)][string]$Sha)
# The latest CodeRabbit comments on a PR (their text, markup stripped, first 4000 characters), then the CodeRabbit check run on a commit. Read only: GET.
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$c=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments?per_page=100" -Headers $h
foreach($x in $c){ if($x.user.login -like 'coderabbit*'){ $b=($x.body -replace '<!--[\s\S]*?-->','' -replace '<[^>]+>',''); "=== $($x.id) $($x.updated_at)"; $b.Substring(0,[Math]::Min(4000,$b.Length)) } }
$ck=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/commits/$Sha/check-runs" -Headers $h
foreach($r in $ck.check_runs){ if($r.name -eq 'CodeRabbit'){ "CHECK: $($r.output.title) | $($r.output.summary)" } }
