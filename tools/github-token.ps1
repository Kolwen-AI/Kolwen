# Reads a GitHub token by name: the process environment first, then the Windows User environment. Throws, naming the variable, when neither has it.
# Only these names are accepted: GITHUB_READ_TOKEN_KOLWEN_AI for reads on Kolwen-AI/* (the org refuses the older read token by its lifetime rule),
# GITHUB_READ_TOKEN for reads on the other repositories, and GITHUB_TOKEN only where a tool writes, or reads check runs (GET only: no fine-grained token reads them).
function Get-GitHubToken {
  param([Parameter(Mandatory)][ValidateSet('GITHUB_READ_TOKEN_KOLWEN_AI', 'GITHUB_READ_TOKEN', 'GITHUB_TOKEN')][string]$Name)
  $t = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $t) { $t = [Environment]::GetEnvironmentVariable($Name, 'User') }
  if (-not $t) { throw "$Name is not set (process or Windows User environment)" }
  return $t
}
