param([int]$Pr, [long]$Id, [string]$BodyFile)
$t=[Environment]::GetEnvironmentVariable('GITHUB_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$p=@{body=[string][System.IO.File]::ReadAllText($BodyFile)} | ConvertTo-Json -Compress
$r=Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr/comments/$Id/replies" -Headers $h -Body ([System.Text.Encoding]::UTF8.GetBytes($p)) -ContentType 'application/json; charset=utf-8'
"posted $($r.id)"
