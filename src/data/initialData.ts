import { PhysicsConfig, KeyBinding, MacroTimingConfig, GameProfile } from '../types/engine';

/**
 * Mode 1: Classic Esports Pro Standard Configuration (Preferred by user before the last modification)
 * - Internal Deadzone: 0.05 (12 units)
 * - Dodge/Flip Deadzone: 0.05
 * - Hardware Jitter Filter: ±2 units
 * - Response Curve Exponent: 1.45 (Esport pro standard non-linear)
 * - Ground Sense: 1.50x
 * - Aerial Sense: 1.30x
 * - Polling Rate: 1 ms (1000Hz)
 */
export const CLASSIC_ESPORTS_PHYSICS_CONFIG: PhysicsConfig = {
  internalDeadzone: 0.05,
  dodgeDeadzone: 0.05,
  hardwareJitter: 2,
  groundSense: 1.50,
  aerialSense: 1.30,
  precisionMode: 0.70,
  curveExponent: 1.45,
  pollingRateAdj: 1,
  supersonicVelocity: 2200,
};

/**
 * Mode 2: Unreal Engine 1/-1 Dynamic Symmetric Configuration (Advanced secondary mode)
 * - Internal Deadzone: 0.02 (Fast snap response)
 * - Dodge/Flip Deadzone: 0.05
 * - Hardware Jitter Filter: ±20 units
 * - Response Curve Exponent: 1.35
 * - Ground Sense: 1.50x
 * - Aerial Sense: 1.30x
 * - Bipolar 1/-1 symmetric dynamic rescaling: D (+1.0) / A (-1.0); E (+1.0) / Q (-1.0)
 */
export const UNREAL_SYMMETRIC_PHYSICS_CONFIG: PhysicsConfig = {
  internalDeadzone: 0.02,
  dodgeDeadzone: 0.05,
  hardwareJitter: 20,
  groundSense: 1.50,
  aerialSense: 1.30,
  precisionMode: 0.70,
  curveExponent: 1.35,
  pollingRateAdj: 1,
  supersonicVelocity: 2200,
};

export const INITIAL_PHYSICS_CONFIG: PhysicsConfig = CLASSIC_ESPORTS_PHYSICS_CONFIG;


export const INITIAL_KEYBINDINGS: KeyBinding[] = [
  // Layer 0 Keyboard keys
  { 
    id: 'forward', 
    action: 'Throttle / Pitch Down', 
    actionAr: 'التقدم للأمام / دواسة السرعة', 
    key: 'W', 
    hardwareDevice: 'keyboard', 
    category: 'movement', 
    layer: 0, 
    description: 'Ground throttle & air pitch down' 
  },
  { 
    id: 'back', 
    action: 'Reverse / Brake / Pitch Up', 
    actionAr: 'الرجوع للخلف / الفرملة / رفع الأنف', 
    key: 'S', 
    hardwareDevice: 'keyboard', 
    category: 'movement', 
    layer: 0, 
    description: 'Brakes & air pitch up' 
  },
  { 
    id: 'left', 
    action: 'Steer Left / Yaw Left', 
    actionAr: 'الانعطاف يساراً / دوران محوري', 
    key: 'A', 
    hardwareDevice: 'keyboard', 
    category: 'movement', 
    layer: 0, 
    description: 'Steering left & aerial yaw' 
  },
  { 
    id: 'right', 
    action: 'Steer Right / Yaw Right', 
    actionAr: 'الانعطاف يميناً / دوران محوري', 
    key: 'D', 
    hardwareDevice: 'keyboard', 
    category: 'movement', 
    layer: 0, 
    description: 'Steering right & aerial yaw' 
  },
  { 
    id: 'powerslide', 
    action: 'Powerslide / Drift', 
    actionAr: 'الانجراف / درفت (Powerslide)', 
    key: 'LAlt', 
    hardwareDevice: 'keyboard', 
    category: 'powerslide_boost', 
    layer: 0, 
    description: 'Sharp handbrake turns & recovery' 
  },
  { 
    id: 'airroll_l', 
    action: 'Air Roll Left', 
    actionAr: 'الدوران الجوي لليسار (Air Roll Left)', 
    key: 'Q', 
    hardwareDevice: 'keyboard', 
    category: 'aerial', 
    layer: 0, 
    description: 'Directional roll left' 
  },
  { 
    id: 'airroll_r', 
    action: 'Air Roll Right', 
    actionAr: 'الدوران الجوي لليمين (Air Roll Right)', 
    key: 'E', 
    hardwareDevice: 'keyboard', 
    category: 'aerial', 
    layer: 0, 
    description: 'Directional roll right' 
  },
  // SPACE is strictly Camera Switch / Ball Cam Toggle
  { 
    id: 'ballcam', 
    action: 'Switch Camera / Ball Cam Toggle', 
    actionAr: 'تبديل الكاميرا (Switch / Ball Cam)', 
    key: 'SPACE', 
    hardwareDevice: 'keyboard', 
    category: 'camera', 
    layer: 0, 
    description: 'Primary camera focus switch' 
  },

  // Logitech G-Key & Mouse Hardware assigned actions (per user requirements)
  { 
    id: 'boost', 
    action: 'Supersonic Boost (Logitech G1)', 
    actionAr: 'التيربو الصاروخي (Logitech G1 Boost)', 
    key: 'G1', 
    hardwareDevice: 'logitech_gkey', 
    category: 'logitech_g', 
    layer: 0, 
    description: 'Supersonic boost 2200-2300 uu/s assigned to G1',
    gKeyMapping: 'G1' 
  },
  { 
    id: 'jump', 
    action: 'Jump / Dodge / Flip (Logitech G2)', 
    actionAr: 'القفز والمراوغة (Logitech G2 Jump)', 
    key: 'G2', 
    hardwareDevice: 'logitech_gkey', 
    category: 'logitech_g', 
    layer: 0, 
    description: 'Primary launch jump and dodge trigger on G2',
    gKeyMapping: 'G2' 
  },
  { 
    id: 'lookback', 
    action: 'Rear View Camera (Logitech G3 / MMB)', 
    actionAr: 'كاميرا الرؤية الخلفية (G3 / زر الماوس الأوسط)', 
    key: 'G3 (MB3)', 
    hardwareDevice: 'mouse', 
    category: 'camera', 
    layer: 0, 
    description: 'Instant backwards camera check on middle click / G3',
    gKeyMapping: 'G3' 
  },
  { 
    id: 'mouse_speedflip', 
    action: 'Mouse Speedflip + Slide (MB4)', 
    actionAr: 'سبيد فليب الماوس مع درفت (MB4)', 
    key: 'MB4', 
    hardwareDevice: 'mouse', 
    category: 'logitech_g', 
    layer: 0, 
    description: 'Thumb mouse speedflip with auto-cancel and powerslide',
    gKeyMapping: 'MB4' 
  },
  { 
    id: 'mouse_chaindash', 
    action: 'Chain Dash / Aerial Wave (MB5)', 
    actionAr: 'تشين داش وسرعة جوية (MB5)', 
    key: 'MB5', 
    hardwareDevice: 'mouse', 
    category: 'logitech_g', 
    layer: 0, 
    description: 'Rapid ground chain dash and wave dash recovery',
    gKeyMapping: 'MB5' 
  },

  // Layer 1: Directional Air Roll (DAR) & High-Agility Aerials
  {
    id: 'kb_q_airroll_left',
    action: 'Air Roll Left (DAR Left)',
    actionAr: 'دوران جوي موجه لليسار',
    key: 'Q',
    hardwareDevice: 'keyboard',
    category: 'aerial',
    layer: 1,
    description: 'DirectInput 0x10 (DIK_Q) - Symmetrical Roll -1.0'
  },
  {
    id: 'kb_e_airroll_right',
    action: 'Air Roll Right (DAR Right)',
    actionAr: 'دوران جوي موجه لليمين',
    key: 'E',
    hardwareDevice: 'keyboard',
    category: 'aerial',
    layer: 1,
    description: 'DirectInput 0x12 (DIK_E) - Symmetrical Roll +1.0'
  },
  {
    id: 'kb_f_freeroll',
    action: 'Free Air Roll Modifier',
    actionAr: 'معدل الدوران الجوي الحر',
    key: 'F',
    hardwareDevice: 'keyboard',
    category: 'aerial',
    layer: 1,
    description: 'DirectInput 0x21 (DIK_F) - Variable Kinematic Air Roll'
  },

  // Layer 2: Fast Recovery, Powerslide & Flip Cancel
  {
    id: 'kb_alt_handbrake',
    action: 'Powerslide / Drift Handbrake',
    actionAr: 'فرامل الانزلاق والتفحيط',
    key: 'LALT',
    hardwareDevice: 'keyboard',
    category: 'powerslide_boost',
    layer: 2,
    description: 'DirectInput 0x38 (DIK_LMENU) - Friction Coefficient Damping'
  },
  {
    id: 'kb_ctrl_pitch_cancel',
    action: 'Flip-Cancel Counter Torque',
    actionAr: 'إلغاء الفليب وتثبيت الهبوط',
    key: 'LCTRL',
    hardwareDevice: 'keyboard',
    category: 'movement',
    layer: 2,
    description: 'DirectInput 0x1D (DIK_LCONTROL) - Rapid Pitch Inversion'
  },
  {
    id: 'kb_z_rearview',
    action: 'Rear Camera Lookback',
    actionAr: 'نظرة خلفية سريعة',
    key: 'Z',
    hardwareDevice: 'keyboard',
    category: 'camera',
    layer: 2,
    description: 'DirectInput 0x2C (DIK_Z) - Inverted Camera Frustum'
  }
];

export const INITIAL_MACRO_TIMINGS: MacroTimingConfig = {
  fastAerial: {
    firstJumpSleep: 200,
    backReleaseSleep: 30,
    secondJumpSleep: 30,
    forwardFlipDelay: 20,
    flipCancelHold: 180,
  },
  forwardSpeedflip: {
    firstJumpSleep: 30,
    delayBeforeSecond: 30,
    cancelHold: 550,
  },
  leftSpeedflip: {
    firstJumpSleep: 30,
    delayBeforeSecond: 30,
    cancelHold: 600,
  },
  rightSpeedflip: {
    firstJumpSleep: 30,
    delayBeforeSecond: 30,
    cancelHold: 600,
  },
  mouseSpeedflip: {
    firstJumpSleep: 35,
    delayBeforeSecond: 45,
    cancelHold: 600,
  },
  chainDash: {
    jump1Sleep: 30,
    fallDelay: 60,
    jump2Sleep: 30,
    releaseDelay: 50,
  },
};

// Unified Single Master Profile (All other separate/extra profiles removed per user requirement)
export const INITIAL_GAME_PROFILES: GameProfile[] = [
  {
    id: 'my_unified_profile',
    name: 'My Master Esports Profile',
    nameAr: 'بروفايلي الشخصي الموحد (My Unified Master Profile)',
    icon: 'shield',
    tier: 'RLCS 3v3',
    configPath: '%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Config\\TAInput.ini',
    gameExePath: 'C:\\Program Files\\Epic Games\\rocketleague\\Binaries\\Win64\\RocketLeague.exe',
    launchProtocol: 'com.epicgames.launcher://apps/Sugar?action=launch&silent=true',
    description: 'Personal master profile permanently bound to 1.50x Ground / 1.30x Aerial sensitivity, 0.05 Deadzone, 1.45 Exponent, and 1000Hz polling rate.',
    deadzoneOverride: 0.05,
    aerialSenseOverride: 1.30,
    powershellCommand: `powershell -Command "Set-Content -Path '%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Config\\TAInput.ini' -Value (Get-Content -Raw -Path './TAInput.ini') -Encoding UTF8"`,
    customBindings: {},
  }
];

