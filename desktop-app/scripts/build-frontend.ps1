$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$nodeCandidates = @(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
  "$env:ProgramFiles\nodejs\node.exe",
  "node"
)

$selectedNode = $null
foreach ($candidate in $nodeCandidates) {
  try {
    if ($candidate -ne "node" -and -not (Test-Path -LiteralPath $candidate)) {
      continue
    }

    $versionText = & $candidate --version 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $versionText) {
      continue
    }

    $major = [int]($versionText.TrimStart("v").Split(".")[0])
    if ($major -lt 25) {
      $selectedNode = $candidate
      break
    }
  } catch {
    continue
  }
}

if (-not $selectedNode) {
  Write-Error "Node.js 25 미만의 안정 빌드 런타임을 찾지 못했습니다. Node.js LTS를 설치한 뒤 다시 실행해주세요."
  exit 1
}

Write-Host "Using Node runtime: $selectedNode"

& $selectedNode ".\node_modules\typescript\bin\tsc"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& $selectedNode ".\node_modules\vite\bin\vite.js" build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
