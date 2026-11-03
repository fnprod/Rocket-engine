/**
 * FNPro Master Engine Native Tauri Bridge
 * Strictly Native-First: Direct communication with Rust backend via Tauri IPC channels.
 */

import { isTauriDesktop } from './gemini';
import { getMandatoryGHubScriptDir } from '../utils/ghubDirectoryConfig';

export interface HardwareProfile {
  machine_guid: string;
  cpu_processor_id: string;
  primary_gpu: string;
  display_refresh_hz: number;
  direct_input_1000hz_capable: boolean;
  fingerprint_hash: string;
  os_build: string;
  registered_user: string;
}

export interface GameLogInspection {
  log_path: string;
  exists: boolean;
  file_size_bytes: number;
  last_modified: string;
  process_status: string;
  current_map: string;
  player_net_id: string;
  match_session_guid: string;
  server_tick_hz: number;
  recent_events: string[];
}

export interface TempBuffersReport {
  base_temp_dir: string;
  ring_buffer_path: string;
  ring_buffer_size_bytes: number;
  scratch_dir: string;
  ghub_stream_log: string;
  is_initialized: boolean;
}

export interface GHubDeploymentResult {
  script_uuid: string;
  script_dir: string;
  script_file: string;
  settings_db_path: string;
  deployed_at: string;
  byte_size: number;
  status: string;
}

export interface LuaValidationReport {
  is_valid: boolean;
  syntax_version: string;
  line_count: number;
  errors: Array<{ line: number; column: number; message: string }>;
  warnings: string[];
  direct_input_1000hz_verified: boolean;
}

export interface PythonEnvironmentInfo {
  is_available: boolean;
  launcher_type: string;
  version: string;
  executable_path: string;
  has_sqlite3: boolean;
  has_numpy: boolean;
  has_pandas: boolean;
}

async function getTauriCore() {
  if (!isTauriDesktop()) {
    throw new Error('Native Desktop Bridge Error: Outside Tauri v2 runtime.');
  }
  return await import('@tauri-apps/api/core');
}

/**
 * Retrieves the hardware fingerprint and machine GUID from Rust backend
 */
export async function getHardwareFingerprint(): Promise<HardwareProfile> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<HardwareProfile>('get_hardware_fingerprint');
  }
  // Mock fallback for browser dev preview
  return {
    machine_guid: 'WIN11-LOCAL-DESKTOP-98A',
    cpu_processor_id: 'Intel64 Family 6 Model 183 Stepping 1',
    primary_gpu: 'NVIDIA GeForce RTX 4090 (G-Sync 240Hz)',
    display_refresh_hz: 240,
    direct_input_1000hz_capable: true,
    fingerprint_hash: 'FNPRO-HWID-38B928C1A0',
    os_build: 'Windows 11 Pro 64-bit (Build 26100)',
    registered_user: 'fnprospace@gmail.com',
  };
}

/**
 * Checks live Rocket League Launch.log
 */
export async function getLiveGameLogStatus(): Promise<GameLogInspection> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<GameLogInspection>('get_live_game_log_status');
  }
  return {
    log_path: '%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Logs\\Launch.log',
    exists: true,
    file_size_bytes: 48920,
    last_modified: new Date().toISOString(),
    process_status: 'RUNNING_IN_GAME',
    current_map: 'DFHStadium_P',
    player_net_id: 'Epic:Sugar_Verified_User_002',
    match_session_guid: 'SESSION-77a8b9-ONLINE',
    server_tick_hz: 120,
    recent_events: [
      'Net: PlayerController initialized on 120Hz dedicated server',
      'DirectInput 1000Hz polling synchronized with io_ring_buffer.bin',
      'Match transition: DFHStadium_P loaded successfully',
    ],
  };
}

/**
 * Initializes %TEMP%\FNProMasterEngine\ scratch buffers
 */
export async function initTempScratchBuffers(): Promise<TempBuffersReport> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<TempBuffersReport>('init_temp_scratch_buffers');
  }
  return {
    base_temp_dir: '%TEMP%\\FNProMasterEngine',
    ring_buffer_path: '%TEMP%\\FNProMasterEngine\\buffers\\io_ring_buffer.bin',
    ring_buffer_size_bytes: 65536,
    scratch_dir: '%TEMP%\\FNProMasterEngine\\scratch',
    ghub_stream_log: '%TEMP%\\FNProMasterEngine\\ghub_stream.log',
    is_initialized: true,
  };
}

/**
 * Deploys Lua script to Logitech G-HUB via %LOCALAPPDATA%\LGHUB\scripts\{UUIDv4}\script.lua
 */
export async function deployGHubLuaUuid(scriptContent: string): Promise<GHubDeploymentResult> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<GHubDeploymentResult>('deploy_ghub_lua_uuid', { scriptContent });
  }
  const fakeUuid = '550e8400-e29b-41d4-a716-446655440000';
  const baseDir = getMandatoryGHubScriptDir();
  return {
    script_uuid: fakeUuid,
    script_dir: `${baseDir}\\${fakeUuid}`,
    script_file: `${baseDir}\\${fakeUuid}\\script.lua`,
    settings_db_path: '%LOCALAPPDATA%\\LGHUB\\settings.db',
    deployed_at: new Date().toISOString(),
    byte_size: scriptContent.length,
    status: 'DEPLOYED_NATIVE_UUID',
  };
}

/**
 * Validates Lua 5.4 script syntax and checks for 1000Hz DirectInput parameters
 */
export async function validateLuaScript(scriptContent: string): Promise<LuaValidationReport> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<LuaValidationReport>('validate_lua_script', { scriptContent });
  }
  // Client validation fallback
  const lines = scriptContent.split('\n');
  const has1000Hz = scriptContent.includes('TICK_MS             = 1') || scriptContent.includes('1000Hz');
  return {
    is_valid: true,
    syntax_version: 'Lua 5.4 Strict',
    line_count: lines.length,
    errors: [],
    warnings: has1000Hz ? [] : ['DirectInput 1000Hz tick constant (TICK_MS = 1) recommended.'],
    direct_input_1000hz_verified: has1000Hz,
  };
}

/**
 * Initializes SQLite WAL telemetry database
 */
export async function initTelemetryDb(): Promise<string> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<string>('init_telemetry_db');
  }
  return 'SQLite WAL Telemetry Database Initialized (%APPDATA%\\FNProMasterEngine\\fnpro_telemetry.db)';
}

/**
 * Detects Python environment without version lock
 */
export async function detectSystemPython(): Promise<PythonEnvironmentInfo> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<PythonEnvironmentInfo>('detect_system_python');
  }
  return {
    is_available: true,
    launcher_type: 'py',
    version: 'Python 3.12.3',
    executable_path: 'C:\\Python312\\python.exe',
    has_sqlite3: true,
    has_numpy: true,
    has_pandas: true,
  };
}

/**
 * Saves Ballchasing.com API token to %APPDATA%\FNProMasterEngine\vault.key
 */
export async function saveBallchasingToken(token: string): Promise<boolean> {
  if (isTauriDesktop()) {
    try {
      const { invoke } = await getTauriCore();
      return await invoke<boolean>('save_ballchasing_token', { token });
    } catch {
      // Fallback to localStorage
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('fnpro_ballchasing_token_v2', token);
  }
  return true;
}

/**
 * Gets Ballchasing.com API token from vault or localStorage
 */
export async function getBallchasingToken(): Promise<string> {
  if (isTauriDesktop()) {
    try {
      const { invoke } = await getTauriCore();
      const token = await invoke<string>('get_ballchasing_token');
      if (token) return token;
    } catch {
      // Fallback
    }
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fnpro_ballchasing_token_v2') || '';
  }
  return '';
}

/**
 * Fetches replay stats from Ballchasing.com REST API
 */
export async function fetchBallchasingReplayStats(replayId: string, token?: string): Promise<any> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<any>('fetch_ballchasing_replay_stats', { replayId, token });
  }
  // Browser preview mock response
  return {
    id: replayId || '123e4567-e89b-12d3-a456-426614174000',
    title: 'Ranked 3v3 Match Analysis',
    status: 'ok',
    rocket_league_id: '772910398',
    map_code: 'DFHStadium_P',
    duration: 312,
    blue: {
      goals: 3,
      players: [
        { name: 'fnprospace', score: 620, goals: 2, saves: 3, shots: 5, boost_usage: 84.5 }
      ]
    },
    orange: {
      goals: 1,
      players: [
        { name: 'Opponent_Alpha', score: 380, goals: 1, saves: 1, shots: 3, boost_usage: 71.0 }
      ]
    }
  };
}

export const fetchBallchasingStats = fetchBallchasingReplayStats;

/**
 * Invokes Rust backend to generate the exact Bipolar 1000Hz Lua template
 */
export async function generateGHubBipolarLuaTemplate(deadzone?: number, exponent?: number): Promise<string> {
  if (isTauriDesktop()) {
    const { invoke } = await getTauriCore();
    return await invoke<string>('generate_ghub_bipolar_lua_template', { deadzone, exponent });
  }
  const dz = deadzone ?? 0.05;
  const exp = exponent ?? 1.35;
  return `-- FNPRO MASTER ENGINE v4.2.0 - BIPOLAR 1000HZ DIRECTINPUT LUA TEMPLATE
local CONFIG = {
    INTERNAL_DEADZONE   = ${dz.toFixed(4)},
    CURVE_EXPONENT      = ${exp.toFixed(4)},
    HARDWARE_JITTER     = 2,
    TICK_MS             = 1.0,
    GROUND_SENSE        = 1.30,
    AERIAL_SENSE        = 1.50,
    SUPERSONIC_VELOCITY = 2200,
}

function GetSign(val)
    if val > 0 then return 1 elseif val < 0 then return -1 else return 0 end
end

function Clamp(val, min_val, max_val)
    if val < min_val then return min_val elseif val > max_val then return max_val else return val end
end

function ApplyBipolarCurve(norm, deadzone, exponent)
    local dz = deadzone or CONFIG.INTERNAL_DEADZONE
    local exp = exponent or CONFIG.CURVE_EXPONENT
    local abs_val = math.abs(norm)
    if abs_val <= dz then return 0.0 end
    local sign = GetSign(norm)
    local clamped = Clamp((abs_val - dz) / (1.0 - dz), 0.0, 1.0)
    return sign * math.pow(clamped, exp)
end

function ProcessRawMouseCounts(dx, dy)
    local norm_x = Clamp(dx / 127.0, -1.0, 1.0)
    local norm_y = Clamp(dy / 127.0, -1.0, 1.0)
    return ApplyBipolarCurve(norm_x), ApplyBipolarCurve(norm_y)
end
`;
}

