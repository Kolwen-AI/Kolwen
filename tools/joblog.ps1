param([long]$Job)
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$r=Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/TheColliery/Kolwen/actions/jobs/$Job/logs" -Headers $h
[string]$r.Content
