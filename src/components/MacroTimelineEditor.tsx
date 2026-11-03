import React, { useState, useEffect } from 'react';
import { MacroTimingConfig, Language } from '../types/engine';
import { 
  Timer, 
  Play, 
  RotateCcw, 
  Zap, 
  Sliders, 
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  Activity,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  Gauge
} from 'lucide-react';

interface MacroTimelineEditorProps {
  timings: MacroTimingConfig;
  onChangeTimings: (newTimings: MacroTimingConfig) => void;
  language: Language;
}

export const MacroTimelineEditor: React.FC<MacroTimelineEditorProps> = ({
  timings,
  onChangeTimings,
  language,
}) => {
  const isAr = language === 'ar';
  
  type MechanicalPresetId = 'fastAerial' | 'speedflip' | 'wavedash' | 'halfflip';
  const [activePreset, setActivePreset] = useState<MechanicalPresetId>('fastAerial');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Mechanical Physics Time Constants (Decoupled from hardware inputs)
  // 120Hz tick = ~8.33ms, 240Hz tick = ~4.16ms, 1000Hz DirectInput = 1.00ms
  const msToTicks = (ms: number, tickRateHz = 120) => {
    return Math.round(ms / (1000 / tickRateHz));
  };

  const currentTimelineSteps = React.useMemo(() => {
    switch (activePreset) {
      case 'fastAerial':
        return [
          {
            name: 'Initial Vertical Impulse (Hold Jump 1)',
            desc: 'Primary suspension liftoff and ground acceleration vector',
            durationMs: timings.fastAerial.firstJumpSleep,
            paramKey: 'firstJumpSleep' as const,
            min: 120,
            max: 250,
            color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
            target: 'fastAerial',
          },
          {
            name: 'Pitch Inversion Window (Neutral Air Release)',
            desc: 'Zero-torque center deadzone transition to prevent backflip dodge lock',
            durationMs: timings.fastAerial.backReleaseSleep,
            paramKey: 'backReleaseSleep' as const,
            min: 20,
            max: 60,
            color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
            target: 'fastAerial',
          },
          {
            name: 'Second Jump Activation Lock (Impulse 2)',
            desc: 'Secondary double-jump impulse at apex without triggering accidental flip',
            durationMs: timings.fastAerial.secondJumpSleep,
            paramKey: 'secondJumpSleep' as const,
            min: 20,
            max: 60,
            color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
            target: 'fastAerial',
          },
          {
            name: 'Pitch Pitch-Up Hold (Supersonic Trajectory)',
            desc: 'Continuous aerodynamic vector stabilization up to 2300 uu/s ceiling',
            durationMs: timings.fastAerial.flipCancelHold,
            paramKey: 'flipCancelHold' as const,
            min: 100,
            max: 300,
            color: 'text-rose-400 bg-rose-950/60 border-rose-500/40',
            target: 'fastAerial',
          },
        ];
      case 'speedflip':
        return [
          {
            name: 'Pre-Impulse Ground Acceleration (Jump 1)',
            desc: 'Initial suspension unload prior to angular dodge vector initiation',
            durationMs: timings.forwardSpeedflip.firstJumpSleep,
            paramKey: 'firstJumpSleep' as const,
            min: 25,
            max: 60,
            color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
            target: 'forwardSpeedflip',
          },
          {
            name: 'Diagonal Pitch/Yaw Dodge Window (Dodge Delay)',
            desc: 'Exact temporal delay before triggering pitch-forward/yaw diagonal roll',
            durationMs: timings.forwardSpeedflip.delayBeforeSecond,
            paramKey: 'delayBeforeSecond' as const,
            min: 25,
            max: 65,
            color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
            target: 'forwardSpeedflip',
          },
          {
            name: 'Flip Cancel Inversion Lock (Counter-Torque Hold)',
            desc: 'Opposing pitch counter-vector to arrest longitudinal chassis tumble',
            durationMs: timings.forwardSpeedflip.cancelHold,
            paramKey: 'cancelHold' as const,
            min: 400,
            max: 750,
            color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
            target: 'forwardSpeedflip',
          },
        ];
      case 'wavedash':
        return [
          {
            name: 'Low-Trajectory Hop Impulse (Jump 1)',
            desc: 'Minimal vertical velocity to ensure instant ground proximity',
            durationMs: timings.chainDash.jump1Sleep,
            paramKey: 'jump1Sleep' as const,
            min: 20,
            max: 50,
            color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
            target: 'chainDash',
          },
          {
            name: 'Suspension Free-Fall & Tire Contact Delay',
            desc: 'Chassis tilt alignment while two tires make initial ground contact',
            durationMs: timings.chainDash.fallDelay,
            paramKey: 'fallDelay' as const,
            min: 40,
            max: 90,
            color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
            target: 'chainDash',
          },
          {
            name: 'Compression Dodge Slam (Jump 2)',
            desc: 'Surface dodge impulse absorbed directly into suspension dampers',
            durationMs: timings.chainDash.jump2Sleep,
            paramKey: 'jump2Sleep' as const,
            min: 20,
            max: 50,
            color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
            target: 'chainDash',
          },
          {
            name: 'Wavedash Recovery Powerslide Window',
            desc: 'Friction bypass keeping kinetic energy along the directional vector',
            durationMs: timings.chainDash.releaseDelay,
            paramKey: 'releaseDelay' as const,
            min: 30,
            max: 80,
            color: 'text-rose-400 bg-rose-950/60 border-rose-500/40',
            target: 'chainDash',
          },
        ];
      case 'halfflip':
        return [
          {
            name: 'Backflip Initiation Delay',
            desc: 'Full backward pitch impulse to trigger rearward longitudinal rotation',
            durationMs: 40,
            paramKey: 'firstJumpSleep' as const,
            min: 25,
            max: 60,
            color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
            target: 'forwardSpeedflip',
          },
          {
            name: 'Longitudinal Flip-Cancel Lock',
            desc: 'Instant forward pitch counter-vector to freeze vehicle upside-down',
            durationMs: 480,
            paramKey: 'cancelHold' as const,
            min: 350,
            max: 650,
            color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
            target: 'forwardSpeedflip',
          },
          {
            name: 'Air Roll Inversion Transition',
            desc: '180-degree directional axial roll settling all four tires on tarmac',
            durationMs: 140,
            paramKey: 'flipCancelHold' as const,
            min: 100,
            max: 220,
            color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
            target: 'fastAerial',
          },
        ];
    }
  }, [activePreset, timings]);

  const totalCycleMs = currentTimelineSteps.reduce((acc, step) => acc + step.durationMs, 0);

  const handleUpdateStep = (target: string, key: string, val: number) => {
    if (target === 'fastAerial') {
      onChangeTimings({
        ...timings,
        fastAerial: {
          ...timings.fastAerial,
          [key]: val,
        },
      });
    } else if (target === 'forwardSpeedflip') {
      onChangeTimings({
        ...timings,
        forwardSpeedflip: {
          ...timings.forwardSpeedflip,
          [key]: val,
        },
      });
    } else if (target === 'chainDash') {
      onChangeTimings({
        ...timings,
        chainDash: {
          ...timings.chainDash,
          [key]: val,
        },
      });
    }
  };

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStepIndex(0);

    let idx = 0;
    const runNext = () => {
      if (idx >= currentTimelineSteps.length) {
        setActiveStepIndex(null);
        setIsSimulating(false);
        return;
      }
      setActiveStepIndex(idx);
      const stepDuration = currentTimelineSteps[idx].durationMs;
      idx++;
      setTimeout(runNext, stepDuration);
    };

    runNext();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                {isAr 
                  ? 'محرر الثوابت الزمنية الفيزيائية (Physical Mechanical Time Constants)' 
                  : 'Physical Macro Timings & Temporal Mechanical Constants'}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DECOUPLED FROM HARDWARE
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                1000Hz DIRECTINPUT RESOLUTION
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {isAr
                ? 'ثوابت فيزيائية مجردة بالمللي ثانية (Δt ms) لآليات اللعبة (القفز السريع، سبيد فليب، ويف داش، هالف فليب). معزولة تماماً عن أجهزة الماوس ومفاتيح G-HUB ومبنية على دورات تيك المحرك الفيزيائي (120Hz / 240Hz).'
                : 'Pure mechanical time constants (Δt ms) defining kinematic execution windows for Fast Aerials, Speedflips, and Wavedashes. Decoupled from input triggers and aligned to physics simulation ticks.'}
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 rounded-lg shadow-md cursor-pointer shrink-0 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isSimulating ? (isAr ? 'جاري محاكاة الدورة...' : 'Simulating Cycle...') : (isAr ? 'محاكاة التسلسل الفيزيائي' : 'Simulate Kinematic Cycle')}</span>
          </button>
        </div>
      </div>

      {/* 2. Preset Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'fastAerial' as MechanicalPresetId, label: 'Fast Aerial Apex Liftoff', sub: 'Vertical Impulse & Delay' },
          { id: 'speedflip' as MechanicalPresetId, label: 'Speedflip Diagonal Cancel', sub: 'Flip Inversion Hold' },
          { id: 'wavedash' as MechanicalPresetId, label: 'Ground Wavedash / Chaindash', sub: 'Suspension Dampers' },
          { id: 'halfflip' as MechanicalPresetId, label: 'Half-Flip 180° Inversion', sub: 'Axial Roll Transition' },
        ].map((tab) => {
          const isSelected = activePreset === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActivePreset(tab.id);
                setIsSimulating(false);
                setActiveStepIndex(null);
              }}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono transition-all text-left whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                {tab.label}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{tab.sub}</div>
            </button>
          );
        })}
      </div>

      {/* 3. Visual Timeline Bar & Tick Metric HUD */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Temporal Timeline & Physics Tick Allocation
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Total Duration: <strong className="text-amber-400">{totalCycleMs} ms</strong></span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">120Hz Ticks: <strong className="text-cyan-400">{msToTicks(totalCycleMs, 120)}</strong></span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">240Hz Ticks: <strong className="text-emerald-400">{msToTicks(totalCycleMs, 240)}</strong></span>
          </div>
        </div>

        {/* Visual Timeline Bar */}
        <div className="w-full bg-slate-950 rounded-xl p-2 border border-slate-800 flex gap-1 h-12">
          {currentTimelineSteps.map((step, idx) => {
            const widthPct = Math.max(8, (step.durationMs / totalCycleMs) * 100);
            const isActive = activeStepIndex === idx;
            return (
              <div
                key={idx}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-lg transition-all flex flex-col justify-center px-2 text-[10px] font-mono border overflow-hidden ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 ring-2 ring-amber-400 animate-pulse'
                    : step.color
                }`}
              >
                <div className="truncate font-bold">{step.name.split('(')[0]}</div>
                <div className="truncate text-[9px] opacity-80">{step.durationMs}ms ({msToTicks(step.durationMs, 120)} ticks)</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Fine-Tuning Parameter Sliders (Δt ms) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentTimelineSteps.map((step, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border bg-slate-950 transition-all ${
              activeStepIndex === idx ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>{step.name}</span>
                </div>
                <p className="text-[11px] text-slate-400">{step.desc}</p>
              </div>
              <div className="text-right font-mono">
                <span className="text-sm font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  {step.durationMs} ms
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Δt = ±{(step.durationMs * 0.05).toFixed(1)}ms jitter
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Min: {step.min} ms</span>
                <span>Max: {step.max} ms</span>
              </div>
              <input
                type="range"
                min={step.min}
                max={step.max}
                value={step.durationMs}
                onChange={(e) => handleUpdateStep(step.target, step.paramKey, Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>PhysX 120Hz: ~{msToTicks(step.durationMs, 120)} ticks</span>
              <span className="text-emerald-400 font-semibold">1000Hz Buffer: ~{step.durationMs} packets</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
