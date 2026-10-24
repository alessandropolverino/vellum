<#
.SYNOPSIS
    Starts the Vellum (dnd5e) development server.

.DESCRIPTION
    Checks for Node.js/npm, installs dependencies if node_modules is missing
    (or if -Install is passed), and starts the Vite development server at
    http://localhost:1420 (or the native Tauri v2 desktop window if -Tauri is passed).

.PARAMETER Tauri
    Launch the native Tauri v2 desktop application in development mode (`npm run tauri dev`).

.PARAMETER Install
    Force `npm install` before starting the development server.

.PARAMETER Port
    Optional custom port for the Vite development server (default: 1420).

.EXAMPLE
    .\dev.ps1
    Starts the Vite web development server on http://localhost:1420.

.EXAMPLE
    .\dev.ps1 -Tauri
    Starts the native Tauri v2 desktop app in development mode.
#>
[CmdletBinding()]
param(
    [switch]$Tauri,
    [switch]$Install,
    [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    Write-Host "==========================================================" -ForegroundColor DarkYellow
    Write-Host " Vellum (dnd5e) - Development Server Launcher" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor DarkYellow

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm was not found in PATH. Please install Node.js (https://nodejs.org/)."
        exit 1
    }

    if ($Install -or -not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
        Write-Host "[1/2] Installing npm dependencies..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm install failed with exit code $LASTEXITCODE."
            exit $LASTEXITCODE
        }
    }

    if ($Tauri) {
        Write-Host "[2/2] Starting Tauri v2 Desktop Development Mode..." -ForegroundColor Green
        npm run tauri dev
    }
    elseif ($Port -gt 0) {
        Write-Host "[2/2] Starting Vite Dev Server on http://localhost:$Port ..." -ForegroundColor Green
        npm run dev -- --port $Port
    }
    else {
        Write-Host "[2/2] Starting Vite Dev Server on http://localhost:1420 ..." -ForegroundColor Green
        npm run dev
    }

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
