param([int]$Pr)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$w=Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/TheColliery/Kolwen/code-scanning/alerts?ref=refs/pull/$Pr/merge&state=open&per_page=100" -Headers $h
$a=$w.Content | ConvertFrom-Json
"open alerts on PR ref: $(($a | Measure-Object).Count) (raw len $($w.Content.Length))"
