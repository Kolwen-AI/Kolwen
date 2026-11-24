# Reads a GitHub token by name: the process environment first, then the Windows User environment. Throws, naming the variable, when neither has it.
# Only the two house names are accepted (GITHUB_READ_TOKEN for reads, GITHUB_TOKEN only where a tool writes).
function Get-GitHubToken {
  param([Parameter(Mandatory)][ValidateSet('GITHUB_READ_TOKEN', 'GITHUB_TOKEN')][string]$Name)
  $t = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $t) { $t = [Environment]::GetEnvironmentVariable($Name, 'User') }
  if (-not $t) { throw "$Name is not set (process or Windows User environment)" }
  return $t
}
