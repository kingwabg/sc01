[CmdletBinding()]
param(
  [switch]$Upgrade
)

. (Join-Path $PSScriptRoot 'semble-common.ps1')

$installPath = Get-SembleInstallPath
New-Item -ItemType Directory -Force -Path $installPath | Out-Null

$python = @(Resolve-SemblePython)
$exe = $python[0]
$exeArgs = @()

if ($python.Length -gt 1) {
  $exeArgs += $python[1..($python.Length - 1)]
}

$exeArgs += '-m'
$exeArgs += 'pip'
$exeArgs += 'install'
$exeArgs += 'semble[mcp]'
$exeArgs += '--target'
$exeArgs += $installPath

if ($Upgrade) {
  $exeArgs += '--upgrade'
}

& $exe @exeArgs
exit $LASTEXITCODE
