import { PhysicsConfig, KeyBinding, MacroTimingConfig } from '../types/engine';

export interface LuaRuntimePayload {
  configTable: string;
  hotReloadChunk: string;
  jsonPayload: string;
  pythonTransmitterCode: string;
  checksum: string;
  payloadBytes: number;
  generatedAt: number;
}

/**
 * Calculates a quick hex checksum of serialized config
 */
function computeChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Maps Python-based PhysicsConfig, Keybindings, and Timings into formats
 * directly consumable by the Logitech G HUB Lua runtime environment.
 */
export function mapPhysicsToLuaRuntime(
  config: PhysicsConfig,
  keybindings: KeyBinding[],
  timings: MacroTimingConfig
): LuaRuntimePayload {
  const getK = (actionId: string, fallback: string) => {
    const found = keybindings.find(b => b.id === actionId && b.layer === 0);
    return found ? found.key.toLowerCase() : fallback;
  };

  const fwdKey = getK('forward', 'w');
  const backKey = getK('back', 's');
  const leftKey = getK('left', 'a');
  const rightKey = getK('right', 'd');
  const powerslideKey = getK('powerslide', 'lalt');
  const airrollLKey = getK('airroll_l', 'q');
  const airrollRKey = getK('airroll_r', 'e');
  const jumpKey = getK('jump', 'space');
  const boostKey = getK('boost', 'lshift');

  const now = Date.now();

  // 1. Direct Lua Table format consumable via loadstring() or dofile() in Logitech G HUB
  const configTable = `-- [[ DIRECT CONSUMABLE LOGITECH G HUB LUA CONFIG TABLE ]]
-- Generated via Python Math Engine Real-Time Bridge
return {
    INTERNAL_DEADZONE = ${config.internalDeadzone.toFixed(2)},
    DODGE_DEADZONE    = ${config.dodgeDeadzone.toFixed(2)},
    HARDWARE_JITTER   = ${config.hardwareJitter},
    GROUND_SENSE      = ${config.groundSense.toFixed(2)},
    AERIAL_SENSE      = ${config.aerialSense.toFixed(2)},
    PRECISION_MODE    = ${config.precisionMode.toFixed(2)},
    CURVE_EXPONENT    = ${config.curveExponent.toFixed(2)},
    POLLING_RATE_ADJ  = ${config.pollingRateAdj},
    K = {
        FORWARD    = "${fwdKey}",
        BACK       = "${backKey}",
        LEFT       = "${leftKey}",
        RIGHT      = "${rightKey}",
        POWERSLIDE = "${powerslideKey}",
        AIRROLL_L  = "${airrollLKey}",
        AIRROLL_R  = "${airrollRKey}",
        JUMP       = "${jumpKey}",
        BOOST      = "${boostKey}",
    },
    TIMINGS = {
        FAST_AERIAL = {
            FIRST_JUMP = ${timings.fastAerial.firstJumpSleep},
            BACK_RELEASE = ${timings.fastAerial.backReleaseSleep},
            SECOND_JUMP = ${timings.fastAerial.secondJumpSleep},
            FORWARD_FLIP = ${timings.fastAerial.forwardFlipDelay},
            CANCEL_HOLD = ${timings.fastAerial.flipCancelHold},
        },
        SPEEDFLIP = {
            FIRST_JUMP = ${timings.forwardSpeedflip.firstJumpSleep},
            DELAY_SECOND = ${timings.forwardSpeedflip.delayBeforeSecond},
            CANCEL_HOLD = ${timings.forwardSpeedflip.cancelHold},
        },
        CHAIN_DASH = {
            JUMP_1 = ${timings.chainDash.jump1Sleep},
            FALL_DELAY = ${timings.chainDash.fallDelay},
            JUMP_2 = ${timings.chainDash.jump2Sleep},
            RELEASE_DELAY = ${timings.chainDash.releaseDelay},
        },
    },
    META = {
        ENGINE_VERSION = "4.0.2",
        SYNC_EPOCH = ${now},
        SOURCE = "Python_PhysicsConfig_Bridge",
    }
}`;

  // 2. Hot-Reload Chunk directly executable in a running Logitech G-HUB OnEvent cycle
  const hotReloadChunk = `-- [[ LOGITECH G-HUB HOT-RELOAD INJECTION CHUNK ]]
-- Execute in Lua runtime or via G-HUB script console to update live physics:
if type(UpdateEngineConfig) == "function" then
    UpdateEngineConfig({
        INTERNAL_DEADZONE = ${config.internalDeadzone.toFixed(2)},
        DODGE_DEADZONE    = ${config.dodgeDeadzone.toFixed(2)},
        HARDWARE_JITTER   = ${config.hardwareJitter},
        GROUND_SENSE      = ${config.groundSense.toFixed(2)},
        AERIAL_SENSE      = ${config.aerialSense.toFixed(2)},
        PRECISION_MODE    = ${config.precisionMode.toFixed(2)},
        CURVE_EXPONENT    = ${config.curveExponent.toFixed(2)},
        POLLING_RATE_ADJ  = ${config.pollingRateAdj},
    })
else
    CONFIG.INTERNAL_DEADZONE = ${config.internalDeadzone.toFixed(2)}
    CONFIG.DODGE_DEADZONE    = ${config.dodgeDeadzone.toFixed(2)}
    CONFIG.HARDWARE_JITTER   = ${config.hardwareJitter}
    CONFIG.GROUND_SENSE      = ${config.groundSense.toFixed(2)}
    CONFIG.AERIAL_SENSE      = ${config.aerialSense.toFixed(2)}
    CONFIG.PRECISION_MODE    = ${config.precisionMode.toFixed(2)}
    CONFIG.CURVE_EXPONENT    = ${config.curveExponent.toFixed(2)}
    CONFIG.POLLING_RATE_ADJ  = ${config.pollingRateAdj}
    OutputLogMessage("[BRIDGE] PhysicsConfig updated dynamically from Python runtime!\\n")
end`;

  // 3. JSON format for inter-process communication / file IPC
  const jsonPayload = JSON.stringify(
    {
      version: '4.0.2',
      timestamp: now,
      physics: {
        internal_deadzone: config.internalDeadzone,
        dodge_deadzone: config.dodgeDeadzone,
        hardware_jitter: config.hardwareJitter,
        ground_sense: config.groundSense,
        aerial_sense: config.aerialSense,
        precision_mode: config.precisionMode,
        curve_exponent: config.curveExponent,
        polling_rate_adj: config.pollingRateAdj,
      },
      keybinds: {
        forward: fwdKey,
        back: backKey,
        left: leftKey,
        right: rightKey,
        powerslide: powerslideKey,
        airroll_l: airrollLKey,
        airroll_r: airrollRKey,
        jump: jumpKey,
        boost: boostKey,
      },
      timings: timings,
    },
    null,
    2
  );

  // 4. Standalone Python Transmitter script demonstrating how Python feeds G HUB
  const pythonTransmitterCode = `#!/usr/bin/env python3
"""
Python -> Logitech G HUB Real-Time Bridge Service
Transmits calibrated PhysicsConfig into Logitech G HUB Lua runtime environment.
"""

import json
import time
import os
from pathlib import Path

# Serialized runtime config payload mapped from Python PhysicsConfig
CONFIG_PAYLOAD = {
    "INTERNAL_DEADZONE": ${config.internalDeadzone.toFixed(2)},
    "DODGE_DEADZONE": ${config.dodgeDeadzone.toFixed(2)},
    "HARDWARE_JITTER": ${config.hardwareJitter},
    "GROUND_SENSE": ${config.groundSense.toFixed(2)},
    "AERIAL_SENSE": ${config.aerialSense.toFixed(2)},
    "PRECISION_MODE": ${config.precisionMode.toFixed(2)},
    "CURVE_EXPONENT": ${config.curveExponent.toFixed(2)},
    "POLLING_RATE_ADJ": ${config.pollingRateAdj},
    "UPDATED_AT": ${now}
}

LUA_BRIDGE_FILE = Path(os.environ.get("TEMP", ".")) / "rl_engine_bridge.lua"

def broadcast_to_logitech_lua():
    lua_code = f"""-- Auto-generated by Python Bridge Service
return {{
    INTERNAL_DEADZONE = {CONFIG_PAYLOAD['INTERNAL_DEADZONE']},
    DODGE_DEADZONE = {CONFIG_PAYLOAD['DODGE_DEADZONE']},
    HARDWARE_JITTER = {CONFIG_PAYLOAD['HARDWARE_JITTER']},
    GROUND_SENSE = {CONFIG_PAYLOAD['GROUND_SENSE']},
    AERIAL_SENSE = {CONFIG_PAYLOAD['AERIAL_SENSE']},
    PRECISION_MODE = {CONFIG_PAYLOAD['PRECISION_MODE']},
    CURVE_EXPONENT = {CONFIG_PAYLOAD['CURVE_EXPONENT']},
    POLLING_RATE_ADJ = {CONFIG_PAYLOAD['POLLING_RATE_ADJ']},
    TIMESTAMP = {CONFIG_PAYLOAD['UPDATED_AT']}
}}
"""
    with open(LUA_BRIDGE_FILE, "w", encoding="utf-8") as f:
        f.write(lua_code)
    print(f"[BRIDGE] Dispatched payload to {LUA_BRIDGE_FILE} (Checksum: ${computeChecksum(configTable)})")

if __name__ == "__main__":
    broadcast_to_logitech_lua()
`;

  const checksum = computeChecksum(configTable);
  const payloadBytes = new TextEncoder().encode(configTable).length;

  return {
    configTable,
    hotReloadChunk,
    jsonPayload,
    pythonTransmitterCode,
    checksum,
    payloadBytes,
    generatedAt: now,
  };
}
