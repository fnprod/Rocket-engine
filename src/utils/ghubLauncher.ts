/**
 * Logitech G-HUB Launch & Runtime Synchronization Utilities
 * Provides bulletproof Windows execution commands, batch files, and PowerShell auto-injectors.
 */

import { getMandatoryGHubScriptDir } from './ghubDirectoryConfig';

export const DEFAULT_GHUB_PATHS = [
  'C:\\Program Files\\LGHUB\\lghub.exe',
  'C:\\Program Files\\LGHUB\\system_tray\\lghub_system_tray.exe',
  '%ProgramFiles%\\LGHUB\\lghub.exe',
  '%LOCALAPPDATA%\\Programs\\LGHUB\\lghub.exe',
];

export function getGHubWindowsCommand(): string {
  return 'start "" "C:\\Program Files\\LGHUB\\lghub.exe"';
}

export function getGHubPowerShellCommand(): string {
  return 'Start-Process -FilePath "$env:ProgramFiles\\LGHUB\\lghub.exe"';
}

/**
 * Generates a ready-to-run Windows batch (.bat) launcher script.
 * Accurately references the mandatory selected G-HUB scripts directory,
 * creates the folder if missing, and injects the Lua script.
 */
export function generateGHubLaunchBatchScript(luaScript: string, customDir?: string): string {
  const scriptDir = customDir || getMandatoryGHubScriptDir();
  return `@echo off
title Rocket League Master Engine - Logitech G HUB 1000Hz Launcher
echo =======================================================================
echo [Rocket League Master Engine] Starting Logitech G HUB 1000Hz Engine...
echo =======================================================================

:: 1. Lock Mandatory G-HUB Scripts Directory
set "GHUB_DIR=${scriptDir}"
echo [*] Mandatory G-HUB Directory: "%GHUB_DIR%"
if not exist "%GHUB_DIR%" (
    echo [*] Creating target directory: "%GHUB_DIR%"...
    mkdir "%GHUB_DIR%" 2>nul
)

set "FOUND_EXE="
if exist "%ProgramFiles%\\LGHUB\\lghub.exe" set "FOUND_EXE=%ProgramFiles%\\LGHUB\\lghub.exe"
if not defined FOUND_EXE if exist "%ProgramFiles(x86)%\\LGHUB\\lghub.exe" set "FOUND_EXE=%ProgramFiles(x86)%\\LGHUB\\lghub.exe"
if not defined FOUND_EXE if exist "%LocalAppData%\\Programs\\LGHUB\\lghub.exe" set "FOUND_EXE=%LocalAppData%\\Programs\\LGHUB\\lghub.exe"
if not defined FOUND_EXE if exist "%ProgramFiles%\\LGHUB\\system_tray\\lghub_system_tray.exe" set "FOUND_EXE=%ProgramFiles%\\LGHUB\\system_tray\\lghub_system_tray.exe"

if defined FOUND_EXE (
    echo [*] Found Logitech G HUB executable at: "%FOUND_EXE%"
    echo [*] Starting Logitech G HUB...
    start "" "%FOUND_EXE%"
    echo [OK] Logitech G HUB dispatched successfully!
) else (
    echo [!] Standard path not found, triggering protocol lghub:// ...
    start "" "lghub://"
)

echo.
echo [*] Logitech G HUB is starting. Writing to mandatory directory and copying 1000Hz synchronized Lua script...
powershell -Command "$Script = @'\n${luaScript.replace(/'/g, "''")}\n'@; [System.IO.File]::WriteAllText((Join-Path ([System.Environment]::ExpandEnvironmentVariables('${scriptDir}')) 'rl_master_engine.lua'), $Script, [System.Text.Encoding]::UTF8); Set-Clipboard -Value $Script"

echo [OK] 1000Hz Lua Engine script has been copied to Windows Clipboard and written to "%GHUB_DIR%"!
echo [*] Paste into Logitech G HUB - Rocket League profile - Scripting editor.
timeout /t 4 >nul
`;
}

/**
 * Generates a PowerShell (.ps1) script that starts G-HUB and writes
 * the Lua script directly to the mandatory Logitech scripts folder.
 */
export function generateGHubLaunchPowerShellScript(luaScript: string, customDir?: string): string {
  const targetDir = customDir || getMandatoryGHubScriptDir();
  const escapedLua = luaScript.replace(/`/g, '``').replace(/"/g, '`"');
  return `# =====================================================================
# ROCKET LEAGUE MASTER ENGINE - LOGITECH G HUB 1000HZ LAUNCHER & INJECTOR
# =====================================================================

Write-Host ">>> [RL MASTER ENGINE] Checking Logitech G HUB Installation..." -ForegroundColor Cyan

$LGHUB_Paths = @(
    "$env:ProgramFiles\\LGHUB\\lghub.exe",
    "\${env:ProgramFiles(x86)}\\LGHUB\\lghub.exe",
    "$env:LOCALAPPDATA\\Programs\\LGHUB\\lghub.exe",
    "$env:ProgramFiles\\LGHUB\\system_tray\\lghub_system_tray.exe"
)

$FoundGHub = $null
foreach ($p in $LGHUB_Paths) {
    if (Test-Path $p) {
        $FoundGHub = $p
        break
    }
}

if ($FoundGHub) {
    Write-Host "[+] Found Logitech G HUB: $FoundGHub" -ForegroundColor Green
    Write-Host "[+] Launching process..." -ForegroundColor Cyan
    Start-Process -FilePath $FoundGHub
    Write-Host "[SUCCESS] Logitech G HUB Started Successfully!" -ForegroundColor Green
} else {
    Write-Host "[!] Executable not found in default paths, invoking protocol..." -ForegroundColor Yellow
    Start-Process "lghub://"
}

# Auto-inject Lua script into mandatory LGHUB scripts folder
$RawDir = "${targetDir}"
$ScriptDir = [System.Environment]::ExpandEnvironmentVariables($RawDir)
if (-not (Test-Path $ScriptDir)) {
    New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
}

$TargetLua = [System.IO.Path]::Combine($ScriptDir, "rl_master_engine.lua")
$LuaPayload = @"
${escapedLua}
"@

[System.IO.File]::WriteAllText($TargetLua, $LuaPayload, [System.Text.Encoding]::UTF8)
Write-Host "[SUCCESS] Lua 1000Hz Engine injected to: $TargetLua" -ForegroundColor Green
Set-Clipboard -Value $LuaPayload
Write-Host "[SUCCESS] Script copied to clipboard for manual paste if needed." -ForegroundColor Cyan
`;
}

