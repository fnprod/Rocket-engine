# ==============================================================================
# FNPro Master Engine - Windows 11 Automated Bootstrapper & Dependency Setup
# Target: Windows 11 Pro 64-bit | Core: Tauri v2 + Rust MSVC + React 19 / TS 5.8
# Author: userfn-git | Email: fnprospace@gmail.com
# Repository: https://github.com/userfn-git/FNProMasterEngine.git
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipVenv = $false,
    [switch]$ForceAdmin = $true
)

$ErrorActionPreference = "Stop"

# 1. Execution Policy Bypass & Administrator Verification
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " FNPro Master Engine v4.2.0 - Automated Windows 11 Setup" -ForegroundColor Cyan
Write-Host " Architecture: Tauri v2 + Rust MSVC + React/Vite + 1000Hz DirectInput" -ForegroundColor DarkGray
Write-Host "======================================================================" -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    if ($ForceAdmin) {
        Write-Warning "Elevation required! Re-launching with elevated Administrator privileges..."
        Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $MyInvocation.MyCommand.Path) -Verb RunAs
        exit
    } else {
        Write-Warning "Running in non-elevated mode. Some Winget / Registry configurations may require Administrator rights."
    }
}

# 2. Register Persistent User Environment Variables and Update PATH
$engineRoot = (Get-Location).Path
$appDataDir = "$env:APPDATA\FNProMasterEngine"
$tempDir    = "$env:TEMP\FNProMasterEngine"
$demoDir    = "$env:USERPROFILE\Documents\My Games\Rocket League\TAGame\Demos"

New-Item -ItemType Directory -Path $appDataDir -Force | Out-Null
New-Item -ItemType Directory -Path "$tempDir\buffers" -Force | Out-Null
New-Item -ItemType Directory -Path "$tempDir\scratch" -Force | Out-Null

[Environment]::SetEnvironmentVariable("FNPRO_ENGINE_HOME", $engineRoot, "User")
[Environment]::SetEnvironmentVariable("FNPRO_APPDATA", $appDataDir, "User")
[Environment]::SetEnvironmentVariable("FNPRO_TEMP", $tempDir, "User")
[Environment]::SetEnvironmentVariable("RL_DEMO_PATH", $demoDir, "User")

# Append to persistent User PATH if not already present
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentUserPath -notlike "*$engineRoot*") {
    $newUserPath = if ($currentUserPath) { "$currentUserPath;$engineRoot" } else { $engineRoot }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    $env:Path = "$env:Path;$engineRoot"
    Write-Host "  ✓ Appended FNPro Engine Home to User PATH" -ForegroundColor Green
}

Write-Host "`n[1/6] Registered User Environment Variables:" -ForegroundColor Green
Write-Host "  FNPRO_ENGINE_HOME = $engineRoot" -ForegroundColor DarkCyan
Write-Host "  FNPRO_APPDATA     = $appDataDir" -ForegroundColor DarkCyan
Write-Host "  FNPRO_TEMP        = $tempDir" -ForegroundColor DarkCyan
Write-Host "  RL_DEMO_PATH      = $demoDir" -ForegroundColor DarkCyan

# Helper command checker
function Test-CommandAvailable ($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

# 3. WinGet Installations: Node.js LTS, Rust, VS2022 C++ Build Tools, Lua 5.4
Write-Host "`n[2/6] Inspecting & Installing Windows Toolchains via WinGet..." -ForegroundColor Green

# Node.js LTS
if (-not (Test-CommandAvailable "node")) {
    Write-Host "  Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
} else {
    Write-Host "  ✓ Node.js detected: $(node --version)" -ForegroundColor DarkGray
}

# Rustup Toolchain
if (-not (Test-CommandAvailable "cargo") -or -not (Test-CommandAvailable "rustup")) {
    Write-Host "  Installing Rust Toolchain via winget..." -ForegroundColor Yellow
    winget install --id Rustlang.Rustup -e --silent --accept-source-agreements --accept-package-agreements
} else {
    Write-Host "  ✓ Rust toolchain detected: $(cargo --version)" -ForegroundColor DarkGray
}

# Visual Studio 2022 C++ Build Tools (MSVC Toolset for Tauri compilation)
Write-Host "  Checking Visual Studio 2022 C++ Build Tools..." -ForegroundColor DarkGray
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasVswhere = Test-Path $vswhere
$hasVCTools = $false
if ($hasVswhere) {
    $vcInst = & $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vcInst) { $hasVCTools = $true }
}
if (-not $hasVCTools) {
    Write-Host "  Installing Visual Studio 2022 C++ Build Tools via winget..." -ForegroundColor Yellow
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
} else {
    Write-Host "  ✓ Microsoft C++ MSVC Build Tools verified" -ForegroundColor DarkGray
}

# Lua 5.4
if (-not (Test-CommandAvailable "lua") -and -not (Test-CommandAvailable "luac")) {
    Write-Host "  Installing Lua 5.4 via winget..." -ForegroundColor Yellow
    try {
        winget install --id DEV-PHP.Lua -e --silent --accept-source-agreements --accept-package-agreements
    } catch {
        Write-Warning "Winget Lua install skipped; Lua 5.4 built-in engine runtime will be used."
    }
} else {
    Write-Host "  ✓ Lua runtime detected" -ForegroundColor DarkGray
}

# 4. Set MSVC Target as Rust Default
Write-Host "`n[3/6] Configuring Rust MSVC Target (x86_64-pc-windows-msvc)..." -ForegroundColor Green
if (Test-CommandAvailable "rustup") {
    rustup target add x86_64-pc-windows-msvc
    rustup default stable-x86_64-pc-windows-msvc
    Write-Host "  ✓ Configured rustup default: stable-x86_64-pc-windows-msvc" -ForegroundColor DarkGray
}

# 5. Dynamic Python & Virtual Environment (.venv) Setup
Write-Host "`n[4/6] Initializing Python Dynamic Extension Environment (.venv)..." -ForegroundColor Green
if (-not (Test-CommandAvailable "python") -and -not (Test-CommandAvailable "py")) {
    Write-Host "  Installing Python 3.12 via winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
}

$pyCmd = if (Test-CommandAvailable "py") { "py -3" } elseif (Test-CommandAvailable "python") { "python" } else { $null }

if ($pyCmd -and -not $SkipVenv) {
    if (-not (Test-Path ".\.venv")) {
        Write-Host "  Creating isolated virtual environment at .\.venv..." -ForegroundColor DarkGray
        Invoke-Expression "$pyCmd -m venv .venv"
    }
    $venvPip = ".\.venv\Scripts\pip.exe"
    if (Test-Path $venvPip) {
        Write-Host "  Installing telemetry analytics libraries: sqlite-utils, numpy, pandas..." -ForegroundColor DarkGray
        & $venvPip install --quiet --upgrade pip
        & $venvPip install --quiet sqlite-utils numpy pandas
        Write-Host "  ✓ Python .venv initialized with sqlite-utils, numpy, pandas" -ForegroundColor DarkGray
    }
}

# 6. Git Identity & Workspace Configuration
Write-Host "`n[5/6] Configuring Git Workspace Identity..." -ForegroundColor Green
if (Test-CommandAvailable "git") {
    git config --local user.name "userfn-git"
    git config --local user.email "fnprospace@gmail.com"
    git remote remove origin 2>$null
    git remote add origin https://github.com/userfn-git/FNProMasterEngine.git
    Write-Host "  ✓ Git User:   userfn-git" -ForegroundColor DarkGray
    Write-Host "  ✓ Git Email:  fnprospace@gmail.com" -ForegroundColor DarkGray
    Write-Host "  ✓ Git Remote: https://github.com/userfn-git/FNProMasterEngine.git" -ForegroundColor DarkGray
}

# 7. Frontend Dependency Installation & PowerShell Module Registration
Write-Host "`n[6/6] Finalizing System Bindings & Frontend Packages..." -ForegroundColor Green
if (Test-CommandAvailable "npm") {
    npm install --no-audit
    Write-Host "  ✓ npm dependencies installed" -ForegroundColor DarkGray
}

# Copy FNProEngine.psm1 into user's PowerShell profile module path
$profileDir = Split-Path -Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
$moduleDest = "$profileDir\FNProEngine.psm1"
Copy-Item -Path ".\FNProEngine.psm1" -Destination $moduleDest -Force
Write-Host "  ✓ Registered FNProEngine.psm1 module to $moduleDest" -ForegroundColor DarkGray

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host " ✓ FNPro Master Engine Windows 11 Bootstrapper Completed!" -ForegroundColor Green
Write-Host " Run 'fnpro-matrix' in PowerShell to benchmark 1000Hz DirectInput latency." -ForegroundColor Cyan
Write-Host " Run 'npm run tauri dev' to launch the native desktop engine." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
