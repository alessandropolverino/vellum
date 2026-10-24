<#
.SYNOPSIS
    Builds the Vellum (dnd5e) application for production.

.DESCRIPTION
    Verifies dependencies, optionally cleans previous build output, runs
    TypeScript verification (`tsc -b`) and bundles the frontend (`vite build`)
    into `./dist`. Optionally packages the native Tauri v2 desktop installer
    when `-Tauri` is specified.

.PARAMETER Tauri
    Package the native Tauri v2 desktop application (`npm run tauri build`)
    instead of only building the frontend web bundle.

.PARAMETER Clean
    Remove `./dist` before running the build.

.PARAMETER Install
    Force `npm install` before building.

.EXAMPLE
    .\build.ps1
    Runs `npm run build` (TypeScript check + Vite production bundle in ./dist).

.EXAMPLE
    .\build.ps1 -Clean
    Cleans ./dist and runs a fresh production build.

.EXAMPLE
    .\build.ps1 -Tauri
    Builds the native Tauri v2 desktop application and installer.
#>
[CmdletBinding()]
param(
    [switch]$Tauri,
    [switch]$Clean,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    Write-Host "==========================================================" -ForegroundColor DarkYellow
    Write-Host " Vellum (dnd5e) - Production Build Script" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor DarkYellow

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm was not found in PATH. Please install Node.js (https://nodejs.org/)."
        exit 1
    }

    if ($Clean) {
        $distPath = Join-Path $PSScriptRoot "dist"
        if (Test-Path $distPath) {
            Write-Host "[Clean] Removing existing ./dist directory..." -ForegroundColor Cyan
            Remove-Item -Recurse -Force $distPath
        }
    }

    if ($Install -or -not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
        Write-Host "[Deps] Installing npm dependencies..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm install failed with exit code $LASTEXITCODE."
            exit $LASTEXITCODE
        }
    }

    if ($Tauri) {
        Write-Host "[Build] Packaging native Tauri v2 desktop application (npm run tauri build)..." -ForegroundColor Cyan
        npm run tauri build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Tauri build failed with exit code $LASTEXITCODE."
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Native Tauri v2 build completed successfully." -ForegroundColor Green
    }
    else {
        Write-Host "[Build] Running TypeScript check (tsc -b) & Vite production build..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Build failed with exit code $LASTEXITCODE."
            exit $LASTEXITCODE
        }
        Write-Host "[OK] Production build completed successfully (output in ./dist)." -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
