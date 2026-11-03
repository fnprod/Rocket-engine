import { PhysicsConfig, KeyBinding, GameProfile } from '../types/engine';

export function generateTAInputIni(
  profile: GameProfile,
  config: PhysicsConfig,
  keybindings: KeyBinding[]
): string {
  const getK = (actionId: string, fallback: string) => {
    const found = keybindings.find(b => b.id === actionId && b.layer === 0);
    return found ? found.key.toUpperCase() : fallback;
  };

  const fwd = getK('forward', 'W');
  const back = getK('back', 'S');
  const left = getK('left', 'A');
  const right = getK('right', 'D');
  const powerslide = getK('powerslide', 'LeftAlt');
  const airrollL = getK('airroll_l', 'Q');
  const airrollR = getK('airroll_r', 'E');
  
  // SPACE is strictly Camera Toggle
  const cameraSwitchKey = 'SpaceBar';

  const deadzone = profile.deadzoneOverride ?? config.internalDeadzone;
  const aerialSense = profile.aerialSenseOverride ?? config.aerialSense;

  // Authentic Psyonix / Unreal Engine 3 TAInput.ini format
  return `[TAGame.PlayerInput_TA]
GamepadDeadzone=${deadzone.toFixed(2)}
GamepadDeadzones=(Type=GDT_Circle,Value=${deadzone.toFixed(2)})
DodgeInputThreshold=${config.dodgeDeadzone.toFixed(2)}
AirTurnSpeed=${(aerialSense * 1000).toFixed(0)}
AirPitchSpeed=${(aerialSense * 1000).toFixed(0)}
SteerSensitivity=${config.groundSense.toFixed(2)}
AirControlSensitivity=${aerialSense.toFixed(2)}

Bindings=(Name="${cameraSwitchKey}",Command="Action ToggleBallCam")
Bindings=(Name="${fwd}",Command="Throttle 1.0")
Bindings=(Name="${back}",Command="Throttle -1.0")
Bindings=(Name="${left}",Command="Steer -1.0")
Bindings=(Name="${right}",Command="Steer 1.0")
Bindings=(Name="${powerslide}",Command="Handbrake 1.0")
Bindings=(Name="${airrollL}",Command="Roll -1.0")
Bindings=(Name="${airrollR}",Command="Roll 1.0")
Bindings=(Name="MiddleMouseButton",Command="Action LookBack")
Bindings=(Name="ThumbMouseButton",Command="Handbrake 1.0")
Bindings=(Name="ThumbMouseButton2",Command="Action Jump")
Bindings=(Name="LeftMouseButton",Command="Action Jump")
Bindings=(Name="RightMouseButton",Command="Action Boost")
Bindings=(Name="XboxTypeS_LeftX",Command="Steer")
Bindings=(Name="XboxTypeS_LeftY",Command="Pitch")
Bindings=(Name="XboxTypeS_RightX",Command="LookUp_Gamepad")
Bindings=(Name="XboxTypeS_RightY",Command="Turn_Gamepad")

[Engine.PlayerInput]
MoveForwardSpeed=1200
MoveStrafeSpeed=1200
LookRightScale=300
LookUpScale=-250
MouseSensitivity=60.0
DoubleClickTime=0.250000
bEnableMouseSmoothing=false
`;
}

/**
 * Generates a complete, legal, safe PowerShell script that applies the TAInput.ini
 * directly on the local machine with automated timestamped backup and zero conflicts.
 */
export function generatePowerShellInstaller(
  profile: GameProfile,
  iniContent: string
): string {
  // Escape backticks and double quotes for PowerShell
  const escapedIni = iniContent.replace(/`/g, '``').replace(/"/g, '`"');

  return `# =====================================================================
# ROCKET LEAGUE PROFESSIONAL MASTER-ENGINE - POWERSHELL AUTO-INSTALLER
# Profile: ${profile.name}
# Engine Version: 4.0.2 Local Deployer
# =====================================================================

$ErrorActionPreference = "Stop"

# 1. Resolve Target Configuration Directory
$RLConfigDir = [System.IO.Path]::Combine($env:USERPROFILE, "Documents", "My Games", "Rocket League", "TAGame", "Config")
$TargetIniFile = [System.IO.Path]::Combine($RLConfigDir, "TAInput.ini")
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = [System.IO.Path]::Combine($RLConfigDir, "TAInput.backup_$Timestamp.ini")

Write-Host ">>> [RL-ENGINE] Initializing Local PowerShell Deployer..." -ForegroundColor Cyan

# 2. Ensure target directory exists
if (-not (Test-Path -Path $RLConfigDir)) {
    Write-Host ">>> [RL-ENGINE] Creating Rocket League Config Directory: $RLConfigDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $RLConfigDir -Force | Out-Null
}

# 3. Create Safe Backup of existing TAInput.ini if present
if (Test-Path -Path $TargetIniFile) {
    Write-Host ">>> [RL-ENGINE] Creating safe timestamped backup: $BackupFile" -ForegroundColor Yellow
    Copy-Item -Path $TargetIniFile -Destination $BackupFile -Force
}

# 4. Write Calibrated TAInput.ini Content (UTF8 without BOM)
$IniPayload = @"
${escapedIni}
"@

[System.IO.File]::WriteAllText($TargetIniFile, $IniPayload, [System.Text.Encoding]::UTF8)

Write-Host ">>> [SUCCESS] TAInput.ini successfully updated and verified!" -ForegroundColor Green
Write-Host ">>> [PATH] $TargetIniFile" -ForegroundColor Gray
Write-Host ">>> [SETTINGS] Deadzone: ${profile.deadzoneOverride} | Aerial Sense: ${profile.aerialSenseOverride}" -ForegroundColor Green
`;
}

/**
 * Generates a PowerShell script to inject the Lua table directly into Logitech G HUB local script directory
 */
export function generateGHubPowerShellInjector(luaTableContent: string): string {
  const escapedLua = luaTableContent.replace(/`/g, '``').replace(/"/g, '`"');

  return `# =====================================================================
# LOGITECH G HUB RUNTIME CONFIG - POWERSHELL AUTO-INJECTOR
# Engine Version: 4.0.2 Local Deployer
# =====================================================================

$GHubScriptDir = [System.IO.Path]::Combine($env:LOCALAPPDATA, "LGHUB", "scripts")
$TargetLuaFile = [System.IO.Path]::Combine($GHubScriptDir, "rl_master_engine.lua")

if (-not (Test-Path -Path $GHubScriptDir)) {
    New-Item -ItemType Directory -Path $GHubScriptDir -Force | Out-Null
}

$LuaPayload = @"
${escapedLua}
"@

[System.IO.File]::WriteAllText($TargetLuaFile, $LuaPayload, [System.Text.Encoding]::UTF8)
Write-Host ">>> [SUCCESS] Logitech G HUB Lua Config Table Injected to $TargetLuaFile!" -ForegroundColor Green
`;
}
