param([long]$Check)
$t=[Environment]::GetEnvironmentVariable('GITHUB_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
try { $r=Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://api.github.com/repos/TheColliery/Kolwen/check-runs/$Check/rerequest" -Headers $h; "status $($r.StatusCode)" } catch { "error $($_.Exception.Response.StatusCode.value__) $($_.ErrorDetails.Message)" }
