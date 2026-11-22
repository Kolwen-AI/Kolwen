param([string]$Job, [int]$Runs = 15)
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$r=Invoke-RestMethod -Uri "https://api.github.com/repos/TheColliery/Kolwen/actions/workflows/ci.yml/runs?status=success&per_page=$Runs" -Headers $h
foreach($run in $r.workflow_runs){ $j=Invoke-RestMethod -Uri $run.jobs_url -Headers $h; foreach($x in $j.jobs){ if($x.name -like "$Job*" -and $x.completed_at){ $d=([datetime]$x.completed_at - [datetime]$x.started_at).TotalSeconds; "$($run.id) $($run.event) $($run.head_sha.Substring(0,7)) $([int]$d)s" } } }
