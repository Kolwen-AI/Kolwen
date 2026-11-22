param([Parameter(Mandatory)][long]$Id, [Parameter(Mandatory)][string]$OutFile)
# One issue or pull-request comment's body, written to OutFile as UTF-8 without a byte-order mark. Read only: GET.
$t=[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User'); $h=@{Authorization="Bearer $t";Accept='application/vnd.github+json'}
$q=Invoke-RestMethod -Headers $h "https://api.github.com/repos/TheColliery/Kolwen/issues/comments/$Id"
[System.IO.File]::WriteAllText($OutFile, [string]$q.body, (New-Object System.Text.UTF8Encoding($false)))
"wrote $OutFile ($([string]$q.body.Length) characters)"
