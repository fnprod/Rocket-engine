import React, { useState, useMemo } from 'react';
import { PhysicsConfig, Language } from '../types/engine';
import {
  ComparatorPhysicsConfig,
  COMPARATOR_PRESETS,
  configToComparatorConfig,
  comparatorConfigToEngineConfig,
  generateDragCurve,
  calculateDragDecel,
  calculateCoastdownTime,
  generateJumpTrajectory,
  calculateJumpMetrics,
  generateThrottleCurve,
  evaluateThrottleScaling,
  calculateZeroToHundredTime,
  computePhysicsComparisonSummary,
} from '../utils/physicsComparatorMath';
import {
  ArrowRightLeft,
  CheckCircle2,
  Sliders,
  Wind,
  Orbit,
  Zap,
  TrendingUp,
  Gauge,
  Layers,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
  Maximize2,
  RefreshCw,
  Flame
} from 'lucide-react';

interface PhysicsComparatorProps {
  activeConfig: PhysicsConfig;
  onApplyConfigToEngine: (config: PhysicsConfig) => void;
  language: Language;
}

export const PhysicsComparator: React.FC<PhysicsComparatorProps> = ({
  activeConfig,
  onApplyConfigToEngine,
  language,
}) => {
  const isAr = language === 'ar';

  // Config A defaults to the current active configuration
  const [configA, setConfigA] = useState<ComparatorPhysicsConfig>(() =>
    configToComparatorConfig(
      activeConfig,
      'config_a_active',
      'Config A (Active Engine)',
      'الإعداد أ (المحرك النشط)'
    )
  );

  // Config B defaults to the alternative preset (Unreal 1/-1 if active is Classic, or Classic if active is Unreal)
  const isCurrentlyUnreal =
    activeConfig.curveExponent === 1.35 && activeConfig.internalDeadzone === 0.02;
  const initialPresetB = isCurrentlyUnreal
    ? COMPARATOR_PRESETS[0]
    : COMPARATOR_PRESETS[1];

  const [configB, setConfigB] = useState<ComparatorPhysicsConfig>({
    ...initialPresetB,
    id: 'config_b_comparator',
    name: `Config B (${initialPresetB.name})`,
    nameAr: `الإعداد ب (${initialPresetB.nameAr})`,
  });

  // Active comparator tab: 'all' | 'drag' | 'gravity' | 'throttle'
  const [activeTab, setActiveTab] = useState<'all' | 'drag' | 'gravity' | 'throttle'>('all');

  // Interactive scrubber values
  const [dragProbeV, setDragProbeV] = useState<number>(1410); // 0 - 2300 uu/s
  const [gravityProbeT, setGravityProbeT] = useState<number>(0.45); // 0 - 1.2s
  const [throttleProbeInp, setThrottleProbeInp] = useState<number>(0.65); // 0.0 - 1.0

  // Collapsible custom tweak drawers
  const [showTweakA, setShowTweakA] = useState<boolean>(false);
  const [showTweakB, setShowTweakB] = useState<boolean>(false);

  // Feedback toast for engine application
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  // Preset switch handlers
  const handleSelectPresetA = (presetId: string) => {
    if (presetId === 'current') {
      setConfigA(configToComparatorConfig(activeConfig, 'config_a_active', 'Config A (Active Engine)', 'الإعداد أ (المحرك النشط)'));
      return;
    }
    const found = COMPARATOR_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setConfigA({ ...found, id: 'config_a_' + found.id, name: `Config A (${found.name})`, nameAr: `الإعداد أ (${found.nameAr})` });
    }
  };

  const handleSelectPresetB = (presetId: string) => {
    if (presetId === 'current') {
      setConfigB(configToComparatorConfig(activeConfig, 'config_b_active', 'Config B (Active Engine)', 'الإعداد ب (المحرك النشط)'));
      return;
    }
    const found = COMPARATOR_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setConfigB({ ...found, id: 'config_b_' + found.id, name: `Config B (${found.name})`, nameAr: `الإعداد ب (${found.nameAr})` });
    }
  };

  // Swap A and B
  const handleSwap = () => {
    const temp = { ...configA };
    setConfigA({ ...configB, name: configB.name.replace('Config B', 'Config A').replace('الإعداد ب', 'الإعداد أ') });
    setConfigB({ ...temp, name: temp.name.replace('Config A', 'Config B').replace('الإعداد أ', 'الإعداد ب') });
  };

  // Apply to engine
  const handleApplyToEngine = (target: 'A' | 'B') => {
    const targetConfig = target === 'A' ? configA : configB;
    const applied = comparatorConfigToEngineConfig(targetConfig, activeConfig);
    onApplyConfigToEngine(applied);
    setApplyFeedback(
      isAr
        ? `✓ تم تطبيق فيزياء (${target === 'A' ? 'الإعداد أ' : 'الإعداد ب'}) بنجاح على المحرك النشط!`
        : `✓ Successfully applied (${target === 'A' ? 'Config A' : 'Config B'}) to active physics engine!`
    );
    setTimeout(() => setApplyFeedback(null), 3500);
  };

  /* -------------------------------------------------------------------------- */
  /*                               DATA GENERATION                              */
  /* -------------------------------------------------------------------------- */

  // Comparison Summary
  const summary = useMemo(
    () => computePhysicsComparisonSummary(configA, configB),
    [configA, configB]
  );

  // 1. Drag curves
  const dragPointsA = useMemo(() => generateDragCurve(configA, 60), [configA]);
  const dragPointsB = useMemo(() => generateDragCurve(configB, 60), [configB]);
  const probeDragDecelA = useMemo(() => calculateDragDecel(dragProbeV, configA.dragCoefficient), [dragProbeV, configA]);
  const probeDragDecelB = useMemo(() => calculateDragDecel(dragProbeV, configB.dragCoefficient), [dragProbeV, configB]);
  const probeDragDelta = Number((probeDragDecelB - probeDragDecelA).toFixed(2));

  // 2. Gravity curves
  const jumpMetricsA = useMemo(() => calculateJumpMetrics(configA.initialJumpVelocity, configA.gravityZ), [configA]);
  const jumpMetricsB = useMemo(() => calculateJumpMetrics(configB.initialJumpVelocity, configB.gravityZ), [configB]);
  const maxHangtime = Math.max(jumpMetricsA.hangtimeSec, jumpMetricsB.hangtimeSec, 1.2);
  const gravityPointsA = useMemo(() => generateJumpTrajectory(configA, maxHangtime, 60), [configA, maxHangtime]);
  const gravityPointsB = useMemo(() => generateJumpTrajectory(configB, maxHangtime, 60), [configB, maxHangtime]);
  const probeHeightA = useMemo(() => {
    const y = configA.initialJumpVelocity * gravityProbeT + 0.5 * configA.gravityZ * gravityProbeT * gravityProbeT;
    return Math.max(0, Number(y.toFixed(1)));
  }, [gravityProbeT, configA]);
  const probeHeightB = useMemo(() => {
    const y = configB.initialJumpVelocity * gravityProbeT + 0.5 * configB.gravityZ * gravityProbeT * gravityProbeT;
    return Math.max(0, Number(y.toFixed(1)));
  }, [gravityProbeT, configB]);
  const probeHeightDelta = Number((probeHeightB - probeHeightA).toFixed(1));

  // 3. Throttle curves
  const throttlePointsA = useMemo(() => generateThrottleCurve(configA, 60), [configA]);
  const throttlePointsB = useMemo(() => generateThrottleCurve(configB, 60), [configB]);
  const probeThrottleA = useMemo(() => evaluateThrottleScaling(throttleProbeInp, configA.internalDeadzone, configA.curveExponent, configA.groundSense), [throttleProbeInp, configA]);
  const probeThrottleB = useMemo(() => evaluateThrottleScaling(throttleProbeInp, configB.internalDeadzone, configB.curveExponent, configB.groundSense), [throttleProbeInp, configB]);
  const probeThrottleDelta = Number((probeThrottleB.effectiveThrottle - probeThrottleA.effectiveThrottle).toFixed(3));

  // 0-100 kph times
  const zeroToHundredA = useMemo(() => calculateZeroToHundredTime(configA), [configA]);
  const zeroToHundredB = useMemo(() => calculateZeroToHundredTime(configB), [configB]);

  // Coastdown times
  const coastdownA = useMemo(() => calculateCoastdownTime(2300, 1410, configA.dragCoefficient), [configA]);
  const coastdownB = useMemo(() => calculateCoastdownTime(2300, 1410, configB.dragCoefficient), [configB]);

  /* -------------------------------------------------------------------------- */
  /*                          SVG COORDINATE MAPPERS                            */
  /* -------------------------------------------------------------------------- */

  // Drag Chart: X: 0 to 2300 uu/s -> 30 to 470; Y: 0 to 180 uu/s² -> 180 to 20
  const dragSvgX = (v: number) => 40 + (v / 2300) * 420;
  const dragSvgY = (decel: number) => 180 - (Math.min(decel, 180) / 180) * 155;

  const dragPathA = dragPointsA.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${dragSvgX(pt.velocityUu)} ${dragSvgY(pt.dragDecelUu)}`,
    ''
  );
  const dragPathB = dragPointsB.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${dragSvgX(pt.velocityUu)} ${dragSvgY(pt.dragDecelUu)}`,
    ''
  );

  // Gravity Chart: X: 0 to maxHangtime -> 40 to 460; Y: 0 to 160 uu -> 180 to 20
  const maxTrajectoryHeight = Math.max(jumpMetricsA.apexHeightUu, jumpMetricsB.apexHeightUu, 140);
  const gravSvgX = (t: number) => 40 + (t / maxHangtime) * 420;
  const gravSvgY = (h: number) => 180 - (h / (maxTrajectoryHeight * 1.15)) * 155;

  const gravPathA = gravityPointsA.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${gravSvgX(pt.timeSec)} ${gravSvgY(pt.heightUu)}`,
    ''
  );
  const gravPathB = gravityPointsB.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${gravSvgX(pt.timeSec)} ${gravSvgY(pt.heightUu)}`,
    ''
  );

  // Throttle Chart: X: 0.0 to 1.0 -> 40 to 460; Y: 0 to 2.0 -> 180 to 20
  const throtSvgX = (inp: number) => 40 + inp * 420;
  const throtSvgY = (out: number) => 180 - (out / 2.0) * 155;

  const throtPathA = throttlePointsA.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${throtSvgX(pt.rawInput)} ${throtSvgY(pt.effectiveThrottle)}`,
    ''
  );
  const throtPathB = throttlePointsB.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${throtSvgX(pt.rawInput)} ${throtSvgY(pt.effectiveThrottle)}`,
    ''
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-gradient-to-br from-amber-500/20 to-cyan-500/20 rounded-lg border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'مقارن الفيزياء التفاعلي (Physics Comparator)' : 'Interactive Physics Comparator'}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                OVERLAY VISUALIZER
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isAr
              ? 'مقارنة تراكبية بصرية بين إعدادين للفيزياء لقياس الفروقات في مقاومة الهواء (Drag)، والجاذبية ومسار القفز (Gravity)، وتدريج دواسة السرعة (Throttle Scaling) بدقة فائقة.'
              : 'Overlay two sets of physics configurations to visualize and quantify real-time differences in aerodynamic drag, gravity trajectories, and throttle scaling.'}
          </p>
        </div>

        {/* FEEDBACK TOAST */}
        {applyFeedback && (
          <div className="p-2 px-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{applyFeedback}</span>
          </div>
        )}
      </div>

      {/* CONFIGURATION SELECTORS (A vs B) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Config A Box (Amber) */}
        <div className="md:col-span-5 p-3.5 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_#f59e0b]"></span>
              {isAr ? 'الإعداد أ (Config A - الأساس)' : 'Config A (Baseline)'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTweakA(!showTweakA)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                  showTweakA
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={isAr ? 'تعديل المعايير يدوياً' : 'Tweak parameters manually'}
              >
                <Sliders className="w-3 h-3" />
                <span>{isAr ? 'تعديل' : 'Tweak'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyToEngine('A')}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition-colors cursor-pointer flex items-center gap-1"
                title={isAr ? 'تطبيق هذا الإعداد على المحرك النشط' : 'Apply Config A to active engine'}
              >
                <CheckCircle2 className="w-3 h-3 text-amber-400" />
                <span>{isAr ? 'تطبيق بالمحرك' : 'Apply'}</span>
              </button>
            </div>
          </div>

          <select
            value={configA.id.replace('config_a_', '')}
            onChange={(e) => handleSelectPresetA(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none font-medium cursor-pointer"
          >
            <option value="current">{isAr ? 'الإعداد الحالي للمحرك' : 'Current Active Engine'}</option>
            {COMPARATOR_PRESETS.map((p) => (
              <option key={'a_' + p.id} value={p.id}>
                {isAr ? p.nameAr : p.name}
              </option>
            ))}
          </select>

          {/* Quick parameter pills */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400 pt-0.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Drag: {configA.dragCoefficient}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Gravity: {configA.gravityZ}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Sense: {configA.groundSense.toFixed(2)}x
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Exp: {configA.curveExponent}
            </span>
          </div>

          {/* Collapsible Manual Tweak Drawer A */}
          {showTweakA && (
            <div className="p-2.5 bg-slate-900 rounded-lg border border-amber-500/20 space-y-2 text-[11px] font-mono text-slate-300 animate-fade-in">
              <div className="flex items-center justify-between">
                <span>Drag Coeff: {configA.dragCoefficient}</span>
                <input
                  type="range"
                  min="0.010"
                  max="0.080"
                  step="0.002"
                  value={configA.dragCoefficient}
                  onChange={(e) => setConfigA({ ...configA, dragCoefficient: parseFloat(e.target.value) })}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Gravity Z: {configA.gravityZ}</span>
                <input
                  type="range"
                  min="-1200"
                  max="-300"
                  step="25"
                  value={configA.gravityZ}
                  onChange={(e) => setConfigA({ ...configA, gravityZ: parseInt(e.target.value, 10) })}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Ground Sense: {configA.groundSense.toFixed(2)}x</span>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={configA.groundSense}
                  onChange={(e) => setConfigA({ ...configA, groundSense: parseFloat(e.target.value) })}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Curve Exp: {configA.curveExponent}</span>
                <input
                  type="range"
                  min="1.0"
                  max="1.8"
                  step="0.05"
                  value={configA.curveExponent}
                  onChange={(e) => setConfigA({ ...configA, curveExponent: parseFloat(e.target.value) })}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Swap Button (Middle) */}
        <div className="md:col-span-2 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
            title={isAr ? 'تبديل الإعدادين (أ ⇄ ب)' : 'Swap Config A and Config B'}
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">{isAr ? 'تبديل' : 'Swap'}</span>
          </button>
        </div>

        {/* Config B Box (Cyan) */}
        <div className="md:col-span-5 p-3.5 bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_#06b6d4]"></span>
              {isAr ? 'الإعداد ب (Config B - المقارنة)' : 'Config B (Comparison)'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTweakB(!showTweakB)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                  showTweakB
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={isAr ? 'تعديل المعايير يدوياً' : 'Tweak parameters manually'}
              >
                <Sliders className="w-3 h-3" />
                <span>{isAr ? 'تعديل' : 'Tweak'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyToEngine('B')}
                className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-colors cursor-pointer flex items-center gap-1"
                title={isAr ? 'تطبيق هذا الإعداد على المحرك النشط' : 'Apply Config B to active engine'}
              >
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>{isAr ? 'تطبيق بالمحرك' : 'Apply'}</span>
              </button>
            </div>
          </div>

          <select
            value={configB.id.replace('config_b_', '')}
            onChange={(e) => handleSelectPresetB(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none font-medium cursor-pointer"
          >
            <option value="current">{isAr ? 'الإعداد الحالي للمحرك' : 'Current Active Engine'}</option>
            {COMPARATOR_PRESETS.map((p) => (
              <option key={'b_' + p.id} value={p.id}>
                {isAr ? p.nameAr : p.name}
              </option>
            ))}
          </select>

          {/* Quick parameter pills */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400 pt-0.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              Drag: {configB.dragCoefficient}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              Gravity: {configB.gravityZ}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              Sense: {configB.groundSense.toFixed(2)}x
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              Exp: {configB.curveExponent}
            </span>
          </div>

          {/* Collapsible Manual Tweak Drawer B */}
          {showTweakB && (
            <div className="p-2.5 bg-slate-900 rounded-lg border border-cyan-500/20 space-y-2 text-[11px] font-mono text-slate-300 animate-fade-in">
              <div className="flex items-center justify-between">
                <span>Drag Coeff: {configB.dragCoefficient}</span>
                <input
                  type="range"
                  min="0.010"
                  max="0.080"
                  step="0.002"
                  value={configB.dragCoefficient}
                  onChange={(e) => setConfigB({ ...configB, dragCoefficient: parseFloat(e.target.value) })}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Gravity Z: {configB.gravityZ}</span>
                <input
                  type="range"
                  min="-1200"
                  max="-300"
                  step="25"
                  value={configB.gravityZ}
                  onChange={(e) => setConfigB({ ...configB, gravityZ: parseInt(e.target.value, 10) })}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Ground Sense: {configB.groundSense.toFixed(2)}x</span>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={configB.groundSense}
                  onChange={(e) => setConfigB({ ...configB, groundSense: parseFloat(e.target.value) })}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Curve Exp: {configB.curveExponent}</span>
                <input
                  type="range"
                  min="1.0"
                  max="1.8"
                  step="0.05"
                  value={configB.curveExponent}
                  onChange={(e) => setConfigB({ ...configB, curveExponent: parseFloat(e.target.value) })}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* COMPARATIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Metric 1: Supersonic Drag Deceleration */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Wind className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'مقاومة السوبرسونيك' : 'Supersonic Drag'}</span>
            </span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
              summary.dragDeltaPercent < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {summary.dragDeltaPercent > 0 ? `+${summary.dragDeltaPercent}%` : `${summary.dragDeltaPercent}%`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 font-mono">
            <span className="text-xs text-amber-400 font-bold">{calculateDragDecel(2300, configA.dragCoefficient)} uu/s²</span>
            <span className="text-xs text-cyan-400 font-bold">{calculateDragDecel(2300, configB.dragCoefficient)} uu/s²</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {isAr ? 'معدل التباطؤ عند 2300 uu/s' : 'Opposing drag at 2300 uu/s'}
          </p>
        </div>

        {/* Metric 2: Jump Apex Height */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'ارتفاع قمة القفزة (Apex)' : 'Jump Apex Height'}</span>
            </span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
              summary.apexDeltaUu > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {summary.apexDeltaUu > 0 ? `+${summary.apexDeltaUu} uu` : `${summary.apexDeltaUu} uu`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 font-mono">
            <span className="text-xs text-amber-400 font-bold">{jumpMetricsA.apexHeightUu} uu</span>
            <span className="text-xs text-cyan-400 font-bold">{jumpMetricsB.apexHeightUu} uu</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {isAr ? 'أقصى نقطة ارتفاع رأسية' : 'Vertical apex limit in uu'}
          </p>
        </div>

        {/* Metric 3: Total Hangtime */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? 'زمن البقاء بالجو (Hangtime)' : 'Air Hangtime'}</span>
            </span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
              summary.hangtimeDeltaMs > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {summary.hangtimeDeltaMs > 0 ? `+${summary.hangtimeDeltaMs}ms` : `${summary.hangtimeDeltaMs}ms`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 font-mono">
            <span className="text-xs text-amber-400 font-bold">{Math.round(jumpMetricsA.hangtimeSec * 1000)} ms</span>
            <span className="text-xs text-cyan-400 font-bold">{Math.round(jumpMetricsB.hangtimeSec * 1000)} ms</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {isAr ? 'مدة بقاء السيارة في الهواء' : 'Airborne duration before ground'}
          </p>
        </div>

        {/* Metric 4: 0-100 km/h Ground Throttle Time */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تسارع 0-100 كم/س (Drive)' : '0-100 km/h Launch'}</span>
            </span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
              summary.zeroToHundredDeltaSec < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {summary.zeroToHundredDeltaSec < 0 ? `${summary.zeroToHundredDeltaSec}s` : `+${summary.zeroToHundredDeltaSec}s`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 font-mono">
            <span className="text-xs text-amber-400 font-bold">{zeroToHundredA}s</span>
            <span className="text-xs text-cyan-400 font-bold">{zeroToHundredB}s</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {isAr ? 'بدون استخدام البوست (Throttle Only)' : 'Pure ground drive without boost'}
          </p>
        </div>

      </div>

      {/* DIMENSION VIEW TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-amber-500 to-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isAr ? 'المعاينة الشاملة المتزامنة (All Overlays)' : 'All Overlays Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drag')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'drag'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>{isAr ? '1. مقاومة الهواء والتباطؤ (Drag Dynamics)' : '1. Aerodynamic Drag'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gravity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'gravity'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>{isAr ? '2. الجاذبية ومسار القفز (Gravity Arc)' : '2. Gravity & Trajectory'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('throttle')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'throttle'
              ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-950/40'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isAr ? '3. تدريج دواسة السرعة (Throttle Scaling)' : '3. Throttle Scaling'}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: DRAG DYNAMICS OVERLAY                                     */}
      {/* ==================================================================== */}
      {(activeTab === 'all' || activeTab === 'drag') && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isAr ? 'منحنى مقاومة الهواء والتباطؤ الإيروديناميكي (Drag Deceleration Curve)' : 'Aerodynamic Drag Deceleration vs Forward Velocity'}
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-1 bg-amber-400 rounded-full inline-block"></span>
                Config A: {configA.dragCoefficient}
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2.5 h-1 bg-cyan-400 rounded-full inline-block"></span>
                Config B: {configB.dragCoefficient}
              </span>
            </div>
          </div>

          {/* SVG Overlay Graph: Drag */}
          <div className="relative bg-[#070b14] rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            <svg viewBox="0 0 480 200" className="w-full h-48 select-none">
              <defs>
                <linearGradient id="dragGradientA" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="dragGradientB" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="25" x2="460" y2="25" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="460" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="125" x2="460" y2="125" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="460" y2="180" stroke="#334155" strokeWidth="1" />

              {/* Velocity Vertical Reference Marks */}
              {/* 1410 Max Throttle */}
              <line x1={dragSvgX(1410)} y1="20" x2={dragSvgX(1410)} y2="180" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <text x={dragSvgX(1410) - 15} y="15" fill="#f59e0b" fontSize="8" fontFamily="monospace" opacity="0.8">
                1410 (Max Throttle)
              </text>

              {/* 2200 Supersonic */}
              <line x1={dragSvgX(2200)} y1="20" x2={dragSvgX(2200)} y2="180" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <text x={dragSvgX(2200) - 20} y="15" fill="#06b6d4" fontSize="8" fontFamily="monospace" opacity="0.8">
                2200 (Supersonic)
              </text>

              {/* Axis Labels */}
              <text x="5" y="30" fill="#64748b" fontSize="8" fontFamily="monospace">180 u/s²</text>
              <text x="5" y="105" fill="#64748b" fontSize="8" fontFamily="monospace">90 u/s²</text>
              <text x="5" y="180" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>

              <text x="40" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">0 uu/s</text>
              <text x="240" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">1150 uu/s</text>
              <text x="430" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">2300 uu/s</text>

              {/* Curve A (Amber) */}
              <path d={dragPathA} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Curve B (Cyan) */}
              <path d={dragPathB} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Probe Line */}
              <line
                x1={dragSvgX(dragProbeV)}
                y1="20"
                x2={dragSvgX(dragProbeV)}
                y2="180"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Probe Dot A */}
              <circle
                cx={dragSvgX(dragProbeV)}
                cy={dragSvgY(probeDragDecelA)}
                r="4.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Probe Dot B */}
              <circle
                cx={dragSvgX(dragProbeV)}
                cy={dragSvgY(probeDragDecelB)}
                r="4.5"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Drag Interactive Probe Scrubber */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-400">
                {isAr ? 'نقطة الفحص التفاعلي للسرعة:' : 'Interactive Probe Velocity:'}{' '}
                <strong className="text-white font-bold">{dragProbeV} uu/s</strong> ({Math.round(dragProbeV * 0.036)} km/h)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-amber-400">Decel A: {probeDragDecelA} uu/s²</span>
                <span className="text-cyan-400">Decel B: {probeDragDecelB} uu/s²</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${
                  probeDragDelta < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  Δ {probeDragDelta > 0 ? `+${probeDragDelta}` : probeDragDelta} uu/s²
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="2300"
              step="10"
              value={dragProbeV}
              onChange={(e) => setDragProbeV(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: GRAVITY & JUMP TRAJECTORY OVERLAY                         */}
      {/* ==================================================================== */}
      {(activeTab === 'all' || activeTab === 'gravity') && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Orbit className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isAr ? 'مسار القفز العمودي وتأثير الجاذبية (Parabolic Jump Arc y(t))' : 'Vertical Jump Trajectory Arc vs Elapsed Hangtime'}
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-1 bg-amber-400 rounded-full inline-block"></span>
                Config A: {configA.gravityZ} uu/s² (Apex: {jumpMetricsA.apexHeightUu} uu)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2.5 h-1 bg-cyan-400 rounded-full inline-block"></span>
                Config B: {configB.gravityZ} uu/s² (Apex: {jumpMetricsB.apexHeightUu} uu)
              </span>
            </div>
          </div>

          {/* SVG Overlay Graph: Gravity */}
          <div className="relative bg-[#070b14] rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            <svg viewBox="0 0 480 200" className="w-full h-48 select-none">
              {/* Grid Lines */}
              <line x1="40" y1="25" x2="460" y2="25" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="460" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="125" x2="460" y2="125" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="460" y2="180" stroke="#334155" strokeWidth="1" />

              {/* Ground level line */}
              <text x="5" y="30" fill="#64748b" fontSize="8" fontFamily="monospace">
                {Math.round(maxTrajectoryHeight)} uu
              </text>
              <text x="5" y="105" fill="#64748b" fontSize="8" fontFamily="monospace">
                {Math.round(maxTrajectoryHeight / 2)} uu
              </text>
              <text x="5" y="180" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>

              <text x="40" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">0.00s</text>
              <text x="240" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">
                {(maxHangtime / 2).toFixed(2)}s
              </text>
              <text x="430" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">
                {maxHangtime.toFixed(2)}s
              </text>

              {/* Trajectory A (Amber) */}
              <path d={gravPathA} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Trajectory B (Cyan) */}
              <path d={gravPathB} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Apex marker A */}
              <circle
                cx={gravSvgX(jumpMetricsA.timeToApexSec)}
                cy={gravSvgY(jumpMetricsA.apexHeightUu)}
                r="4"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Apex marker B */}
              <circle
                cx={gravSvgX(jumpMetricsB.timeToApexSec)}
                cy={gravSvgY(jumpMetricsB.apexHeightUu)}
                r="4"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Probe Line */}
              <line
                x1={gravSvgX(gravityProbeT)}
                y1="20"
                x2={gravSvgX(gravityProbeT)}
                y2="180"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Probe Dot A */}
              <circle
                cx={gravSvgX(gravityProbeT)}
                cy={gravSvgY(probeHeightA)}
                r="4.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Probe Dot B */}
              <circle
                cx={gravSvgX(gravityProbeT)}
                cy={gravSvgY(probeHeightB)}
                r="4.5"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Gravity Interactive Probe Scrubber */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-400">
                {isAr ? 'زمن المعاينة بعد القفز:' : 'Elapsed Jump Timestamp:'}{' '}
                <strong className="text-white font-bold">{gravityProbeT}s</strong> ({Math.round(gravityProbeT * 1000)} ms)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-amber-400">Height A: {probeHeightA} uu</span>
                <span className="text-cyan-400">Height B: {probeHeightB} uu</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${
                  probeHeightDelta > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  Δ {probeHeightDelta > 0 ? `+${probeHeightDelta}` : probeHeightDelta} uu
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max={maxHangtime}
              step="0.02"
              value={gravityProbeT}
              onChange={(e) => setGravityProbeT(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: THROTTLE SCALING OVERLAY                                  */}
      {/* ==================================================================== */}
      {(activeTab === 'all' || activeTab === 'throttle') && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isAr ? 'منحنى تدريج دواسة السرعة والاستجابة (Throttle Input Response Curve)' : 'Normalized Throttle Input vs Effective Output Curve'}
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-1 bg-amber-400 rounded-full inline-block"></span>
                Config A: DZ {configA.internalDeadzone} | Exp {configA.curveExponent}
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2.5 h-1 bg-cyan-400 rounded-full inline-block"></span>
                Config B: DZ {configB.internalDeadzone} | Exp {configB.curveExponent}
              </span>
            </div>
          </div>

          {/* SVG Overlay Graph: Throttle */}
          <div className="relative bg-[#070b14] rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            <svg viewBox="0 0 480 200" className="w-full h-48 select-none">
              {/* Grid Lines */}
              <line x1="40" y1="25" x2="460" y2="25" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="460" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="125" x2="460" y2="125" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="460" y2="180" stroke="#334155" strokeWidth="1" />

              {/* Deadzone visual zone A */}
              <rect
                x="40"
                y="20"
                width={configA.internalDeadzone * 420}
                height="160"
                fill="#f59e0b"
                opacity="0.08"
              />

              {/* Deadzone visual zone B */}
              <rect
                x="40"
                y="20"
                width={configB.internalDeadzone * 420}
                height="160"
                fill="#06b6d4"
                opacity="0.08"
              />

              {/* Axis labels */}
              <text x="5" y="30" fill="#64748b" fontSize="8" fontFamily="monospace">2.00x</text>
              <text x="5" y="105" fill="#64748b" fontSize="8" fontFamily="monospace">1.00x</text>
              <text x="5" y="180" fill="#64748b" fontSize="8" fontFamily="monospace">0.00x</text>

              <text x="40" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">0.0 (Idle)</text>
              <text x="240" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">0.50</text>
              <text x="430" y="195" fill="#64748b" fontSize="8" fontFamily="monospace">1.00 (Full W)</text>

              {/* Throttle Curve A (Amber) */}
              <path d={throtPathA} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Throttle Curve B (Cyan) */}
              <path d={throtPathB} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Probe Line */}
              <line
                x1={throtSvgX(throttleProbeInp)}
                y1="20"
                x2={throtSvgX(throttleProbeInp)}
                y2="180"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Probe Dot A */}
              <circle
                cx={throtSvgX(throttleProbeInp)}
                cy={throtSvgY(probeThrottleA.effectiveThrottle)}
                r="4.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Probe Dot B */}
              <circle
                cx={throtSvgX(throttleProbeInp)}
                cy={throtSvgY(probeThrottleB.effectiveThrottle)}
                r="4.5"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Throttle Interactive Probe Scrubber */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-400">
                {isAr ? 'إزاحة دواسة السرعة (W / Throttle):' : 'Throttle Input Deflection:'}{' '}
                <strong className="text-white font-bold">{Math.round(throttleProbeInp * 100)}%</strong> ({throttleProbeInp.toFixed(2)})
              </span>
              <div className="flex items-center gap-3">
                <span className="text-amber-400">
                  Out A: {probeThrottleA.inDeadzone ? 'DEADZONE' : `${probeThrottleA.effectiveThrottle}x`}
                </span>
                <span className="text-cyan-400">
                  Out B: {probeThrottleB.inDeadzone ? 'DEADZONE' : `${probeThrottleB.effectiveThrottle}x`}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${
                  probeThrottleDelta > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  Δ {probeThrottleDelta > 0 ? `+${probeThrottleDelta}` : probeThrottleDelta}x
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={throttleProbeInp}
              onChange={(e) => setThrottleProbeInp(parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* FOOTER HELPER */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            {isAr
              ? 'تتيح لك المقارنة اختيار أي بروفايل أو وضع وتعديل المعايير يدوياً وتطبيقها فوراً على محرك اللعبة بنقرة واحدة.'
              : 'Easily test any pair of presets, adjust drag, gravity or throttle dynamically, and apply the winner directly to your game engine.'}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-amber-400 font-bold">● Config A</span>
          <span className="text-slate-500">vs</span>
          <span className="text-cyan-400 font-bold">● Config B</span>
        </div>
      </div>

    </div>
  );
};
