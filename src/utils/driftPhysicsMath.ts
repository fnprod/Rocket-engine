import { PhysicsConfig } from '../types/engine';

export interface DriftDataPoint {
  velocityUu: number;
  speedKph: number;
  gripAngleDeg: number;       // Drift angle under regular grip turn (typically 2° - 12°)
  powerslideAngleDeg: number; // Drift angle under powerslide (15° - 80°)
  optimalMinAngleDeg: number; // Lower boundary of optimal high-speed maneuvering zone
  optimalMaxAngleDeg: number; // Upper boundary of optimal high-speed maneuvering zone
  turningRadiusUu: number;    // Turning radius in Unreal Units
  lateralAccelG: number;      // Lateral acceleration in Gs (v^2 / (R * g))
  yawRateDegPerSec: number;   // Angular yaw rate
  speedRetentionPct: number;  // Velocity conservation efficiency %
}

export interface DriftManeuverConfig {
  steerInput: number;         // 0.1 to 1.0 (default 1.0 full lock)
  powerslideDuration: number; // 0.1s to 1.0s (default 0.35s tap)
  groundSensitivity: number;  // Ground sense multiplier (e.g. 1.30 to 1.70)
  curveExponent: number;      // Response curve exponent
  internalDeadzone: number;   // Steering deadzone
}

/**
 * Calculates Rocket League turning radius as an empirical function of velocity:
 * At low velocity: R is tight (~250-450 uu).
 * At high velocity: R widens (~1400-2400 uu) due to aerodynamic and tire grip limits.
 */
export function calculateTurnRadius(velocityUu: number, steerInput: number = 1.0, isPowerslide: boolean = false): number {
  const v = Math.max(10, Math.min(2300, velocityUu));
  const steer = Math.max(0.1, Math.min(1.0, Math.abs(steerInput)));

  // Base grip radius model (Rocket League empirical curve)
  // Low speed: R ~ 250 uu; High speed (1410 uu/s): R ~ 1150 uu; Supersonic (2300 uu/s): R ~ 2200 uu
  const gripRadius = (250 + 0.42 * v + 0.00018 * v * v) / steer;

  if (isPowerslide) {
    // Powerslide cuts turning radius by ~40-60% depending on speed
    const reductionFactor = 0.42 + 0.15 * (v / 2300);
    return Number((gripRadius * reductionFactor).toFixed(1));
  }

  return Number(gripRadius.toFixed(1));
}

/**
 * Calculates drift / slip angle beta(v) in degrees:
 * beta = arctan(v_lateral / v_longitudinal)
 * Under grip: stays small (2° - 10°).
 * Under powerslide: opens up to 25° - 75° based on speed and steer angle.
 */
export function calculateDriftAngle(
  velocityUu: number,
  steerInput: number = 1.0,
  isPowerslide: boolean = false,
  groundSensitivity: number = 1.50
): number {
  const v = Math.max(10, Math.min(2300, velocityUu));
  const steer = Math.max(0.1, Math.min(1.0, Math.abs(steerInput)));
  const senseFactor = Math.min(1.4, Math.max(0.8, groundSensitivity / 1.50));

  if (!isPowerslide) {
    // Normal grip turn: slight tire slip angle increasing with speed and lateral force
    const gripSlip = (2.5 + 4.5 * (v / 1410) + 2.0 * Math.pow(v / 2300, 2)) * steer * senseFactor;
    return Number(Math.min(12, gripSlip).toFixed(1));
  }

  // Powerslide drift angle:
  // Starts around 20° at low speed, peaks around 55°-72° at mid-high speed (800-1600 uu/s),
  // and tapers to 40°-50° at extreme supersonic speeds (2300 uu/s) as longitudinal momentum dominates.
  const normalizedSpeed = v / 2300;
  // Non-linear peak curve using parabolic weighting
  const baseDrift = 22 + 54 * Math.sin(normalizedSpeed * Math.PI * 0.95);
  const totalDrift = baseDrift * steer * senseFactor;

  return Number(Math.min(85, Math.max(15, totalDrift)).toFixed(1));
}

/**
 * Calculates lateral acceleration in G units:
 * a_lat = v^2 / (R * 980)  [where 1 G = 980 uu/s² / Unreal gravity scale]
 */
export function calculateLateralAccelG(velocityUu: number, radiusUu: number): number {
  if (radiusUu <= 0) return 0;
  const aLatUu = (velocityUu * velocityUu) / radiusUu;
  const gForce = aLatUu / 650; // In Rocket League gravity units (650 uu/s² = 1G)
  return Number(gForce.toFixed(2));
}

/**
 * Calculates angular yaw rate in degrees per second:
 * omega = (v / R) * (180 / PI)
 */
export function calculateYawRate(velocityUu: number, radiusUu: number): number {
  if (radiusUu <= 0) return 0;
  const radPerSec = velocityUu / radiusUu;
  const degPerSec = radPerSec * (180 / Math.PI);
  return Number(degPerSec.toFixed(1));
}

/**
 * Calculates speed retention efficiency (%) during the corner:
 * High drift angles (> 60°) bleed significant speed.
 * The sweet spot (28° - 42°) maintains 82% - 92% exit speed.
 */
export function calculateSpeedRetention(driftAngleDeg: number, velocityUu: number): number {
  const angleRad = (driftAngleDeg * Math.PI) / 180;
  // Longitudinal velocity component: v_exit = v * cos(beta) * dragFactor
  const cosComponent = Math.cos(angleRad);
  const dragFactor = velocityUu >= 2200 ? 0.94 : 0.98;
  const retention = cosComponent * dragFactor * 100;
  return Number(Math.max(15, Math.min(98, retention)).toFixed(1));
}

/**
 * Generates data series for D3 plotting of Drift Angle vs Velocity across 0 to 2300 uu/s.
 */
export function generateDriftVelocityCurveData(
  maneuver: DriftManeuverConfig,
  steps: number = 46
): DriftDataPoint[] {
  const points: DriftDataPoint[] = [];
  const maxV = 2300;

  for (let i = 0; i <= steps; i++) {
    const v = Math.round((i / steps) * maxV);
    const speedKph = Number((v * 0.036).toFixed(1));

    const gripAngle = calculateDriftAngle(v, maneuver.steerInput, false, maneuver.groundSensitivity);
    const powerslideAngle = calculateDriftAngle(v, maneuver.steerInput, true, maneuver.groundSensitivity);

    // Optimal maneuvering zone definition:
    // Window where drift angle gives the highest yaw rate with > 75% speed retention
    const optimalMinAngle = Number((24 + 8 * (v / 2300)).toFixed(1));
    const optimalMaxAngle = Number((42 + 10 * (v / 2300)).toFixed(1));

    const radius = calculateTurnRadius(v, maneuver.steerInput, true);
    const lateralG = calculateLateralAccelG(v, radius);
    const yawRate = calculateYawRate(v, radius);
    const speedRetention = calculateSpeedRetention(powerslideAngle, v);

    points.push({
      velocityUu: v,
      speedKph,
      gripAngleDeg: gripAngle,
      powerslideAngleDeg: powerslideAngle,
      optimalMinAngleDeg: optimalMinAngle,
      optimalMaxAngleDeg: optimalMaxAngle,
      turningRadiusUu: radius,
      lateralAccelG: lateralG,
      yawRateDegPerSec: yawRate,
      speedRetentionPct: speedRetention,
    });
  }

  return points;
}

/**
 * Generates comparator drift points comparing Config A vs Config B.
 */
export function generateDualConfigDriftComparison(
  configA: PhysicsConfig,
  configB: PhysicsConfig,
  steerInput: number = 1.0,
  steps: number = 46
): {
  dataA: DriftDataPoint[];
  dataB: DriftDataPoint[];
} {
  const maneuverA: DriftManeuverConfig = {
    steerInput,
    powerslideDuration: 0.35,
    groundSensitivity: configA.groundSense,
    curveExponent: configA.curveExponent,
    internalDeadzone: configA.internalDeadzone,
  };

  const maneuverB: DriftManeuverConfig = {
    steerInput,
    powerslideDuration: 0.35,
    groundSensitivity: configB.groundSense,
    curveExponent: configB.curveExponent,
    internalDeadzone: configB.internalDeadzone,
  };

  return {
    dataA: generateDriftVelocityCurveData(maneuverA, steps),
    dataB: generateDriftVelocityCurveData(maneuverB, steps),
  };
}

export interface TelemetryDriftMetrics {
  velocityUu: number;
  speedKph: number;
  steerInput: number;
  isPowerslide: boolean;
  driftAngle: number;
  gripAngle: number;
  radius: number;
  gripRadius: number;
  lateralG: number;
  yawRate: number;
  speedRetention: number;
  isSupersonic: boolean;
  statusZone: 'OPTIMAL' | 'SPINOUT_RISK' | 'STABLE';
}

/**
 * Pure evaluator that computes vehicle drift/slip kinematics directly from real-time game telemetry stream
 * without allowing manual UI manipulation.
 */
export function evaluateTelemetryDriftMetrics(
  velocityUu: number,
  steerInput: number = 0.75,
  isPowerslide: boolean = false,
  groundSensitivity: number = 1.50
): TelemetryDriftMetrics {
  const v = Math.max(0, Math.min(2300, velocityUu));
  const steer = Math.max(0.1, Math.min(1.0, Math.abs(steerInput)));
  const gripAngle = calculateDriftAngle(v, steer, false, groundSensitivity);
  const driftAngle = calculateDriftAngle(v, steer, isPowerslide, groundSensitivity);
  const radius = calculateTurnRadius(v, steer, isPowerslide);
  const gripRadius = calculateTurnRadius(v, steer, false);
  const lateralG = calculateLateralAccelG(v, radius);
  const yawRate = calculateYawRate(v, radius);
  const speedRetention = calculateSpeedRetention(driftAngle, v);
  const isSupersonic = v >= 2200;

  let statusZone: 'OPTIMAL' | 'SPINOUT_RISK' | 'STABLE' = 'STABLE';
  if (driftAngle >= 25 && driftAngle <= 48) {
    statusZone = 'OPTIMAL';
  } else if (driftAngle > 65) {
    statusZone = 'SPINOUT_RISK';
  }

  return {
    velocityUu: v,
    speedKph: Number((v * 0.036).toFixed(1)),
    steerInput: steer,
    isPowerslide,
    driftAngle,
    gripAngle,
    radius,
    gripRadius,
    lateralG,
    yawRate,
    speedRetention,
    isSupersonic,
    statusZone
  };
}

