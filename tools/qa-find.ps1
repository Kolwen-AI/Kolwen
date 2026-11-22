param([int]$Pr)
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
$cs=Invoke-RestMethod -Headers $h "https://api.github.com/repos/TheColliery/Kolwen/issues/$Pr/comments?per_page=100"
$cs | Where-Object { ([string]$_.body) -match 'coderabbit-qa-agent' -or ([string]$_.body) -match '(?i)verify' } | ForEach-Object { $b=[string]$_.body; $st=[regex]::Match($b,'coderabbit-qa-agent-state[^>]*').Value; $sum=[regex]::Match($b,'\*\*[^*]*scenarios[^*]*\*\*').Value; "$($_.id) $($_.user.login) $($_.updated_at) | $st | $sum" }
