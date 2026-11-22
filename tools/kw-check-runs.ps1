# The merge refusal's check, factored out so a test can feed it a recorded check-run list (REST shape: name, status, conclusion). Assert-GreenRuns throws,
# naming each failing check, unless every run is completed, the check named all-green concluded success, and no run concluded a failure, cancelled, timed_out,
# action_required or startup_failure. success, skipped and neutral are not failures. No parameter bypasses it.
function Assert-GreenRuns {
  param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Runs)
  $bad = @('failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure')
  $reasons = @($Runs | Where-Object { $bad -contains $_.conclusion } | ForEach-Object { "$($_.name) $($_.conclusion)" })
  $reasons += @($Runs | Where-Object { $_.status -ne 'completed' } | ForEach-Object { "$($_.name) not completed" })
  $gate = @($Runs | Where-Object { $_.name -eq 'all-green' })
  if ($gate.Count -eq 0) { $reasons += 'all-green missing' }
  elseif ($gate[0].conclusion -ne 'success' -and $reasons -notcontains "all-green $($gate[0].conclusion)") { $reasons += "all-green $($gate[0].conclusion)" }
  if ($reasons.Count -gt 0) { throw ('merge refused, check runs on this commit: ' + ($reasons -join '; ')) }
}
