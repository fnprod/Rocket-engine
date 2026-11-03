import React, { useState, useEffect, useMemo } from 'react';
import { PhysicsConfig, Language, KeyBinding, MacroTimingConfig } from '../types/engine';
import { CLASSIC_ESPORTS_PHYSICS_CONFIG, INITIAL_KEYBINDINGS, INITIAL_MACRO_TIMINGS } from '../data/initialData';
import { recordAuditEntry } from '../utils/engineAuditLog';
import { generateCurvePoints, applyProfessionalCurve } from '../utils/mathEngine';
import { KeybindLayerZero } from './KeybindLayerZero';
import { UnifiedRadarCodexHub } from './UnifiedRadarCodexHub';
import { LiveGameMonitor } from './LiveGameMonitor';
import { NativeCppLuaStudio } from './NativeCppLuaStudio';
import { ReplayAnalyzer } from './ReplayAnalyzer';
import { EngineAuditHistoryPanel } from './EngineAuditHistoryPanel';
import { EngineTreeVisualizer } from './EngineTreeVisualizer';
import { 
  Rocket, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  Zap, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Keyboard, 
  Crosshair, 
  Tv, 
  Code2, 
  FileSearch, 
  History,
  GitBranch
} from 'lucide-react';

interface ClassicProEngineProps {
  config?: PhysicsConfig;
  onChangeConfig?: (newConfig: PhysicsConfig) => void;
  keybindings?: KeyBinding[];
  onChangeKeybindings?: (bindings: KeyBinding[]) => void;
  macroTimings?: MacroTimingConfig;
  onChangeTimings?: (newTimings: MacroTimingConfig) => void;
  initialBranch?: string;
  language: Language;
  onDispatchToast?: (msg: string) => void;
}

const STORAGE_KEY_CLASSIC = 'fnpro_classic_pro_config_v2';
const STORAGE_BRANCH_KEY = 'fnpro_classic_active_branch_v2';

// LOCKED FACTORY ESPORTS REFERENCE CONSTANTS (Non-editable baseline)
const LOCKED_MASTER_REFERENCE: PhysicsConfig = {
  internalDeadzone: 0.05,
  dodgeDeadzone: 0.10,
  hardwareJitter: 2,
  groundSense: 1.30,
  aerialSense: 1.50,
  precisionMode: 0.70,
  curveExponent: 1.45,
  pollingRateAdj: 1,
  supersonicVelocity: 2200
};

export const ClassicProEngine: React.FC<ClassicProEngineProps> = ({
  config: propConfig,
  onChangeConfig: propOnChangeConfig,
  keybindings = INITIAL_KEYBINDINGS,
  onChangeKeybindings,
  macroTimings = INITIAL_MACRO_TIMINGS,
  onChangeTimings,
  initialBranch,
  language,
  onDispatchToast,
}) => {
  const isAr = language === 'ar';

  const [activeBranch, setActiveBranch] = useState<string>(() => {
    if (initialBranch) return initialBranch;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_BRANCH_KEY);
      if (saved) return saved;
    }
    return 'physics_curve';
  });

  // Switch active branch and persist
  const handleSelectBranch = (branchId: string) => {
    setActiveBranch(branchId);
    try {
      localStorage.setItem(STORAGE_BRANCH_KEY, branchId);
    } catch {}
  };

  const [internalConfig, setInternalConfig] = useState<PhysicsConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CLASSIC);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.curveExponent === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load classic pro config:', e);
      }
    }
    return propConfig || CLASSIC_ESPORTS_PHYSICS_CONFIG;
  });

  const config = propConfig || internalConfig;

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isCurveLocked, setIsCurveLocked] = useState<boolean>(() => {
    return localStorage.getItem('fnpro_classic_curve_locked') === 'true';
  });

  // Real-time live oscillating telemetry probe stream
  const [liveProbeInput, setLiveProbeInput] = useState<number>(75);

  useEffect(() => {
    if (isCurveLocked) return; // Frozen at exact moment when locked
    const interval = setInterval(() => {
      const t = Date.now() / 700;
      const wave = 68 + Math.sin(t) * 18 + Math.cos(t * 1.8) * 8;
      setLiveProbeInput(Math.max(5, Math.min(96, Math.round(wave))));
    }, 120);
    return () => clearInterval(interval);
  }, [isCurveLocked]);

  const handleUpdateParam = (key: keyof PhysicsConfig, value: number, labelAr: string, labelEn: string) => {
    if (isCurveLocked) {
      const lockMsg = isAr ? '🔒 لا يمكن التعديل: المنحنى والمحرك مقفل حالياً لمنع العبث العرضي' : '🔒 Modification blocked: Live curve is currently locked.';
      setSaveToast(lockMsg);
      onDispatchToast?.(lockMsg);
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }
    const oldVal = config[key];
    const updated = {
      ...config,
      [key]: value
    };
    if (propOnChangeConfig) {
      propOnChangeConfig(updated);
    }
    setInternalConfig(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CLASSIC, JSON.stringify(updated));
    } catch (err) {
      console.error('Storage error:', err);
    }

    // Record in complete audit log
    recordAuditEntry({
      section: 'classic_pro',
      sectionNameAr: 'المحرك الكلاسيكي المعتمد (الرئيسي)',
      sectionNameEn: 'Classic Pro Standard Engine',
      paramKey: String(key),
      paramLabelAr: labelAr,
      paramLabelEn: labelEn,
      oldValue: oldVal,
      newValue: value,
      changeType: 'param_tune'
    });

    const toast = isAr ? `✓ تم حفظ ${labelAr}: ${value} وتحديث الرادار تلقائياً` : `✓ Saved ${labelEn}: ${value} & synchronized radar`;
    setSaveToast(toast);
    onDispatchToast?.(toast);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleResetToLockedMaster = () => {
    if (propOnChangeConfig) {
      propOnChangeConfig(LOCKED_MASTER_REFERENCE);
    }
    setInternalConfig(LOCKED_MASTER_REFERENCE);
    try {
      localStorage.setItem(STORAGE_KEY_CLASSIC, JSON.stringify(LOCKED_MASTER_REFERENCE));
    } catch (err) {
      console.error('Storage error:', err);
    }
    recordAuditEntry({
      section: 'classic_pro',
      sectionNameAr: 'المحرك الكلاسيكي المعتمد (الرئيسي)',
      sectionNameEn: 'Classic Pro Standard Engine',
      paramKey: 'ALL_PARAMETERS',
      paramLabelAr: 'إعادة ضبط المحرك لمعايير المصنع المقفلة',
      paramLabelEn: 'Reset Engine to Locked Master Reference',
      oldValue: 'Custom',
      newValue: 'Locked Esports Baseline',
      changeType: 'engine_switch'
    });
    const toast = isAr ? '✓ تم استعادة معايير المصنع المرجعية المقفلة للمحرك' : '✓ Restored locked master reference baseline';
    setSaveToast(toast);
    onDispatchToast?.(toast);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Generate SVG curve points for Live Tuned Config
  const tunedCurvePoints = useMemo(() => {
    return generateCurvePoints(config, 60);
  }, [config]);

  // Generate SVG curve points for Locked Master Reference
  const masterCurvePoints = useMemo(() => {
    return generateCurvePoints(LOCKED_MASTER_REFERENCE, 60);
  }, []);

  const tunedSvgPath = useMemo(() => {
    if (tunedCurvePoints.length === 0) return '';
    return tunedCurvePoints.reduce((acc, pt, idx) => {
      const x = 180 + (pt.rawInput / 127) * 160;
      const y = 90 - (pt.groundOutput / 195) * 80;
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [tunedCurvePoints]);

  const masterSvgPath = useMemo(() => {
    if (masterCurvePoints.length === 0) return '';
    return masterCurvePoints.reduce((acc, pt, idx) => {
      const x = 180 + (pt.rawInput / 127) * 160;
      const y = 90 - (pt.groundOutput / 195) * 80;
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [masterCurvePoints]);

  const liveProbeCurved = useMemo(() => {
    const rawVal = (liveProbeInput / 100) * 127;
    const curved = applyProfessionalCurve(rawVal, config.groundSense, config);
    return Math.round((curved / 127) * 100);
  }, [liveProbeInput, config]);

  const masterProbeCurved = useMemo(() => {
    const rawVal = (liveProbeInput / 100) * 127;
    const curved = applyProfessionalCurve(rawVal, LOCKED_MASTER_REFERENCE.groundSense, LOCKED_MASTER_REFERENCE);
    return Math.round((curved / 127) * 100);
  }, [liveProbeInput]);

  const getDeltaBadge = (currentVal: number, masterVal: number, unit = '') => {
    const diff = +(currentVal - masterVal).toFixed(2);
    if (diff === 0) {
      return (
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          = {isAr ? 'مطابق للمرجع' : 'Exact Match'}
        </span>
      );
    }
    const isPositive = diff > 0;
    return (
      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
        isPositive 
          ? 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30' 
          : 'text-amber-400 bg-amber-950/60 border-amber-500/30'
      }`}>
        {isPositive ? `+${diff}` : diff}{unit} {isAr ? 'عن المرجع' : 'vs Master'}
      </span>
    );
  };

  // Master Engine Tree Branches
  const branches = [
    {
      id: 'physics_curve',
      label: isAr ? 'الفيزياء والمنحنى الحي' : 'Core Physics & Live Curve',
      icon: Rocket,
      desc: isAr ? 'المعايرة والمنحنى المباشر' : 'Physics & curve'
    },
    {
      id: 'keyboard_macros',
      label: isAr ? 'كيبورد زيرو والماكرو' : 'Keyboard Zero & Macros',
      icon: Keyboard,
      desc: isAr ? 'مصفوفة 1000Hz وسكريبتات G-HUB' : '1000Hz matrix & G-HUB'
    },
    {
      id: 'radar_codex',
      label: isAr ? 'رادار المتجهات وكوديكس' : 'Radar & Codex Hub',
      icon: Crosshair,
      desc: isAr ? 'فضاء القوة والحركات العشر' : 'Polar scope & fleet'
    },
    {
      id: 'directx_monitor',
      label: isAr ? 'مراقب DirectX والتليمينتري' : 'DirectX Live Monitor',
      icon: Tv,
      desc: isAr ? '2300 uu/s وحزم الإشارات الحية' : 'DirectX 11/12 & hardware feed'
    },
    {
      id: 'cpp_lua_studio',
      label: isAr ? 'استوديو C++ و Lua 5.4' : '5 C++ & Lua 5.4 Studio',
      icon: Code2,
      desc: isAr ? 'محركات الذاكرة المنخفضة DLL' : 'Native C++ engines & Lua'
    },
    {
      id: 'replay_ai',
      label: isAr ? 'تحليل الريبلاي والذكاء' : 'Replay & AI Studio',
      icon: FileSearch,
      desc: isAr ? 'تحليل .replay والربط مع TAInput' : '.replay analysis & correlation'
    },
    {
      id: 'audit_trail',
      label: isAr ? 'سجل العمليات والتدقيق' : 'Audit Trail & History',
      icon: History,
      desc: isAr ? 'سجل SQLite والتاريخ الكامل' : 'SQLite WAL change history'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-xl p-3 text-center text-xs font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2 shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Engine Hub Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-xl shadow-inner shrink-0">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-wide">
                {isAr ? 'المحرك الكلاسيكي المعتمد (Classic Pro Engine)' : 'Classic Pro Standard Engine'}
              </h1>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm">
                {isAr ? 'المحرك الرئيسي الشامل' : 'PRIMARY MASTER ENGINE'}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                1000Hz DIRECTINPUT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {isAr
                ? 'شجرة المحرك الموحدة: يحتوي على 7 أغصان مترابطة تغذي بعضها البعض (الفيزياء الحية، كيبورد زيرو، الماكرو، رادار المتجهات، مراقب DirectX، محركات C++، وتحليل الريبلاي).'
                : 'Unified Master Engine Tree: 7 interconnected branches feeding into one responsive 1000Hz esports pipeline.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleResetToLockedMaster}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-mono font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'استعادة معايير المصنع' : 'Reset to Esports Baseline'}</span>
        </button>
      </div>

      {/* DYNAMIC HIERARCHY TREE VISUALIZER (1 -> 2 -> 4 -> 8) */}
      <EngineTreeVisualizer
        language={language}
        config={config}
        activeBranch={activeBranch}
        onSelectBranch={handleSelectBranch}
      />

      {/* MASTER TREE BRANCHES SELECTOR (الشجرة الرئيسية للمحرك) */}
      <div className="bg-[#090e18] border-2 border-slate-800 rounded-2xl p-2.5 shadow-xl">
        <div className="text-[11px] font-mono text-slate-400 mb-2 px-2 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{isAr ? 'أغصان المحرك الكلاسيكي المترابطة (Engine Hierarchy Tree):' : 'Engine Tree Subsystems:'}</span>
          </span>
          <span className="text-slate-500 text-[10px]">PC High Performance 1000Hz</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {branches.map((b) => {
            const Icon = b.icon;
            const isActive = activeBranch === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleSelectBranch(b.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-950/40 scale-[1.02]'
                    : 'text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BRANCH 1: CORE PHYSICS CALIBRATION & REAL-TIME OSCILLATING TELEMETRY CURVE */}
      {/* ========================================================================= */}
      {activeBranch === 'physics_curve' && (
        <div className="space-y-6">
          {/* PART 1: LOCKED MASTER REFERENCE BASELINE */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <span>{isAr ? 'الجزء 1: المعايير المرجعية المقفلة للمحرك (Locked Master Reference)' : 'Part 1: Locked Master Reference (Esports Standard)'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                      {isAr ? 'غير قابلة للتعديل 🔒' : 'LOCKED 🔒'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'هذه القيم القياسية لمصنع البطولة ثابتة وغير قابلة للتعديل بأي شكل، وتُستخدم كمعيار مرجعي لقياس التعديلات ومقارنتها.'
                      : 'Factory esports reference standards. Strictly read-only to guarantee an unalterable benchmark.'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                RLCS Esports Factory Spec
              </span>
            </div>

            {/* Read-Only Reference Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">{isAr ? 'الديد زون المرجعي' : 'Ref Deadzone'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-bold text-amber-300">{LOCKED_MASTER_REFERENCE.internalDeadzone}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span className="text-[9px] font-mono text-slate-500">Fixed 0.05 True</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">{isAr ? 'دودج ديد زون المرجعي' : 'Ref Dodge Deadzone'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-bold text-amber-300">{LOCKED_MASTER_REFERENCE.dodgeDeadzone}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span className="text-[9px] font-mono text-slate-500">Fixed 0.10 Flip</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">{isAr ? 'الحساسية الأرضية' : 'Ref Ground Sens'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-bold text-amber-300">{LOCKED_MASTER_REFERENCE.groundSense}x</span>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span className="text-[9px] font-mono text-slate-500">Fixed 1.30 Ground</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">{isAr ? 'الحساسية الجوية' : 'Ref Aerial Sens'}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-bold text-amber-300">{LOCKED_MASTER_REFERENCE.aerialSense}x</span>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span className="text-[9px] font-mono text-slate-500">Fixed 1.50 Aerial</span>
              </div>
            </div>
          </div>

          {/* PART 2: DYNAMIC CALIBRATION & LIVE TUNING LAYER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sliders Panel (8 Cols) */}
            <div className="lg:col-span-8 bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${isCurveLocked ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'}`}>
                    {isCurveLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{isAr ? 'الجزء 2: طبقة المعايرة والتعديل الديناميكي الحي (Live Tuning Layer)' : 'Part 2: Dynamic Calibration & Tuning Layer'}</span>
                      {isCurveLocked && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                          LOCKED 🔒
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'تعديل المعايير يتم قياسه لحظياً ومقارنته مع المرجع وينعكس مباشرة على الرادار' : 'Tune custom settings with live delta tracking directly affecting the Polar Radar.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !isCurveLocked;
                      setIsCurveLocked(nextVal);
                      localStorage.setItem('fnpro_classic_curve_locked', String(nextVal));
                      const toast = nextVal 
                        ? (isAr ? '🔒 تم قفل المنحنى والمعايير بنجاح لحمايتها من أي تعديل عرضي!' : '🔒 Live Curve & Calibration Locked against accidental edits!')
                        : (isAr ? '🔓 تم إلغاء قفل المنحنى - المعايرة جاهزة للتعديل' : '🔓 Live Curve Unlocked for calibration');
                      setSaveToast(toast);
                      onDispatchToast?.(toast);
                      setTimeout(() => setSaveToast(null), 3000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      isCurveLocked
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-md shadow-amber-950/30'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {isCurveLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{isCurveLocked ? (isAr ? 'قفل المنحنى نشط 🔒' : 'Curve Locked 🔒') : (isAr ? 'قفل المنحنى المباشر' : 'Lock Live Curve')}</span>
                  </button>

                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30 hidden sm:inline-block">
                    RADAR SYNC ACTIVE ✓
                  </span>
                </div>
              </div>

              {/* Protective Lock Banner */}
              {isCurveLocked && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 animate-in fade-in font-mono">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isAr
                      ? '🔒 تم قفل المنحنى والمعايير لحمايتها من التعديل العرضي أثناء المباريات. انقر على إلغاء القفل للتعديل.'
                      : '🔒 Live Curve is LOCKED to prevent accidental tampering during matches. Click Unlock to adjust parameters.'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Slider 1: Internal Deadzone */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'المنطقة الميتة الداخلية:' : 'Internal Deadzone:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-sm">{config.internalDeadzone}</span>
                      {getDeltaBadge(config.internalDeadzone, LOCKED_MASTER_REFERENCE.internalDeadzone)}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.25"
                    step="0.01"
                    disabled={isCurveLocked}
                    value={config.internalDeadzone}
                    onChange={(e) => handleUpdateParam('internalDeadzone', parseFloat(e.target.value), 'المنطقة الميتة الداخلية', 'Internal Deadzone')}
                    className={`w-full accent-cyan-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0.01 (High Precision)</span>
                    <span>Master: 0.05</span>
                    <span>0.25 (Loose)</span>
                  </div>
                </div>

                {/* Slider 2: Dodge Deadzone */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'منطقة الفليب دودج:' : 'Dodge Deadzone:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-sm">{config.dodgeDeadzone}</span>
                      {getDeltaBadge(config.dodgeDeadzone, LOCKED_MASTER_REFERENCE.dodgeDeadzone)}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.90"
                    step="0.05"
                    disabled={isCurveLocked}
                    value={config.dodgeDeadzone}
                    onChange={(e) => handleUpdateParam('dodgeDeadzone', parseFloat(e.target.value), 'منطقة الفليب دودج', 'Dodge Deadzone')}
                    className={`w-full accent-amber-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0.05 (Instant Flip)</span>
                    <span>Master: 0.10</span>
                    <span>0.90 (Safe Aerial)</span>
                  </div>
                </div>

                {/* Slider 3: Ground Sensitivity */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'حساسية التوجيه الأرضي:' : 'Ground Steering Sensitivity:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm">{config.groundSense}x</span>
                      {getDeltaBadge(config.groundSense, LOCKED_MASTER_REFERENCE.groundSense, 'x')}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="3.00"
                    step="0.05"
                    disabled={isCurveLocked}
                    value={config.groundSense}
                    onChange={(e) => handleUpdateParam('groundSense', parseFloat(e.target.value), 'حساسية التوجيه الأرضي', 'Ground Sensitivity')}
                    className={`w-full accent-emerald-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>1.00x</span>
                    <span>Master: 1.30x</span>
                    <span>3.00x</span>
                  </div>
                </div>

                {/* Slider 4: Aerial Sensitivity */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'حساسية المناورة الجوية:' : 'Aerial Sensitivity:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold text-sm">{config.aerialSense}x</span>
                      {getDeltaBadge(config.aerialSense, LOCKED_MASTER_REFERENCE.aerialSense, 'x')}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="3.00"
                    step="0.05"
                    disabled={isCurveLocked}
                    value={config.aerialSense}
                    onChange={(e) => handleUpdateParam('aerialSense', parseFloat(e.target.value), 'حساسية المناورة الجوية', 'Aerial Sensitivity')}
                    className={`w-full accent-purple-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>1.00x</span>
                    <span>Master: 1.50x</span>
                    <span>3.00x</span>
                  </div>
                </div>

                {/* Slider 5: Curve Exponent */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'معامل تقوس الاستجابة:' : 'Curve Exponent:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-sm">{config.curveExponent}</span>
                      {getDeltaBadge(config.curveExponent, LOCKED_MASTER_REFERENCE.curveExponent)}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="2.50"
                    step="0.05"
                    disabled={isCurveLocked}
                    value={config.curveExponent}
                    onChange={(e) => handleUpdateParam('curveExponent', parseFloat(e.target.value), 'معامل تقوس الاستجابة', 'Curve Exponent')}
                    className={`w-full accent-cyan-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>1.00 (Linear 1:1)</span>
                    <span>Master: 1.45</span>
                    <span>2.50 (Exponential)</span>
                  </div>
                </div>

                {/* Slider 6: Jitter Filtering */}
                <div className={`p-3.5 bg-slate-950 border rounded-xl space-y-2 transition-all ${isCurveLocked ? 'border-slate-800/60 opacity-60' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{isAr ? 'فلترة اهتزاز العتاد (Jitter):' : 'Hardware Jitter Damping:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-sm">{config.hardwareJitter} counts</span>
                      {getDeltaBadge(config.hardwareJitter, LOCKED_MASTER_REFERENCE.hardwareJitter, 'c')}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    disabled={isCurveLocked}
                    value={config.hardwareJitter}
                    onChange={(e) => handleUpdateParam('hardwareJitter', parseInt(e.target.value, 10), 'فلترة الاهتزاز', 'Jitter Damping')}
                    className={`w-full accent-amber-400 ${isCurveLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0 (Raw)</span>
                    <span>Master: 2 counts</span>
                    <span>8 (Heavy Damped)</span>
                  </div>
                </div>
              </div>

              {/* Real-time Dynamic Feedback Notice */}
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'الانعكاس الحي على الرادار:' : 'Live Impact on Polar Radar:'}</span>
                  <strong className="text-cyan-300 font-bold">
                    {isAr ? `تحديث فضاء المتجهات بمعدل 1000Hz مع ديد زون ${config.internalDeadzone}` : `1000Hz Vector Space updating with Deadzone ${config.internalDeadzone}`}
                  </strong>
                </span>
                <span className="text-emerald-400 font-bold">100% OPERATIONAL</span>
              </div>
            </div>

            {/* Live Response Comparison Curve (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'منحنى المقارنة المباشر (Live Telemetry)' : 'Live Curve Comparison'}</span>
                </span>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {isCurveLocked ? (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                      {isAr ? 'مقفل على اللحظة 🔒' : 'FROZEN AT MOMENT 🔒'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      <span>LIVE 1000Hz</span>
                    </span>
                  )}
                </div>
              </div>

              {/* SVG Comparative Graph with Real Live Oscillation */}
              <div className="h-44 w-full bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <svg viewBox="0 0 360 180" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="20" y1="90" x2="340" y2="90" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="180" y1="10" x2="180" y2="170" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Master Reference Curve (Amber Dashed) */}
                  <path d={masterSvgPath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.65" />

                  {/* Live Tuned Curve (Cyan Glow) */}
                  <path d={tunedSvgPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" />

                  {/* Live Oscillating Test Point Probe */}
                  <circle
                    cx={180 + ((liveProbeInput / 100) * 160)}
                    cy={90 - ((liveProbeCurved / 100) * 80)}
                    r="5"
                    fill={isCurveLocked ? '#f59e0b' : '#06b6d4'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className={isCurveLocked ? '' : 'animate-ping opacity-75'}
                  />
                  <circle
                    cx={180 + ((liveProbeInput / 100) * 160)}
                    cy={90 - ((liveProbeCurved / 100) * 80)}
                    r="5"
                    fill={isCurveLocked ? '#f59e0b' : '#06b6d4'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Live Probe Feedback Stats */}
              <div className="space-y-2 pt-1 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{isAr ? 'قراءة الإشارة الحية لحظياً:' : 'Live Input Deflection:'}</span>
                  <span className="text-white font-bold">{liveProbeInput}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1 text-[11px]">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">MASTER OUT</span>
                    <span className="text-amber-400 font-bold">{masterProbeCurved}%</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">TUNED OUT</span>
                    <span className="text-cyan-400 font-bold">{liveProbeCurved}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BRANCH 2: KEYBOARD ZERO & HARDWARE MACROS (G-HUB KEY-SCRIPTS SUITE) */}
      {/* ========================================================================= */}
      {activeBranch === 'keyboard_macros' && (
        <KeybindLayerZero
          keybindings={keybindings}
          onChangeKeybindings={onChangeKeybindings || (() => {})}
          physicsConfig={config}
          macroTimings={macroTimings}
          onChangeTimings={onChangeTimings}
          language={language}
        />
      )}

      {/* ========================================================================= */}
      {/* BRANCH 3: UNIFIED POLAR RADAR & CODEX HUB */}
      {/* ========================================================================= */}
      {activeBranch === 'radar_codex' && (
        <UnifiedRadarCodexHub
          physicsConfig={config}
          macroTimings={macroTimings}
          onApplyTimings={onChangeTimings}
          keybindings={keybindings}
          language={language}
        />
      )}

      {/* ========================================================================= */}
      {/* BRANCH 4: DIRECTX 11/12 LIVE TELEMETRY & HARDWARE MONITOR */}
      {/* ========================================================================= */}
      {activeBranch === 'directx_monitor' && (
        <LiveGameMonitor
          physicsConfig={config}
          language={language}
        />
      )}

      {/* ========================================================================= */}
      {/* BRANCH 5: 5 C++ NATIVE ENGINES & LUA 5.4 WORKBENCH */}
      {/* ========================================================================= */}
      {activeBranch === 'cpp_lua_studio' && (
        <NativeCppLuaStudio
          language={language}
        />
      )}

      {/* ========================================================================= */}
      {/* BRANCH 6: REPLAY ANALYZER & AI MECHANICS STUDIO */}
      {/* ========================================================================= */}
      {activeBranch === 'replay_ai' && (
        <ReplayAnalyzer
          physicsConfig={config}
          keybindings={keybindings}
          language={language}
          onApplyBindings={(cmds: string[]) => {
            onDispatchToast?.(isAr ? '✓ تم مزامنة بيانات ريبلاي مع محرك الإدخال' : '✓ Replay bindings synchronized with input engine');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* BRANCH 7: ENGINE AUDIT HISTORY & SQLITE WAL TRAIL */}
      {/* ========================================================================= */}
      {activeBranch === 'audit_trail' && (
        <EngineAuditHistoryPanel
          language={language}
        />
      )}

    </div>
  );
};
