import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  PhysicsConfig, 
  MacroTimingConfig, 
  Language, 
  RLMechanicItem,
  PolarVectorPoint
} from '../types/engine';
import rlMovesData from '../data/rlMovesCodex.json';
import { 
  applySymmetricBipolarCurve, 
  evaluateKinematicVector3D, 
  evaluateSupersonicKinematics 
} from '../utils/engineMath';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Zap, 
  Compass, 
  Crosshair, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Film, 
  Sliders, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Activity,
  Flame,
  Volume2
} from 'lucide-react';

interface MechanicsCodexProps {
  physicsConfig: PhysicsConfig;
  macroTimings: MacroTimingConfig;
  onApplyTimings: (newTimings: MacroTimingConfig) => void;
  language: Language;
}

export const MechanicsCodex: React.FC<MechanicsCodexProps> = ({
  physicsConfig,
  macroTimings,
  onApplyTimings,
  language
}) => {
  const isAr = language === 'ar';
  const mechanics = rlMovesData as RLMechanicItem[];

  // Selected mechanic state
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('speedflip_kickoff');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Playback / Frame scrubber state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5); // 0.25x, 0.5x, 1.0x
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Active mechanic object
  const activeMechanic = useMemo(() => {
    return mechanics.find(m => m.id === selectedMechanicId) || mechanics[0];
  }, [mechanics, selectedMechanicId]);

  // Filtered categories
  const filteredMechanics = useMemo(() => {
    if (selectedCategory === 'All') return mechanics;
    return mechanics.filter(m => m.category === selectedCategory);
  }, [mechanics, selectedCategory]);

  // Generate continuous high-resolution 1000Hz sampled points for the active move
  const sampleTrace = useMemo(() => {
    const rawTrace = activeMechanic.polarSampleTrace || [];
    if (rawTrace.length === 0) return [];

    // Interpolate points into a 100-step smooth continuous curve
    const steps = 100;
    const interpolated: PolarVectorPoint[] = [];

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const segmentProgress = progress * (rawTrace.length - 1);
      const segIndex = Math.min(Math.floor(segmentProgress), rawTrace.length - 2);
      const segFraction = segmentProgress - segIndex;

      const p0 = rawTrace[segIndex];
      const p1 = rawTrace[segIndex + 1] || p0;

      const steer = p0.steer + (p1.steer - p0.steer) * segFraction;
      const pitch = p0.pitch + (p1.pitch - p0.pitch) * segFraction;
      const roll = p0.roll + (p1.roll - p0.roll) * segFraction;

      const evalResult = evaluateKinematicVector3D(
        { steer, pitch, roll },
        physicsConfig.internalDeadzone,
        physicsConfig.curveExponent
      );

      interpolated.push({
        angleDeg: evalResult.angleDeg,
        radius: evalResult.magnitude,
        steer: evalResult.curved.steer,
        pitch: evalResult.curved.pitch,
        roll: evalResult.curved.roll,
        timestampMs: Math.round(i * 10)
      });
    }

    return interpolated;
  }, [activeMechanic, physicsConfig.internalDeadzone, physicsConfig.curveExponent]);

  // Frame animation loop
  useEffect(() => {
    if (!isPlaying || sampleTrace.length === 0) return;

    const interval = Math.round(16 / playbackSpeed); // ~60 FPS adjusted for speed
    const timer = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % sampleTrace.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sampleTrace.length]);

  // Current active frame sample
  const currentSample = sampleTrace[currentFrameIndex] || {
    angleDeg: activeMechanic.targetAngleDeg,
    radius: 0.8,
    steer: 0.5,
    pitch: 0.5,
    roll: 0.0,
    timestampMs: 0
  };

  // Cross-axis torque leakage calculation at current frame
  const currentLeakage = useMemo(() => {
    const rawLeak = Math.abs(currentSample.roll) * 100;
    return Math.min(100, Math.round(rawLeak * 10) / 10);
  }, [currentSample.roll]);

  // Supersonic state evaluation for active mechanic
  const supersonicReport = useMemo(() => {
    return evaluateSupersonicKinematics(
      activeMechanic.optimalVelocityUu,
      currentSample.steer
    );
  }, [activeMechanic.optimalVelocityUu, currentSample.steer]);

  // Handle "Apply Timings to Engine"
  const handleApplyTimings = () => {
    const t = activeMechanic.timings;
    const updated: MacroTimingConfig = {
      ...macroTimings,
      forwardSpeedflip: {
        firstJumpSleep: t.firstJumpSleepMs,
        delayBeforeSecond: t.secondJumpDelayMs,
        cancelHold: t.cancelHoldMs
      },
      mouseSpeedflip: {
        firstJumpSleep: t.firstJumpSleepMs,
        delayBeforeSecond: t.secondJumpDelayMs,
        cancelHold: t.cancelHoldMs
      },
      fastAerial: {
        firstJumpSleep: t.firstJumpSleepMs,
        backReleaseSleep: 20,
        secondJumpSleep: t.secondJumpDelayMs,
        forwardFlipDelay: 0,
        flipCancelHold: t.cancelHoldMs
      },
      chainDash: {
        jump1Sleep: t.firstJumpSleepMs,
        fallDelay: 15,
        jump2Sleep: t.secondJumpDelayMs,
        releaseDelay: 20
      }
    };

    onApplyTimings(updated);
    setAppliedNotification(
      isAr 
        ? `تم تطبيق توقيتات ${activeMechanic.nameAr} على محرك الماكرو بنجاح!` 
        : `Successfully applied ${activeMechanic.name} physical timings to Engine Macro Timelines!`
    );
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // Canvas ref for wireframe car representation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw coordinate grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Render wireframe car chassis oriented by currentSample steer/pitch/roll
    const cx = width / 2;
    const cy = height / 2;
    const angleRad = (currentSample.angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);

    // Car body wireframe
    ctx.strokeStyle = supersonicReport.isSupersonic ? '#22d3ee' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillStyle = supersonicReport.isSupersonic ? 'rgba(34, 211, 238, 0.15)' : 'rgba(56, 189, 248, 0.08)';

    ctx.beginPath();
    // Octane-style stylized hitbox
    ctx.moveTo(0, -45); // Nose
    ctx.lineTo(24, -30);
    ctx.lineTo(22, 35);
    ctx.lineTo(16, 45); // Rear right
    ctx.lineTo(-16, 45); // Rear left
    ctx.lineTo(-22, 35);
    ctx.lineTo(-24, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spoiler & Windshield accents
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, 38);
    ctx.lineTo(18, 38);
    ctx.moveTo(-14, -10);
    ctx.lineTo(14, -10);
    ctx.stroke();

    // Wheels (4 contacts)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-28, -28, 6, 16); // Front Left
    ctx.fillRect(22, -28, 6, 16);  // Front Right
    ctx.fillRect(-28, 20, 7, 18);  // Rear Left
    ctx.fillRect(21, 20, 7, 18);   // Rear Right

    // Boost flame effect when supersonic
    if (supersonicReport.isSupersonic) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-10, 46);
      ctx.lineTo(0, 70);
      ctx.lineTo(10, 46);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [currentSample, supersonicReport.isSupersonic]);

  // Polar Scope Geometry calculations
  const polarSize = 340;
  const center = polarSize / 2;
  const maxRadiusPx = center - 24;

  // Converts polar coordinates (angle in degrees, radius 0-1) to SVG (x, y)
  const polarToSvg = (angleDeg: number, radius: number) => {
    // 0 deg = top (pitch +1.0)
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const r = radius * maxRadiusPx;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  // Generate SVG path for sample trace
  const tracePathD = useMemo(() => {
    if (sampleTrace.length === 0) return '';
    return sampleTrace.reduce((acc, pt, idx) => {
      const { x, y } = polarToSvg(pt.angleDeg, pt.radius);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [sampleTrace]);

  // Target cone slice arc
  const targetConeSvgPath = useMemo(() => {
    const [minA, maxA] = activeMechanic.angleToleranceDeg;
    const r = maxRadiusPx;
    const p1 = polarToSvg(minA, 1.0);
    const p2 = polarToSvg(maxA, 1.0);
    const largeArc = (maxA - minA) > 180 ? 1 : 0;
    return `M ${center} ${center} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
  }, [activeMechanic.angleToleranceDeg, center, maxRadiusPx]);

  const currentMarkerPos = polarToSvg(currentSample.angleDeg, currentSample.radius);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Applied Notification Banner */}
      {appliedNotification && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3.5 text-center text-sm font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2 shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{appliedNotification}</span>
        </div>
      )}

      {/* Top Banner: Active Mechanic Header & Kinematic Status */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isAr ? activeMechanic.nameAr : activeMechanic.name}
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                activeMechanic.difficulty === 'Pro RLCS' 
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50' 
                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50'
              }`}>
                {activeMechanic.difficulty}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                {activeMechanic.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {isAr ? activeMechanic.descriptionAr : activeMechanic.description}
            </p>
          </div>
        </div>

        {/* Action: Apply Timings Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleApplyTimings}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-lg shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{isAr ? 'تطبيق التوقيتات على المحرك' : 'Apply Timings to Engine'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2D Polar Vector Scope (Left) & RL Moves Codex / Media (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ------------------------------------------------------------- */}
        {/* Left Col (7 cols): 2D POLAR VECTOR SCOPE                      */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-7 bg-[#0b1120] border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold font-mono text-white tracking-wider">
                {isAr ? 'رادار المتجهات القطبية 1000Hz (Polar Vector Scope)' : '2D POLAR VECTOR SCOPE (1000Hz)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
              <span>Target Cone: <strong className="text-emerald-400">{activeMechanic.angleToleranceDeg[0]}° - {activeMechanic.angleToleranceDeg[1]}°</strong></span>
              <span>·</span>
              <span>Torque Leakage: <strong className={currentLeakage > activeMechanic.crossAxisTorqueLeakageMaxPercent ? 'text-rose-400' : 'text-cyan-400'}>{currentLeakage}%</strong></span>
            </div>
          </div>

          {/* SVG Polar Visualizer */}
          <div className="flex items-center justify-center py-2 relative">
            <svg
              width={polarSize}
              height={polarSize}
              className="bg-slate-950/80 rounded-full border border-slate-800 shadow-2xl select-none"
            >
              <defs>
                <radialGradient id="polarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
                </radialGradient>
                <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>

              {/* Background gradient circle */}
              <circle cx={center} cy={center} r={maxRadiusPx} fill="url(#polarGlow)" />

              {/* Concentric rings: 0.25, 0.50, 0.75, 1.00 */}
              {[0.25, 0.5, 0.75, 1.0].map((frac) => (
                <circle
                  key={frac}
                  cx={center}
                  cy={center}
                  r={maxRadiusPx * frac}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={frac === 1.0 ? 'none' : '3 3'}
                />
              ))}

              {/* Concentric ring magnitude labels */}
              <text x={center + 4} y={center - maxRadiusPx * 0.25 + 4} fill="#475569" fontSize="9" fontFamily="monospace">0.25</text>
              <text x={center + 4} y={center - maxRadiusPx * 0.50 + 4} fill="#475569" fontSize="9" fontFamily="monospace">0.50</text>
              <text x={center + 4} y={center - maxRadiusPx * 0.75 + 4} fill="#475569" fontSize="9" fontFamily="monospace">0.75</text>
              <text x={center + 4} y={center - maxRadiusPx * 1.00 + 12} fill="#0ea5e9" fontSize="9" fontFamily="monospace" fontWeight="bold">1.0 MAX</text>

              {/* Radial Spokes: 0°, 30°, 45°, 90°, 135°, 180°, 225°, 270°, 315° */}
              {[0, 30, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const p = polarToSvg(angle, 1.0);
                return (
                  <g key={angle}>
                    <line
                      x1={center}
                      y1={center}
                      x2={p.x}
                      y2={p.y}
                      stroke="#1e293b"
                      strokeWidth={angle % 90 === 0 ? '1.5' : '0.75'}
                    />
                  </g>
                );
              })}

              {/* Axis Labels */}
              <text x={center} y={16} textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">0° (Pitch +1.0)</text>
              <text x={polarSize - 16} y={center + 4} textAnchor="end" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">90° (Steer +1.0)</text>
              <text x={center} y={polarSize - 8} textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">180° (Pitch -1.0)</text>
              <text x={16} y={center + 4} textAnchor="start" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">270° (Steer -1.0)</text>

              {/* Target Cone Wedge: Green Translucent Overlay */}
              <path
                d={targetConeSvgPath}
                fill="rgba(16, 185, 129, 0.18)"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Continuous Trajectory Trace */}
              {tracePathD && (
                <path
                  d={tracePathD}
                  fill="none"
                  stroke="url(#traceGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Active Marker Head */}
              <circle
                cx={currentMarkerPos.x}
                cy={currentMarkerPos.y}
                r="6"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={currentMarkerPos.x}
                cy={currentMarkerPos.y}
                r="12"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                className="animate-ping"
                style={{ transformOrigin: `${currentMarkerPos.x}px ${currentMarkerPos.y}px` }}
              />

              {/* Center Zero Point */}
              <circle cx={center} cy={center} r="3" fill="#0ea5e9" />
            </svg>
          </div>

          {/* Real-time Bipolar Vector & Telemetry Readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-center font-mono">
              <span className="text-[10px] text-slate-500 block">STEER (X)</span>
              <span className="text-xs font-bold text-cyan-300">
                {currentSample.steer >= 0 ? `+${currentSample.steer.toFixed(2)}` : currentSample.steer.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-center font-mono">
              <span className="text-[10px] text-slate-500 block">PITCH (Y)</span>
              <span className="text-xs font-bold text-cyan-300">
                {currentSample.pitch >= 0 ? `+${currentSample.pitch.toFixed(2)}` : currentSample.pitch.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-center font-mono">
              <span className="text-[10px] text-slate-500 block">ROLL (Z)</span>
              <span className="text-xs font-bold text-amber-300">
                {currentSample.roll >= 0 ? `+${currentSample.roll.toFixed(2)}` : currentSample.roll.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-center font-mono">
              <span className="text-[10px] text-slate-500 block">ANGLE</span>
              <span className="text-xs font-bold text-emerald-300">{currentSample.angleDeg}°</span>
            </div>
          </div>

          {/* Supersonic Band State Machine Indicator */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Flame className={`w-4 h-4 ${supersonicReport.isSupersonic ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
                <span>Supersonic Kinematic Band (2200 - 2300 uu/s)</span>
              </span>
              <span className={`font-bold ${supersonicReport.isSupersonic ? 'text-emerald-400' : 'text-slate-400'}`}>
                {supersonicReport.velocityUu} uu/s ({Math.round(supersonicReport.velocityPercentOfMax * 100)}% Max)
              </span>
            </div>

            {/* Supersonic Band Ratio Meter */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                {/* 2200 threshold mark */}
                <div className="absolute left-[95.65%] top-0 bottom-0 w-0.5 bg-amber-500 z-10" title="2200 uu/s Supersonic Cutoff (95.65%)"></div>
                <div 
                  className={`h-full transition-all duration-150 ${
                    supersonicReport.isSupersonic 
                      ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400' 
                      : 'bg-cyan-600'
                  }`}
                  style={{ width: `${Math.min(100, (supersonicReport.velocityUu / supersonicReport.maxVelocityUu) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 uu/s</span>
                <span className="text-amber-400">2200 uu/s (P_supersonic=0.0)</span>
                <span className="text-emerald-400">2300 uu/s (P_supersonic=1.0)</span>
              </div>
            </div>

            {/* Friction Bleeding Warning */}
            {supersonicReport.isFrictionBleeding && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-2 text-rose-300 flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Friction Bleeding Active: Sharp steer (|Steer| &gt; 0.8) decelerates vehicle by -{supersonicReport.frictionBleedPenaltyUu} uu/s!
                </span>
              </div>
            )}
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right Col (5 cols): CODEX SELECTOR & VIDEO/CANVAS SCRUBBER   */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-4">

          {/* Interactive Player / Canvas Wireframe Box */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <span>Kinematic Execution Preview (0.25x - 1.0x)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Frame {currentFrameIndex + 1} / {sampleTrace.length || 100}
              </span>
            </div>

            {/* Canvas Simulation / Video Component */}
            <div className="relative w-full h-44 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={320}
                height={170}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-cyan-300 rounded">
                Target Angle: {activeMechanic.targetAngleDeg}°
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-amber-300 rounded">
                Velocity: {activeMechanic.optimalVelocityUu} uu/s
              </div>
            </div>

            {/* Playback Controls & Frame Scrubber */}
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
                  title="Reset to Frame 0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Buttons: 0.25x, 0.5x, 1.0x */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {[0.25, 0.5, 1.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 text-[11px] font-mono rounded cursor-pointer transition ${
                      playbackSpeed === spd
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Time Constants Badge */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 text-xs font-mono">
              <span className="text-[10px] text-slate-500 block font-bold">PHYSICAL TIME CONSTANTS</span>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>Jump 1: <strong className="text-white">{activeMechanic.timings.firstJumpSleepMs}ms</strong></div>
                <div>Jump 2: <strong className="text-white">{activeMechanic.timings.secondJumpDelayMs}ms</strong></div>
                <div>Cancel: <strong className="text-white">{activeMechanic.timings.cancelHoldMs}ms</strong></div>
              </div>
            </div>

            {/* Key Sequence Sequence Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-mono block">SCANCODE DISPATCH SEQUENCE</span>
              <div className="flex flex-wrap gap-1.5">
                {activeMechanic.keySequence.map((key, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30 rounded shadow-sm"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Category Tabs & Mechanic List */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Rocket League Mechanics Codex ({filteredMechanics.length})</span>
              </span>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Kickoffs', 'Aerials', 'Flicks', 'Recoveries'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Scrollable Mechanic Cards */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredMechanics.map((m) => {
                const isSelected = m.id === selectedMechanicId;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMechanicId(m.id);
                      setCurrentFrameIndex(0);
                    }}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {isAr ? m.nameAr : m.name}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {m.targetAngleDeg}° Cone
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-500">
                      <span>{m.category} · {m.difficulty}</span>
                      <span>Opt: {m.optimalVelocityUu} uu/s</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
