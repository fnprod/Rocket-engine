import React, { useState, useEffect } from 'react';
import { MacroTimingConfig, Language } from '../types/engine';
import { INITIAL_MACRO_TIMINGS } from '../data/initialData';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Activity, 
  Flame, 
  Terminal, 
  Lock 
} from 'lucide-react';
import { recordAuditEntry } from '../utils/engineAuditLog';

interface MasterMacroSuiteProps {
  timings?: MacroTimingConfig;
  onChangeTimings?: (newTimings: MacroTimingConfig) => void;
  language: Language;
}

export const MasterMacroSuite: React.FC<MasterMacroSuiteProps> = ({
  timings = INITIAL_MACRO_TIMINGS,
  onChangeTimings,
  language,
}) => {
  const isAr = language === 'ar';
  const [isSimulatingAll, setIsSimulatingAll] = useState<boolean>(false);
  const [simulationTick, setSimulationTick] = useState<number>(0);
  const [activeImpulsePhase, setActiveImpulsePhase] = useState<string>('Standby (1000Hz Polling)');

  // Master Unified Suite: All 6 macro mechanics active concurrently
  const macroProtocols = [
    {
      id: 'fast_aerial',
      nameAr: 'ماكرو الارتفاع الجوي السريع (Fast Aerial Protocol)',
      nameEn: 'Fast Aerial Supersonic Liftoff',
      category: 'Aerial',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Jump 1 Liftoff', valueMs: timings.fastAerial.firstJumpSleep },
        { label: 'Center Deadzone Release', valueMs: timings.fastAerial.backReleaseSleep },
        { label: 'Jump 2 Double Impulse', valueMs: timings.fastAerial.secondJumpSleep },
        { label: 'Pitch Inversion Hold', valueMs: timings.fastAerial.flipCancelHold },
      ],
      axisOutput: 'Pitch -1.0 ↔ +1.0 + Boost Injection',
      scancodeChain: '0x39 (SPACE) → 0x1F (S) → 0x39 (SPACE) → 0x2A (LSHIFT)',
    },
    {
      id: 'forward_speedflip',
      nameAr: 'ماكرو السبيدفليب الأمامي (Forward Speedflip)',
      nameEn: 'Forward Speedflip 45° Inversion',
      category: 'Kickoff',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Pre-Impulse Hop', valueMs: timings.forwardSpeedflip.firstJumpSleep },
        { label: 'Dodge Delay Window', valueMs: timings.forwardSpeedflip.delayBeforeSecond },
        { label: 'Counter-Torque Cancel', valueMs: timings.forwardSpeedflip.cancelHold },
      ],
      axisOutput: 'Yaw +0.65 / Pitch -0.65 → Pitch +1.0 Cancel',
      scancodeChain: '0x11 (W) + 0x20 (D) → 0x39 (SPACE) → 0x1F (S) Cancel',
    },
    {
      id: 'left_speedflip',
      nameAr: 'سبيدفليب الدوران الأيسر (Left DAR Speedflip)',
      nameEn: 'Left Directional Speedflip',
      category: 'Kickoff',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Jump 1 Unload', valueMs: timings.leftSpeedflip.firstJumpSleep },
        { label: 'Dodge Window', valueMs: timings.leftSpeedflip.delayBeforeSecond },
        { label: 'DAR Lock', valueMs: timings.leftSpeedflip.cancelHold },
      ],
      axisOutput: 'Roll -1.0 (Q) + Pitch -0.70',
      scancodeChain: '0x10 (Q) + 0x11 (W) + 0x1E (A) → 0x39 (SPACE)',
    },
    {
      id: 'right_speedflip',
      nameAr: 'سبيدفليب الدوران الأيمن (Right DAR Speedflip)',
      nameEn: 'Right Directional Speedflip',
      category: 'Kickoff',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Jump 1 Unload', valueMs: timings.rightSpeedflip.firstJumpSleep },
        { label: 'Dodge Window', valueMs: timings.rightSpeedflip.delayBeforeSecond },
        { label: 'DAR Lock', valueMs: timings.rightSpeedflip.cancelHold },
      ],
      axisOutput: 'Roll +1.0 (E) + Pitch -0.70',
      scancodeChain: '0x12 (E) + 0x11 (W) + 0x20 (D) → 0x39 (SPACE)',
    },
    {
      id: 'chaindash',
      nameAr: 'ماكرو الويف داش والزاب داش (Wavedash & Zapdash)',
      nameEn: 'Chassis Wave Dash & Zapdash Ground Recovery',
      category: 'Recovery',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Low Hop Impulse', valueMs: timings.chainDash.jump1Sleep },
        { label: 'Suspension Tilt Delay', valueMs: timings.chainDash.fallDelay },
        { label: 'Secondary Ground Dodge', valueMs: timings.chainDash.jump2Sleep },
        { label: 'Landing Damping', valueMs: timings.chainDash.releaseDelay },
      ],
      axisOutput: 'Pitch +0.40 → Handbrake Drift Lock',
      scancodeChain: '0x39 (SPACE) → 0x11 (W) + 0x38 (LALT) → 0x39 (SPACE)',
    },
    {
      id: 'mouse_speedflip',
      nameAr: 'ماكرو التوجيه المكتبي السريع (DirectInput Mouse Bipolar Speedflip)',
      nameEn: 'Mouse DirectInput Bipolar Speedflip',
      category: 'Precision',
      status: 'ACTIVE_CONCURRENT',
      timeConstants: [
        { label: 'Impulse Hop', valueMs: timings.mouseSpeedflip.firstJumpSleep },
        { label: 'Vector Translation', valueMs: timings.mouseSpeedflip.delayBeforeSecond },
        { label: 'Counter Torque', valueMs: timings.mouseSpeedflip.cancelHold },
      ],
      axisOutput: 'Normalized dx/dy [-1.0, +1.0] Bipolar',
      scancodeChain: 'DirectInput Raw Counts: dx: 45, dy: -85 → 0x39 (SPACE)',
    }
  ];

  // Live unified multi-macro simulation loop
  useEffect(() => {
    if (!isSimulatingAll) return;

    const phases = [
      'Phase 1: Pre-Impulse Suspension Unload & Throttle Lock (1000Hz DirectInput)',
      'Phase 2: Primary Vertical Impulse Jump 1 Active across All Mechanics',
      'Phase 3: Neutral Center Deadzone Transition (True Zero 0.0 Release)',
      'Phase 4: Symmetrical Diagonal Roll & Secondary Jump Activation',
      'Phase 5: Counter-Torque Flip Cancel Inversion (Longitudinal Pitch Lock)',
      'Phase 6: Ground Recovery, Powerslide Damping & 2300 uu/s Supersonic Exit',
    ];

    const timer = setInterval(() => {
      setSimulationTick((prev) => {
        const next = (prev + 1) % 60;
        const phaseIdx = Math.floor(next / 10);
        setActiveImpulsePhase(phases[phaseIdx] || phases[0]);
        return next;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isSimulatingAll]);

  const handleToggleSimulation = () => {
    setIsSimulatingAll(!isSimulatingAll);
    if (!isSimulatingAll) {
      recordAuditEntry({
        section: 'macros',
        sectionNameAr: 'الماكرو الشامل الموحد',
        sectionNameEn: 'Master Unified Macro Suite',
        paramKey: 'SIMULATION_DISPATCH',
        paramLabelAr: 'تشغيل المحاكاة الشاملة لجميع توقيتات الماكرو معاً',
        paramLabelEn: 'Start Unified Concurrent Simulation for All Macros',
        oldValue: 'Idle',
        newValue: 'All 6 Macro Chains Running Simultaneously',
        changeType: 'macro_inject'
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-xl shadow-inner">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  {isAr ? 'الماكرو الشامل الموحد (Master Unified Macro Suite)' : 'Master Unified Macro Suite'}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 shadow-sm">
                  {isAr ? 'جميع قيم الماكرو مفعلة إجبارياً' : 'ALL MACROS RUNNING CONCURRENTLY'}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  LOCKED 1000Hz CALIBRATION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'تم توحيد جميع توقيتات الماكرو (الفاست إيريال، السبيدفليب بكافة اتجاهاته، والويف داش) تحت قائمة موحدة تعمل معاً بدون تجزئة. القيم محمية ومثبتة بمعايير بطولات الـ RLCS لضمان أعلى أداء حركي.'
                  : 'Unified macro execution suite running Fast Aerials, Diagonal Speedflips, and Wave Dashes concurrently with tournament-locked 1000Hz physical constants.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Simulation Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleSimulation}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg ${
              isSimulatingAll
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-950/40'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-950/40'
            }`}
          >
            {isSimulatingAll ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-slate-950" />}
            <span>
              {isSimulatingAll
                ? (isAr ? 'إيقاف المحاكاة الشاملة' : 'Stop Simulation')
                : (isAr ? 'بدء تشغيل الماكرو الشامل (Start Simulation)' : 'Run All Macros Simultaneously')}
            </span>
          </button>
        </div>
      </div>

      {/* Live Simulation Telemetry HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-white font-bold flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isSimulatingAll ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
            <span>{isAr ? 'حالة البث الحركي لجميع الماكروهات:' : 'Unified Macro Stream Status:'}</span>
          </span>
          <span className="text-cyan-400 font-bold">
            Tick {simulationTick} / 60 · 1000Hz SendInput Lock
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">{activeImpulsePhase}</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
            6/6 PROTOCOLS CONCURRENT
          </span>
        </div>

        {/* Progress Timeline Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 h-full transition-all duration-75"
            style={{ width: `${(simulationTick / 60) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Master Unified Macro Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {macroProtocols.map((macro) => (
          <div
            key={macro.id}
            className={`p-5 rounded-2xl border transition-all ${
              isSimulatingAll
                ? 'bg-slate-900/90 border-amber-500/40 shadow-xl shadow-amber-950/20'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? macro.nameAr : macro.nameEn}
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 rounded">
                LOCKED CONSTANTS
              </span>
            </div>

            <div className="text-xs font-mono text-slate-400 mb-3">
              <span className="text-slate-500 block mb-1">المحور الحركي:</span>
              <span className="text-cyan-300 font-bold">{macro.axisOutput}</span>
            </div>

            {/* Time Constants Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {macro.timeConstants.map((tc, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-400">{tc.label}:</span>
                  <span className="text-white font-bold">{tc.valueMs}ms</span>
                </div>
              ))}
            </div>

            {/* DirectInput Scancodes */}
            <div className="text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 block text-[10px]">سلسلة كود DirectInput:</span>
              <span className="text-emerald-400 font-bold break-all">{macro.scancodeChain}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
