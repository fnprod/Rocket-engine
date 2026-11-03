import { PhysicsConfig } from '../types/engine';
import { CLASSIC_ESPORTS_PHYSICS_CONFIG, UNREAL_SYMMETRIC_PHYSICS_CONFIG } from '../data/initialData';

export interface ComparatorPhysicsConfig {
  id: string;
  name: string;
  nameAr: string;
  // Drag parameters
  dragCoefficient: number; // Linear drag coefficient k (0.010 - 0.100, standard RL ~0.030)
  terminalVelocityUu: number; // Supersonic cap (2200 - 2300 uu/s)
  // Gravity parameters
  gravityZ: number; // Gravity in uu/s² (negative, standard RL is -650 uu/s²)
  initialJumpVelocity: number; // First jump impulse in uu/s (standard RL ~292 uu/s)
  // Throttle parameters
  maxDriveSpeedUu: number; // Base throttle cap without boost in uu/s (standard RL 1410 uu/s)
  groundSense: number; // Ground throttle sensitivity multiplier (e.g. 1.30 - 1.70)
  curveExponent: number; // Input response curve power (e.g. 1.10 - 1.60)
  internalDeadzone: number; // Input deadzone (e.g. 0.02 - 0.08)
  hardwareJitter: number; // Jitter threshold filter (e.g. 2 - 20)
}

export const COMPARATOR_PRESETS: ComparatorPhysicsConfig[] = [
  {
    id: 'classic_pro',
    name: 'Classic Esports Pro Standard',
    nameAr: 'الوضع الأصلي الكلاسيكي المعتمد (RLCS Pro)',
    dragCoefficient: 0.030,
    terminalVelocityUu: 2300,
    gravityZ: -650,
    initialJumpVelocity: 292,
    maxDriveSpeedUu: 1410,
    groundSense: 1.50,
    curveExponent: 1.45,
    internalDeadzone: 0.05,
    hardwareJitter: 2,
  },
  {
    id: 'unreal_symmetric',
    name: 'Unreal 1/-1 Symmetric Rapid Snap',
    nameAr: 'ريل إنجين المتناظر الديناميكي (Unreal 1/-1)',
    dragCoefficient: 0.022,
    terminalVelocityUu: 2300,
    gravityZ: -650,
    initialJumpVelocity: 292,
    maxDriveSpeedUu: 1410,
    groundSense: 1.50,
    curveExponent: 1.35,
    internalDeadzone: 0.02,
    hardwareJitter: 20,
  },
  {
    id: 'low_gravity_freestyle',
    name: 'Low-Gravity Freestyle Floater',
    nameAr: 'الجاذبية المنخفضة للفري ستايل (Low-G Floater)',
    dragCoefficient: 0.015,
    terminalVelocityUu: 2300,
    gravityZ: -325, // 50% gravity
    initialJumpVelocity: 292,
    maxDriveSpeedUu: 1410,
    groundSense: 1.40,
    curveExponent: 1.25,
    internalDeadzone: 0.03,
    hardwareJitter: 5,
  },
  {
    id: 'heavy_drag_scrim',
    name: 'Heavy Drag Atmosphere (High Resistance)',
    nameAr: 'مقاومة هواء وثقل مكثف (Heavy Drag)',
    dragCoefficient: 0.065,
    terminalVelocityUu: 2200,
    gravityZ: -800,
    initialJumpVelocity: 280,
    maxDriveSpeedUu: 1350,
    groundSense: 1.60,
    curveExponent: 1.55,
    internalDeadzone: 0.06,
    hardwareJitter: 2,
  },
  {
    id: 'kickoff_burst',
    name: 'Instant Twitch Kickoff (Flat 1.05 Exponent)',
    nameAr: 'استجابة الانطلاق الفوري للكيك أوف (Kickoff Burst)',
    dragCoefficient: 0.025,
    terminalVelocityUu: 2300,
    gravityZ: -650,
    initialJumpVelocity: 300,
    maxDriveSpeedUu: 1410,
    groundSense: 1.70,
    curveExponent: 1.05,
    internalDeadzone: 0.01,
    hardwareJitter: 1,
  },
];

/**
 * Converts a standard PhysicsConfig into a ComparatorPhysicsConfig.
 */
export function configToComparatorConfig(
  base: PhysicsConfig,
  id: string = 'custom_current',
  name: string = 'Current Engine Config',
  nameAr: string = 'إعدادات المحرك الحالية'
): ComparatorPhysicsConfig {
  const isUnreal = base.curveExponent === 1.35 && base.internalDeadzone === 0.02;
  return {
    id,
    name,
    nameAr,
    dragCoefficient: isUnreal ? 0.022 : 0.030,
    terminalVelocityUu: base.supersonicVelocity || 2300,
    gravityZ: -650,
    initialJumpVelocity: 292,
    maxDriveSpeedUu: 1410,
    groundSense: base.groundSense,
    curveExponent: base.curveExponent,
    internalDeadzone: base.internalDeadzone,
    hardwareJitter: base.hardwareJitter,
  };
}

/**
 * Converts a ComparatorPhysicsConfig back into standard PhysicsConfig for engine application.
 */
export function comparatorConfigToEngineConfig(
  comp: ComparatorPhysicsConfig,
  current: PhysicsConfig
): PhysicsConfig {
  return {
    ...current,
    internalDeadzone: comp.internalDeadzone,
    curveExponent: comp.curveExponent,
    groundSense: comp.groundSense,
    hardwareJitter: comp.hardwareJitter,
    supersonicVelocity: comp.terminalVelocityUu,
  };
}

/* -------------------------------------------------------------------------- */
/*                               DRAG DYNAMICS                                */
/* -------------------------------------------------------------------------- */

export interface DragPoint {
  velocityUu: number; // 0 to 2300 uu/s
  dragDecelUu: number; // Opposing deceleration in uu/s²
  dragForceRel: number; // Relative percentage
  speedKph: number;
}

/**
 * Calculates aerodynamic deceleration opposing forward motion:
 * a_drag(v) = k_drag * v + (1.5e-5) * v^2
 */
export function calculateDragDecel(vUu: number, dragCoeff: number): number {
  if (vUu <= 0) return 0;
  const linear = dragCoeff * vUu;
  const quadratic = 0.000015 * vUu * vUu;
  return Number((linear + quadratic).toFixed(2));
}

/**
 * Generates sample curve points for drag visualization across 0 to 2300 uu/s.
 */
export function generateDragCurve(
  config: ComparatorPhysicsConfig,
  steps: number = 50
): DragPoint[] {
  const points: DragPoint[] = [];
  const maxV = config.terminalVelocityUu || 2300;
  for (let i = 0; i <= steps; i++) {
    const v = (i / steps) * maxV;
    const dragDecel = calculateDragDecel(v, config.dragCoefficient);
    points.push({
      velocityUu: Math.round(v),
      dragDecelUu: dragDecel,
      dragForceRel: Number((dragDecel / calculateDragDecel(2300, 0.030) * 100).toFixed(1)),
      speedKph: Number((v * 0.036).toFixed(1)), // 1 uu/s = 0.036 km/h
    });
  }
  return points;
}

/**
 * Estimates coastdown time from supersonic (2300 uu/s) to max non-boost drive (1410 uu/s).
 */
export function calculateCoastdownTime(
  vStart: number = 2300,
  vTarget: number = 1410,
  dragCoeff: number = 0.030
): number {
  if (vStart <= vTarget) return 0;
  let t = 0;
  let v = vStart;
  const dt = 0.01;
  while (v > vTarget && t < 10) {
    const decel = calculateDragDecel(v, dragCoeff);
    v -= decel * dt;
    t += dt;
  }
  return Number(t.toFixed(2));
}

/* -------------------------------------------------------------------------- */
/*                            GRAVITY & TRAJECTORY                            */
/* -------------------------------------------------------------------------- */

export interface GravityTrajectoryPoint {
  timeSec: number; // 0 to hangtime
  heightUu: number; // y(t)
  verticalVelocityUu: number; // v_y(t)
}

/**
 * Calculates jump trajectory kinematics:
 * Apex height: h_max = v0^2 / (2 * |g|)
 * Hangtime: t_hang = 2 * v0 / |g|
 */
export function calculateJumpMetrics(
  initialJumpV: number,
  gravityZ: number
): {
  apexHeightUu: number;
  timeToApexSec: number;
  hangtimeSec: number;
  gravityScaleVsEarth: number;
} {
  const gMag = Math.max(10, Math.abs(gravityZ));
  const timeToApex = initialJumpV / gMag;
  const apexHeight = (initialJumpV * initialJumpV) / (2 * gMag);
  const hangtime = 2 * timeToApex;
  const gravityScaleVsEarth = Number((gMag / 650).toFixed(2));

  return {
    apexHeightUu: Number(apexHeight.toFixed(2)),
    timeToApexSec: Number(timeToApex.toFixed(3)),
    hangtimeSec: Number(hangtime.toFixed(3)),
    gravityScaleVsEarth,
  };
}

/**
 * Generates trajectory points y(t) = v0*t + 0.5*g*t^2 until vehicle lands.
 */
export function generateJumpTrajectory(
  config: ComparatorPhysicsConfig,
  durationSec: number = 1.2,
  steps: number = 50
): GravityTrajectoryPoint[] {
  const points: GravityTrajectoryPoint[] = [];
  const g = config.gravityZ; // negative
  const v0 = config.initialJumpVelocity;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * durationSec;
    const y = Math.max(0, v0 * t + 0.5 * g * t * t);
    const vy = v0 + g * t;
    points.push({
      timeSec: Number(t.toFixed(3)),
      heightUu: Number(y.toFixed(2)),
      verticalVelocityUu: Number(vy.toFixed(2)),
    });
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/*                              THROTTLE SCALING                              */
/* -------------------------------------------------------------------------- */

export interface ThrottleInputPoint {
  rawInput: number; // 0.0 to 1.0 (or -1.0 to 1.0)
  effectiveThrottle: number; // After deadzone, exponent, groundSense
  driveAccelUu: number; // Ground acceleration at rest in uu/s²
}

/**
 * Calculates effective throttle output based on deadzone, non-linear exponent, and groundSense.
 */
export function evaluateThrottleScaling(
  inputNorm: number, // 0.0 to 1.0
  deadzone: number,
  exponent: number,
  groundSense: number
): {
  effectiveThrottle: number;
  inDeadzone: boolean;
  driveAccelUu: number;
} {
  const mag = Math.min(1.0, Math.max(0.0, Math.abs(inputNorm)));
  if (mag <= deadzone) {
    return {
      effectiveThrottle: 0,
      inDeadzone: true,
      driveAccelUu: 0,
    };
  }

  const activeRange = 1.0 - deadzone;
  const deflection = activeRange > 0 ? (mag - deadzone) / activeRange : 0;
  const curved = Math.pow(deflection, exponent);
  const effectiveThrottle = Number((curved * groundSense).toFixed(3));
  // Base zero-speed drive acceleration in RL is ~1600 uu/s²
  const driveAccel = Number((effectiveThrottle * 1600).toFixed(1));

  return {
    effectiveThrottle,
    inDeadzone: false,
    driveAccelUu: driveAccel,
  };
}

/**
 * Generates curve points for throttle input 0.0 to 1.0.
 */
export function generateThrottleCurve(
  config: ComparatorPhysicsConfig,
  steps: number = 50
): ThrottleInputPoint[] {
  const points: ThrottleInputPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const inp = i / steps;
    const res = evaluateThrottleScaling(
      inp,
      config.internalDeadzone,
      config.curveExponent,
      config.groundSense
    );
    points.push({
      rawInput: Number(inp.toFixed(2)),
      effectiveThrottle: res.effectiveThrottle,
      driveAccelUu: res.driveAccelUu,
    });
  }
  return points;
}

/**
 * Calculates estimated 0-100 kph (0 to 777.78 uu/s) acceleration time.
 */
export function calculateZeroToHundredTime(
  config: ComparatorPhysicsConfig
): number {
  const targetV = 777.78; // 100 km/h in uu/s
  const vMax = config.maxDriveSpeedUu || 1410;
  const a0 = 1600 * config.groundSense;

  if (targetV >= vMax || a0 <= 0) return 9.99;

  let t = 0;
  let v = 0;
  const dt = 0.01;
  while (v < targetV && t < 10) {
    // a(v) = a0 * (1 - v / vMax) - a_drag(v)
    const driveA = Math.max(0, a0 * (1 - v / vMax));
    const dragA = calculateDragDecel(v, config.dragCoefficient);
    const netA = Math.max(10, driveA - dragA);
    v += netA * dt;
    t += dt;
  }
  return Number(t.toFixed(2));
}

/* -------------------------------------------------------------------------- */
/*                           COMPARATOR OVERLAY DELTA                         */
/* -------------------------------------------------------------------------- */

export interface PhysicsComparisonSummary {
  dragDeltaPercent: number; // Config B drag vs Config A drag at max speed
  coastdownDeltaSec: number;
  hangtimeDeltaMs: number; // Config B hangtime - Config A hangtime
  apexDeltaUu: number;
  zeroToHundredDeltaSec: number;
  maxThrottleResponseDelta: number;
}

export function computePhysicsComparisonSummary(
  configA: ComparatorPhysicsConfig,
  configB: ComparatorPhysicsConfig
): PhysicsComparisonSummary {
  // Drag comparison at 2300 uu/s
  const dragA = calculateDragDecel(2300, configA.dragCoefficient);
  const dragB = calculateDragDecel(2300, configB.dragCoefficient);
  const dragDeltaPercent = dragA > 0 ? Number(((dragB - dragA) / dragA * 100).toFixed(1)) : 0;

  // Coastdown
  const coastA = calculateCoastdownTime(2300, 1410, configA.dragCoefficient);
  const coastB = calculateCoastdownTime(2300, 1410, configB.dragCoefficient);
  const coastdownDeltaSec = Number((coastB - coastA).toFixed(2));

  // Jump metrics
  const jumpA = calculateJumpMetrics(configA.initialJumpVelocity, configA.gravityZ);
  const jumpB = calculateJumpMetrics(configB.initialJumpVelocity, configB.gravityZ);
  const hangtimeDeltaMs = Math.round((jumpB.hangtimeSec - jumpA.hangtimeSec) * 1000);
  const apexDeltaUu = Number((jumpB.apexHeightUu - jumpA.apexHeightUu).toFixed(1));

  // Throttle
  const accelTimeA = calculateZeroToHundredTime(configA);
  const accelTimeB = calculateZeroToHundredTime(configB);
  const zeroToHundredDeltaSec = Number((accelTimeB - accelTimeA).toFixed(2));

  // Full throttle response
  const maxThrotA = evaluateThrottleScaling(1.0, configA.internalDeadzone, configA.curveExponent, configA.groundSense).effectiveThrottle;
  const maxThrotB = evaluateThrottleScaling(1.0, configB.internalDeadzone, configB.curveExponent, configB.groundSense).effectiveThrottle;
  const maxThrottleResponseDelta = Number((maxThrotB - maxThrotA).toFixed(2));

  return {
    dragDeltaPercent,
    coastdownDeltaSec,
    hangtimeDeltaMs,
    apexDeltaUu,
    zeroToHundredDeltaSec,
    maxThrottleResponseDelta,
  };
}
