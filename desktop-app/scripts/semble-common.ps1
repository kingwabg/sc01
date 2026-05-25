function Get-SembleRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-SembleInstallPath {
  return Join-Path (Get-SembleRepoRoot) '.tools\semble'
}

function Get-SembleRunnerPath {
  return Join-Path $PSScriptRoot 'semble_runner.py'
}

function Resolve-SemblePython {
  if ($env:SEMBLE_PYTHON -and (Test-Path $env:SEMBLE_PYTHON)) {
    return @($env:SEMBLE_PYTHON)
  }

  $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (Test-Path $bundledPython) {
    return @($bundledPython)
  }

  try {
    & py -3.12 -c "import sys" | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return @('py', '-3.12')
    }
  } catch {
  }

  try {
    & py -3 -c "import sys" | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return @('py', '-3')
    }
  } catch {
  }

  try {
    & python -c "import sys" | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return @('python')
    }
  } catch {
  }

  throw 'Python 실행 파일을 찾지 못했습니다. SEMBLE_PYTHON 환경 변수 또는 py/python 경로를 확인하세요.'
}

function Invoke-SembleRunner {
  param(
    [string[]]$Arguments = @()
  )

  $installPath = Get-SembleInstallPath
  if (-not (Test-Path $installPath)) {
    throw "Semble가 설치되지 않았습니다. 먼저 desktop-app/scripts/install-semble.ps1 를 실행하세요."
  }

  $python = @(Resolve-SemblePython)
  $runner = Get-SembleRunnerPath
  $exe = $python[0]
  $exeArgs = @()

  if ($python.Length -gt 1) {
    $exeArgs += $python[1..($python.Length - 1)]
  }

  $exeArgs += $runner
  $exeArgs += $Arguments

  & $exe @exeArgs
  if ($null -eq $LASTEXITCODE) {
    $global:LASTEXITCODE = 0
  }
}
