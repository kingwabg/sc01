[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

. (Join-Path $PSScriptRoot 'semble-common.ps1')

Invoke-SembleRunner -Arguments $RemainingArgs
exit $LASTEXITCODE
