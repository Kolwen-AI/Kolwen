param([int]$Pr)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN_KOLWEN_AI; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$w=Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/Kolwen-AI/Kolwen/code-scanning/alerts?ref=refs/pull/$Pr/merge&state=open&per_page=100" -Headers $h
foreach($a in ($w.Content | ConvertFrom-Json)){ "#$($a.number) $($a.rule.id) $($a.rule.severity) $($a.most_recent_instance.location.path):$($a.most_recent_instance.location.start_line) | $($a.most_recent_instance.message.text)" }
