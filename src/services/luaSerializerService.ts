import { PhysicsConfig, KeyBinding, MacroTimingConfig } from '../types/engine';

export interface SerializerOptions {
  format?: 'return_table' | 'assignment' | 'raw_table' | 'delta_patch';
  tableName?: string; // default "CONFIG"
  indentSpaces?: number;
  includeMetadata?: boolean;
}

export interface SerializedLuaResult {
  luaString: string;
  isValid: boolean;
  validationErrors: string[];
  byteSize: number;
  serializationTimeMs: number;
  mappedVariables: Array<{
    pythonKey: string;
    luaKey: string;
    pythonValue: any;
    luaFormattedValue: string;
  }>;
}

/**
 * Service that serializes Python physics configuration objects and generates
 * syntactically valid Lua table strings compatible with the Logitech G HUB runtime environment.
 */
export class PythonToLuaSerializerService {
  /**
   * Serializes a JavaScript/Python primitive into a valid Lua literal
   */
  public static serializeValue(val: any, indent = 4): string {
    if (val === null || val === undefined) {
      return 'nil';
    }
    if (typeof val === 'boolean') {
      return val ? 'true' : 'false';
    }
    if (typeof val === 'number') {
      if (Number.isNaN(val)) return '0';
      if (!Number.isFinite(val)) return 'math.huge';
      // Format float vs integer cleanly
      return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    }
    if (typeof val === 'string') {
      // Escape quotes and backslashes
      const escaped = val
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      return `"${escaped}"`;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '{}';
      const items = val.map((v) => this.serializeValue(v, indent + 4));
      return `{ ${items.join(', ')} }`;
    }
    if (typeof val === 'object') {
      return this.serializeObjectToLuaTable(val, indent);
    }
    return String(val);
  }

  /**
   * Recursively serializes a plain key-value object into a formatted Lua table string
   */
  public static serializeObjectToLuaTable(obj: Record<string, any>, indent = 4): string {
    const spaces = ' '.repeat(indent);
    const innerSpaces = ' '.repeat(indent + 4);
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return '{}';
    }

    const lines: string[] = ['{'];
    for (const [key, value] of entries) {
      // Validate key as valid Lua identifier or bracket it
      const luaKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `["${key}"]`;
      const serializedVal = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? this.serializeObjectToLuaTable(value, indent + 4)
        : this.serializeValue(value, indent + 4);

      lines.push(`${innerSpaces}${luaKey} = ${serializedVal},`);
    }
    lines.push(`${spaces}}`);
    return lines.join('\n');
  }

  /**
   * Serializes the Python PhysicsConfig and keybindings into a validated Lua table string
   */
  public static serializePhysicsConfig(
    config: PhysicsConfig,
    keybindings?: KeyBinding[],
    timings?: MacroTimingConfig,
    options: SerializerOptions = {}
  ): SerializedLuaResult {
    const startTime = performance.now();
    const {
      format = 'return_table',
      tableName = 'CONFIG',
      includeMetadata = true,
    } = options;

    const mappedVariables = [
      { pythonKey: 'internal_deadzone', luaKey: 'INTERNAL_DEADZONE', pythonValue: config.internalDeadzone, luaFormattedValue: config.internalDeadzone.toFixed(2) },
      { pythonKey: 'dodge_deadzone', luaKey: 'DODGE_DEADZONE', pythonValue: config.dodgeDeadzone, luaFormattedValue: config.dodgeDeadzone.toFixed(2) },
      { pythonKey: 'hardware_jitter', luaKey: 'HARDWARE_JITTER', pythonValue: config.hardwareJitter, luaFormattedValue: config.hardwareJitter.toString() },
      { pythonKey: 'ground_sense', luaKey: 'GROUND_SENSE', pythonValue: config.groundSense, luaFormattedValue: config.groundSense.toFixed(2) },
      { pythonKey: 'aerial_sense', luaKey: 'AERIAL_SENSE', pythonValue: config.aerialSense, luaFormattedValue: config.aerialSense.toFixed(2) },
      { pythonKey: 'precision_mode', luaKey: 'PRECISION_MODE', pythonValue: config.precisionMode, luaFormattedValue: config.precisionMode.toFixed(2) },
      { pythonKey: 'curve_exponent', luaKey: 'CURVE_EXPONENT', pythonValue: config.curveExponent, luaFormattedValue: config.curveExponent.toFixed(2) },
      { pythonKey: 'polling_rate_adj', luaKey: 'POLLING_RATE_ADJ', pythonValue: config.pollingRateAdj, luaFormattedValue: config.pollingRateAdj.toString() },
    ];

    // Build Lua Data Model
    const luaDataModel: Record<string, any> = {
      INTERNAL_DEADZONE: Number(config.internalDeadzone.toFixed(2)),
      DODGE_DEADZONE: Number(config.dodgeDeadzone.toFixed(2)),
      HARDWARE_JITTER: config.hardwareJitter,
      GROUND_SENSE: Number(config.groundSense.toFixed(2)),
      AERIAL_SENSE: Number(config.aerialSense.toFixed(2)),
      PRECISION_MODE: Number(config.precisionMode.toFixed(2)),
      CURVE_EXPONENT: Number(config.curveExponent.toFixed(2)),
      POLLING_RATE_ADJ: config.pollingRateAdj,
    };

    if (keybindings && keybindings.length > 0) {
      const getK = (actionId: string, fallback: string) => {
        const found = keybindings.find(b => b.id === actionId && b.layer === 0);
        return found ? found.key.toLowerCase() : fallback;
      };

      luaDataModel['K'] = {
        FORWARD: getK('forward', 'w'),
        BACK: getK('back', 's'),
        LEFT: getK('left', 'a'),
        RIGHT: getK('right', 'd'),
        POWERSLIDE: getK('powerslide', 'lalt'),
        AIRROLL_L: getK('airroll_l', 'q'),
        AIRROLL_R: getK('airroll_r', 'e'),
        JUMP: getK('jump', 'space'),
        BOOST: getK('boost', 'lshift'),
      };
    }

    if (timings) {
      luaDataModel['TIMINGS'] = {
        FAST_AERIAL: {
          FIRST_JUMP: timings.fastAerial.firstJumpSleep,
          BACK_RELEASE: timings.fastAerial.backReleaseSleep,
          SECOND_JUMP: timings.fastAerial.secondJumpSleep,
          FORWARD_FLIP: timings.fastAerial.forwardFlipDelay,
          CANCEL_HOLD: timings.fastAerial.flipCancelHold,
        },
        SPEEDFLIP: {
          FIRST_JUMP: timings.forwardSpeedflip.firstJumpSleep,
          DELAY_SECOND: timings.forwardSpeedflip.delayBeforeSecond,
          CANCEL_HOLD: timings.forwardSpeedflip.cancelHold,
        },
        CHAIN_DASH: {
          JUMP_1: timings.chainDash.jump1Sleep,
          FALL_DELAY: timings.chainDash.fallDelay,
          JUMP_2: timings.chainDash.jump2Sleep,
          RELEASE_DELAY: timings.chainDash.releaseDelay,
        },
      };
    }

    if (includeMetadata) {
      luaDataModel['__SERIALIZER_METADATA'] = {
        VERSION: '4.0.2',
        SERIALIZED_AT_EPOCH: Date.now(),
        SOURCE_ENGINE: 'Python_PySide6_PhysicsModel',
        RUNTIME_COMPLIANCE: 'Logitech_G_HUB_Lua_5.3',
      };
    }

    let luaString = '';
    if (format === 'delta_patch') {
      const lines = [
        '-- [[ LOGITECH G HUB RUNTIME CONFIG PATCH ]]',
        '-- Injected directly into active environment',
      ];
      for (const item of mappedVariables) {
        lines.push(`${tableName}.${item.luaKey} = ${item.luaFormattedValue}`);
      }
      lines.push(`OutputLogMessage("[BRIDGE] Serialized delta applied to ${tableName}\\n")`);
      luaString = lines.join('\n');
    } else if (format === 'assignment') {
      luaString = `-- [[ LOGITECH G HUB CONFIG TABLE ASSIGNMENT ]]\n${tableName} = ${this.serializeObjectToLuaTable(luaDataModel, 0)}`;
    } else if (format === 'raw_table') {
      luaString = this.serializeObjectToLuaTable(luaDataModel, 0);
    } else {
      // return_table
      luaString = `-- [[ LOGITECH G HUB CONSUMABLE RUNTIME TABLE ]]\n-- Consumable via assert(loadstring(str))() or dofile()\nreturn ${this.serializeObjectToLuaTable(luaDataModel, 0)}`;
    }

    // Validate generated Lua syntax
    const validationErrors: string[] = [];
    
    // Check balanced braces
    const openBraces = (luaString.match(/\{/g) || []).length;
    const closeBraces = (luaString.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      validationErrors.push(`Unbalanced braces: ${openBraces} '{' vs ${closeBraces} '}'`);
    }

    // Check for illegal Python tokens that shouldn't leak
    if (/\bTrue\b/.test(luaString)) validationErrors.push('Forbidden Python token "True" found (must be "true")');
    if (/\bFalse\b/.test(luaString)) validationErrors.push('Forbidden Python token "False" found (must be "false")');
    if (/\bNone\b/.test(luaString)) validationErrors.push('Forbidden Python token "None" found (must be "nil")');
    if (/\bNaN\b/.test(luaString)) validationErrors.push('Invalid numeric value "NaN" found in table');

    const endTime = performance.now();
    const byteSize = new TextEncoder().encode(luaString).length;

    return {
      luaString,
      isValid: validationErrors.length === 0,
      validationErrors,
      byteSize,
      serializationTimeMs: Number((endTime - startTime).toFixed(3)),
      mappedVariables,
    };
  }
}
