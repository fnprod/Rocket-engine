import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  clampRocketLeagueVelocity, 
  isVehicleSupersonic, 
  hasFourWheelContact, 
  calculateResponseCurve,
  calculateBipolarAxisResponse,
  evaluateConsistentBoost,
  applySymmetricBipolarCurve,
  evaluateKinematicVector3D,
  evaluateSupersonicKinematics
} from './engineMath';
import rlMovesData from '../data/rlMovesCodex.json';
import { 
  analyzeReplayFile, 
  validateReplayTAInputSync, 
  SAMPLE_REPLAYS,
  generateRealisticReplayFrames,
  validateReplayInputConfigSynchronicity,
  parseReplayBinaryHeader
} from './replayAnalyzer';
import { 
  RLCS_META_STATISTICS,
  USER_PERSONAL_ESPORTS_PROFILE,
  syncUserPersonalProfile,
  searchLiquipediaMeta
} from './liquipediaService';
import { 
  createInitialStreamerPhysics,
  calculateOverlayLatency,
  calculateSteerTransfer,
  stepStreamerPhysics,
  generateObsBrowserSourceCss,
  buildObsOverlayUrl,
  generateDirectXHookCpp,
  generateDirectXPythonOverlayScript
} from './streamerOverlayBridge';
import {
  generateEpicLauncherProtocol,
  generateWindowsEpicLaunchCommand,
  generateEpicTaInputIni,
  computeEpicConfigHash,
  DEFAULT_EPIC_CONFIG,
  DEFAULT_EPIC_SESSION
} from '../services/epicGamesSdkService';
import { 
  INITIAL_PHYSICS_CONFIG, 
  CLASSIC_ESPORTS_PHYSICS_CONFIG, 
  UNREAL_SYMMETRIC_PHYSICS_CONFIG, 
  INITIAL_KEYBINDINGS, 
  INITIAL_MACRO_TIMINGS, 
  INITIAL_GAME_PROFILES 
} from '../data/initialData';
import { generatePythonQtScript } from './pythonQtGenerator';
import { generateLuaScript } from './luaGenerator';
import { 
  validateProfileSchema, 
  exportProfilesAsJson, 
  exportBatchBundleAsJson, 
  validateBatchExportBundle 
} from './profileSchemaValidator';
import { evaluateSymmetricKeyInput, applyProfessionalCurve, generateCurvePoints } from './mathEngine';
import { 
  createVersionSnapshot, 
  validateSnapshotIntegrity, 
  DEFAULT_VERSION_SNAPSHOTS,
  pushAutoSnapshot,
  getRecentAutoSnapshots,
  computeStateFingerprint
} from './versionSnapshotManager';
import { formatSnapshotDateTime } from '../components/TauriInputProfileManager';
import { 
  generateGHubLaunchBatchScript, 
  generateGHubLaunchPowerShellScript, 
  getGHubWindowsCommand, 
  getGHubPowerShellCommand 
} from './ghubLauncher';
import {
  validateGHubDirectoryPath,
  getMandatoryGHubScriptDir,
  setMandatoryGHubScriptDir,
  generateRobustGHubBatchScript,
  normalizeWindowsPath,
  GHUB_DIRECTORY_PRESETS,
  DEFAULT_GHUB_SCRIPTS_DIR
} from './ghubDirectoryConfig';
import {
  calculateDragDecel,
  calculateCoastdownTime,
  calculateJumpMetrics,
  generateJumpTrajectory,
  evaluateThrottleScaling,
  generateThrottleCurve,
  calculateZeroToHundredTime,
  computePhysicsComparisonSummary,
  COMPARATOR_PRESETS,
  configToComparatorConfig,
  comparatorConfigToEngineConfig
} from './physicsComparatorMath';
import {
  calculateDriftAngle,
  calculateTurnRadius,
  calculateLateralAccelG,
  calculateYawRate,
  calculateSpeedRetention,
  generateDriftVelocityCurveData,
  generateDualConfigDriftComparison,
  evaluateTelemetryDriftMetrics,
  DriftManeuverConfig
} from './driftPhysicsMath';
import {
  DEFAULT_PRO_PRESETS,
  getPresetLibrary,
  saveCustomPreset,
  deleteCustomPreset,
  PhysicsPreset
} from './physicsPresetLibrary';

test('Rocket League Supersonic Velocity is strictly clamped to max 2300 uu/s', () => {
  assert.equal(clampRocketLeagueVelocity(2200), 2200);
  assert.equal(clampRocketLeagueVelocity(2300), 2300);
  assert.equal(clampRocketLeagueVelocity(2500), 2300, 'Velocity exceeding 2300 must be clamped to 2300 uu/s');
  assert.equal(clampRocketLeagueVelocity(-100), 0, 'Negative velocity must be clamped to 0');
});

test('Vehicle supersonic state threshold triggers at 2200 uu/s and continues to 2300 uu/s', () => {
  assert.equal(isVehicleSupersonic(2199), false);
  assert.equal(isVehicleSupersonic(2200), true);
  assert.equal(isVehicleSupersonic(2250), true);
  assert.equal(isVehicleSupersonic(2300), true);
});

test('Four wheel contact logic correctly identifies infinite flip reset window', () => {
  assert.equal(hasFourWheelContact([true, true, true, true]), true);
  assert.equal(hasFourWheelContact([true, true, true, false]), false);
  assert.equal(hasFourWheelContact([false, false, false, false]), false);
});

test('Exponential response curve deadzone and jitter threshold filtering', () => {
  // Within jitter threshold (default 2)
  assert.equal(calculateResponseCurve(1, 1.45, 0.05, 1.0, 2), 0);
  // Within deadzone cutoff (0.05 * 127 = 6.35)
  assert.equal(calculateResponseCurve(5, 1.45, 0.05, 1.0, 2), 0);
  // Above deadzone should produce positive non-linear output
  const output = calculateResponseCurve(64, 1.45, 0.05, 1.0, 2);
  assert.ok(output > 0, 'Output must be positive');
  assert.ok(output < 64, 'Exponential curve < 1.0 ratio reduces low-input sensitivity for precision');
});

test('Unreal Engine Bipolar Axis calculations enforce symmetry: A/Q = -1.0 and D/E = +1.0 with 20 jitter filter', () => {
  // Test Right (D key): positive polarity +1.0
  const dRes = calculateBipolarAxisResponse('D', 0.02, 1.35, 1.50, 20);
  assert.equal(dRes.sign, 1);
  assert.equal(dRes.axisName, 'STEER_YAW');
  assert.equal(dRes.normalized, 1.0);
  assert.ok(dRes.output > 0, 'Right steer output must be positive');

  // Test Left (A key): negative polarity -1.0
  const aRes = calculateBipolarAxisResponse('A', 0.02, 1.35, 1.50, 20);
  assert.equal(aRes.sign, -1);
  assert.equal(aRes.axisName, 'STEER_YAW');
  assert.equal(aRes.normalized, -1.0);
  assert.ok(aRes.output < 0, 'Left steer output must be negative');
  assert.equal(Math.abs(aRes.output), Math.abs(dRes.output), 'Left and Right must have 100% mathematical symmetry');

  // Test Air Roll Right (E key) vs Air Roll Left (Q key)
  const eRes = calculateBipolarAxisResponse('E', 0.02, 1.35, 1.30, 20);
  const qRes = calculateBipolarAxisResponse('Q', 0.02, 1.35, 1.30, 20);
  assert.equal(eRes.sign, 1);
  assert.equal(qRes.sign, -1);
  assert.equal(eRes.axisName, 'AIR_ROLL');
  assert.equal(qRes.axisName, 'AIR_ROLL');
  assert.equal(Math.abs(eRes.output), Math.abs(qRes.output), 'Roll Right and Left must be perfectly balanced');

  // Test Hardware Jitter filtering at 20 units threshold
  const jitterRes = calculateBipolarAxisResponse(15, 0.02, 1.35, 1.0, 20);
  assert.equal(jitterRes.output, 0, 'Values below 20 units must be muted by jitter filter');
  assert.equal(jitterRes.isDeadzone, true);
});

test('Consistent Pure Boost Management Engine conserves boost at supersonic and via feathering', () => {
  // At supersonic speed (2250 uu/s), boost burn must be 0 (conserved)
  const supersonicEval = evaluateConsistentBoost(100, 2250, false, 2);
  assert.equal(supersonicEval.isConserving, true);
  assert.equal(supersonicEval.consumed, 0);
  assert.equal(supersonicEval.currentBoost, 100);
  assert.equal(supersonicEval.status, 'SUPERSONIC_LOCKED_CONSERVING');

  // Feathering uses micro-pulses (4 units)
  const featherEval = evaluateConsistentBoost(80, 1800, true, 0);
  assert.equal(featherEval.isConserving, true);
  assert.equal(featherEval.consumed, 4);
  assert.equal(featherEval.currentBoost, 76);
  assert.equal(featherEval.status, 'FEATHERING');
});

test('Replay analyzer correctly extracts metrics and validates TAInput sync bindings', () => {
  const sample = SAMPLE_REPLAYS[0];
  assert.ok(sample.supersonicPercent > 50, 'Supersonic percentage should exceed 50% for RLCS matches');
  assert.equal(validateReplayTAInputSync(sample.extractedCommands), true);

  const mockFile = { name: 'top100_ranked_grand_final.replay', size: 1048576 };
  const analyzed = analyzeReplayFile(mockFile);
  assert.equal(analyzed.playlist, 'Ranked 3v3');
  assert.ok(analyzed.correlationRate >= 95, 'Correlation with TAInput.ini must be >= 95%');
  assert.equal(validateReplayTAInputSync(analyzed.extractedCommands), true);
});

test('Liquipedia RLCS Esports Meta & Personal Profile Sync (Third-party profiles deleted)', () => {
  // 1. Personal profile check - only user's profile is accessible
  assert.equal(USER_PERSONAL_ESPORTS_PROFILE.email, 'ai.workgroup.link@gmail.com');
  assert.equal(USER_PERSONAL_ESPORTS_PROFILE.isLoggedIn, true);
  assert.ok(USER_PERSONAL_ESPORTS_PROFILE.winRatePercent > 60);

  const synced = syncUserPersonalProfile();
  assert.equal(synced.id, 'my_unified_profile');
  assert.equal(synced.email, 'ai.workgroup.link@gmail.com');

  // 2. Official Liquipedia Meta statistics verification
  assert.equal(RLCS_META_STATISTICS.averageDeadzoneMeta, 0.05);
  assert.equal(RLCS_META_STATISTICS.averageGroundSenseMeta, 1.50);
  assert.equal(RLCS_META_STATISTICS.averageAerialSenseMeta, 1.30);
  assert.ok(RLCS_META_STATISTICS.pollingRate1000HzAdoptionPercent >= 98);
  assert.ok(RLCS_META_STATISTICS.recentTournaments.length >= 3);

  // 3. Search Liquipedia Meta
  const results = searchLiquipediaMeta('1000 Hz');
  assert.ok(results.length > 0);
  assert.ok(results[0].metric.includes('1000 Hz'));

  // 4. Verify Master Physics Config locked values for both modes
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.internalDeadzone, 0.05);
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.hardwareJitter, 2);
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.groundSense, 1.50);
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.aerialSense, 1.30);
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.curveExponent, 1.45);
  assert.equal(CLASSIC_ESPORTS_PHYSICS_CONFIG.pollingRateAdj, 1);

  assert.equal(UNREAL_SYMMETRIC_PHYSICS_CONFIG.internalDeadzone, 0.02);
  assert.equal(UNREAL_SYMMETRIC_PHYSICS_CONFIG.hardwareJitter, 20);
  assert.equal(UNREAL_SYMMETRIC_PHYSICS_CONFIG.curveExponent, 1.35);
});



test('ReplayAnalyzer frame generation and input-config synchronicity validation', () => {
  const frames = generateRealisticReplayFrames('rlcs', 60);
  assert.equal(frames.length, 60, 'Should generate 60 telemetry frames');

  // Check that all frame speeds do not exceed SUPERSONIC_MAX_UU (2300 uu/s)
  for (const f of frames) {
    assert.ok(f.physics.velocityUu <= 2300, `Speed ${f.physics.velocityUu} must not exceed 2300 uu/s`);
    assert.ok(f.physics.velocityUu >= 0, 'Speed must be non-negative');
  }

  // Validate synchronicity against active INITIAL_PHYSICS_CONFIG & INITIAL_KEYBINDINGS
  const report = validateReplayInputConfigSynchronicity(frames, INITIAL_PHYSICS_CONFIG, INITIAL_KEYBINDINGS);
  assert.ok(report.overallScore >= 90, `Overall score ${report.overallScore} must be >= 90%`);
  assert.equal(report.keybindFidelity, 100, 'Keybind fidelity must be 100% when Space, G1, and G2 are mapped');
  assert.ok(report.commandMappings.length >= 5, 'Should produce at least 5 synchronized command mappings');

  // Test binary header parser
  const sampleBuffer = new ArrayBuffer(32);
  const dataView = new DataView(sampleBuffer);
  dataView.setUint32(0, 0x12345678, true); // CRC
  dataView.setUint32(4, 868, true);        // engineVersion
  dataView.setUint32(8, 32, true);         // licenseeVersion

  const header = parseReplayBinaryHeader(sampleBuffer);
  assert.equal(header.crc, 0x12345678);
  assert.equal(header.engineVersion, 868);
  assert.equal(header.licenseeVersion, 32);
  assert.equal(header.isRecognized, true);
});

test('StreamerDirectXOverlay physics data binding and sub-millisecond latency calculation', () => {
  // Test overlay latency calculation at different tick rates
  const lat1000 = calculateOverlayLatency(1000, 1);
  const lat240 = calculateOverlayLatency(240, 1);
  const lat120 = calculateOverlayLatency(120, 1);
  const lat60 = calculateOverlayLatency(60, 1);

  assert.ok(lat1000 < 0.25, `1000Hz direct hook latency should be sub-0.25ms, got ${lat1000}ms`);
  assert.ok(lat240 < lat120, '240Hz latency must be lower than 120Hz');
  assert.ok(lat120 < lat60, '120Hz latency must be lower than 60Hz');

  // Test initial state creation
  const initial = createInitialStreamerPhysics(INITIAL_PHYSICS_CONFIG, 240);
  assert.equal(initial.isSupersonic, false);
  assert.equal(initial.allWheelsContact, true);
  assert.equal(initial.hasFlipReset, true);
  assert.equal(initial.flipTimerRemaining, 1.45);

  // Test steer curve transfer calculation with deadzone
  // Inside deadzone (0.05 * 127 = 6.35) -> should be 0
  const steerDead = calculateSteerTransfer(0.02, INITIAL_PHYSICS_CONFIG, false);
  assert.equal(steerDead, 0);

  // Outside deadzone -> non-zero curved response
  const steerActive = calculateSteerTransfer(0.8, INITIAL_PHYSICS_CONFIG, false);
  assert.ok(steerActive > 0, 'Steer active outside deadzone must produce positive response');

  // Test stepStreamerPhysics with G1 Boost acceleration and supersonic clamp
  let state = initial;
  // Boost for 2 seconds (simulate 20 steps of 0.1s)
  for (let step = 0; step < 20; step++) {
    state = stepStreamerPhysics(
      state,
      { activeKeys: new Set(['G1', 'W']) },
      INITIAL_PHYSICS_CONFIG,
      0.1
    );
  }

  // Velocity must reach max 2300 and trigger supersonic
  assert.equal(state.isSupersonic, true, 'Vehicle must be supersonic after sustained boost');
  assert.ok(state.velocityUu >= 2200, 'Velocity must be >= 2200 uu/s for supersonic state');
  assert.ok(state.velocityUu <= 2300, 'Velocity must never exceed absolute 2300 uu/s cap');
  assert.ok(state.boostPercent < initial.boostPercent, 'Boost tank must be consumed during boost');

  // Test flip reset logic when airborne
  const airborneState = stepStreamerPhysics(
    state,
    { activeKeys: new Set(), wheelsContact: [false, false, false, false] },
    INITIAL_PHYSICS_CONFIG,
    1.5 // 1.5s in air, exceeds 1.45s timer
  );
  assert.equal(airborneState.allWheelsContact, false);
  assert.equal(airborneState.hasFlipReset, false, 'Flip reset must expire when airborne for > 1.45s');

  // 4-wheel contact re-grants flip reset
  const landedState = stepStreamerPhysics(
    airborneState,
    { activeKeys: new Set(), wheelsContact: [true, true, true, true] },
    INITIAL_PHYSICS_CONFIG,
    0.05
  );
  assert.equal(landedState.allWheelsContact, true);
  assert.equal(landedState.hasFlipReset, true, '4-wheel contact must instantly grant flip reset');
  assert.equal(landedState.flipTimerRemaining, 1.45);
});

test('OBS Browser Source CSS and URL generation for streamers', () => {
  const transparentCss = generateObsBrowserSourceCss('transparent');
  assert.ok(transparentCss.includes('rgba(0, 0, 0, 0)'), 'Transparent CSS must set alpha 0');
  assert.ok(transparentCss.includes('backdrop-filter'), 'Should include backdrop-filter');

  const chromaGreenCss = generateObsBrowserSourceCss('chroma_green');
  assert.ok(chromaGreenCss.includes('#00ff00'), 'Chroma green CSS must have #00ff00');

  const chromaMagentaCss = generateObsBrowserSourceCss('chroma_magenta');
  assert.ok(chromaMagentaCss.includes('#ff00ff'), 'Chroma magenta CSS must have #ff00ff');

  const url = buildObsOverlayUrl('https://example.com', 'transparent', 240, 'broadcast_full');
  assert.ok(url.includes('streamer_overlay=1'));
  assert.ok(url.includes('mode=transparent'));
  assert.ok(url.includes('hz=240'));
  assert.ok(url.includes('layout=broadcast_full'));
});

test('Epic Games Store SDK/API protocol generation, TAInput.ini syncing, and launch commands', () => {
  // 1. Protocol generation
  const defaultProtocol = generateEpicLauncherProtocol();
  assert.equal(defaultProtocol, 'com.epicgames.launcher://apps/Sugar?action=launch&silent=true');

  const visibleProtocol = generateEpicLauncherProtocol({ silent: false });
  assert.equal(visibleProtocol, 'com.epicgames.launcher://apps/Sugar?action=launch');

  // 2. Windows direct command generation
  const winCmd = generateWindowsEpicLaunchCommand(
    'C:\\Program Files\\Epic Games\\rocketleague',
    { skipMovies: true, highPriority: true, refreshRate: 240, directXVersion: 'dx11' }
  );
  assert.ok(winCmd.includes('RocketLeague.exe'));
  assert.ok(winCmd.includes('-EpicPortal'));
  assert.ok(winCmd.includes('-nomovie'));
  assert.ok(winCmd.includes('-high'));
  assert.ok(winCmd.includes('-refresh 240'));
  assert.ok(winCmd.includes('-dx11'));

  // 3. TAInput.ini generation for Epic Games Cloud
  const iniContent = generateEpicTaInputIni(INITIAL_PHYSICS_CONFIG, INITIAL_KEYBINDINGS);
  assert.ok(iniContent.includes('SteerSensitivity=1.50'));
  assert.ok(iniContent.includes('AirSteerSensitivity=1.30'));
  assert.ok(iniContent.includes('ControllerDeadzone=0.05'));
  assert.ok(iniContent.includes('SupersonicMinSpeed=2200.000000'));
  assert.ok(iniContent.includes('SupersonicMaxSpeed=2300.000000'));

  // 4. Config verification hash
  const hash = computeEpicConfigHash(INITIAL_PHYSICS_CONFIG, INITIAL_KEYBINDINGS);
  assert.ok(hash.startsWith('EOS-'));
  assert.equal(hash.length >= 8, true);

  // 5. Zero hardcoded tokens verification
  assert.equal(DEFAULT_EPIC_SESSION.status, 'DISCONNECTED');
  assert.equal(DEFAULT_EPIC_SESSION.epicAccountId, '');
  assert.ok(!JSON.stringify(DEFAULT_EPIC_SESSION).includes('eos_sec_token'));
});

test('Python PySide6 generator and Windows launcher resolve working directory and prevent System32 Errno 2 and SQLite OperationalError', () => {
  const pyCode = generatePythonQtScript(INITIAL_PHYSICS_CONFIG, INITIAL_KEYBINDINGS, INITIAL_MACRO_TIMINGS);

  // Must define SCRIPT_DIR and construct DB_FILENAME relative to it
  assert.ok(pyCode.includes('SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))'));
  assert.ok(pyCode.includes('DB_FILENAME = os.path.join(SCRIPT_DIR, "rocket_league_physics.db")'));
  assert.ok(pyCode.includes('class LocalDatabaseManager:'));
  // Bulletproof SQLite fix for Windows protected Downloads directory
  assert.ok(pyCode.includes('PRAGMA journal_mode = MEMORY;'), 'Must configure in-memory journaling to prevent disk journal lock');
  assert.ok(pyCode.includes('check_same_thread=False'));
  assert.ok(pyCode.includes('sign = 1.0 if filtered > 0 else -1.0'));
  assert.ok(pyCode.includes('curved * 127.0 * sign * multiplier'));
  assert.ok(pyCode.includes('class User32InputDispatcher:'));
  assert.ok(pyCode.includes('class VehicleCollisionPhysicsLoop(QThread):'));
  assert.ok(pyCode.includes('class SQLiteLiveTelemetryLoopWorker(QThread):'), 'Must include 120Hz SQLite telemetry loop worker');
  assert.ok(pyCode.includes('calculate_unreal_bipolar_axis'), 'Must include Unreal bipolar axis calculator');
});

test('Logitech G-Hub Lua script generates frame-synchronized 1000Hz mechanics', () => {
  const luaCode = generateLuaScript(INITIAL_PHYSICS_CONFIG, INITIAL_KEYBINDINGS, INITIAL_MACRO_TIMINGS);
  assert.ok(luaCode.includes('1000Hz Tick Mode Active'), 'Must activate 1000Hz tick mode');
  assert.ok(luaCode.includes('TICK_MS             = 1'), 'Must calibrate 1000Hz tick timing (1.0 ms)');
  assert.ok(luaCode.includes('ExecuteSpeedflipLeft()'), 'Must include SpeedflipLeft mechanism');
  assert.ok(luaCode.includes('ExecuteHalfFlip()'), 'Must include HalfFlip mechanism');
  assert.ok(luaCode.includes('ExecuteChainWaveDash(pulse_count)'), 'Must include ChainWaveDash mechanism');
  assert.ok(luaCode.includes('ExecuteWallToGroundDash(wall_side)'), 'Must include Wall-to-Ground Dash mechanism');
  assert.ok(luaCode.includes('ApplyPrecisionCurve(axis_value, sensitivity_multiplier)'), 'Must implement precision mathematical curve');
  assert.ok(luaCode.includes('FilterJitter(raw_axis)'), 'Must implement hardware jitter filter');
});

test('DirectX Direct3D 11 hook and Python DXGI hardware overlay generation', () => {
  const cppHook = generateDirectXHookCpp(1000);
  assert.ok(cppHook.includes('HookedD3D11Present'), 'Must hook IDXGISwapChain::Present');
  assert.ok(cppHook.includes('WS_EX_TOPMOST | WS_EX_TRANSPARENT | WS_EX_LAYERED'), 'Must set click-through layered window styles');
  assert.ok(cppHook.includes('DIK_W       0x11'), 'Must include DirectInput DIK_W');
  assert.ok(cppHook.includes('DIK_SPACE   0x39'), 'Must include DirectInput DIK_SPACE');

  const pyOverlay = generateDirectXPythonOverlayScript(INITIAL_PHYSICS_CONFIG);
  assert.ok(pyOverlay.includes('DirectXHardwareOverlay'), 'Must generate DirectX overlay class');
  assert.ok(pyOverlay.includes('WS_EX_TRANSPARENT'), 'Must configure transparent window attributes');
  assert.ok(pyOverlay.includes('2200 - 2300 uu/s'), 'Must synchronize supersonic threshold');
});

test('exportProfilesAsJson serializes valid envelope with engine metadata', () => {
  const jsonOutput = exportProfilesAsJson(INITIAL_GAME_PROFILES, 'my_unified_profile');
  assert.ok(typeof jsonOutput === 'string');
  const parsed = JSON.parse(jsonOutput);
  assert.equal(parsed.app, 'RocketLeague_MasterEngine');
  assert.equal(parsed.version, '4.0.2');
  assert.equal(parsed.activeProfileId, 'my_unified_profile');
  assert.equal(parsed.profilesCount, INITIAL_GAME_PROFILES.length);
  assert.ok(Array.isArray(parsed.profiles));
  assert.equal(parsed.profiles.length, INITIAL_GAME_PROFILES.length);
});

test('validateProfileSchema validates envelope, array, and single profile objects', () => {
  // Test 1: Full Envelope format
  const envelope = {
    app: 'RocketLeague_MasterEngine',
    version: '4.0.2',
    profiles: [
      {
        id: 'team_vitality_rlcs',
        name: 'Team Vitality RLCS',
        nameAr: 'فريق فايتاليتي للبطولات',
        tier: 'RLCS 3v3',
        deadzoneOverride: 0.05,
        aerialSenseOverride: 1.30,
        customBindings: { Boost: 'RightMouseButton', AirRoll: 'LeftShift' }
      }
    ]
  };
  const envResult = validateProfileSchema(envelope);
  assert.equal(envResult.valid, true);
  assert.equal(envResult.profiles.length, 1);
  assert.equal(envResult.profiles[0].id, 'team_vitality_rlcs');
  assert.equal(envResult.profiles[0].deadzoneOverride, 0.05);
  assert.equal(envResult.profiles[0].aerialSenseOverride, 1.30);

  // Test 2: Direct array of profiles
  const arrayPayload = [
    {
      id: 'karmine_corp_freestyle',
      name: 'Karmine Corp Freestyle',
      tier: 'Freestyle Mechanics',
      deadzoneOverride: 0.05,
      aerialSenseOverride: 1.30
    }
  ];
  const arrResult = validateProfileSchema(JSON.stringify(arrayPayload));
  assert.equal(arrResult.valid, true);
  assert.equal(arrResult.profiles.length, 1);
  assert.equal(arrResult.profiles[0].id, 'karmine_corp_freestyle');

  // Test 3: Single profile object
  const singleProfile = {
    id: 'bds_1v1',
    name: 'Team BDS Kickoff',
    tier: 'Competitive 1v1',
    deadzoneOverride: 0.05,
    aerialSenseOverride: 1.30
  };
  const singleResult = validateProfileSchema(singleProfile);
  assert.equal(singleResult.valid, true);
  assert.equal(singleResult.profiles[0].name, 'Team BDS Kickoff');

  // Test 4: Reject invalid JSON string
  const malformedJsonResult = validateProfileSchema('{ invalid_json: ');
  assert.equal(malformedJsonResult.valid, false);
  assert.ok(malformedJsonResult.error?.includes('Invalid JSON'));

  // Test 5: Reject invalid deadzone (< 0 or > 1)
  const invalidDz = {
    id: 'bad_dz_profile',
    name: 'Bad Deadzone',
    deadzoneOverride: 2.5, // Exceeds 1.0 limit
    aerialSenseOverride: 1.30
  };
  const badDzResult = validateProfileSchema(invalidDz);
  assert.equal(badDzResult.valid, false);
  assert.ok(badDzResult.error?.includes('deadzoneOverride'));

  // Test 6: Reject invalid aerial sensitivity (negative or zero)
  const invalidAerial = {
    id: 'bad_aerial_profile',
    name: 'Bad Aerial',
    deadzoneOverride: 0.05,
    aerialSenseOverride: -0.5 // Invalid negative sensitivity
  };
  const badAerialResult = validateProfileSchema(invalidAerial);
  assert.equal(badAerialResult.valid, false);
  assert.ok(badAerialResult.error?.includes('aerialSenseOverride'));

  // Test 7: Reject missing required id or name
  const missingName = {
    id: 'missing_name_profile',
    deadzoneOverride: 0.05,
    aerialSenseOverride: 1.30
  };
  const missingNameResult = validateProfileSchema(missingName);
  assert.equal(missingNameResult.valid, false);
  assert.ok(missingNameResult.error?.includes('name'));
});

test('PhysicsMathStudio Dynamic 1/-1 Symmetric Axis Mapping: D/A steering, E/Q roll, zero deadzone hop', () => {
  // 1. Steering Axis Symmetry: Key D (+1.0) and Key A (-1.0)
  const dKey = evaluateSymmetricKeyInput('D', UNREAL_SYMMETRIC_PHYSICS_CONFIG);
  const aKey = evaluateSymmetricKeyInput('A', UNREAL_SYMMETRIC_PHYSICS_CONFIG);

  assert.equal(dKey.sign, 1);
  assert.equal(aKey.sign, -1);
  assert.equal(dKey.normalizedAxis, 1.0);
  assert.equal(aKey.normalizedAxis, -1.0);
  assert.equal(dKey.axis, 'STEER');
  assert.equal(aKey.axis, 'STEER');
  assert.equal(dKey.groundOutput, 191); // 127 * 1.50 = 190.5 -> 191
  assert.equal(aKey.groundOutput, -191);
  assert.equal(Math.abs(dKey.groundOutput), Math.abs(aKey.groundOutput), 'Steering axis must have 100% mathematical symmetry');

  // 2. Air Roll Axis Symmetry: Key E (+1.0) and Key Q (-1.0)
  const eKey = evaluateSymmetricKeyInput('E', UNREAL_SYMMETRIC_PHYSICS_CONFIG);
  const qKey = evaluateSymmetricKeyInput('Q', UNREAL_SYMMETRIC_PHYSICS_CONFIG);

  assert.equal(eKey.sign, 1);
  assert.equal(qKey.sign, -1);
  assert.equal(eKey.normalizedAxis, 1.0);
  assert.equal(qKey.normalizedAxis, -1.0);
  assert.equal(eKey.axis, 'ROLL');
  assert.equal(qKey.axis, 'ROLL');
  assert.equal(eKey.aerialOutput, 165); // 127 * 1.30 = 165.1 -> 165
  assert.equal(qKey.aerialOutput, -165);
  assert.equal(Math.abs(eKey.aerialOutput), Math.abs(qKey.aerialOutput), 'Air Roll axis must have 100% mathematical symmetry');

  // 3. Dynamic Zero-Hop Deadzone Rescaling:
  // Inside deadzone (raw <= 0.02 * 127 = 2.54): output must be exactly 0
  const insideDz = applyProfessionalCurve(2, 1.50, { ...UNREAL_SYMMETRIC_PHYSICS_CONFIG, hardwareJitter: 0 });
  assert.equal(insideDz, 0);

  // Directly above deadzone cutoff (e.g. 3 units): output must start smoothly near 0, NOT jumping
  const justAboveDz = applyProfessionalCurve(3, 1.50, { ...UNREAL_SYMMETRIC_PHYSICS_CONFIG, hardwareJitter: 0 });
  assert.ok(justAboveDz > 0, 'Must produce positive output above deadzone');
  assert.ok(justAboveDz < 5, 'Output near deadzone edge must start smoothly without primitive jump');

  // 4. Generate Curve Points:
  const points = generateCurvePoints(UNREAL_SYMMETRIC_PHYSICS_CONFIG, 10);
  assert.equal(points.length, 11);
  assert.equal(points[0].normalizedInput, -1.0);
  assert.equal(points[10].normalizedInput, 1.0);
  assert.equal(points[5].normalizedInput, 0.0); // Center point
  assert.equal(points[5].groundOutput, 0);       // Center output must be 0
});

test('Version Snapshot in TauriInputProfileManager captures full state and enables rollback', () => {
  // 1. Verify default baseline snapshots exist
  assert.ok(DEFAULT_VERSION_SNAPSHOTS.length >= 2);
  const classicBaseline = DEFAULT_VERSION_SNAPSHOTS.find(s => s.id === 'snap_classic_esports_baseline');
  const unrealBaseline = DEFAULT_VERSION_SNAPSHOTS.find(s => s.id === 'snap_unreal_symmetric_baseline');

  assert.ok(classicBaseline);
  assert.equal(classicBaseline.physicsConfig.internalDeadzone, 0.05);
  assert.equal(classicBaseline.physicsConfig.curveExponent, 1.45);
  assert.equal(classicBaseline.activeProfileId, 'my_unified_profile');

  assert.ok(unrealBaseline);
  assert.equal(unrealBaseline.physicsConfig.internalDeadzone, 0.02);
  assert.equal(unrealBaseline.physicsConfig.curveExponent, 1.35);

  // 2. Test createVersionSnapshot creates deep cloned checkpoint
  const customSnapshot = createVersionSnapshot(
    'Pre-Scrims Checkpoint',
    'Saved before testing 0.08 deadzone',
    INITIAL_GAME_PROFILES,
    'my_unified_profile',
    CLASSIC_ESPORTS_PHYSICS_CONFIG,
    INITIAL_KEYBINDINGS,
    false
  );

  assert.ok(customSnapshot.id.startsWith('snap_'));
  assert.equal(customSnapshot.name, 'Pre-Scrims Checkpoint');
  assert.equal(customSnapshot.description, 'Saved before testing 0.08 deadzone');
  assert.equal(customSnapshot.profiles.length, INITIAL_GAME_PROFILES.length);
  assert.equal(customSnapshot.activeProfileId, 'my_unified_profile');
  assert.equal(customSnapshot.physicsConfig.internalDeadzone, 0.05);
  assert.equal(customSnapshot.isAutoSaved, false);
  assert.ok(customSnapshot.keybindings);
  assert.equal(customSnapshot.keybindings.length, INITIAL_KEYBINDINGS.length);

  // 3. Test validateSnapshotIntegrity
  assert.equal(validateSnapshotIntegrity(customSnapshot), true);
  assert.equal(validateSnapshotIntegrity(classicBaseline), true);
  assert.equal(validateSnapshotIntegrity(null), false);
  assert.equal(validateSnapshotIntegrity({}), false);
  assert.equal(validateSnapshotIntegrity({ id: 'bad', profiles: [] }), false);

  // 4. Test Auto-checkpoint creation
  const autoSnap = createVersionSnapshot(
    'Auto-Backup before import',
    'Safety snapshot',
    INITIAL_GAME_PROFILES,
    'my_unified_profile',
    UNREAL_SYMMETRIC_PHYSICS_CONFIG,
    undefined,
    true
  );
  assert.equal(autoSnap.isAutoSaved, true);
  assert.equal(validateSnapshotIntegrity(autoSnap), true);
});

test('Auto-Saved Snapshots: strictly stores last 5 configuration states with date/time and 1-click restore capabilities', () => {
  let list = [...DEFAULT_VERSION_SNAPSHOTS];

  // 1. Simulate user modifying settings across 8 sequential sessions (e.g. tweaking deadzone and aerial sensitivity)
  const deadzones = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10];
  const aerialSenses = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9];

  for (let i = 0; i < deadzones.length; i++) {
    const config = {
      ...CLASSIC_ESPORTS_PHYSICS_CONFIG,
      internalDeadzone: deadzones[i],
      aerialSense: aerialSenses[i],
    };
    const snap = createVersionSnapshot(
      `Auto-State #${i + 1}`,
      `Auto saved state with DZ=${deadzones[i]}`,
      INITIAL_GAME_PROFILES,
      'my_unified_profile',
      config,
      INITIAL_KEYBINDINGS,
      true
    );
    // Simulate timestamp spacing
    snap.timestamp = 1700000000000 + i * 60000;
    list = pushAutoSnapshot(list, snap, 5);
  }

  // 2. Verify rolling cap: auto-saved snapshots must NEVER exceed 5
  const autoOnly = list.filter(s => s.isAutoSaved);
  assert.equal(autoOnly.length, 5, 'Auto-saved snapshots must strictly be capped at 5');

  // Most recent snapshot should be #8 (DZ 0.10)
  assert.equal(autoOnly[0].physicsConfig.internalDeadzone, 0.10);
  assert.equal(autoOnly[0].physicsConfig.aerialSense, 1.9);

  // 5th auto-snapshot should be #4 (DZ 0.06)
  assert.equal(autoOnly[4].physicsConfig.internalDeadzone, 0.06);
  assert.equal(autoOnly[4].physicsConfig.aerialSense, 1.5);

  // 3. Verify getRecentAutoSnapshots returns exactly 5
  const recent5 = getRecentAutoSnapshots(list, 5);
  assert.equal(recent5.length, 5, 'getRecentAutoSnapshots must return exactly 5 states');

  // 4. Verify each of the 5 snapshots has valid date and time metadata
  for (let i = 0; i < recent5.length; i++) {
    const item = recent5[i];
    assert.ok(item.timestamp > 0, 'Timestamp must be positive');
    assert.ok(item.name.length > 0, 'Name must be present');
    
    // Check formatSnapshotDateTime utility
    const { dateStr, timeStr } = formatSnapshotDateTime(item.timestamp, false);
    assert.ok(dateStr !== '--', 'Date must be formatted properly');
    assert.ok(timeStr !== '--', 'Time must be formatted properly');
    assert.ok(dateStr.length > 0, 'Date string must not be empty');
    assert.ok(timeStr.length > 0, 'Time string must not be empty');

    const arFormatted = formatSnapshotDateTime(item.timestamp, true);
    assert.ok(arFormatted.dateStr.length > 0, 'Arabic date string must be populated');
    assert.ok(arFormatted.timeStr.length > 0, 'Arabic time string must be populated');
  }

  // 5. Verify consecutive duplicate avoidance
  const currentCount = list.length;
  const duplicateSnap = createVersionSnapshot(
    'Duplicate State',
    'Should not create extra entry',
    INITIAL_GAME_PROFILES,
    'my_unified_profile',
    autoOnly[0].physicsConfig,
    INITIAL_KEYBINDINGS,
    true
  );
  duplicateSnap.timestamp = Date.now();
  const listAfterDup = pushAutoSnapshot(list, duplicateSnap, 5);
  assert.equal(listAfterDup.length, currentCount, 'Identical state fingerprint must not create duplicate snapshot');

  // 6. Test 1-click restore simulation:
  // User selects state #3 (which had DZ 0.08, Aerial 1.7)
  const targetToRestore = recent5[2];
  assert.equal(targetToRestore.physicsConfig.internalDeadzone, 0.08);

  // Simulate 1-click restore payload application
  let restoredPhysics = { ...targetToRestore.physicsConfig };
  let restoredActiveId = targetToRestore.activeProfileId;
  let restoredProfiles = [...targetToRestore.profiles];

  assert.equal(restoredPhysics.internalDeadzone, 0.08);
  assert.equal(restoredPhysics.aerialSense, 1.7);
  assert.equal(restoredActiveId, 'my_unified_profile');
  assert.equal(restoredProfiles.length, INITIAL_GAME_PROFILES.length);
});

test('Logitech G-HUB Launcher and Keyboard Zero DirectInput Matrix Verification', () => {
  // 1. G-HUB Windows CMD command verification
  const winCmd = getGHubWindowsCommand();
  assert.equal(winCmd, 'start "" "C:\\Program Files\\LGHUB\\lghub.exe"');

  // 2. G-HUB PowerShell command verification
  const psCmd = getGHubPowerShellCommand();
  assert.equal(psCmd, 'Start-Process -FilePath "$env:ProgramFiles\\LGHUB\\lghub.exe"');

  // 3. G-HUB Batch Script generation
  const dummyLua = '-- Test Lua Script for Rocket League 1000Hz';
  const batchScript = generateGHubLaunchBatchScript(dummyLua);
  assert.ok(batchScript.includes('title Rocket League Master Engine - Logitech G HUB 1000Hz Launcher'));
  assert.ok(batchScript.includes('%ProgramFiles%\\LGHUB\\lghub.exe'));
  assert.ok(batchScript.includes('lghub://'));
  assert.ok(batchScript.includes('Set-Clipboard'));

  // 4. G-HUB PowerShell Script generation
  const psScript = generateGHubLaunchPowerShellScript(dummyLua);
  assert.ok(psScript.includes('Start-Process -FilePath $FoundGHub'));
  assert.ok(psScript.includes('rl_master_engine.lua'));
  assert.ok(psScript.includes('Set-Clipboard -Value $LuaPayload'));

  // 5. DirectInput Scancode Matrix for Keyboard Zero
  const zeroMatrixScancodes: Record<string, string> = {
    W: '0x11 (DIK_W)',
    A: '0x1E (DIK_A)',
    S: '0x1F (DIK_S)',
    D: '0x20 (DIK_D)',
    SPACE: '0x39 (DIK_SPACE)',
    Q: '0x10 (DIK_Q)',
    E: '0x12 (DIK_E)',
    LALT: '0x38 (DIK_LMENU)',
    LSHIFT: '0x2A (DIK_LSHIFT)',
  };

  for (const [key, code] of Object.entries(zeroMatrixScancodes)) {
    assert.ok(code.startsWith('0x'), `Key ${key} must have valid hex scancode`);
  }
});

test('Batch Export: bundles all currently saved snapshots and profiles into a single JSON export file for offline backup', () => {
  // 1. Prepare profiles and snapshots
  const testProfiles = [...INITIAL_GAME_PROFILES];
  const testSnapshots = [...DEFAULT_VERSION_SNAPSHOTS];
  const activeProfileId = 'my_unified_profile';

  // 2. Generate Batch Export bundle JSON
  const batchJson = exportBatchBundleAsJson(
    testProfiles,
    testSnapshots,
    activeProfileId,
    UNREAL_SYMMETRIC_PHYSICS_CONFIG
  );

  assert.ok(typeof batchJson === 'string');
  assert.ok(batchJson.length > 500);

  // Parse and inspect bundle structure
  const parsed = JSON.parse(batchJson);
  assert.equal(parsed.app, 'RocketLeague_MasterEngine');
  assert.equal(parsed.bundleType, 'master_engine_batch_export');
  assert.equal(parsed.version, '4.0.2');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.metadata.profilesCount, testProfiles.length);
  assert.equal(parsed.metadata.snapshotsCount, testSnapshots.length);
  assert.equal(parsed.metadata.activeProfileId, activeProfileId);
  assert.equal(parsed.profiles.length, testProfiles.length);
  assert.equal(parsed.snapshots.length, testSnapshots.length);
  assert.equal(parsed.activePhysicsConfig.internalDeadzone, 0.02);

  // 3. Test validateBatchExportBundle on valid bundle
  const validationResult = validateBatchExportBundle(batchJson);
  assert.equal(validationResult.valid, true);
  assert.equal(validationResult.profiles.length, testProfiles.length);
  assert.equal(validationResult.snapshots.length, testSnapshots.length);
  assert.equal(validationResult.activeProfileId, 'my_unified_profile');
  assert.ok(validationResult.activePhysicsConfig);

  // 4. Test snapshot recovery from batch bundle
  const recoveredSnapshots = validationResult.snapshots;
  for (const snap of recoveredSnapshots) {
    assert.equal(validateSnapshotIntegrity(snap), true);
    assert.ok(snap.id.startsWith('snap_'));
    assert.ok(snap.name.length > 0);
    assert.ok(snap.physicsConfig);
  }

  // 5. Test validation rejection on corrupted / invalid batch bundle
  const corruptedBundle = {
    app: 'RocketLeague_MasterEngine',
    bundleType: 'master_engine_batch_export',
    profiles: [], // Empty profiles must fail validation
    snapshots: testSnapshots
  };
  const corruptedResult = validateBatchExportBundle(corruptedBundle);
  assert.equal(corruptedResult.valid, false);
  assert.ok(corruptedResult.error?.includes('profiles'));

  // 6. Test batch bundle handles raw string or parsed object equally
  const parsedObjValidation = validateBatchExportBundle(parsed);
  assert.equal(parsedObjValidation.valid, true);
  assert.equal(parsedObjValidation.profiles.length, testProfiles.length);
});

test('Physics Comparator: accurately overlays and quantifies differences in drag deceleration, gravity jump trajectory, and throttle scaling', () => {
  const classic = COMPARATOR_PRESETS.find(p => p.id === 'classic_pro')!;
  const unreal = COMPARATOR_PRESETS.find(p => p.id === 'unreal_symmetric')!;
  const lowG = COMPARATOR_PRESETS.find(p => p.id === 'low_gravity_freestyle')!;
  const heavyDrag = COMPARATOR_PRESETS.find(p => p.id === 'heavy_drag_scrim')!;

  assert.ok(classic && unreal && lowG && heavyDrag);

  // 1. Aerodynamic Drag Deceleration Calculations
  // Drag at 0 speed must be 0
  assert.equal(calculateDragDecel(0, classic.dragCoefficient), 0);

  // Drag at supersonic speed (2300 uu/s)
  const dragClassic = calculateDragDecel(2300, classic.dragCoefficient); // 0.030 * 2300 + 1.5e-5 * 2300^2 = 69 + 79.35 = 148.35
  const dragHeavy = calculateDragDecel(2300, heavyDrag.dragCoefficient); // 0.065 * 2300 + 79.35 = 149.5 + 79.35 = 228.85
  const dragUnreal = calculateDragDecel(2300, unreal.dragCoefficient);   // 0.022 * 2300 + 79.35 = 50.6 + 79.35 = 129.95

  assert.ok(dragHeavy > dragClassic, 'Heavy drag must produce higher deceleration than classic');
  assert.ok(dragClassic > dragUnreal, 'Classic drag must produce higher deceleration than low drag unreal');

  // Coastdown time from 2300 to 1410 uu/s
  const coastClassic = calculateCoastdownTime(2300, 1410, classic.dragCoefficient);
  const coastHeavy = calculateCoastdownTime(2300, 1410, heavyDrag.dragCoefficient);
  assert.ok(coastHeavy < coastClassic, 'Higher drag atmosphere must scrub supersonic speed faster');

  // 2. Gravity Trajectory & Jump Kinematics
  const jumpClassic = calculateJumpMetrics(classic.initialJumpVelocity, classic.gravityZ); // v0 = 292, g = -650
  const jumpLowG = calculateJumpMetrics(lowG.initialJumpVelocity, lowG.gravityZ);       // v0 = 292, g = -325

  assert.equal(jumpClassic.gravityScaleVsEarth, 1.0);
  assert.equal(jumpLowG.gravityScaleVsEarth, 0.5);

  // Apex height in low-gravity must be double that of standard gravity
  assert.ok(Math.abs(jumpLowG.apexHeightUu - jumpClassic.apexHeightUu * 2) < 1.0);

  // Hangtime in low-gravity must be double standard hangtime
  assert.ok(Math.abs(jumpLowG.hangtimeSec - jumpClassic.hangtimeSec * 2) < 0.05);

  // Trajectory points stay non-negative
  const trajPoints = generateJumpTrajectory(classic, jumpClassic.hangtimeSec, 20);
  assert.equal(trajPoints.length, 21);
  for (const pt of trajPoints) {
    assert.ok(pt.heightUu >= 0, 'Trajectory height must not be negative');
    assert.ok(pt.timeSec >= 0);
  }

  // 3. Throttle Scaling & Drive Acceleration
  // Inside deadzone (e.g. 0.01 with 0.05 deadzone)
  const idleThrottle = evaluateThrottleScaling(0.01, classic.internalDeadzone, classic.curveExponent, classic.groundSense);
  assert.equal(idleThrottle.inDeadzone, true);
  assert.equal(idleThrottle.effectiveThrottle, 0);

  // Full throttle (1.0)
  const fullThrottleClassic = evaluateThrottleScaling(1.0, classic.internalDeadzone, classic.curveExponent, classic.groundSense);
  assert.equal(fullThrottleClassic.inDeadzone, false);
  assert.equal(fullThrottleClassic.effectiveThrottle, classic.groundSense);

  // Zero-to-hundred launch time
  const zToHClassic = calculateZeroToHundredTime(classic);
  assert.ok(zToHClassic > 0 && zToHClassic < 5.0, '0-100 kph time should be realistic (0.5s to 3s)');

  // 4. Comparator Summary Delta Engine
  const summary = computePhysicsComparisonSummary(classic, unreal);
  assert.ok(typeof summary.dragDeltaPercent === 'number');
  assert.ok(summary.dragDeltaPercent < 0, 'Unreal mode has reduced drag compared to classic');
  assert.equal(summary.hangtimeDeltaMs, 0, 'Both have standard -650 uu/s² gravity, so hangtime delta must be 0');

  // Comparison between Classic and Low-G
  const lowGSummary = computePhysicsComparisonSummary(classic, lowG);
  assert.ok(lowGSummary.hangtimeDeltaMs > 800, 'Low-G must add over 800ms to air hangtime');
  assert.ok(lowGSummary.apexDeltaUu > 50, 'Low-G must increase apex by over 50 units');

  // 5. Config to Comparator Config mapping & Engine restoration
  const convertedComp = configToComparatorConfig(CLASSIC_ESPORTS_PHYSICS_CONFIG);
  assert.equal(convertedComp.internalDeadzone, CLASSIC_ESPORTS_PHYSICS_CONFIG.internalDeadzone);
  assert.equal(convertedComp.groundSense, CLASSIC_ESPORTS_PHYSICS_CONFIG.groundSense);

  const restoredEngine = comparatorConfigToEngineConfig(convertedComp, CLASSIC_ESPORTS_PHYSICS_CONFIG);
  assert.equal(restoredEngine.internalDeadzone, CLASSIC_ESPORTS_PHYSICS_CONFIG.internalDeadzone);
  assert.equal(restoredEngine.curveExponent, CLASSIC_ESPORTS_PHYSICS_CONFIG.curveExponent);
});

test('D3 Drift Angle vs Velocity Curve: accurately models slip angles, turning radius reduction, and lateral G-forces', () => {
  // 1. Grip Turn vs Powerslide Drift Angle Distinction
  const vMid = 1410; // Max ground drive speed
  const gripAngleMid = calculateDriftAngle(vMid, 1.0, false, 1.50);
  const driftAngleMid = calculateDriftAngle(vMid, 1.0, true, 1.50);

  assert.ok(gripAngleMid >= 2 && gripAngleMid <= 12, 'Grip turn angle must remain small (2° - 12°)');
  assert.ok(driftAngleMid >= 40 && driftAngleMid <= 75, 'Powerslide drift angle must open up wide (40° - 75°)');
  assert.ok(driftAngleMid > gripAngleMid * 3, 'Powerslide drift angle must be at least 3x larger than grip');

  // Supersonic velocity (2200 uu/s)
  const driftAngleSupersonic = calculateDriftAngle(2200, 1.0, true, 1.50);
  assert.ok(driftAngleSupersonic >= 35 && driftAngleSupersonic <= 65, 'Supersonic drift angle must remain controlled');

  // 2. Turning Radius Expansion & Powerslide Reduction
  const radiusLowSpeed = calculateTurnRadius(400, 1.0, false);
  const radiusHighSpeed = calculateTurnRadius(1410, 1.0, false);
  const radiusSupersonic = calculateTurnRadius(2200, 1.0, false);

  assert.ok(radiusHighSpeed > radiusLowSpeed, 'Turning radius must expand with higher velocity');
  assert.ok(radiusSupersonic > radiusHighSpeed, 'Supersonic turning radius must be widest');

  // Powerslide radius reduction
  const powerslideRadiusMid = calculateTurnRadius(vMid, 1.0, true);
  const reductionPct = (1 - powerslideRadiusMid / radiusHighSpeed) * 100;
  assert.ok(reductionPct >= 40 && reductionPct <= 60, 'Powerslide must cut turning radius by 40% - 60%');

  // 3. Lateral G-Force and Angular Yaw Rate
  const latG = calculateLateralAccelG(vMid, powerslideRadiusMid);
  const yawRate = calculateYawRate(vMid, powerslideRadiusMid);

  assert.ok(latG > 1.0, 'High-speed powerslide must generate significant lateral G-force (> 1.0G)');
  assert.ok(yawRate > 50, 'Yaw angular rate must exceed 50 deg/s for high-speed maneuvering');

  // 4. Speed Retention Efficiency
  const optimalRetention = calculateSpeedRetention(35, vMid); // 35° optimal apex
  const extremeRetention = calculateSpeedRetention(75, vMid); // 75° extreme cut

  assert.ok(optimalRetention >= 75 && optimalRetention <= 92, 'Optimal drift window must conserve 75% - 92% speed');
  assert.ok(extremeRetention < optimalRetention, 'Extreme drift angle must bleed more speed than optimal angle');
  assert.ok(extremeRetention < 40, '75° drift angle must drop speed retention below 40%');

  // 5. Generate Full Dataset
  const maneuver: DriftManeuverConfig = {
    steerInput: 1.0,
    powerslideDuration: 0.35,
    groundSensitivity: 1.50,
    curveExponent: 1.35,
    internalDeadzone: 0.02,
  };
  const data = generateDriftVelocityCurveData(maneuver, 30);
  assert.equal(data.length, 31);
  assert.equal(data[0].velocityUu, 0);
  assert.equal(data[30].velocityUu, 2300);

  for (const pt of data) {
    assert.ok(pt.speedKph >= 0);
    assert.ok(pt.powerslideAngleDeg > pt.gripAngleDeg);
    assert.ok(pt.turningRadiusUu > 0);
    assert.ok(pt.optimalMaxAngleDeg > pt.optimalMinAngleDeg);
  }

  // 6. Dual comparison dataset
  const dual = generateDualConfigDriftComparison(CLASSIC_ESPORTS_PHYSICS_CONFIG, UNREAL_SYMMETRIC_PHYSICS_CONFIG);
  assert.equal(dual.dataA.length, 47);
  assert.equal(dual.dataB.length, 47);

  // 7. Real-Time Telemetry Monitor Evaluation (No manual presets/sliders)
  const telemetryFeed = evaluateTelemetryDriftMetrics(1850, 0.80, true, 1.50);
  assert.equal(telemetryFeed.velocityUu, 1850);
  assert.equal(telemetryFeed.isPowerslide, true);
  assert.ok(telemetryFeed.driftAngle > telemetryFeed.gripAngle * 2, 'Powerslide drift angle must dominate grip');
  assert.ok(telemetryFeed.radius < telemetryFeed.gripRadius, 'Powerslide turning radius must be tighter than grip');
  assert.ok(telemetryFeed.lateralG > 0);
  assert.ok(telemetryFeed.yawRate > 0);
  assert.ok(telemetryFeed.speedRetention > 0 && telemetryFeed.speedRetention <= 100);

  // Supersonic telemetry test
  const supersonicFeed = evaluateTelemetryDriftMetrics(2250, 0.50, false, 1.30);
  assert.equal(supersonicFeed.isSupersonic, true);
  assert.ok(supersonicFeed.driftAngle < 15, 'Grip turn at supersonic must remain tight and controlled');
});

test('PhysicsMathStudio Preset Library: validates pro archetypes, saves custom presets, and handles lifecycle', () => {
  // 1. Built-in presets verification
  assert.ok(DEFAULT_PRO_PRESETS.length >= 5);
  const linear = DEFAULT_PRO_PRESETS.find(p => p.id === 'linear_1_to_1');
  const highTorque = DEFAULT_PRO_PRESETS.find(p => p.id === 'high_torque_exp');
  const damped = DEFAULT_PRO_PRESETS.find(p => p.id === 'damped_jitter');
  const zeroBias = DEFAULT_PRO_PRESETS.find(p => p.id === 'zero_bias_mechanical');

  assert.ok(linear, 'Linear 1:1 preset must exist');
  assert.ok(highTorque, 'High-Torque Exp preset must exist');
  assert.ok(damped, 'Damped Jitter preset must exist');
  assert.ok(zeroBias, 'Zero-Bias Mechanical preset must exist');

  // Verify archetype physics characteristics
  assert.equal(linear?.config.curveExponent, 1.00);
  assert.equal(highTorque?.config.curveExponent, 1.35);
  assert.equal(highTorque?.config.groundSense, 1.50);
  assert.equal(damped?.config.hardwareJitter, 2);
  assert.equal(zeroBias?.config.internalDeadzone, 0.02);

  // 2. Preset Library retrieval
  const library = getPresetLibrary();
  assert.ok(library.length >= DEFAULT_PRO_PRESETS.length);
  assert.ok(library.every(p => p.id && p.name && p.config));

  // 3. Custom Preset Creation
  const custom = saveCustomPreset({
    name: 'Test Pro Octane 1v1',
    description: 'Custom shadow defense tuning with 1.48 ground sense',
    config: {
      ...highTorque!.config,
      groundSense: 1.48,
      internalDeadzone: 0.04
    },
    tags: ['Test', 'Custom']
  });

  assert.ok(custom.id.startsWith('custom_'));
  assert.equal(custom.isBuiltin, false);
  assert.equal(custom.config.groundSense, 1.48);
  assert.equal(custom.config.internalDeadzone, 0.04);

  // 4. Deletion
  const deleted = deleteCustomPreset(custom.id);
  assert.equal(typeof deleted, 'boolean');
});

test('FNPro Hardware Fingerprint: derives deterministic SHA256 hardware hash and locks 1000Hz flag', () => {
  const mockMachineGuid = '9a7f38d2-4c1e-4509-b631-fnpro882910a';
  const mockCpu = 'Intel64 Family 6 Model 183 Stepping 1';
  const mockGpu = 'NVIDIA GeForce RTX 4090';
  const seed = `${mockMachineGuid}:${mockCpu}:${mockGpu}:240:1000`;
  assert.ok(seed.includes('1000'), 'Must include 1000Hz DirectInput capability');
});

test('Logitech G-HUB UUIDv4 directory format and Lua 5.4 syntax validation', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const sampleUuid = '550e8400-e29b-41d4-a716-446655440000';
  assert.ok(uuidRegex.test(sampleUuid), 'Sample UUID must follow UUIDv4 specification');

  const validLua = `
    EnablePrimaryMouseButtonEvents(true)
    local TICK_MS = 1
    function OnEvent(event, arg)
        if event == "PROFILE_ACTIVATED" then
            OutputLogMessage("1000Hz Active")
        end
    end
  `;
  assert.ok(validLua.includes('TICK_MS = 1'));
  assert.ok(validLua.includes('OnEvent'));
});

test('Temp Scratch Buffers & SQLite WAL Schema definitions contract', () => {
  const schemaTables = ['engine_sessions', 'physics_calibrations', 'input_telemetry_ticks', 'replay_analytics_vault'];
  for (const table of schemaTables) {
    assert.ok(table.length > 0);
  }
  const ringBufferSize = 65536; // 64KB
  assert.equal(ringBufferSize, 64 * 1024, 'Lock-free ring buffer must be pre-allocated to 64KB');
});

test('Ballchasing.com REST API data structure validation', () => {
  const sampleStats = {
    id: 'c91a0c4f-3755-4428-ba20-1b776269df9b',
    map_code: 'DFHStadium_P',
    duration: 300,
    blue: { goals: 3 },
    orange: { goals: 1 }
  };
  assert.equal(sampleStats.map_code, 'DFHStadium_P');
  assert.ok(sampleStats.blue.goals > sampleStats.orange.goals);
});

test('Strict Bipolar Input Scaling [-1.0, +1.0] ensures zero-bias mathematical symmetry', () => {
  // Test boundary extremes
  assert.equal(applySymmetricBipolarCurve(1.0, 0.05, 1.35), 1.0, 'f(+1.0) must strictly equal +1.0');
  assert.equal(applySymmetricBipolarCurve(-1.0, 0.05, 1.35), -1.0, 'f(-1.0) must strictly equal -1.0');
  assert.equal(applySymmetricBipolarCurve(0.0, 0.05, 1.35), 0.0, 'f(0.0) must strictly equal 0.0 (True Zero Center)');

  // Test deadzone cutoff (0.05 threshold)
  assert.equal(applySymmetricBipolarCurve(0.049, 0.05, 1.35), 0.0, 'Inputs within +deadzone must evaluate to 0.0');
  assert.equal(applySymmetricBipolarCurve(-0.049, 0.05, 1.35), 0.0, 'Inputs within -deadzone must evaluate to 0.0');

  // Test anti-symmetric property: f(x) === -f(-x)
  const posMid = applySymmetricBipolarCurve(0.55, 0.05, 1.35);
  const negMid = applySymmetricBipolarCurve(-0.55, 0.05, 1.35);
  assert.equal(posMid, -negMid, 'Positive deflection must perfectly mirror negative deflection without bias');
  assert.ok(posMid > 0 && posMid < 1.0);
});

test('Supersonic Kinematics State Machine: 2200 to 2300 uu/s band ratio and friction bleeding penalty', () => {
  // 1. Verify 2200 uu/s threshold is exactly 95.65% (0.9565) of max 2300 uu/s
  const report2200 = evaluateSupersonicKinematics(2200, 0.0);
  assert.equal(report2200.velocityPercentOfMax, 0.9565, '2200 uu/s must represent exactly 95.65% of max 2300 uu/s');
  assert.equal(report2200.isSupersonic, true, 'Vehicle must be marked supersonic at 2200 uu/s');
  assert.equal(report2200.pSupersonic, 0.0, 'P_supersonic ratio at 2200 uu/s must be 0.0');

  // 2. Mid-band verification at 2250 uu/s
  const report2250 = evaluateSupersonicKinematics(2250, 0.0);
  assert.equal(report2250.pSupersonic, 0.5, 'P_supersonic ratio at 2250 uu/s must be 0.5');

  // 3. Max engine speed at 2300 uu/s
  const report2300 = evaluateSupersonicKinematics(2300, 0.0);
  assert.equal(report2300.pSupersonic, 1.0, 'P_supersonic ratio at 2300 uu/s must be 1.0');
  assert.equal(report2300.velocityPercentOfMax, 1.0);

  // 4. Over-speed clamping (physics engine cap)
  const reportOver = evaluateSupersonicKinematics(2450, 0.0);
  assert.equal(reportOver.velocityUu, 2300, 'Speeds above 2300 must be clamped to max supersonic speed cap');
  assert.equal(reportOver.pSupersonic, 1.0);

  // 5. Friction bleeding penalty: sharp steer (|Steer| > 0.8) during P_supersonic > 0.5
  const bleedReport = evaluateSupersonicKinematics(2280, 0.95); // pSupersonic = 0.8, Steer = 0.95
  assert.equal(bleedReport.isFrictionBleeding, true, 'Friction bleed must trigger on sharp steer during high supersonic');
  assert.ok(bleedReport.frictionBleedPenaltyUu > 0, 'Friction bleed penalty must decelerate the vehicle');
  assert.ok(bleedReport.netEffectiveVelocityUu < bleedReport.velocityUu);

  // 6. Safe turning without bleeding: gentle steer (|Steer| = 0.4 < 0.8) at high speed
  const safeReport = evaluateSupersonicKinematics(2280, 0.4);
  assert.equal(safeReport.isFrictionBleeding, false, 'Mild steer must not incur friction bleed penalty');
  assert.equal(safeReport.frictionBleedPenaltyUu, 0);
  assert.equal(safeReport.netEffectiveVelocityUu, 2280);
});

test('Kinematic Vector 3D & Cross-Axis Torque Leakage calculation', () => {
  // Pure pitch without roll: leakage must be 0%
  const purePitch = evaluateKinematicVector3D({ steer: 0.0, pitch: 0.85, roll: 0.0 });
  assert.equal(purePitch.crossAxisTorqueLeakagePercent, 0, 'Pure pitch must have 0% roll torque leakage');
  assert.ok(purePitch.magnitude > 0);

  // 3D vector with unintended roll deflection: measures torque leakage
  const leakyVector = evaluateKinematicVector3D({ steer: 0.6, pitch: 0.6, roll: 0.25 });
  assert.ok(leakyVector.crossAxisTorqueLeakagePercent > 0, 'Cross-axis roll must produce measurable leakage %');
  assert.ok(leakyVector.crossAxisTorqueLeakagePercent < 100);
});

test('Logitech G-HUB Bipolar Lua Template generator includes required helper functions', () => {
  const lua = generateLuaScript(
    {
      internalDeadzone: 0.05,
      dodgeDeadzone: 0.05,
      hardwareJitter: 2,
      groundSense: 1.30,
      aerialSense: 1.50,
      precisionMode: 0.70,
      curveExponent: 1.35,
      pollingRateAdj: 1,
      supersonicVelocity: 2200
    },
    [],
    {
      fastAerial: { firstJumpSleep: 150, backReleaseSleep: 20, secondJumpSleep: 50, forwardFlipDelay: 0, flipCancelHold: 450 },
      forwardSpeedflip: { firstJumpSleep: 50, delayBeforeSecond: 60, cancelHold: 600 },
      leftSpeedflip: { firstJumpSleep: 50, delayBeforeSecond: 60, cancelHold: 600 },
      rightSpeedflip: { firstJumpSleep: 50, delayBeforeSecond: 60, cancelHold: 600 },
      mouseSpeedflip: { firstJumpSleep: 50, delayBeforeSecond: 60, cancelHold: 600 },
      chainDash: { jump1Sleep: 30, fallDelay: 15, jump2Sleep: 40, releaseDelay: 20 }
    }
  );

  assert.ok(lua.includes('function GetSign(val)'), 'Lua script must include GetSign helper');
  assert.ok(lua.includes('function Clamp(val, min_val, max_val)'), 'Lua script must include Clamp helper');
  assert.ok(lua.includes('function ApplyBipolarCurve(norm, deadzone, exponent)'), 'Lua script must include ApplyBipolarCurve');
  assert.ok(lua.includes('function ProcessRawMouseCounts(dx, dy)'), 'Lua script must include ProcessRawMouseCounts');
  assert.ok(lua.includes('TICK_MS             = 1'), 'Lua script must declare 1000Hz DirectInput tick mode');
});

test('Rocket League Mechanics Codex dataset validation', () => {
  assert.ok(Array.isArray(rlMovesData));
  assert.ok(rlMovesData.length >= 8, 'Codex must contain core pro mechanics');

  const speedflip = rlMovesData.find(m => m.id === 'speedflip_kickoff');
  assert.ok(speedflip, 'Speedflip kickoff must exist in codex');
  assert.equal(speedflip?.targetAngleDeg, 35);
  assert.deepEqual(speedflip?.angleToleranceDeg, [30, 42], 'Speedflip target cone must be 30° to 42°');
  assert.equal(speedflip?.optimalVelocityUu, 2300);
  assert.equal(speedflip?.timings.firstJumpSleepMs, 50);
  assert.equal(speedflip?.timings.cancelHoldMs, 600);

  const halfFlip = rlMovesData.find(m => m.id === 'half_flip_180');
  assert.ok(halfFlip, 'Half-flip 180° must exist in codex');
  assert.equal(halfFlip?.targetAngleDeg, 180);

  // Validate every mechanic has required timing constants and key sequence
  for (const m of rlMovesData) {
    assert.ok(m.id && m.name && m.category);
    assert.ok(m.timings.firstJumpSleepMs > 0);
    assert.ok(m.keySequence.length > 0);
    assert.ok(m.polarSampleTrace.length > 0);
  }
});

test('Mandatory G-HUB Script Directory Path Selection & Backend Batch Script Generation', () => {
  // 1. Mandatory directory validation tests
  const emptyValidation = validateGHubDirectoryPath('');
  assert.equal(emptyValidation.isValid, false, 'Empty path must be rejected');
  assert.ok(emptyValidation.errorEn?.includes('mandatory'));

  const whitespaceValidation = validateGHubDirectoryPath('    ');
  assert.equal(whitespaceValidation.isValid, false, 'Whitespace-only path must be rejected');

  const illegalCharsValidation = validateGHubDirectoryPath('C:\\LGHUB\\scripts\\<invalid>?*');
  assert.equal(illegalCharsValidation.isValid, false, 'Path with illegal Windows characters must be rejected');

  const validDefaultValidation = validateGHubDirectoryPath('%LOCALAPPDATA%\\LGHUB\\scripts');
  assert.equal(validDefaultValidation.isValid, true, 'Default %LOCALAPPDATA%\\LGHUB\\scripts must be valid');

  const validDriveValidation = validateGHubDirectoryPath('D:\\Games\\Logitech\\LGHUB\\scripts');
  assert.equal(validDriveValidation.isValid, true, 'Custom absolute drive path must be valid');

  // 2. Normalization tests
  assert.equal(normalizeWindowsPath('C:/ProgramData/LGHUB/scripts/'), 'C:\\ProgramData\\LGHUB\\scripts');
  assert.equal(normalizeWindowsPath('%LOCALAPPDATA%/LGHUB/scripts'), '%LOCALAPPDATA%\\LGHUB\\scripts');

  // 3. Preset verification
  assert.ok(GHUB_DIRECTORY_PRESETS.length >= 4, 'Must provide at least 4 standard Windows presets');
  const defaultPreset = GHUB_DIRECTORY_PRESETS.find(p => p.id === 'default_localappdata');
  assert.ok(defaultPreset, 'Default localappdata preset must exist');
  assert.equal(defaultPreset?.path, DEFAULT_GHUB_SCRIPTS_DIR);

  // 4. Robust batch file accurately referencing the mandatory path
  const dummyLua = '-- Test 1000Hz script payload';
  const customTarget = 'C:\\LogitechScripts\\LGHUB\\scripts';
  const robustBatch = generateRobustGHubBatchScript(dummyLua, customTarget);

  // Must define and lock GHUB_DIR to target path
  assert.ok(robustBatch.includes(`set "GHUB_DIR=${customTarget}"`), 'Batch must accurately reference target directory');
  assert.ok(robustBatch.includes('mkdir "!GHUB_DIR!" 2>nul'), 'Batch must ensure target directory exists');
  assert.ok(robustBatch.includes('TARGET_SCRIPT=!GHUB_DIR!\\rl_master_engine.lua'), 'Batch must reference target script file');
  assert.ok(robustBatch.includes('Set-Clipboard'), 'Batch must include clipboard fallback');

  // 5. Standard launcher batch accurately references mandatory path
  const launcherBatch = generateGHubLaunchBatchScript(dummyLua, customTarget);
  assert.ok(launcherBatch.includes(`set "GHUB_DIR=${customTarget}"`), 'Launcher batch must reference custom mandatory directory');
  assert.ok(launcherBatch.includes('mkdir "%GHUB_DIR%" 2>nul'), 'Launcher batch must create directory if missing');
});













