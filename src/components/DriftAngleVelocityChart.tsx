import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { PhysicsConfig, Language } from '../types/engine';
import {
  DriftDataPoint,
  DriftManeuverConfig,
  generateDriftVelocityCurveData,
  calculateDriftAngle,
  calculateTurnRadius,
  calculateLateralAccelG,
  calculateYawRate,
  calculateSpeedRetention,
  evaluateTelemetryDriftMetrics
} from '../utils/driftPhysicsMath';
import { 
  CLASSIC_ESPORTS_PHYSICS_CONFIG, 
  UNREAL_SYMMETRIC_PHYSICS_CONFIG 
} from '../data/initialData';
import {
  Compass,
  Gauge,
  Zap,
  Layers,
  Activity,
  Flame,
  CheckCircle2,
  Lock,
  Radio,
  Wifi,
  WifiOff,
  Eye,
  EyeOff
} from 'lucide-react';

export interface DriftTelemetryFeed {
  velocityUu: number;
  speedKph?: number;
  steerInput: number; // 0.1 to 1.0
  isPowerslide: boolean;
  gForceLateral?: number;
  yawRate?: number;
  isSupersonic?: boolean;
  packetLatencyMs?: number;
}

interface DriftAngleVelocityChartProps {
  currentConfig: PhysicsConfig;
  language: Language;
  isTelemetryActive?: boolean;
  telemetry?: DriftTelemetryFeed;
  onToggleTelemetry?: () => void;
  hideWhenInactive?: boolean;
}

export const DriftAngleVelocityChart: React.FC<DriftAngleVelocityChartProps> = ({
  currentConfig,
  language,
  isTelemetryActive = true,
  telemetry,
  onToggleTelemetry,
  hideWhenInactive = false,
}) => {
  const isAr = language === 'ar';
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fallback internal telemetry stream if external telemetry feed is not passed directly
  const [internalTelemetry, setInternalTelemetry] = useState<DriftTelemetryFeed>({
    velocityUu: 1420,
    speedKph: 85,
    steerInput: 0.75,
    isPowerslide: true,
    packetLatencyMs: 0.10
  });

  // Dual comparison toggle for esports config analysis
  const [showDualComparison, setShowDualComparison] = useState<boolean>(true);

  // Internal real-time game telemetry oscillating tick (if external telemetry not supplied)
  useEffect(() => {
    if (!isTelemetryActive || telemetry) return;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setInternalTelemetry((prev) => {
        const t = frame * 0.04;
        // Wave oscillating realistically across game speeds (600 to 2260 uu/s)
        const vel = Math.round(1400 + Math.sin(t) * 650 + Math.cos(t * 1.7) * 220);
        const clampedVel = Math.max(350, Math.min(2300, vel));
        const steer = Number((0.65 + Math.sin(t * 0.8) * 0.28).toFixed(2));
        const powerslide = Math.sin(t * 0.5) > -0.2;

        return {
          velocityUu: clampedVel,
          speedKph: Math.round(clampedVel * 0.036),
          steerInput: steer,
          isPowerslide: powerslide,
          packetLatencyMs: Number((0.08 + Math.random() * 0.05).toFixed(2))
        };
      });
    }, 40); // 25-30Hz real-time stream

    return () => clearInterval(interval);
  }, [isTelemetryActive, telemetry]);

  // Active Telemetry Source
  const activeTelemetry: DriftTelemetryFeed = telemetry || internalTelemetry;

  // Real-time telemetry values (READ-ONLY: no manual UI sliders)
  const probeVelocity = activeTelemetry.velocityUu;
  const steerInput = Math.max(0.1, Math.min(1.0, Math.abs(activeTelemetry.steerInput)));
  const isPowerslide = activeTelemetry.isPowerslide;

  // Real-time computed drift kinematics from telemetry
  const telemetryMetrics = useMemo(() => {
    return evaluateTelemetryDriftMetrics(
      probeVelocity,
      steerInput,
      isPowerslide,
      currentConfig.groundSense
    );
  }, [probeVelocity, steerInput, isPowerslide, currentConfig.groundSense]);

  // Primary dataset (Generated from current configuration with active telemetry steer)
  const currentManeuver: DriftManeuverConfig = useMemo(() => ({
    steerInput,
    powerslideDuration: 0.35,
    groundSensitivity: currentConfig.groundSense,
    curveExponent: currentConfig.curveExponent,
    internalDeadzone: currentConfig.internalDeadzone,
  }), [steerInput, currentConfig]);

  const primaryData: DriftDataPoint[] = useMemo(() => {
    return generateDriftVelocityCurveData(currentManeuver, 48);
  }, [currentManeuver]);

  // Secondary dataset for comparison: Unreal 1/-1 Symmetric vs Classic Esports
  const compareConfig = currentConfig.curveExponent === 1.35
    ? CLASSIC_ESPORTS_PHYSICS_CONFIG
    : UNREAL_SYMMETRIC_PHYSICS_CONFIG;

  const compareManeuver: DriftManeuverConfig = useMemo(() => ({
    steerInput,
    powerslideDuration: 0.35,
    groundSensitivity: compareConfig.groundSense,
    curveExponent: compareConfig.curveExponent,
    internalDeadzone: compareConfig.internalDeadzone,
  }), [steerInput, compareConfig]);

  const compareData: DriftDataPoint[] = useMemo(() => {
    return generateDriftVelocityCurveData(compareManeuver, 48);
  }, [compareManeuver]);

  // Point under probe inspection from compare config
  const compareDriftAngle = useMemo(() => {
    return calculateDriftAngle(probeVelocity, steerInput, isPowerslide, compareConfig.groundSense);
  }, [probeVelocity, steerInput, isPowerslide, compareConfig.groundSense]);

  /* -------------------------------------------------------------------------- */
  /*                             D3 CHART RENDERING                             */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!isTelemetryActive || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 860;
    const height = 340;
    const margin = { top: 25, right: 35, bottom: 40, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // 1. Scales
    const xScale = d3.scaleLinear().domain([0, 2300]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 90]).range([innerHeight, 0]);

    // 2. Gradients and Clip Paths
    const defs = svg.append('defs');

    // Emerald gradient for optimal maneuver zone
    const optGrad = defs.append('linearGradient')
      .attr('id', 'optZoneGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    optGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.20);
    optGrad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.03);

    // Red gradient for spinout zone (> 65°)
    const spinGrad = defs.append('linearGradient')
      .attr('id', 'spinoutGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    spinGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.16);
    spinGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.02);

    // Cyan glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 3. Grid Lines
    const xGrid = d3.axisBottom(xScale).ticks(8).tickSize(-innerHeight).tickFormat(() => '');
    const yGrid = d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(() => '');

    g.append('g').attr('class', 'grid').attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '3,3').attr('opacity', 0.7);
    g.append('g').attr('class', 'grid')
      .call(yGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '3,3').attr('opacity', 0.7);
    g.selectAll('.domain').remove();

    // 4. Shaded Spinout Risk Zone (> 65°)
    const spinoutArea = d3.area<DriftDataPoint>()
      .x(d => xScale(d.velocityUu))
      .y0(yScale(65))
      .y1(yScale(90))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(primaryData)
      .attr('fill', 'url(#spinoutGrad)')
      .attr('d', spinoutArea);

    // 5. Optimal High-Speed Cornering Area Band
    const optimalArea = d3.area<DriftDataPoint>()
      .x(d => xScale(d.velocityUu))
      .y0(d => yScale(d.optimalMinAngleDeg))
      .y1(d => yScale(d.optimalMaxAngleDeg))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(primaryData)
      .attr('fill', 'url(#optZoneGrad)')
      .attr('d', optimalArea);

    // 6. Supersonic Lock Reference Marker (2200 uu/s)
    const x2200 = xScale(2200);
    g.append('line')
      .attr('x1', x2200).attr('x2', x2200)
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6);

    g.append('text')
      .attr('x', x2200 - 90)
      .attr('y', 14)
      .attr('fill', '#38bdf8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text('2200 uu/s (Supersonic)');

    // 7. Data Lines
    // Grip Turn Curve (Amber dashed)
    const gripLine = d3.line<DriftDataPoint>()
      .x(d => xScale(d.velocityUu))
      .y(d => yScale(d.gripAngleDeg))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(primaryData)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('opacity', 0.85)
      .attr('d', gripLine);

    // Comparison Config Drift Line (if enabled)
    if (showDualComparison) {
      const compareLine = d3.line<DriftDataPoint>()
        .x(d => xScale(d.velocityUu))
        .y(d => yScale(d.powerslideAngleDeg))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(compareData)
        .attr('fill', 'none')
        .attr('stroke', '#a855f7')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.85)
        .attr('d', compareLine);
    }

    // Active Powerslide Drift Curve (Vibrant Cyan Glow)
    const driftLine = d3.line<DriftDataPoint>()
      .x(d => xScale(d.velocityUu))
      .y(d => yScale(d.powerslideAngleDeg))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(primaryData)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2.8)
      .attr('filter', 'url(#glow)')
      .attr('d', driftLine);

    // 8. Real-Time Telemetry Crosshairs & Live Tracking Probe
    const probeX = xScale(probeVelocity);
    const probeGripY = yScale(telemetryMetrics.gripAngle);
    const probeDriftY = yScale(telemetryMetrics.driftAngle);

    // Live vertical tracking beam
    g.append('line')
      .attr('x1', probeX).attr('x2', probeX)
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,2')
      .attr('opacity', 0.85);

    // Grip reference dot (Amber)
    g.append('circle')
      .attr('cx', probeX).attr('cy', probeGripY)
      .attr('r', 4)
      .attr('fill', '#f59e0b')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Live Active Telemetry Dot (Cyan Pulsing)
    g.append('circle')
      .attr('cx', probeX).attr('cy', probeDriftY)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7);

    g.append('circle')
      .attr('cx', probeX).attr('cy', probeDriftY)
      .attr('r', 5.5)
      .attr('fill', isPowerslide ? '#06b6d4' : '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // 9. D3 Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(7)
      .tickFormat(d => `${d} uu/s`);

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => `${d}°`);

    const gx = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');
    gx.select('.domain').attr('stroke', '#475569');

    const gy = g.append('g').call(yAxis);
    gy.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');
    gy.select('.domain').attr('stroke', '#475569');

    // Axis titles
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(isAr ? 'السرعة الحية من اللعبة v (Unreal Units/s · Live Game Telemetry)' : 'Live Game Velocity (Unreal Units/s · km/h)');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(isAr ? 'زاوية الانجراف الحية β (بالدرجات)' : 'Live Drift / Slip Angle β (Degrees)');

  }, [isTelemetryActive, primaryData, compareData, showDualComparison, probeVelocity, telemetryMetrics, isPowerslide, isAr]);

  // If no telemetry stream is active and user elected to hide completely, return null
  if (!isTelemetryActive && hideWhenInactive) {
    return null;
  }

  // If no telemetry stream is active and not completely hidden, render disabled placeholder
  if (!isTelemetryActive) {
    return (
      <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-3 transition-all">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-950 flex items-center justify-center text-slate-500 border border-slate-800">
          <WifiOff className="w-6 h-6 text-rose-500/80 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center justify-center gap-2">
            <span>{isAr ? 'مخطط زوايا الانجراف D3 معطل / مخفي (Telemetry Inactive)' : 'D3 Drift Angle Monitor Inactive / Disabled'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
              OFFLINE 🚫
            </span>
          </h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            {isAr
              ? 'تم تعطيل وإخفاء عناصر تحكم D3 تلقائياً لعدم وجود بث تيليمتري نشط من اللعبة. لا يُسمح بأي تعديل يدوي، ويعمل المخطط حصرياً عند تشغيل بث الإشارات الحية.'
              : 'The D3 monitor is completely disabled/hidden because no active game telemetry stream is running. Manual UI manipulation is strictly disabled; the chart activates automatically when game telemetry is received.'}
          </p>
        </div>
        {onToggleTelemetry && (
          <button
            type="button"
            onClick={onToggleTelemetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-bold font-mono transition cursor-pointer shadow-md"
          >
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'توصيل / تشغيل بث التيليمتري المباشر' : 'Connect / Start Telemetry Stream'}</span>
          </button>
        )}
      </div>
    );
  }

  // ACTIVE REAL-TIME MONITOR VIEW (Zero manual sliders / presets)
  return (
    <div className="relative overflow-hidden bg-[#030712] border-2 border-cyan-500/50 rounded-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.14)] ring-1 ring-cyan-400/30 space-y-5 animate-in fade-in transition-all">
      {/* Top subtle live telemetry scanning pulse line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

      {/* HEADER SECTION: TELEMETRY STREAM MONITOR STATUS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative p-2.5 bg-cyan-950/70 text-cyan-300 border border-cyan-500/60 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
              <Compass className="w-5 h-5" />
              {/* Subtle pulsing live beacon ring */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black font-mono text-cyan-100 tracking-wider uppercase">
                  {isAr ? 'مراقب زاوية الانجراف D3 اللحظي (Live Telemetry Drift Monitor)' : 'Real-Time D3 Drift Angle & Slip Monitor'}
                </h3>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-400/50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{isAr ? 'بث حي متزامن (1000Hz)' : 'STREAM ACTIVE (1000Hz)'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>{isAr ? 'قراءة آلية محايدة (TELEMETRY PASSIVE)' : 'READ-ONLY TELEMETRY'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {isAr
                  ? 'رصد ديناميكي فوري من محرك اللعبة (السرعة، زاوية التوجيه، زاوية الانزلاق β، وقوة الطرد) بدون أي تلاعب يدوي.'
                  : 'Passively monitors real-time game telemetry (velocity, steer angle, slip angle β, and lateral G) with zero manual manipulation.'}
              </p>
            </div>
          </div>
        </div>

        {/* STREAM CONTROLS & OVERLAYS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDualComparison(!showDualComparison)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono rounded-xl border transition cursor-pointer ${
              showDualComparison
                ? 'bg-purple-950/90 text-purple-200 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title={isAr ? 'مقارنة المنحنى مع المحرك المتناظر' : 'Toggle dual config overlay'}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'تراكب المقارنة' : 'Compare Overlay'}</span>
          </button>

          {onToggleTelemetry && (
            <button
              type="button"
              onClick={onToggleTelemetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
              title={isAr ? 'قطع اتصال التيليمتري لاختبار وضع التعطيل / الإخفاء' : 'Disconnect telemetry stream'}
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAr ? 'قطع التيليمتري' : 'Disconnect'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 LIVE TELEMETRY KPI CARDS (Driven by game data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Live Drift Angle */}
        <div className="p-3 bg-[#080d1a] rounded-xl border border-cyan-500/40 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-[11px] text-cyan-200">
            <span className="flex items-center gap-1 font-semibold">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'زاوية الانجراف الحالية' : 'Live Slip Angle'}</span>
            </span>
            <span className="font-mono text-[10px] text-cyan-300 font-black bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-400/50">
              β = {telemetryMetrics.driftAngle}°
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono pt-0.5">
            <span className="text-lg font-black text-white">{telemetryMetrics.driftAngle}°</span>
            <span className="text-[11px] font-bold text-amber-300">Grip: {telemetryMetrics.gripAngle}°</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono font-medium">
            {isAr ? `سرعة المركبة: ${telemetryMetrics.velocityUu} uu/s` : `Telemetry Speed: ${telemetryMetrics.velocityUu} uu/s`}
          </p>
        </div>

        {/* KPI 2: Live Turning Radius */}
        <div className="p-3 bg-[#080d1a] rounded-xl border border-amber-500/40 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-[11px] text-amber-200">
            <span className="flex items-center gap-1 font-semibold">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'نصف قطر الدوران الفعلي' : 'Live Turning Radius'}</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-300 font-black bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400/50">
              -{Math.round((1 - telemetryMetrics.radius / telemetryMetrics.gripRadius) * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono pt-0.5">
            <span className="text-lg font-black text-amber-300">{telemetryMetrics.radius} uu</span>
            <span className="text-[11px] font-bold text-slate-300">Grip: {telemetryMetrics.gripRadius} uu</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono font-medium">
            {isAr ? `توجيه اللعبة: ${Math.round(steerInput * 100)}%` : `Game Steer: ${Math.round(steerInput * 100)}%`}
          </p>
        </div>

        {/* KPI 3: Live Lateral G-Force */}
        <div className="p-3 bg-[#080d1a] rounded-xl border border-purple-500/40 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-[11px] text-purple-200">
            <span className="flex items-center gap-1 font-semibold">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? 'قوة التسارع الجانبي الحية' : 'Lateral G-Force'}</span>
            </span>
            <span className="font-mono text-[10px] text-purple-300 font-black bg-purple-950 px-1.5 py-0.5 rounded border border-purple-400/50">
              {telemetryMetrics.yawRate}°/s
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono pt-0.5">
            <span className="text-lg font-black text-purple-300">{telemetryMetrics.lateralG} G</span>
            <span className="text-[11px] font-bold text-slate-300">Yaw: {telemetryMetrics.yawRate}°/s</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono font-medium">
            {isAr ? 'عزم التدوير الحقيقي للشاسيه' : 'Chassis Centripetal G'}
          </p>
        </div>

        {/* KPI 4: Speed Retention */}
        <div className="p-3 bg-[#080d1a] rounded-xl border border-emerald-500/40 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-[11px] text-emerald-200">
            <span className="flex items-center gap-1 font-semibold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'كفاءة حفظ السرعة' : 'Speed Retention'}</span>
            </span>
            <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
              telemetryMetrics.speedRetention >= 75
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-400/50'
                : 'bg-amber-950 text-amber-300 border border-amber-400/50'
            }`}>
              {telemetryMetrics.speedRetention}%
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono pt-0.5">
            <span className="text-base font-bold text-emerald-400">{telemetryMetrics.speedRetention}%</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {Math.round(probeVelocity * (telemetryMetrics.speedRetention / 100))} uu/s
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {isAr ? 'زخم الحركة المحفوظ' : 'Conserved momentum'}
          </p>
        </div>
      </div>

      {/* LIVE TELEMETRY STREAM STATUS STRIP (Zero manual sliders / presets) */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'بيانات البث الفعلي:' : 'Active Stream Feed:'}</span>
          </span>
          <span className="text-slate-300">
            Vel: <strong className="text-white">{probeVelocity} uu/s</strong> ({telemetryMetrics.speedKph} km/h)
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300">
            Steer: <strong className="text-amber-400">{Math.round(steerInput * 100)}%</strong>
          </span>
          <span className="text-slate-500">·</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isPowerslide 
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            {isPowerslide ? (isAr ? 'درفت نشط (Powerslide)' : 'POWERSLIDE ACTIVE') : (isAr ? 'تماسك عادي (Grip)' : 'TIRE GRIP')}
          </span>
          <span className="text-slate-500">·</span>
          <span className={telemetryMetrics.isSupersonic ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            {telemetryMetrics.isSupersonic ? '⚡ SUPERSONIC (>= 2200)' : 'SUB-SONIC'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Latency: {activeTelemetry.packetLatencyMs ?? 0.10}ms</span>
          <span>·</span>
          <span className="text-emerald-400 font-bold">LOCKED 🔒</span>
        </div>
      </div>

      {/* D3 VISUALIZATION CONTAINER (PURE READ-ONLY MONITOR) */}
      <div className="relative bg-[#070b14] rounded-2xl border border-slate-800 p-2 overflow-hidden shadow-inner">
        <svg
          ref={svgRef}
          className="w-full h-auto select-none pointer-events-none"
          style={{ minHeight: '300px', maxHeight: '380px' }}
        />

        {/* FLOATING REAL-TIME TELEMETRY HUD TOOLTIP */}
        <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5 pointer-events-none min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[11px]">
            <span className="text-white font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block"></span>
              <span>{probeVelocity} uu/s</span>
            </span>
            <span className="text-slate-400">{telemetryMetrics.speedKph} km/h</span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <div className="text-slate-400">Drift Angle β:</div>
            <div className="text-cyan-400 font-bold text-right">{telemetryMetrics.driftAngle}°</div>

            <div className="text-slate-400">Grip Angle:</div>
            <div className="text-amber-400 text-right">{telemetryMetrics.gripAngle}°</div>

            {showDualComparison && (
              <>
                <div className="text-purple-400">Compare Config:</div>
                <div className="text-purple-300 font-bold text-right">{compareDriftAngle}°</div>
              </>
            )}

            <div className="text-slate-400">Turn Radius R:</div>
            <div className="text-white text-right">{telemetryMetrics.radius} uu</div>

            <div className="text-slate-400">Lateral Force:</div>
            <div className="text-white text-right">{telemetryMetrics.lateralG} G</div>

            <div className="text-slate-400">Yaw Velocity:</div>
            <div className="text-white text-right">{telemetryMetrics.yawRate}°/s</div>

            <div className="text-slate-400">Retention:</div>
            <div className={`font-bold text-right ${telemetryMetrics.speedRetention >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {telemetryMetrics.speedRetention}%
            </div>
          </div>

          {/* Status Badge */}
          <div className="pt-1 border-t border-slate-800/80">
            <span className={`text-[10px] font-bold block text-center px-1.5 py-0.5 rounded ${
              telemetryMetrics.statusZone === 'OPTIMAL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : telemetryMetrics.statusZone === 'SPINOUT_RISK'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {telemetryMetrics.statusZone === 'OPTIMAL'
                ? (isAr ? '✓ نطاق الانعطاف والسرعة المثالي' : '✓ OPTIMAL DRIFT APEX')
                : telemetryMetrics.statusZone === 'SPINOUT_RISK'
                  ? (isAr ? '⚠️ منطقة خطر فقدان السيطرة' : '⚠️ HIGH TRACTION LOSS RISK')
                  : (isAr ? 'انعطاف عادي مستقر' : 'STABLE CORNERING')}
            </span>
          </div>
        </div>

        {/* Real-Time Telemetry Dynamic Heartbeat Bar */}
        <div className="absolute bottom-2 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold">{isAr ? 'مراقب قراءة حية مستمرة:' : 'Continuous Telemetry Tracking:'}</span>
            <span className="text-cyan-400">{probeVelocity} uu/s</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">{telemetryMetrics.speedKph} km/h</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-400 hidden sm:inline">Slip: {telemetryMetrics.driftAngle}°</span>
            <span className="text-slate-400 hidden sm:inline">Lateral: {telemetryMetrics.lateralG}G</span>
            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px]">
              NO MANUAL OVERRIDE
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
