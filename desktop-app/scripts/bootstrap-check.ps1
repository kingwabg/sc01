[CmdletBinding()]
param(
  [switch]$Build,
  [string]$DevUrl = "http://127.0.0.1:1420"
)

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $AppRoot "..")

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [ValidateSet("OK", "WARN", "FAIL")]
    [string]$Status,
    [string]$Detail = ""
  )

  $results.Add([pscustomobject]@{
    Name = $Name
    Status = $Status
    Detail = $Detail
  }) | Out-Null
}

function Test-File {
  param(
    [string]$Label,
    [string]$Path,
    [switch]$WarnOnly
  )

  if (Test-Path -LiteralPath $Path) {
    Add-Result $Label "OK" (Resolve-Path -LiteralPath $Path)
  } elseif ($WarnOnly) {
    Add-Result $Label "WARN" "missing: $Path"
  } else {
    Add-Result $Label "FAIL" "missing: $Path"
  }
}

function Get-StableNode {
  $nodeCandidates = @(
    "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "node"
  )

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
        return [pscustomobject]@{
          Path = $candidate
          Version = $versionText
        }
      }
    } catch {
      continue
    }
  }

  return $null
}

function Get-ActiveRhwpAssets {
  param([string]$IndexPath)

  if (-not (Test-Path -LiteralPath $IndexPath)) {
    return $null
  }

  $html = Get-Content -LiteralPath $IndexPath -Raw
  $jsMatch = [regex]::Match($html, 'assets/(index-[^"''<>]+\.js)')
  $cssMatch = [regex]::Match($html, 'assets/(index-[^"''<>]+\.css)')

  return [pscustomobject]@{
    JavaScript = if ($jsMatch.Success) { $jsMatch.Groups[1].Value } else { $null }
    Css = if ($cssMatch.Success) { $cssMatch.Groups[1].Value } else { $null }
  }
}

function Test-TextMarkers {
  param(
    [string]$Label,
    [string]$Path,
    [string[]]$Markers,
    [switch]$WarnOnly
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    if ($WarnOnly) {
      Add-Result $Label "WARN" "file missing: $Path"
    } else {
      Add-Result $Label "FAIL" "file missing: $Path"
    }
    return
  }

  $text = Get-Content -LiteralPath $Path -Raw
  $missing = @($Markers | Where-Object { -not $text.Contains($_) })
  if ($missing.Count -eq 0) {
    Add-Result $Label "OK" "markers present"
  } elseif ($WarnOnly) {
    Add-Result $Label "WARN" ("missing markers: " + ($missing -join ", "))
  } else {
    Add-Result $Label "FAIL" ("missing markers: " + ($missing -join ", "))
  }
}

Write-Host ""
Write-Host "Seochang project bootstrap check"
Write-Host "Repo: $RepoRoot"
Write-Host "App : $AppRoot"
Write-Host ""

Test-File "PROJECT_MEMORY.md" (Join-Path $RepoRoot "PROJECT_MEMORY.md")
Test-File "AGENTS.md" (Join-Path $RepoRoot "AGENTS.md")
Test-File ".clasp.json" (Join-Path $RepoRoot ".clasp.json") -WarnOnly
Test-File "appsscript.json" (Join-Path $RepoRoot "appsscript.json")
Test-File "desktop package.json" (Join-Path $AppRoot "package.json")

$rhwpVendor = Join-Path $AppRoot "vendor\rhwp\rhwp-studio"
if (Test-Path -LiteralPath $rhwpVendor) {
  Add-Result "RHWP vendor source" "OK" $rhwpVendor
} else {
      Add-Result "RHWP vendor source" "WARN" "Local reference source is missing. Restore from edwardkim/rhwp if RHWP source work is needed."
}

$rhwpIndex = Join-Path $AppRoot "public\rhwp-studio\index.html"
$rhwpAssetsDir = Join-Path $AppRoot "public\rhwp-studio\assets"
$activeAssets = Get-ActiveRhwpAssets $rhwpIndex

if ($activeAssets -and $activeAssets.JavaScript) {
  $activeJsPath = Join-Path $rhwpAssetsDir $activeAssets.JavaScript
  Test-File "Active RHWP JS bundle" $activeJsPath
  Test-TextMarkers "RHWP cell range command" $activeJsPath @("table:cell-select-range") -WarnOnly
  Test-TextMarkers "RHWP table boundary clamp markers" $activeJsPath @("function __scClampTableMove", "function __scClampTableResize", "__SC_RHWP_PX_TO_HWP=75") -WarnOnly
} else {
    Add-Result "Active RHWP JS bundle" "FAIL" "No active JS bundle reference found in index.html"
}

if ($activeAssets -and $activeAssets.Css) {
  Test-File "Active RHWP CSS bundle" (Join-Path $rhwpAssetsDir $activeAssets.Css)
} else {
  Add-Result "Active RHWP CSS bundle" "WARN" "No active CSS bundle reference found in index.html"
}

if (Test-Path -LiteralPath $rhwpAssetsDir) {
  $activeNames = @($activeAssets.JavaScript, $activeAssets.Css) | Where-Object { $_ }
  $assetFiles = Get-ChildItem -LiteralPath $rhwpAssetsDir -File -Filter "index-*"
  $staleAssets = @($assetFiles | Where-Object { $activeNames -notcontains $_.Name })
  if ($staleAssets.Count -eq 0) {
    Add-Result "Stale RHWP assets" "OK" "No extra index assets beyond active bundle"
  } else {
    Add-Result "Stale RHWP assets" "WARN" (($staleAssets | Select-Object -ExpandProperty Name) -join ", ")
  }
}

try {
  $untrackedAssets = & git -C $RepoRoot ls-files --others --exclude-standard -- desktop-app/public/rhwp-studio/assets 2>$null
  if ($LASTEXITCODE -eq 0) {
    if ($untrackedAssets) {
      Add-Result "Untracked RHWP assets" "WARN" ($untrackedAssets -join ", ")
    } else {
      Add-Result "Untracked RHWP assets" "OK" "none"
    }
  }
} catch {
  Add-Result "Untracked RHWP assets" "WARN" "git check failed: $($_.Exception.Message)"
}

$node = Get-StableNode
if ($node) {
  Add-Result "Node runtime" "OK" "$($node.Path) $($node.Version)"
} else {
  Add-Result "Node runtime" "FAIL" "Stable Node.js runtime below v25 was not found"
}

$nodeModules = Join-Path $AppRoot "node_modules"
if (Test-Path -LiteralPath $nodeModules) {
  $requiredTools = @(
    "node_modules\typescript\bin\tsc",
    "node_modules\vite\bin\vite.js"
  )
  $missingTools = @($requiredTools | Where-Object { -not (Test-Path -LiteralPath (Join-Path $AppRoot $_)) })
  if ($missingTools.Count -eq 0) {
    Add-Result "npm dependencies" "OK" "node_modules present"
  } else {
    Add-Result "npm dependencies" "WARN" ("missing: " + ($missingTools -join ", "))
  }
} else {
  Add-Result "npm dependencies" "WARN" "node_modules missing. Run npm install in desktop-app."
}

try {
  $response = Invoke-WebRequest -Uri $DevUrl -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
    Add-Result "Dev server" "OK" "$DevUrl responded with $($response.StatusCode)"
  } else {
    Add-Result "Dev server" "WARN" "$DevUrl responded with $($response.StatusCode)"
  }
} catch {
  Add-Result "Dev server" "WARN" "$DevUrl did not respond. Run npm run dev in desktop-app if browser verification is needed."
}

if ($Build) {
  Push-Location $AppRoot
  try {
    & npm run build
    if ($LASTEXITCODE -eq 0) {
      Add-Result "Build check" "OK" "npm run build passed"
    } else {
      Add-Result "Build check" "FAIL" "npm run build failed: exit $LASTEXITCODE"
    }
  } catch {
    Add-Result "Build check" "FAIL" $_.Exception.Message
  } finally {
    Pop-Location
  }
} else {
  Add-Result "Build check" "WARN" "Skipped in fast check. Use -Build when needed."
}

Write-Host ""
Write-Host "Result"
Write-Host "------"

foreach ($result in $results) {
  $color = switch ($result.Status) {
    "OK" { "Green" }
    "WARN" { "Yellow" }
    "FAIL" { "Red" }
  }
  Write-Host ("[{0}] {1}" -f $result.Status, $result.Name) -ForegroundColor $color
  if ($result.Detail) {
    Write-Host ("     {0}" -f $result.Detail)
  }
}

$failures = @($results | Where-Object { $_.Status -eq "FAIL" })
$warnings = @($results | Where-Object { $_.Status -eq "WARN" })

Write-Host ""
Write-Host ("Summary: {0} OK / {1} WARN / {2} FAIL" -f `
  (@($results | Where-Object { $_.Status -eq "OK" }).Count), `
  $warnings.Count, `
  $failures.Count)

if ($failures.Count -gt 0) {
  exit 1
}

exit 0
