import { SUPERSONIC_MIN_UU, SUPERSONIC_MAX_UU } from '../types/engine';

/**
 * Validates and clamps Rocket League in-game velocity in Unreal Units (uu/s).
 * Rocket League physics enforces supersonic between 2200 and 2300 uu/s.
 */
export function clampRocketLeagueVelocity(rawVelocityUu: number): number {
  if (rawVelocityUu < 0) return 0;
  if (rawVelocityUu > SUPERSONIC_MAX_UU) return SUPERSONIC_MAX_UU;
  return Math.round(rawVelocityUu);
}

/**
 * Checks if the vehicle has entered the supersonic state.
 */
export function isVehicleSupersonic(velocityUu: number): boolean {
  return velocityUu >= SUPERSONIC_MIN_UU;
}

/**
 * Calculates whether all 4 wheels make contact with a physical surface (Ball, Ceiling, Ground),
 * granting an infinite flip reset without timer expiration.
 */
export function hasFourWheelContact(wheels: [boolean, boolean, boolean, boolean]): boolean {
  return wheels[0] && wheels[1] && wheels[2] && wheels[3];
}

/**
 * Computes non-linear exponential curve output:
 * f(x) = sign(x) * (|x| / 127) ^ exponent * 127 * multiplier
 * Filtered by hardware jitter threshold (default 20 units) and internal deadzone.
 */
export function calculateResponseCurve(
  rawInput: number,
  exponent: number,
  deadzone: number,
  multiplier: number,
  jitterThreshold: number = 20
): number {
  if (Math.abs(rawInput) < jitterThreshold) {
    return 0;
  }
  const deadzoneCutoff = deadzone * 127;
  if (Math.abs(rawInput) < deadzoneCutoff) {
    return 0;
  }

  const sign = rawInput > 0 ? 1 : -1;
  const normalized = Math.min(Math.abs(rawInput) / 127, 1.0);
  const curved = Math.pow(normalized, exponent);
  return curved * 127 * sign * multiplier;
}

/**
 * Unreal Engine Bipolar Axis Response Function:
 * Enforces pure mathematical symmetry between left and right directions:
 *   - Key D / Right Steer / Yaw = +1.0
 *   - Key A / Left Steer / Yaw  = -1.0
 *   - Key E / Air Roll Right    = +1.0
 *   - Key Q / Air Roll Left     = -1.0
 *   - Key W / Throttle / Pitch  = +1.0
 *   - Key S / Brake / Pitch     = -1.0
 * 
 * Rejects asymmetric offsets (e.g. 0.25 right-side bias or unbalanced 0.0 deadzones).
 */
export function calculateBipolarAxisResponse(
  input: 'A' | 'D' | 'Q' | 'E' | 'W' | 'S' | number,
  deadzone: number = 0.02,
  exponent: number = 1.35,
  multiplier: number = 1.0,
  jitterThreshold: number = 20
): {
  key: string;
  sign: number;
  rawMagnitude: number;
  normalized: number;
  output: number;
  isDeadzone: boolean;
  axisName: 'STEER_YAW' | 'AIR_ROLL' | 'THROTTLE_PITCH';
} {
  let sign = 1;
  let rawMag = 127;
  let keyStr = 'D';
  let axisName: 'STEER_YAW' | 'AIR_ROLL' | 'THROTTLE_PITCH' = 'STEER_YAW';

  if (typeof input === 'string') {
    const k = input.toUpperCase();
    keyStr = k;
    if (k === 'D') {
      sign = 1;
      axisName = 'STEER_YAW';
    } else if (k === 'A') {
      sign = -1;
      axisName = 'STEER_YAW';
    } else if (k === 'E') {
      sign = 1;
      axisName = 'AIR_ROLL';
    } else if (k === 'Q') {
      sign = -1;
      axisName = 'AIR_ROLL';
    } else if (k === 'W') {
      sign = 1;
      axisName = 'THROTTLE_PITCH';
    } else if (k === 'S') {
      sign = -1;
      axisName = 'THROTTLE_PITCH';
    }
  } else {
    sign = input >= 0 ? 1 : -1;
    rawMag = Math.min(127, Math.abs(input));
    keyStr = sign > 0 ? 'D / E' : 'A / Q';
  }

  // 1. Hardware Jitter Gate (Locked to 20)
  if (rawMag < jitterThreshold) {
    return {
      key: keyStr,
      sign,
      rawMagnitude: rawMag,
      normalized: 0,
      output: 0,
      isDeadzone: true,
      axisName
    };
  }

  // 2. Deadzone Gate
  const deadzoneCutoff = deadzone * 127;
  if (rawMag < deadzoneCutoff) {
    return {
      key: keyStr,
      sign,
      rawMagnitude: rawMag,
      normalized: 0,
      output: 0,
      isDeadzone: true,
      axisName
    };
  }

  // 3. Dynamic Normalized and Exponential Curvature (Unreal Engine Dynamic Rescaling)
  // Maps [deadzoneCutoff, 127] continuously to [0.0, 1.0] to eliminate jump discontinuities
  const activeRange = 127.0 - deadzoneCutoff;
  const dynamicDeflection = activeRange > 0
    ? Math.min((rawMag - deadzoneCutoff) / activeRange, 1.0)
    : 0;
  const curved = Math.pow(dynamicDeflection, exponent);
  const output = Number((curved * 127.0 * sign * multiplier).toFixed(2));

  return {
    key: keyStr,
    sign,
    rawMagnitude: rawMag,
    normalized: Number((dynamicDeflection * sign).toFixed(3)),
    output,
    isDeadzone: false,
    axisName
  };
}

export const calculateBipolarAxis = calculateBipolarAxisResponse;


/**
 * Calculates boost burn rate: 100 boost lasts exactly 3.0 seconds (33.3% per second)
 */
export function calculateRemainingBoost(currentBoost: number, durationSeconds: number): number {
  const boostConsumed = durationSeconds * 33.333;
  return Math.max(0, Math.min(100, currentBoost - boostConsumed));
}

/**
 * Consistent Pure Boost Management Engine:
 * Implements supersonic conservation (stopping unnecessary boost expenditure once 2200 uu/s is locked),
 * feathering micro-pulses (3-5 boost units) for aerial speed maintenance,
 * and flip gain conversion (preserving 100 boost by substituting wave-dashes and speedflips).
 */
export interface BoostConservationResult {
  currentBoost: number;
  consumed: number;
  isConserving: boolean;
  status: 'FULL_BURN' | 'SUPERSONIC_LOCKED_CONSERVING' | 'FEATHERING' | 'EMPTY';
  flipsGained: number;
}

export function evaluateConsistentBoost(
  currentBoost: number,
  velocityUu: number,
  isFeathering: boolean = false,
  flipsExecuted: number = 0
): BoostConservationResult {
  const isSupersonic = velocityUu >= SUPERSONIC_MIN_UU;

  if (currentBoost <= 0) {
    return {
      currentBoost: 0,
      consumed: 0,
      isConserving: false,
      status: 'EMPTY',
      flipsGained: flipsExecuted * 2
    };
  }

  if (isSupersonic) {
    // Supersonic lock active: Boost burn should be suppressed or feathered to preserve speed
    return {
      currentBoost,
      consumed: 0,
      isConserving: true,
      status: 'SUPERSONIC_LOCKED_CONSERVING',
      flipsGained: flipsExecuted + 1
    };
  }

  if (isFeathering) {
    // Feathering consumes only 4 units per pulse instead of full 33.3/s continuous burn
    const nextBoost = Math.max(0, currentBoost - 4);
    return {
      currentBoost: nextBoost,
      consumed: 4,
      isConserving: true,
      status: 'FEATHERING',
      flipsGained: flipsExecuted
    };
  }

  // Standard boost consumption
  const nextBoost = Math.max(0, currentBoost - 8);
  return {
    currentBoost: nextBoost,
    consumed: 8,
    isConserving: false,
    status: 'FULL_BURN',
    flipsGained: flipsExecuted
  };
}

/**
 * Strict Bipolar Input Scaling [-1.0, +1.0]:
 * Symmetric Deadzone & Exponent Curve:
 * f(x) = sgn(x) * pow(clamp((|x| - deadzone) / (1.0 - deadzone), 0.0, 1.0), exponent)
 * Enforces pure symmetry: f(-1.0) = -1.0, f(0.0) = 0.0, and f(+1.0) = +1.0.
 */
export function applySymmetricBipolarCurve(
  input: number, // [-1.0, +1.0]
  deadzone: number = 0.05,
  exponent: number = 1.35
): number {
  if (Math.abs(input) <= deadzone) {
    return 0.0;
  }
  const sign = input > 0 ? 1 : (input < 0 ? -1 : 0);
  const activeFraction = (Math.abs(input) - deadzone) / (1.0 - deadzone);
  const clampedFraction = Math.max(0.0, Math.min(1.0, activeFraction));
  const curved = Math.pow(clampedFraction, exponent);
  return Number((sign * curved).toFixed(5));
}

/**
 * Continuous 2D/3D Kinematic Force Vector
 */
export interface KinematicVector3D {
  steer: number;  // [-1.0, +1.0]
  pitch: number;  // [-1.0, +1.0]
  roll: number;   // [-1.0, +1.0]
}

export function evaluateKinematicVector3D(
  raw: KinematicVector3D,
  deadzone: number = 0.05,
  exponent: number = 1.35
): {
  curved: KinematicVector3D;
  magnitude: number;
  angleDeg: number;
  crossAxisTorqueLeakagePercent: number;
} {
  const steer = applySymmetricBipolarCurve(raw.steer, deadzone, exponent);
  const pitch = applySymmetricBipolarCurve(raw.pitch, deadzone, exponent);
  const roll = applySymmetricBipolarCurve(raw.roll, deadzone, exponent);
  const mag = Math.min(1.0, Math.sqrt(steer * steer + pitch * pitch + roll * roll));
  // 2D steering-pitch angle in degrees
  let angle = (Math.atan2(steer, pitch) * 180) / Math.PI;
  if (angle < 0) angle += 360;

  // Cross-axis torque leakage: unintended roll while pitching/steering
  const primaryMag = Math.sqrt(steer * steer + pitch * pitch);
  const leakage = primaryMag > 0.01 
    ? Math.min(100, (Math.abs(roll) / (primaryMag + Math.abs(roll))) * 100)
    : 0;

  return {
    curved: { steer, pitch, roll },
    magnitude: Number(mag.toFixed(4)),
    angleDeg: Number(angle.toFixed(1)),
    crossAxisTorqueLeakagePercent: Number(leakage.toFixed(2))
  };
}

/**
 * Supersonic Velocity State Machine (2200 to 2300 uu/s):
 * - Absolute Max Engine Speed = 2300.0 uu/s.
 * - 2200.0 uu/s represents exactly 95.65% (0.9565) of max velocity.
 * - Supersonic Band Ratio: P_supersonic = clamp((velocity - 2200.0) / (2300.0 - 2200.0), 0.0, 1.0).
 * - Friction bleeding penalty: when sharp steering (|Steer| > 0.8) occurs during P_supersonic > 0.5.
 */
export function evaluateSupersonicKinematics(
  currentVelocityUu: number,
  steerInput: number // [-1.0, +1.0]
): {
  velocityUu: number;
  maxVelocityUu: number;
  velocityPercentOfMax: number;
  isSupersonic: boolean;
  pSupersonic: number;
  isFrictionBleeding: boolean;
  frictionBleedPenaltyUu: number;
  netEffectiveVelocityUu: number;
} {
  const maxVel = SUPERSONIC_MAX_UU; // 2300.0
  const clampedVel = Math.max(0, Math.min(maxVel, currentVelocityUu));
  const velocityPercentOfMax = Number((clampedVel / maxVel).toFixed(4)); // 2200 / 2300 = 0.9565
  const isSupersonic = clampedVel >= SUPERSONIC_MIN_UU; // >= 2200
  
  // P_supersonic band ratio [0.0, 1.0] between 2200 and 2300
  const band = SUPERSONIC_MAX_UU - SUPERSONIC_MIN_UU; // 100 uu/s
  const pSupersonic = Math.max(0.0, Math.min(1.0, (clampedVel - SUPERSONIC_MIN_UU) / band));

  // Friction bleeding penalty when sharp steering (|Steer| > 0.8) occurs during P_supersonic > 0.5
  const absSteer = Math.abs(steerInput);
  let isFrictionBleeding = false;
  let frictionBleedPenaltyUu = 0;

  if (absSteer > 0.8 && pSupersonic > 0.5) {
    isFrictionBleeding = true;
    const steerExcess = (absSteer - 0.8) / 0.2; // 0.0 to 1.0
    const supersonicExcess = (pSupersonic - 0.5) / 0.5; // 0.0 to 1.0
    // Maximum friction bleed up to 180 uu/s deceleration penalty
    frictionBleedPenaltyUu = Number((steerExcess * supersonicExcess * 180.0).toFixed(2));
  }

  const netEffectiveVelocityUu = Math.max(0, Number((clampedVel - frictionBleedPenaltyUu).toFixed(2)));

  return {
    velocityUu: clampedVel,
    maxVelocityUu: maxVel,
    velocityPercentOfMax,
    isSupersonic,
    pSupersonic: Number(pSupersonic.toFixed(4)),
    isFrictionBleeding,
    frictionBleedPenaltyUu,
    netEffectiveVelocityUu
  };
}

