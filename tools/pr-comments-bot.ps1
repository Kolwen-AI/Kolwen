param([int]$Pr, [string]$Pattern)
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$c=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments?per_page=100" -Headers $h
foreach($x in $c){ if($x.body -match $Pattern){ "=== $($x.user.login) $($x.updated_at)"; $b=($x.body -replace "<[^>]+>",""); $b.Substring(0,[Math]::Min(1500,$b.Length)) } }
