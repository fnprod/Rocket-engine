import React, { useState, useEffect, useMemo } from 'react';
import { PhysicsConfig, Language } from '../types/engine';
import { UNREAL_SYMMETRIC_PHYSICS_CONFIG } from '../data/initialData';
import { recordAuditEntry } from '../utils/engineAuditLog';
import { 
  applySymmetricBipolarCurve, 
  evaluateSupersonicKinematics, 
  calculateBipolarAxis 
} from '../utils/engineMath';
import { 
  Compass, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  Zap, 
  Flame, 
  Crosshair, 
  Activity, 
  Gauge, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';

interface UnrealSymmetricEngineProps {
  config?: PhysicsConfig;
  onChangeConfig?: (newConfig: PhysicsConfig) => void;
  language: Language;
  onDispatchToast?: (msg: string) => void;
}

const STORAGE_KEY_UNREAL = 'fnpro_unreal_symmetric_config_v2';

export const UnrealSymmetricEngine: React.FC<UnrealSymmetricEngineProps> = ({
  config: propConfig,
  onChangeConfig: propOnChangeConfig,
  language,
  onDispatchToast,
}) => {
  const isAr = language === 'ar';
  const [internalConfig, setInternalConfig] = useState<PhysicsConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_UNREAL);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.curveExponent === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load unreal symmetric config:', e);
      }
    }
    return propConfig || UNREAL_SYMMETRIC_PHYSICS_CONFIG;
  });

  const config = propConfig || internalConfig;

  const [bipolarInput, setBipolarInput] = useState<number>(0.0); // [-1.0, +1.0]
  const [probeSpeed, setProbeSpeed] = useState<number>(2240); // 0 to 2300 uu/s
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active symmetric values
  const deadzone = config.internalDeadzone || 0.02;
  const exponent = 1.35; // Unreal Engine strictly symmetric constant

  // Evaluate Bipolar mathematical curve: f(x) = sgn(x) * pow(clamp((|x| - dz)/(1 - dz), 0, 1), 1.35)
  const curveOutput = useMemo(() => {
    return applySymmetricBipolarCurve(bipolarInput, deadzone, exponent);
  }, [bipolarInput, deadzone, exponent]);

  // Evaluate supersonic kinematics and friction bleed
  const supersonicState = useMemo(() => {
    return evaluateSupersonicKinematics(probeSpeed, bipolarInput);
  }, [probeSpeed, bipolarInput]);

  const handleUpdateParam = (key: keyof PhysicsConfig, val: number, labelAr: string, labelEn: string) => {
    const oldVal = config[key];
    const updated = {
      ...config,
      [key]: val,
    };
    if (propOnChangeConfig) {
      propOnChangeConfig(updated);
    }
    setInternalConfig(updated);
    try {
      localStorage.setItem(STORAGE_KEY_UNREAL, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    recordAuditEntry({
      section: 'unreal_symmetric',
      sectionNameAr: 'محرك إنريل المتناظر 1:-1',
      sectionNameEn: 'Unreal Symmetric 1:-1 Engine',
      paramKey: String(key),
      paramLabelAr: labelAr,
      paramLabelEn: labelEn,
      oldValue: oldVal,
      newValue: val,
      changeType: 'param_tune'
    });

    const toast = isAr ? `✓ تم تحديث وحفظ ${labelAr}: ${val}` : `✓ Updated & saved ${labelEn}: ${val}`;
    setToastMessage(toast);
    onDispatchToast?.(toast);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleResetDefaults = () => {
    if (propOnChangeConfig) {
      propOnChangeConfig(UNREAL_SYMMETRIC_PHYSICS_CONFIG);
    }
    setInternalConfig(UNREAL_SYMMETRIC_PHYSICS_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEY_UNREAL, JSON.stringify(UNREAL_SYMMETRIC_PHYSICS_CONFIG));
    } catch (e) {
      console.error(e);
    }
    recordAuditEntry({
      section: 'unreal_symmetric',
      sectionNameAr: 'محرك إنريل المتناظر 1:-1',
      sectionNameEn: 'Unreal Symmetric 1:-1 Engine',
      paramKey: 'ALL_PARAMETERS',
      paramLabelAr: 'إعادة ضبط محرك أنريل المتناظر للقيم القياسية',
      paramLabelEn: 'Reset Unreal Symmetric to Standard 1.0/-1.0',
      oldValue: 'Custom',
      newValue: 'Unreal 1.35 Symmetric Defaults',
      changeType: 'engine_switch'
    });
    const toast = isAr ? '✓ تم إعادة ضبط محرك إنريل المتناظر وحفظه' : '✓ Reset Unreal Symmetric engine to defaults';
    setToastMessage(toast);
    onDispatchToast?.(toast);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3 text-center text-xs font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-purple-500/40 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-xl shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  {isAr ? 'محرك إنريل المتناظر 1:-1 (Unreal Symmetric Engine)' : 'Unreal Engine 1.0/-1.0 Symmetric Engine'}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/50 shadow-sm">
                  TRUE ZERO (0.0) BIPOLAR
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  EXP 1.35 FIXED SYMMETRY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'محرك المتجهات المستمرة ثنائي القطب [-1.0, +1.0] مع مركز الصفر الحقيقي المطلق. يلغي أي انحياز بين اليمين واليسار (A/Q = -1.0 و D/E = +1.0) مع حسابات نزيف الاحتكاك عند السرعة الخارقة.'
                  : 'Continuous Bipolar [-1.0, +1.0] Kinematic Vector Engine with True Zero (0.0) Center, strictly symmetric 1.35 exponential curvature, and supersonic friction bleeding physics.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer shadow-md shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعادة ضبط المتناظر' : 'Reset Symmetric Engine'}</span>
        </button>
      </div>

      {/* Grid: Tuning Controls (8 cols) & Bipolar Live Axis Visualizer (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Controls Panel */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'معايير المتجهات ثنائية القطب [-1.0 إلى +1.0]' : 'Bipolar Vector Calibration Sliders'}</span>
            </span>
            <span className="text-[11px] font-mono text-purple-400 font-bold">
              f(x) = sgn(x) * |x|^1.35
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Deadzone */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">{isAr ? 'المنطقة الميتة المتناظرة:' : 'Symmetric Deadzone:'}</span>
                <span className="text-purple-400 font-bold text-sm">{config.internalDeadzone}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.15"
                step="0.005"
                value={config.internalDeadzone}
                onChange={(e) => handleUpdateParam('internalDeadzone', parseFloat(e.target.value), 'المنطقة الميتة المتناظرة', 'Symmetric Deadzone')}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.01 (True Direct)</span>
                <span>0.15 (Large Center)</span>
              </div>
            </div>

            {/* Dodge Deadzone */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">{isAr ? 'عتبة الفليب المتناظر:' : 'Symmetric Flip Threshold:'}</span>
                <span className="text-cyan-400 font-bold text-sm">{config.dodgeDeadzone}</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.90"
                step="0.05"
                value={config.dodgeDeadzone}
                onChange={(e) => handleUpdateParam('dodgeDeadzone', parseFloat(e.target.value), 'عتبة الفليب المتناظر', 'Symmetric Flip Threshold')}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.20 (Sensitive)</span>
                <span>0.90 (Safe Pitch)</span>
              </div>
            </div>

            {/* Ground Sensitivity */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">{isAr ? 'معامل التوجيه المتناظر:' : 'Symmetric Steering Scalar:'}</span>
                <span className="text-emerald-400 font-bold text-sm">{config.groundSense}x</span>
              </div>
              <input
                type="range"
                min="1.00"
                max="3.00"
                step="0.05"
                value={config.groundSense}
                onChange={(e) => handleUpdateParam('groundSense', parseFloat(e.target.value), 'معامل التوجيه المتناظر', 'Symmetric Steering Scalar')}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1.00x</span>
                <span>3.00x</span>
              </div>
            </div>

            {/* Aerial Sensitivity */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">{isAr ? 'معامل الدوران المتناظر:' : 'Symmetric Aerial Scalar:'}</span>
                <span className="text-amber-400 font-bold text-sm">{config.aerialSense}x</span>
              </div>
              <input
                type="range"
                min="1.00"
                max="3.00"
                step="0.05"
                value={config.aerialSense}
                onChange={(e) => handleUpdateParam('aerialSense', parseFloat(e.target.value), 'معامل الدوران المتناظر', 'Symmetric Aerial Scalar')}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1.00x</span>
                <span>3.00x</span>
              </div>
            </div>

          </div>

          {/* Supersonic Band & Friction Bleed Evaluator */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>{isAr ? 'مقياس نطاق السرعة الخارقة (Supersonic Band 2200-2300 uu/s):' : 'Supersonic Kinematic Band Evaluator:'}</span>
              </span>
              <span className="text-amber-400 font-bold">{probeSpeed} uu/s ({Math.round(supersonicState.velocityPercentOfMax * 100)}% Max)</span>
            </div>
            
            <input
              type="range"
              min="1800"
              max="2300"
              step="10"
              value={probeSpeed}
              onChange={(e) => setProbeSpeed(parseInt(e.target.value, 10))}
              className="w-full accent-rose-400 cursor-pointer"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Supersonic Lock:</span>
                <span className={supersonicState.isSupersonic ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {supersonicState.isSupersonic ? 'ACTIVE (>= 2200)' : 'SUB-SONIC'}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Band Ratio (P):</span>
                <span className="text-cyan-400 font-bold">{(supersonicState.pSupersonic * 100).toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Friction Bleeding:</span>
                <span className={supersonicState.isFrictionBleeding ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {supersonicState.isFrictionBleeding ? `-${supersonicState.frictionBleedPenaltyUu.toFixed(1)} uu/s` : 'ZERO BLEED'}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Net Velocity:</span>
                <span className="text-white font-bold">{supersonicState.netEffectiveVelocityUu.toFixed(0)} uu/s</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bipolar Axis Interactive Scope (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'محور التناظر المباشر' : 'Symmetric Axis Scope'}</span>
            </span>
            <span className="text-[10px] font-mono text-purple-400 font-bold">
              [-1.0 ↔ +1.0]
            </span>
          </div>

          {/* Interactive Bipolar Slider */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">{isAr ? 'انحراف الإشارة ثنائية القطب:' : 'Bipolar Signal:'}</span>
              <span className={`font-bold text-sm ${bipolarInput < 0 ? 'text-rose-400' : bipolarInput > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {bipolarInput.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={bipolarInput}
              onChange={(e) => setBipolarInput(parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span className="text-rose-400">-1.0 (A/Q Left)</span>
              <span className="text-emerald-400">0.0 (True Zero)</span>
              <span className="text-cyan-400">+1.0 (D/E Right)</span>
            </div>
          </div>

          {/* Output Metric Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-purple-500/30 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isAr ? 'المخرجات الفيزيائية المنحنية:' : 'Curved Output Force:'}</span>
              <span className={`font-bold text-base ${curveOutput < 0 ? 'text-rose-400' : curveOutput > 0 ? 'text-cyan-400' : 'text-white'}`}>
                {curveOutput.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
              <span>Center Deadzone Status:</span>
              <span className={Math.abs(bipolarInput) <= deadzone ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {Math.abs(bipolarInput) <= deadzone ? 'IN DEADZONE (0.0)' : 'ACTIVE KINEMATIC'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-[11px] text-purple-300 leading-relaxed">
            {isAr
              ? '✓ معادلة التناظر تضمن تماماً: f(-1.0) = -1.0 و f(0.0) = 0.0 و f(+1.0) = +1.0 بدون أي انحياز أو ترحيل في المركز.'
              : '✓ Guaranteed mathematical symmetry: f(-1.0) = -1.0, f(0.0) = 0.0, and f(+1.0) = +1.0 with zero center drift.'}
          </div>

        </div>

      </div>

    </div>
  );
};
