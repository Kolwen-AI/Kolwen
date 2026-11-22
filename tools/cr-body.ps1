param([Parameter(Mandatory)][int]$Pr, [Parameter(Mandatory)][long]$Review, [Parameter(Mandatory)][string]$OutFile)
# The body of one pull-request review, written to OutFile as UTF-8 without a byte-order mark. Read only: GET.
. (Join-Path $PSScriptRoot 'github-token.ps1')
$t=Get-GitHubToken -Name GITHUB_READ_TOKEN; $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
$r = Invoke-RestMethod -Headers $h "https://api.github.com/repos/TheColliery/Kolwen/pulls/$Pr/reviews/$Review"
[System.IO.File]::WriteAllText($OutFile, [string]$r.body, (New-Object System.Text.UTF8Encoding($false)))
"wrote $OutFile ($([string]$r.body.Length) characters)"
