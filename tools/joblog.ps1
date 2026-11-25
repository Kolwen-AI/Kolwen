param([long]$Job)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN_KOLWEN_AI; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$r=Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/Kolwen-AI/Kolwen/actions/jobs/$Job/logs" -Headers $h
[string]$r.Content
