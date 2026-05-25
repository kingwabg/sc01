[CmdletBinding()]
param(
  [switch]$Upgrade
)

function Resolve-BundledPython {
  $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (Test-Path $bundled) {
    return $bundled
  }
  throw 'Could not find the bundled Codex Python runtime.'
}

function Get-SharedSembleRoot {
  return Join-Path $env:USERPROFILE 'Documents\Codex\shared-tools\semble'
}

function Get-CodexConfigPath {
  return Join-Path $env:USERPROFILE '.codex\config.toml'
}

function Write-SembleLauncher {
  param(
    [Parameter(Mandatory = $true)][string]$SharedRoot
  )

  $launcherPath = Join-Path $SharedRoot 'semble_mcp_server.py'
  $launcher = @"
from __future__ import annotations

import site
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
site.addsitedir(str(ROOT))

from semble.cli import main

if __name__ == "__main__":
    main()
"@

  Set-Content -Path $launcherPath -Value $launcher -Encoding UTF8
  return $launcherPath
}

function Update-CodexConfig {
  param(
    [Parameter(Mandatory = $true)][string]$PythonPath,
    [Parameter(Mandatory = $true)][string]$LauncherPath
  )

  $configPath = Get-CodexConfigPath
  if (-not (Test-Path $configPath)) {
    throw "Could not find the Codex config file: $configPath"
  }

  $backupPath = "$configPath.bak-semble"
  Copy-Item -Path $configPath -Destination $backupPath -Force

  $content = Get-Content -Path $configPath -Raw
  $serverBlock = @"
[mcp_servers.semble]
command = '$PythonPath'
args = ['$LauncherPath']
startup_timeout_sec = 120
"@

  $pattern = '(?ms)^\[mcp_servers\.semble\]\r?\n(?:.*?\r?\n)*?(?=^\[|$\Z)'
  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, "$serverBlock`r`n")
  } else {
    if (-not $content.EndsWith("`n")) {
      $content += "`r`n"
    }
    $content += "`r`n$serverBlock`r`n"
  }

  Set-Content -Path $configPath -Value $content -Encoding UTF8
  return $backupPath
}

$pythonPath = Resolve-BundledPython
$sharedRoot = Get-SharedSembleRoot
New-Item -ItemType Directory -Force -Path $sharedRoot | Out-Null

$pipArgs = @(
  '-m',
  'pip',
  'install',
  'semble[mcp]',
  '--target',
  $sharedRoot
)

if ($Upgrade -or (Test-Path (Join-Path $sharedRoot 'semble'))) {
  $pipArgs += '--upgrade'
}

& $pythonPath @pipArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$launcherPath = Write-SembleLauncher -SharedRoot $sharedRoot
$backupPath = Update-CodexConfig -PythonPath $pythonPath -LauncherPath $launcherPath

Write-Host "Semble shared install: $sharedRoot"
Write-Host "Codex config backup: $backupPath"
Write-Host "Codex config updated with [mcp_servers.semble]"
Write-Host 'Restart Codex or open a fresh session so the MCP server is picked up.'
