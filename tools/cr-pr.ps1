param([int]$Pr,[string]$Sha)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN_KOLWEN_AI; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
# check runs are readable only with GITHUB_TOKEN; GET only (main's rule, 2026-11-25)
$tc=Get-GitHubToken -Name GITHUB_TOKEN; $hc=@{Authorization="Bearer $tc";Accept='application/vnd.github+json'}
$cr=(Invoke-RestMethod -Headers $hc "https://api.github.com/repos/Kolwen-AI/Kolwen/commits/$Sha/check-runs?check_name=CodeRabbit").check_runs | Select-Object -First 1
"#$Pr check: $($cr.conclusion) | $($cr.output.title) | $(([string]$cr.output.summary).Substring(0,[Math]::Min(300,([string]$cr.output.summary).Length)) -replace "`n",' ')"
$rv=Invoke-RestMethod -Headers $h "https://api.github.com/repos/Kolwen-AI/Kolwen/pulls/$Pr/reviews"
$rv | Where-Object { $_.user.login -like 'coderabbit*' } | ForEach-Object { "review $($_.id) $($_.state) on $($_.commit_id.Substring(0,7)): " + (([string]$_.body).Substring(0,[Math]::Min(160,([string]$_.body).Length)) -replace "`n",' ') }
$cs=Invoke-RestMethod -Headers $h "https://api.github.com/repos/Kolwen-AI/Kolwen/issues/$Pr/comments"
$cs | Where-Object { $_.user.login -like 'coderabbit*' } | ForEach-Object { $b=[string]$_.body; $m=[regex]::Matches($b,'(?i)(review limit reached|rate limit[^.\n]*|final_review_risk_coverage[^\n]{0,200}|Actionable comments posted: \d+|No actionable comments[^\n]*|skipped[^\n]{0,120})') ; "comment $($_.id): " + (($m | ForEach-Object { $_.Value }) -join ' | ') }
