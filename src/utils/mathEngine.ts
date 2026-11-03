import { PhysicsConfig } from '../types/engine';

/**
 * Filters sensor hardware electrical jitter below threshold.
 * Locked Pro Standard is ±20 units.
 */
export function filterJitter(val: number, jitterThreshold: number): number {
  if (Math.abs(val) < jitterThreshold) return 0;
  return val;
}

/**
 * Unreal Engine Dynamic Symmetric Axis Curve:
 * Replaces primitive fixed deadzone clipping with dynamic [-1.0, +1.0] symmetric axis rescaling:
 * 
 *   deflection = max(0, |rawMag| - deadzoneCutoff) / (127 - deadzoneCutoff)
 *   curved = sign * (deflection ^ exponent) * 127 * multiplier
 * 
 * Guarantees:
 * 1. Zero jump-discontinuity at deadzone border: output starts smoothly at 0.0.
 * 2. 100% mathematical symmetry between Left (A: -1.0, Q: -1.0) and Right (D: +1.0, E: +1.0).
 * 3. Eliminates accidental flip/dodge execution during double jumps.
 */
export function applyProfessionalCurve(
  input: number,
  multiplier: number,
  config: PhysicsConfig
): number {
  const jitterFiltered = filterJitter(input, config.hardwareJitter);
  const deadzoneCutoff = config.internalDeadzone * 127;
  const rawMag = Math.abs(jitterFiltered);

  if (rawMag <= deadzoneCutoff) {
    return 0;
  }

  const sign = jitterFiltered > 0 ? 1 : -1;
  const activeRange = 127.0 - deadzoneCutoff;
  const dynamicDeflection = activeRange > 0 
    ? Math.min(Math.max(0, (rawMag - deadzoneCutoff) / activeRange), 1.0)
    : 0;

  const curved = Math.pow(dynamicDeflection, config.curveExponent);
  return curved * 127.0 * sign * multiplier;
}

export interface CurvePoint {
  rawInput: number;           // -127 to 127
  normalizedInput: number;   // -1.0 to 1.0
  dynamicDeflection: number; // 0.0 to 1.0
  linearOutput: number;
  groundOutput: number;
  aerialOutput: number;
  precisionOutput: number;
}

export function generateCurvePoints(config: PhysicsConfig, steps = 100): CurvePoint[] {
  const points: CurvePoint[] = [];
  const deadzoneCutoff = config.internalDeadzone * 127;
  const activeRange = 127.0 - deadzoneCutoff;

  for (let i = 0; i <= steps; i++) {
    const norm = (i / steps) * 2 - 1; // -1 to +1
    const raw = Math.round(norm * 127);
    const rawMag = Math.abs(raw);
    
    const deflection = rawMag <= deadzoneCutoff || activeRange <= 0
      ? 0
      : Math.min((rawMag - deadzoneCutoff) / activeRange, 1.0);

    const groundOut = applyProfessionalCurve(raw, config.groundSense, config);
    const aerialOut = applyProfessionalCurve(raw, config.aerialSense, config);
    const precisionOut = applyProfessionalCurve(raw, config.precisionMode, config);

    points.push({
      rawInput: raw,
      normalizedInput: Number(norm.toFixed(3)),
      dynamicDeflection: Number(deflection.toFixed(3)),
      linearOutput: raw,
      groundOutput: Math.max(-191, Math.min(191, Math.round(groundOut))),
      aerialOutput: Math.max(-166, Math.min(166, Math.round(aerialOut))),
      precisionOutput: Math.max(-127, Math.min(127, Math.round(precisionOut))),
    });
  }
  return points;
}

/**
 * Evaluates discrete keyboard symmetric inputs (D/A for steer, E/Q for roll, W/S for throttle/pitch)
 */
export function evaluateSymmetricKeyInput(
  key: 'D' | 'A' | 'E' | 'Q' | 'W' | 'S',
  config: PhysicsConfig
): {
  key: string;
  sign: number;
  axis: 'STEER' | 'ROLL' | 'PITCH_THROTTLE';
  normalizedAxis: number;
  groundOutput: number;
  aerialOutput: number;
  precisionOutput: number;
  formula: string;
} {
  const k = key.toUpperCase();
  let sign = 1;
  let axis: 'STEER' | 'ROLL' | 'PITCH_THROTTLE' = 'STEER';

  if (k === 'D') {
    sign = 1;
    axis = 'STEER';
  } else if (k === 'A') {
    sign = -1;
    axis = 'STEER';
  } else if (k === 'E') {
    sign = 1;
    axis = 'ROLL';
  } else if (k === 'Q') {
    sign = -1;
    axis = 'ROLL';
  } else if (k === 'W') {
    sign = 1;
    axis = 'PITCH_THROTTLE';
  } else if (k === 'S') {
    sign = -1;
    axis = 'PITCH_THROTTLE';
  }

  const raw = sign * 127;
  const groundOutput = sign * Math.round(Math.abs(applyProfessionalCurve(raw, config.groundSense, config)));
  const aerialOutput = sign * Math.round(Math.abs(applyProfessionalCurve(raw, config.aerialSense, config)));
  const precisionOutput = sign * Math.round(Math.abs(applyProfessionalCurve(raw, config.precisionMode, config)));

  return {
    key: k,
    sign,
    axis,
    normalizedAxis: sign * 1.0,
    groundOutput,
    aerialOutput,
    precisionOutput,
    formula: `f(${k}) = ${sign > 0 ? '+1.0' : '-1.0'} * ((|127| - ${config.internalDeadzone * 127}) / (127 - ${config.internalDeadzone * 127}))^${config.curveExponent} * Sense`
  };
}

