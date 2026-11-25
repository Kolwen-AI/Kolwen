param([string]$Sha)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN_KOLWEN_AI; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
$r=Invoke-RestMethod -Headers $h "https://api.github.com/repos/Kolwen-AI/Kolwen/actions/runs?head_sha=$Sha&per_page=50"
$r.workflow_runs | ForEach-Object { "{0} | {1} | {2} | {3} | {4}" -f $_.name, $_.event, $_.status, $_.conclusion, $_.id }
