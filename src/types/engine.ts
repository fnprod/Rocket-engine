export const SUPERSONIC_MIN_UU = 2200; // Minimum supersonic speed threshold in Unreal Units/sec
export const SUPERSONIC_MAX_UU = 2300; // Absolute game physics max supersonic speed cap in Unreal Units/sec

export interface PhysicsConfig {
  internalDeadzone: number;     // 0.05
  dodgeDeadzone: number;        // 0.05
  hardwareJitter: number;       // 2 (threshold in raw 0-127 range)
  groundSense: number;          // 1.30
  aerialSense: number;          // 1.50
  precisionMode: number;        // 0.70
  curveExponent: number;        // 1.45
  pollingRateAdj: number;       // 1 ms (1000Hz)
  supersonicVelocity: number;   // 2200 - 2300 uu/s (Unreal Units per second)
}

export interface KeyBinding {
  id: string;
  action: string;
  actionAr: string;
  key: string;
  hardwareDevice: 'keyboard' | 'mouse' | 'logitech_gkey';
  category: 'movement' | 'aerial' | 'powerslide_boost' | 'camera' | 'logitech_g';
  layer: number; // 0 = default primary
  description?: string;
  gKeyMapping?: string; // G1, G2, G3, G4, MB4, MB5
}

export interface MacroTimingConfig {
  fastAerial: {
    firstJumpSleep: number;
    backReleaseSleep: number;
    secondJumpSleep: number;
    forwardFlipDelay: number;
    flipCancelHold: number;
  };
  forwardSpeedflip: {
    firstJumpSleep: number;
    delayBeforeSecond: number;
    cancelHold: number;
  };
  leftSpeedflip: {
    firstJumpSleep: number;
    delayBeforeSecond: number;
    cancelHold: number;
  };
  rightSpeedflip: {
    firstJumpSleep: number;
    delayBeforeSecond: number;
    cancelHold: number;
  };
  mouseSpeedflip: {
    firstJumpSleep: number;
    delayBeforeSecond: number;
    cancelHold: number;
  };
  chainDash: {
    jump1Sleep: number;
    fallDelay: number;
    jump2Sleep: number;
    releaseDelay: number;
  };
}

export interface GameProfile {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  configPath: string;
  gameExePath: string;
  launchProtocol: string;
  description: string;
  tier: 'Competitive 1v1' | 'RLCS 3v3' | 'Freestyle Mechanics' | 'Custom';
  deadzoneOverride: number;
  aerialSenseOverride: number;
  powershellCommand?: string;
  customBindings: Record<string, string>;
}

export interface LiquipediaProPlayer {
  id: string;
  tag: string;
  realName: string;
  team: string;
  region: string;
  controller: string;
  deadzone: number;
  dodgeDeadzone: number;
  steeringSensitivity: number;
  aerialSensitivity: number;
  camera: {
    fov: number;
    distance: number;
    height: number;
    angle: number;
    stiffness: number;
    swivelSpeed: number;
    transitionSpeed: number;
  };
  bindings: {
    boost: string;
    jump: string;
    powerslide: string;
    airRollLeft: string;
    airRollRight: string;
    ballCam: string;
  };
  liquipediaUrl: string;
  verifiedTop100: boolean;
}

export interface ReplayFrame {
  tick: number;
  timeSec: number;
  inputs: {
    throttle: number; // -1.0 to 1.0
    steer: number; // -1.0 to 1.0
    pitch: number; // -1.0 to 1.0
    yaw: number; // -1.0 to 1.0
    roll: number; // -1.0 to 1.0
    boost: boolean; // G1
    jump: boolean; // G2
    ballCam: boolean; // Space
    powerslide: boolean; // Handbrake
    airRollLeft: boolean;
    airRollRight: boolean;
    rearView: boolean; // G3
  };
  physics: {
    velocityUu: number; // 0 to 2300 uu/s
    isSupersonic: boolean; // >= 2200 uu/s
    angularVelocity: number; // deg/s
    wheelsOnGround: [boolean, boolean, boolean, boolean];
    hasFlipReset: boolean;
    flipTimerRemaining: number;
  };
  matchedBinding: string;
  syncStatus: 'perfect' | 'sync_delay' | 'unmapped';
}

export interface SynchronicityReport {
  overallScore: number; // 0-100%
  inputCount: number;
  keybindFidelity: number; // 0-100%
  deadzoneFidelity: number; // 0-100%
  supersonicFidelity: number; // 0-100%
  averageLatencyMs: number;
  jitterVarianceMs: number;
  commandMappings: Array<{
    sourceInput: string;
    taInputCommand: string;
    status: 'matched' | 'warning' | 'calibrated';
    latencyMs: number;
    details: string;
  }>;
  diagnostics: string[];
}

export interface ReplayMetadata {
  id: string;
  matchName: string;
  date: string;
  durationSeconds: number;
  mapName: string;
  playlist: 'Ranked 1v1' | 'Ranked 2v2' | 'Ranked 3v3' | 'RLCS Tournament' | 'Custom Scrim';
  result: 'VICTORY' | 'DEFEAT';
  score: string;
  averageVelocityUu: number;
  supersonicPercent: number; // percentage of time at 2200-2300 uu/s
  boostEfficiencyPercent: number;
  aerialCount: number;
  speedflipCount: number;
  waveDashCount: number;
  flipResetsAttempted: number;
  flipResetsLanded: number;
  extractedCommands: string[];
  correlationRate: number; // 0-100% correlation with TAInput.ini
  frames?: ReplayFrame[];
  syncReport?: SynchronicityReport;
  fileSizeBytes?: number;
  engineVersion?: number;
  licenseeVersion?: number;
}

export interface LiveTelemetryState {
  velocityUu: number; // 0 to 2300 uu/s
  isSupersonic: boolean; // true if velocityUu >= 2200
  boostPercent: number; // 0 - 100
  throttleInput: number; // -1.0 to 1.0
  steerInput: number; // -1.0 to 1.0
  pitchInput: number; // -1.0 to 1.0
  yawInput: number; // -1.0 to 1.0
  rollInput: number; // -1.0 to 1.0
  wheelsOnGround: [boolean, boolean, boolean, boolean]; // FL, FR, RL, RR
  flipTimerRemaining: number; // 0 to 1.45 seconds remaining for second jump
  hasFlipReset: boolean;
  activeKeyStrokes: string[];
  pingMs: number;
  fps: number;
}

export interface ClipBookmark {
  id: string;
  timestamp: string;
  gameTime: string;
  note: string;
  speedUu: number;
  actionSequence: string;
}

export type ActiveTab = 
  | 'classic_pro'         // المحرك الكلاسيكي المعتمد (المحرك الرئيسي)
  | 'unreal_symmetric'    // محرك إنريل المتناظر 1:-1
  | 'layer0'              // كيبورد زيرو DirectInput
  | 'unified_radar'       // رادار المتجهات وفيزياء الحركات الحية (Polar Scope + Codex + D3 Drift + Live Telemetry)
  | 'macros'              // الماكرو الشامل الموحد
  | 'replay_analyzer'     // تحليل الريبلاي والذكاء الاصطناعي
  | 'ballchasing_cloud'   // سحابة Ballchasing.com والمزامنة
  | 'history_audit'       // سجل التعديلات والعمليات الكامل
  | 'profiles'            // بروفايلات الألعاب ومراقبة الهاردوير
  | 'gaming_profiles'     // بروفايلات الألعاب ومراقبة الهاردوير
  | 'cpp_lua_studio'      // محركات C++ الخمسة وبيئة Lua 5.4 المتقدمة
  | 'liquipedia'          // مزامنة Liquipedia
  | 'physics'             // Alias for classic_pro
  | 'streamer_overlay'    // Alias for unified_radar
  | 'mechanics';          // Alias for unified_radar

export interface PolarVectorPoint {
  angleDeg: number;
  radius: number; // 0.0 to 1.0 normalized magnitude
  steer: number;  // [-1.0, +1.0]
  pitch: number;  // [-1.0, +1.0]
  roll: number;   // [-1.0, +1.0]
  timestampMs: number;
}

export interface SupersonicBandState {
  velocityUu: number;
  maxVelocityUu: number;
  velocityPercentOfMax: number; // 2200 / 2300 = 0.9565 (95.65%)
  isSupersonic: boolean;        // velocity >= 2200
  pSupersonic: number;          // clamp((v - 2200) / (2300 - 2200), 0.0, 1.0)
  steerDeflection: number;      // [-1.0, +1.0]
  isFrictionBleeding: boolean;  // |steer| > 0.8 and pSupersonic > 0.5
  frictionBleedPenaltyUu: number;
  netEffectiveVelocityUu: number;
}

export interface RLMechanicTimingConfig {
  firstJumpSleepMs: number;
  secondJumpDelayMs: number;
  cancelHoldMs: number;
  airRollDurationMs: number;
  powerslideDurationMs: number;
}

export interface RLMechanicItem {
  id: string;
  name: string;
  nameAr: string;
  category: 'Kickoffs' | 'Aerials' | 'Flicks' | 'Recoveries';
  difficulty: 'Standard' | 'Advanced' | 'Pro RLCS' | 'Grand Champion';
  targetAngleDeg: number;
  angleToleranceDeg: [number, number]; // [min, max]
  crossAxisTorqueLeakageMaxPercent: number; // e.g. 5.0%
  optimalVelocityUu: number;
  description: string;
  descriptionAr: string;
  keySequence: string[];
  timings: RLMechanicTimingConfig;
  videoPath: string;
  polarSampleTrace: Array<{ steer: number; pitch: number; roll: number }>;
}

export type Language = 'ar' | 'en';

export type OverlayBackgroundMode = 'transparent' | 'chroma_green' | 'chroma_magenta' | 'cyber_dark';
export type OverlayLayoutMode = 'broadcast_full' | 'compact_hud' | 'streamer_minimal';
export type OverlayTickRate = 60 | 120 | 240 | 1000;

export interface StreamerOverlayPhysicsState {
  velocityUu: number;
  isSupersonic: boolean;
  boostPercent: number;
  throttle: number;
  steer: number;
  steerCurved: number;
  pitch: number;
  yaw: number;
  roll: number;
  wheelsOnGround: [boolean, boolean, boolean, boolean];
  allWheelsContact: boolean;
  hasFlipReset: boolean;
  flipTimerRemaining: number;
  angularRateDegSec: number;
  gForce: number;
  latencyMs: number;
  jitterMs: number;
  tickRateHz: OverlayTickRate;
  directBindingActive: boolean;
  activeKeys: string[];
}


