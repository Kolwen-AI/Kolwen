param([Parameter(Mandatory)][int]$Pr, [Parameter(Mandatory)][long]$Review)
# The inline comments of one pull-request review, markup stripped, first 1600 characters each. Read only: GET.
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
$rc=Invoke-RestMethod -Headers $h "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr/reviews/$Review/comments"
$rc | ForEach-Object { "--- $($_.id) $($_.path):$($_.line)"; ([string]$_.body -replace '<[^>]+>','').Substring(0,[Math]::Min(1600,([string]$_.body -replace '<[^>]+>','').Length)) }
