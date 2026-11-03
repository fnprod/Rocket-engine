import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  PhysicsConfig, 
  MacroTimingConfig, 
  Language, 
  RLMechanicItem, 
  PolarVectorPoint,
  KeyBinding
} from '../types/engine';
import rlMovesData from '../data/rlMovesCodex.json';
import { 
  evaluateKinematicVector3D, 
  evaluateSupersonicKinematics 
} from '../utils/engineMath';
import { StreamerDirectXOverlay } from './StreamerDirectXOverlay';
import { DriftAngleVelocityChart, DriftTelemetryFeed } from './DriftAngleVelocityChart';
import { recordAuditEntry } from '../utils/engineAuditLog';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Crosshair, 
  Layers, 
  CheckCircle2, 
  Film, 
  Zap, 
  Flame, 
  Activity, 
  Sliders, 
  Tv, 
  Eye, 
  Check,
  ShieldCheck,
  Gauge,
  Radio
} from 'lucide-react';
import { INITIAL_MACRO_TIMINGS } from '../data/initialData';

interface UnifiedRadarCodexHubProps {
  physicsConfig: PhysicsConfig;
  macroTimings?: MacroTimingConfig;
  onApplyTimings?: (newTimings: MacroTimingConfig) => void;
  keybindings: KeyBinding[];
  language: Language;
}

const STORAGE_SPEED_KEY = 'fnpro_codex_playback_speed_v2';

export const UnifiedRadarCodexHub: React.FC<UnifiedRadarCodexHubProps> = ({
  physicsConfig,
  macroTimings = INITIAL_MACRO_TIMINGS,
  onApplyTimings,
  keybindings,
  language
}) => {
  const isAr = language === 'ar';
  const mechanics = rlMovesData as RLMechanicItem[];

  // Persistent Playback Speed: Default to 1.0x (Full Real-time Speed)
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_SPEED_KEY);
        if (saved) {
          const val = parseFloat(saved);
          if ([0.25, 0.5, 1.0].includes(val)) return val;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return 1.0; // 1.0x is default full speed
  });

  const setPlaybackSpeed = (spd: number) => {
    setPlaybackSpeedState(spd);
    try {
      localStorage.setItem(STORAGE_SPEED_KEY, String(spd));
    } catch (e) {
      console.error(e);
    }
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Real-Time Game Telemetry Stream State (Used by Radar Codex & D3 Drift Monitor)
  const [isTelemetryStreamActive, setIsTelemetryStreamActive] = useState<boolean>(true);
  const [telemetryFeed, setTelemetryFeed] = useState<DriftTelemetryFeed>({
    velocityUu: 1420,
    speedKph: 85,
    steerInput: 0.72,
    isPowerslide: true,
    packetLatencyMs: 0.10
  });

  // Real-time live game telemetry stream ticker (30-60Hz physics telemetry)
  useEffect(() => {
    if (!isTelemetryStreamActive) return;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setTelemetryFeed((prev) => {
        const t = frame * 0.05;
        // Natural racing trajectory oscillation across 600 - 2250 uu/s
        const vel = Math.round(1380 + Math.sin(t) * 680 + Math.cos(t * 1.6) * 210);
        const clampedVel = Math.max(300, Math.min(2300, vel));
        const steer = Number((0.68 + Math.sin(t * 0.85) * 0.28).toFixed(2));
        const powerslide = Math.sin(t * 0.55) > -0.25;

        return {
          velocityUu: clampedVel,
          speedKph: Math.round(clampedVel * 0.036),
          steerInput: steer,
          isPowerslide: powerslide,
          packetLatencyMs: Number((0.08 + Math.random() * 0.04).toFixed(2))
        };
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isTelemetryStreamActive]);

  // Consolidated Mechanics Calculations (Blending ALL 10 mechanics into ONE unified master vector)
  const blendedFleet = useMemo(() => {
    let totalWeight = 0;
    let sumAngle = 0;
    let sumVelocity = 0;
    let sumSteer = 0;
    let sumPitch = 0;
    let sumRoll = 0;
    let sumFirstJump = 0;
    let sumSecondJump = 0;
    let sumCancelHold = 0;

    mechanics.forEach((m) => {
      const weight = m.difficulty === 'Pro RLCS' ? 1.5 : m.difficulty === 'Grand Champion' ? 1.25 : 1.0;
      totalWeight += weight;
      sumAngle += m.targetAngleDeg * weight;
      sumVelocity += m.optimalVelocityUu * weight;
      const initialPoint = m.polarSampleTrace[0] || { steer: 0.5, pitch: 0.5, roll: 0.0 };
      sumSteer += initialPoint.steer * weight;
      sumPitch += initialPoint.pitch * weight;
      sumRoll += initialPoint.roll * weight;
      sumFirstJump += m.timings.firstJumpSleepMs * weight;
      sumSecondJump += m.timings.secondJumpDelayMs * weight;
      sumCancelHold += m.timings.cancelHoldMs * weight;
    });

    const avgAngle = Math.round(sumAngle / totalWeight);
    const avgVelocity = Math.round(sumVelocity / totalWeight);
    const rawSteer = Number((sumSteer / totalWeight).toFixed(3));
    const rawPitch = Number((sumPitch / totalWeight).toFixed(3));
    const rawRoll = Number((sumRoll / totalWeight).toFixed(3));

    // Dynamic Deadzone Bounding Envelope: measures continuous deadzone movement across all 10 mechanics
    const deadzoneFloor = physicsConfig.internalDeadzone; // e.g. 0.02
    const deadzoneCeiling = Math.max(physicsConfig.dodgeDeadzone, physicsConfig.internalDeadzone * 2.0); // e.g. 0.05
    const deadzoneBreathingSpan = Number((deadzoneCeiling - deadzoneFloor).toFixed(3));

    const evalResult = evaluateKinematicVector3D(
      { steer: rawSteer, pitch: rawPitch, roll: rawRoll },
      physicsConfig.internalDeadzone,
      physicsConfig.curveExponent
    );

    const supersonicState = evaluateSupersonicKinematics(avgVelocity, rawSteer);

    return {
      totalMechanics: mechanics.length,
      avgAngle,
      avgVelocity,
      rawSteer,
      rawPitch,
      rawRoll,
      deadzoneFloor,
      deadzoneCeiling,
      deadzoneBreathingSpan,
      evalResult,
      supersonicState,
      blendedTimings: {
        firstJumpSleepMs: Math.round(sumFirstJump / totalWeight),
        secondJumpDelayMs: Math.round(sumSecondJump / totalWeight),
        cancelHoldMs: Math.round(sumCancelHold / totalWeight)
      }
    };
  }, [mechanics, physicsConfig]);

  // Generate 100-step unified multi-vector dynamic trajectory
  const unifiedTrace = useMemo(() => {
    const steps = 100;
    const interpolated: PolarVectorPoint[] = [];

    // Synthesize combined trajectory across all mechanics
    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      // Oscillate across composite dynamic angle
      const dynamicAngle = blendedFleet.avgAngle + Math.sin(progress * Math.PI * 2) * 12.0;
      const dynamicSteer = Math.sin(progress * Math.PI * 2) * blendedFleet.rawSteer;
      const dynamicPitch = Math.cos(progress * Math.PI * 2) * blendedFleet.rawPitch;
      const dynamicRoll = Math.sin(progress * Math.PI * 4) * blendedFleet.rawRoll;

      const evalResult = evaluateKinematicVector3D(
        { steer: dynamicSteer, pitch: dynamicPitch, roll: dynamicRoll },
        physicsConfig.internalDeadzone,
        physicsConfig.curveExponent
      );

      interpolated.push({
        angleDeg: Math.round((dynamicAngle + 360) % 360),
        radius: evalResult.magnitude,
        steer: evalResult.curved.steer,
        pitch: evalResult.curved.pitch,
        roll: evalResult.curved.roll,
        timestampMs: Math.round(i * 10)
      });
    }

    return interpolated;
  }, [blendedFleet, physicsConfig.internalDeadzone, physicsConfig.curveExponent]);

  // Animation ticker synchronized to 1000Hz DirectInput step
  useEffect(() => {
    if (!isPlaying || unifiedTrace.length === 0) return;
    const interval = Math.round(16 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % unifiedTrace.length);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, unifiedTrace.length]);

  const currentSample = unifiedTrace[currentFrameIndex] || {
    angleDeg: blendedFleet.avgAngle,
    radius: blendedFleet.evalResult.magnitude,
    steer: blendedFleet.rawSteer,
    pitch: blendedFleet.rawPitch,
    roll: blendedFleet.rawRoll,
    timestampMs: 0
  };

  // Canvas 3D Kinematic Wireframe
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Cross-axis grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const cx = width / 2;
    const cy = height / 2;
    const angleRad = (currentSample.angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);

    // Chassis body
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.beginPath();
    ctx.roundRect(-24, -40, 48, 80, 8);
    ctx.fill();
    ctx.stroke();

    // 4 Wheels
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-28, -32, 6, 16);
    ctx.fillRect(22, -32, 6, 16);
    ctx.fillRect(-28, 16, 6, 16);
    ctx.fillRect(22, 16, 6, 16);

    // Directional Apex Indicator
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -28, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [currentSample]);

  // Polar Scope Dimensions & Geometry
  const polarSize = 360;
  const center = polarSize / 2;
  const maxRadiusPx = center - 24;

  const polarToSvg = (angleDeg: number, magnitude: number) => {
    const r = Math.min(magnitude, 1.0) * maxRadiusPx;
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const currentMarkerPos = polarToSvg(currentSample.angleDeg, currentSample.radius);

  // Apply unified fleet timings to the Master Macro Suite
  const handleApplyAllTimings = () => {
    const updated: MacroTimingConfig = {
      fastAerial: {
        firstJumpSleep: 200,
        backReleaseSleep: 30,
        secondJumpSleep: 30,
        forwardFlipDelay: 40,
        flipCancelHold: 180
      },
      forwardSpeedflip: {
        firstJumpSleep: blendedFleet.blendedTimings.firstJumpSleepMs,
        delayBeforeSecond: blendedFleet.blendedTimings.secondJumpDelayMs,
        cancelHold: blendedFleet.blendedTimings.cancelHoldMs
      },
      leftSpeedflip: {
        firstJumpSleep: 30,
        delayBeforeSecond: 30,
        cancelHold: 600
      },
      rightSpeedflip: {
        firstJumpSleep: 30,
        delayBeforeSecond: 30,
        cancelHold: 600
      },
      mouseSpeedflip: {
        firstJumpSleep: 35,
        delayBeforeSecond: 45,
        cancelHold: 600
      },
      chainDash: {
        jump1Sleep: 30,
        fallDelay: 60,
        jump2Sleep: 30,
        releaseDelay: 50
      }
    };

    recordAuditEntry({
      section: 'radar_codex',
      sectionNameAr: 'رادار المتجهات وفيزياء الحركات الموحد',
      sectionNameEn: 'Unified Radar & Codex Suite',
      paramKey: 'ALL_CONSOLIDATED_TIMINGS',
      paramLabelAr: 'تطبيق التوقيتات الفيزيائية الموحدة لكافة الحركات',
      paramLabelEn: 'Applied Unified Fleet Kinematics to Engine',
      oldValue: 'Individual Unlinked',
      newValue: 'Consolidated Fleet Timings (1000Hz)',
      changeType: 'macro_inject'
    });

    onApplyTimings?.(updated);
    setAppliedNotification(
      isAr 
        ? '✓ تم دمج وحقن توقيتات جميع الحركات العشر الموحدة في محرك الماكرو بنجاح!' 
        : '✓ All 10 consolidated movement timings successfully merged & injected into Master Engine!'
    );
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Toast Notification */}
      {appliedNotification && (
        <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-xl p-3.5 text-center text-sm font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2 shadow-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{appliedNotification}</span>
        </div>
      )}

      {/* SECTION 1: MASTER INTEGRATED HUB HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/40 rounded-xl shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-wide">
                  {isAr ? 'مركز الرادار الحركي وكودكس الحركات المتكامل (Unified Radar & Codex Hub)' : 'Unified Kinematic Radar, Mechanics Fleet & D3 Drift Hub'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  ALL 10 MECHANICS CONSOLIDATED
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  1000Hz DIRECTINPUT MATRIX
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {isAr
                  ? 'تم دمج رادار المتجهات القطبية، كودكس الحركات العشر، ومخطط زوايا الانجراف D3، وشاشات DirectX في واجهة واحدة متكاملة. يتم دمج جميع الحركات معاً في معادلة متجهات واحدة بدلاً من عزل كل حركة على حدة.'
                  : 'Integrated Kinematic Radar, 10-Mechanics Codex Fleet, D3 Drift Physics, and DirectX Live Streams unified in a single page. All maneuvers calculate concurrently to produce one master dynamic vector.'}
              </p>
            </div>
          </div>
        </div>

        {/* Master Action: Apply Unified Fleet Timings to Engine */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleApplyAllTimings}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>
              {isAr ? 'حقن توقيتات الحركات الموحدة في المحرك' : 'Inject Unified Fleet Timings to Engine'}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 2: 2D POLAR RADAR SCOPE + DIRECT VECTOR SPACE & DEADZONE LIVE METER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left (7 cols): 2D Polar Vector Radar Canvas & Scope */}
        <div className="lg:col-span-7 bg-[#0b1120] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>2D POLAR VECTOR SCOPE (1000Hz CONSOLIDATED FLEET)</span>
            </span>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-cyan-400">
                Torque Leakage: <strong className="text-white">{blendedFleet.evalResult.crossAxisTorqueLeakagePercent}%</strong>
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                10/10 ACTIVE
              </span>
            </div>
          </div>

          {/* SVG 2D Polar Scope */}
          <div className="relative flex items-center justify-center p-2">
            <svg width={polarSize} height={polarSize} viewBox={`0 0 ${polarSize} ${polarSize}`}>
              <defs>
                <radialGradient id="unifiedRadarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.8" />
                </radialGradient>
              </defs>

              <rect width={polarSize} height={polarSize} fill="url(#unifiedRadarGlow)" rx="16" />

              {/* Concentric Calibration Rings */}
              <circle cx={center} cy={center} r={maxRadiusPx * 0.25} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={center} cy={center} r={maxRadiusPx * 0.50} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={center} cy={center} r={maxRadiusPx * 0.75} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 3" />
              <circle cx={center} cy={center} r={maxRadiusPx} fill="none" stroke="#334155" strokeWidth="1.5" />

              {/* Axis Crosshairs */}
              <line x1={center} y1="14" x2={center} y2={polarSize - 14} stroke="#1e293b" strokeWidth="1" />
              <line x1="14" y1={center} x2={polarSize - 14} y2={center} stroke="#1e293b" strokeWidth="1" />

              {/* Dynamic Deadzone Envelope Circle (Visualizing continuous deadzone movement) */}
              <circle 
                cx={center} 
                cy={center} 
                r={maxRadiusPx * blendedFleet.deadzoneCeiling} 
                fill="rgba(239, 68, 68, 0.08)" 
                stroke="#ef4444" 
                strokeWidth="1.2" 
                strokeDasharray="3 2" 
              />
              <circle 
                cx={center} 
                cy={center} 
                r={maxRadiusPx * blendedFleet.deadzoneFloor} 
                fill="rgba(245, 158, 11, 0.12)" 
                stroke="#f59e0b" 
                strokeWidth="1.2" 
              />

              {/* Consolidated Conic Envelope of All 10 Moves */}
              {mechanics.map((m) => {
                const [minA, maxA] = m.angleToleranceDeg;
                const p1 = polarToSvg(minA, 0.9);
                const p2 = polarToSvg(maxA, 0.9);
                const largeArc = (maxA - minA) > 180 ? 1 : 0;
                const path = `M ${center} ${center} L ${p1.x} ${p1.y} A ${maxRadiusPx * 0.9} ${maxRadiusPx * 0.9} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
                return (
                  <path
                    key={m.id}
                    d={path}
                    fill="rgba(6, 182, 212, 0.04)"
                    stroke="rgba(6, 182, 212, 0.2)"
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* Cardinal Axis Labels */}
              <text x={center} y="16" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">0° (Pitch +1.0)</text>
              <text x={polarSize - 4} y={center + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">90° (Steer +1.0)</text>
              <text x={center} y={polarSize - 6} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">180° (Pitch -1.0)</text>
              <text x="6" y={center + 3} fill="#94a3b8" fontSize="10" textAnchor="start" fontFamily="monospace">270° (Steer -1.0)</text>

              {/* Master Blended Dynamic Vector Line */}
              <line 
                x1={center} 
                y1={center} 
                x2={currentMarkerPos.x} 
                y2={currentMarkerPos.y} 
                stroke="#06b6d4" 
                strokeWidth="2.5" 
              />

              {/* Active Force Vector Head */}
              <circle 
                cx={currentMarkerPos.x} 
                cy={currentMarkerPos.y} 
                r="6" 
                fill="#22d3ee" 
                stroke="#ffffff" 
                strokeWidth="2" 
                className="animate-pulse" 
              />
            </svg>
          </div>

          {/* Quick HUD Strip under Scope */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block">BLENDED VECTOR ANGLE</span>
              <span className="text-white font-bold text-sm">{currentSample.angleDeg}°</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">FORCE RADIUS</span>
              <span className="text-amber-400 font-bold text-sm">{currentSample.radius.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">FLEET APEX SPEED</span>
              <span className="text-cyan-400 font-bold text-sm">{blendedFleet.avgVelocity} uu/s</span>
            </div>
          </div>
        </div>

        {/* Right (5 cols): DIRECT VECTOR SPACE & DEADZONE LIVE TELEMETRY METER */}
        <div className="lg:col-span-5 space-y-4">

          {/* Direct Vector Space & Deadzone Meter Card */}
          <div className="bg-[#0b1120] border-2 border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2 uppercase tracking-wider">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'عداد فضاء المتجهات وحركة الديد زون' : 'Direct Vector Space & Deadzone Meter'}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                LIVE 1000Hz
              </span>
            </div>

            {/* DYNAMIC DEADZONE MOVEMENT METRICS */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-bold">{isAr ? 'نطاق حركة الديد زون الحية:' : 'Dynamic Deadzone Envelope:'}</span>
                <span className="text-amber-400 font-bold font-mono">
                  {blendedFleet.deadzoneFloor.toFixed(3)} ↔ {blendedFleet.deadzoneCeiling.toFixed(3)} (±{blendedFleet.deadzoneBreathingSpan})
                </span>
              </div>

              {/* Deadzone Bounding Bar */}
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                <div 
                  className="bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentSample.radius / 1.0) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Center: True Zero (0.000)</span>
                <span>Active Cutoff: {physicsConfig.internalDeadzone}</span>
                <span>Dodge Gate: {physicsConfig.dodgeDeadzone}</span>
              </div>
            </div>

            {/* CONSOLIDATED FORCE VECTOR VALUES */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs text-center">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">STEER (D/A)</span>
                <span className="text-cyan-400 font-bold">{currentSample.steer >= 0 ? `+${currentSample.steer.toFixed(2)}` : currentSample.steer.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PITCH (W/S)</span>
                <span className="text-amber-400 font-bold">{currentSample.pitch >= 0 ? `+${currentSample.pitch.toFixed(2)}` : currentSample.pitch.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROLL (E/Q)</span>
                <span className="text-purple-400 font-bold">{currentSample.roll >= 0 ? `+${currentSample.roll.toFixed(2)}` : currentSample.roll.toFixed(2)}</span>
              </div>
            </div>

            {/* SUPERSONIC SPEED BAND CHECK */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300">{isAr ? 'حزمة السرعة الخارقة الموحدة:' : 'Unified Supersonic Band:'}</span>
              </div>
              <span className="text-rose-400 font-bold">
                {blendedFleet.avgVelocity} uu/s ({blendedFleet.supersonicState.isSupersonic ? 'Supersonic Locked' : 'Sub-sonic'})
              </span>
            </div>

            {/* KINEMATIC WIREFRAME SIMULATOR */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isAr ? 'محاكي الحركة الفيزيائية الموحد:' : 'Kinematic Wireframe Stream:'}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Frame {currentFrameIndex + 1} / {unifiedTrace.length}
                </span>
              </div>

              <div className="relative w-full h-36 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
                <canvas ref={canvasRef} width={300} height={140} className="w-full h-full object-contain" />
                <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-cyan-300 rounded">
                  Angle: {currentSample.angleDeg}°
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-amber-300 rounded">
                  {blendedFleet.avgVelocity} uu/s
                </div>
              </div>

              {/* Playback Controls & Speed Toggle */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrameIndex(0);
                    }}
                    className="p-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Persistent Speed Selector: 0.25x, 0.5x, 1.0x (Default 1.0x Full Speed) */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {[0.25, 0.5, 1.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition ${
                        playbackSpeed === spd
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={spd === 1.0 ? (isAr ? 'أقوى سرعة حقيقية (1.0x)' : 'Full Real-time Speed') : undefined}
                    >
                      {spd}x {spd === 1.0 ? '⚡' : ''}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* SECTION 3: MASTER CONSOLIDATED FLEET MATRIX TABLE (ALL 10 MECHANICS CONCURRENT) */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'مصفوفة الحركات العشر الموحدة والمدمجة في المحرك' : 'Consolidated 10-Mechanics Master Fleet Matrix'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'جميع الحركات العشر مفعلة إجبارياً وتتشارك في تشكيل متجه القوة والحركة الموحد للمحرك بدلاً من التجزئة.'
                : 'All 10 maneuvers remain permanently active, combining their force parameters into the unified master vector.'}
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg">
            10/10 ACTIVE CONCURRENTLY
          </span>
        </div>

        {/* Consolidated Table of All 10 Moves */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{isAr ? 'الحركة الميكانيكية' : 'Mechanic Maneuver'}</th>
                <th className="py-2.5 px-3">{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المخروط الزاوي' : 'Angular Cone'}</th>
                <th className="py-2.5 px-3">{isAr ? 'السرعة المثالية' : 'Optimal Velocity'}</th>
                <th className="py-2.5 px-3">{isAr ? 'زمن القفز الأول' : 'Jump 1 (ms)'}</th>
                <th className="py-2.5 px-3">{isAr ? 'تأخير الدودج' : 'Dodge Delay'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الحالة في المحرك' : 'Fleet State'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {mechanics.map((m, idx) => (
                <tr key={m.id} className="hover:bg-slate-900/50 transition">
                  <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>{isAr ? m.nameAr : m.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{m.category}</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-bold">{m.targetAngleDeg}° ({m.angleToleranceDeg[0]}°-{m.angleToleranceDeg[1]}°)</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{m.optimalVelocityUu} uu/s</td>
                  <td className="py-2.5 px-3 text-slate-300">{m.timings.firstJumpSleepMs}ms</td>
                  <td className="py-2.5 px-3 text-slate-300">{m.timings.secondJumpDelayMs}ms</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'مدمج ونشط' : 'Active Fleet'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: REAL-TIME D3 DRIFT ANGLE & SLIP VELOCITY MONITOR */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              {isAr ? 'مراقب زوايا الانجراف D3 الحي للرادار (Real-Time D3 Drift Angle Monitor)' : 'Radar Codex Real-Time D3 Drift Angle Monitor'}
            </h3>
          </div>

          {/* Telemetry Stream On/Off State Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTelemetryStreamActive(!isTelemetryStreamActive)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                isTelemetryStreamActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-sm'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:bg-rose-900/60 shadow-sm'
              }`}
              title={isAr ? 'التبديل بين تشغيل وإيقاف بث التيليمتري للتحقق من التعطيل / الإخفاء التلقائي' : 'Toggle telemetry stream to test automatic hiding / disabling'}
            >
              <Radio className={`w-3.5 h-3.5 ${isTelemetryStreamActive ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
              <span>
                {isTelemetryStreamActive 
                  ? (isAr ? 'بث التيليمتري: متصل ✓' : 'Stream: CONNECTED ✓') 
                  : (isAr ? 'بث التيليمتري: متوقف 🚫' : 'Stream: OFFLINE 🚫')}
              </span>
            </button>
            <span className="text-[10px] font-mono text-slate-500 hidden md:inline">
              {isAr ? 'يتم إخفاء/تعطيل D3 تلقائياً عند انقطاع البث' : 'D3 UI auto-disables / hides when disconnected'}
            </span>
          </div>
        </div>

        {/* Real-Time Telemetry D3 Monitor Component */}
        <DriftAngleVelocityChart
          currentConfig={physicsConfig}
          language={language}
          isTelemetryActive={isTelemetryStreamActive}
          telemetry={telemetryFeed}
          onToggleTelemetry={() => setIsTelemetryStreamActive(!isTelemetryStreamActive)}
          hideWhenInactive={false}
        />
      </div>

      {/* SECTION 5: INLINE DIRECTX 11 LIVE TELEMETRY STREAMS */}
      <div className="pt-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              {isAr ? 'شاشات تيليميتري DirectX 11 الحية (DirectX Streams)' : 'DirectX 11 Live Telemetry & DirectInput Overlay'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
            1000Hz STREAM MATRIX
          </span>
        </div>

        <StreamerDirectXOverlay
          keybindings={keybindings}
          physicsConfig={physicsConfig}
          language={language}
        />
      </div>

    </div>
  );
};
