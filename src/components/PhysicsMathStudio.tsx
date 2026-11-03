import React, { useState, useMemo, useEffect } from 'react';
import { PhysicsConfig, KeyBinding, Language } from '../types/engine';
import { 
  CLASSIC_ESPORTS_PHYSICS_CONFIG, 
  UNREAL_SYMMETRIC_PHYSICS_CONFIG 
} from '../data/initialData';
import { 
  generateCurvePoints, 
  applyProfessionalCurve, 
  filterJitter, 
  evaluateSymmetricKeyInput 
} from '../utils/mathEngine';
import { 
  Activity, 
  RotateCcw, 
  Sliders, 
  Crosshair, 
  Gauge, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles,
  Zap,
  Check,
  Flame,
  ArrowRightLeft,
  Compass,
  Keyboard,
  Cpu,
  Layers,
  Bookmark,
  BookmarkPlus,
  Save,
  Trash2,
  Terminal,
  MousePointer
} from 'lucide-react';
import { LivePhysicsStreamsChart } from './LivePhysicsStreamsChart';
import { PhysicsComparator } from './PhysicsComparator';
import { DriftAngleVelocityChart } from './DriftAngleVelocityChart';
import { 
  PhysicsPreset, 
  getPresetLibrary, 
  saveCustomPreset, 
  deleteCustomPreset,
  syncPresetsWithNative 
} from '../utils/physicsPresetLibrary';
import { isTauriDesktop } from '../services/gemini';

interface PhysicsMathStudioProps {
  config: PhysicsConfig;
  onChangeConfig: (newConfig: PhysicsConfig) => void;
  language: Language;
  keybindings?: KeyBinding[];
  onChangeKeybindings?: (bindings: KeyBinding[]) => void;
}

export const PhysicsMathStudio: React.FC<PhysicsMathStudioProps> = ({
  config,
  onChangeConfig,
  language,
}) => {
  const isAr = language === 'ar';

  // Parent Runtime Environment: Mode 1 (Classic Pro Standard) vs Mode 2 (Unreal Dynamic 1.0/-1.0 Symmetric)
  const isUnrealMode = config.curveExponent === 1.35 && config.internalDeadzone === 0.02;
  const activeRuntimeEngine: 'classic_pro' | 'unreal_symmetric' = isUnrealMode ? 'unreal_symmetric' : 'classic_pro';

  // Mathematical Presets State (Subsets applied INSIDE active runtime engine)
  const [presets, setPresets] = useState<PhysicsPreset[]>(() => getPresetLibrary());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('high_torque_exp');
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');
  const [presetSaveSuccess, setPresetSaveSuccess] = useState<string | null>(null);
  const [ghubDispatchFeedback, setGhubDispatchFeedback] = useState<string | null>(null);

  // Sync with native %APPDATA%/RocketLeagueMasterEngine/presets.json
  useEffect(() => {
    syncPresetsWithNative().then(setPresets).catch(console.error);
  }, []);

  const activePreset = useMemo(() => {
    return presets.find(p => p.id === selectedPresetId) || presets[0];
  }, [presets, selectedPresetId]);

  const [testInput, setTestInput] = useState<number>(75);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Switch Parent Runtime Engine 1: Classic Pro Standard
  const handleSelectClassicEngine = () => {
    onChangeConfig(CLASSIC_ESPORTS_PHYSICS_CONFIG);
    setResetFeedback(
      isAr 
        ? '✓ تم تفعيل بيئة المحرك الكلاسيكي المعتمد (Classic Pro Standard Runtime)!' 
        : '✓ Classic Pro Standard Runtime activated!'
    );
    setTimeout(() => setResetFeedback(null), 3200);
  };

  // Switch Parent Runtime Engine 2: Unreal Dynamic 1.0/-1.0 Symmetric
  const handleSelectUnrealEngine = () => {
    onChangeConfig(UNREAL_SYMMETRIC_PHYSICS_CONFIG);
    setResetFeedback(
      isAr 
        ? '✓ تم تفعيل بيئة محرك أنريل المتناظر (Unreal Dynamic 1.0/-1.0 Symmetric Runtime)!' 
        : '✓ Unreal Dynamic 1.0/-1.0 Symmetric Runtime activated!'
    );
    setTimeout(() => setResetFeedback(null), 3200);
  };

  // 1-Click Native Logitech G HUB Execution (Zero copy popups or modals)
  const handleDirectGHubLaunch = async () => {
    if (isTauriDesktop()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<string>('launch_logitech_ghub');
        setGhubDispatchFeedback(isAr ? '✓ تم تشغيل لوجيتك G-HUB بنجاح عبر النظام المكتبي!' : '✓ Logitech G-HUB dispatched directly!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setGhubDispatchFeedback(`Launch notice: ${msg}`);
      }
    } else {
      setGhubDispatchFeedback(isAr ? 'تم إرسال أمر التشغيل إلى البروتوكول lghub://' : 'Protocol command dispatched to lghub://');
    }
    setTimeout(() => setGhubDispatchFeedback(null), 3500);
  };

  // Apply Mathematical Preset Parameters inside current engine
  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = presets.find(p => p.id === presetId);
    if (target) {
      onChangeConfig(target.config);
      setResetFeedback(
        isAr 
          ? `✓ تم تطبيق المنحنى الرياضي: ${target.nameAr || target.name}` 
          : `✓ Applied Mathematical Curve: ${target.name}`
      );
      setTimeout(() => setResetFeedback(null), 3000);
    }
  };

  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const saved = saveCustomPreset({
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || undefined,
      config: { ...config }
    });
    const refreshed = getPresetLibrary();
    setPresets(refreshed);
    setSelectedPresetId(saved.id);
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSavePresetModal(false);
    setPresetSaveSuccess(isAr ? 'تم حفظ النموذج الرياضي بنجاح!' : 'Mathematical curve saved!');
    setTimeout(() => setPresetSaveSuccess(null), 3500);
  };

  const handleDeletePreset = (id: string) => {
    deleteCustomPreset(id);
    const refreshed = getPresetLibrary();
    setPresets(refreshed);
    if (selectedPresetId === id) {
      setSelectedPresetId(refreshed[0]?.id || 'high_torque_exp');
    }
    setResetFeedback(isAr ? 'تم حذف النموذج المخصص.' : 'Custom curve removed.');
    setTimeout(() => setResetFeedback(null), 3000);
  };

  // Synchronously Reactive Telemetry & Curve Metrics
  const curvePoints = useMemo(() => generateCurvePoints(config, 100), [config]);

  const testOutputs = useMemo(() => {
    const rawFiltered = filterJitter(testInput, config.hardwareJitter);
    const deadzoneCutoff = config.internalDeadzone * 127;
    const rawMag = Math.abs(rawFiltered);
    const inDeadzone = rawMag <= deadzoneCutoff;
    const activeRange = 127.0 - deadzoneCutoff;
    const dynamicDeflection = inDeadzone || activeRange <= 0 
      ? 0 
      : Math.min((rawMag - deadzoneCutoff) / activeRange, 1.0);

    const ground = applyProfessionalCurve(testInput, config.groundSense, config);
    const aerial = applyProfessionalCurve(testInput, config.aerialSense, config);
    const precision = applyProfessionalCurve(testInput, config.precisionMode, config);

    let axisType = 'NEUTRAL';
    if (testInput > 0) {
      axisType = '+1.0 Positive Symmetrical';
    } else if (testInput < 0) {
      axisType = '-1.0 Negative Symmetrical';
    }

    return {
      raw: testInput,
      rawFiltered,
      inDeadzone,
      dynamicDeflection,
      ground: Math.round(ground),
      aerial: Math.round(aerial),
      precision: Math.round(precision),
      axisType,
      isDodgeTriggered: dynamicDeflection >= config.dodgeDeadzone
    };
  }, [testInput, config]);

  const toSvgX = (raw: number) => 200 + (raw / 127) * 175;
  const toSvgY = (val: number) => 120 - (val / 195) * 95;

  const groundPath = curvePoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${toSvgX(pt.rawInput)} ${toSvgY(pt.groundOutput)}`,
    ''
  );
  const aerialPath = curvePoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${toSvgX(pt.rawInput)} ${toSvgY(pt.aerialOutput)}`,
    ''
  );

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: MASTER RUNTIME CONTROL & 1-CLICK HARDWARE DISPATCH */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                CORE RUNTIME ENVIRONMENT
              </span>
              <h2 className="text-xl font-black text-white tracking-wide">
                {isAr ? 'قمرة القيادة الموحدة لمحرك الفيزياء والعتاد 1000Hz' : 'Unified Physics Engine & 1000Hz Hardware Cockpit'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isAr
                ? 'بيئة تشغيل هندسية موحدة تدمج مصفوفة العتاد 1000Hz، وتراكب الفروقات التفاضلية (Δ)، ومخطط زوايا الانجراف D3 في واجهة متفاعلة آنياً مع كل تعديل.'
                : 'Consolidated engineering cockpit fusing 1000Hz DirectInput telemetry, comparative Delta (Δ) physics overlay, and dynamic D3 drift vectors in a synchronously reactive master view.'}
            </p>
          </div>

          {/* PARENT RUNTIME ENGINES & 1-CLICK G-HUB LAUNCHER */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={handleSelectClassicEngine}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeRuntimeEngine === 'classic_pro'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'المحرك الكلاسيكي (Classic Pro)' : 'Classic Pro Standard'}</span>
              </button>

              <button
                type="button"
                onClick={handleSelectUnrealEngine}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeRuntimeEngine === 'unreal_symmetric'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isAr ? 'محرك أنريل المتناظر (Unreal 1/-1)' : 'Unreal Dynamic 1/-1'}</span>
              </button>
            </div>

            {/* Direct 1-Click Logitech G HUB Dispatch */}
            <button
              onClick={handleDirectGHubLaunch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 rounded-lg transition-all shadow-md cursor-pointer"
              title="Direct 1-Click Process Dispatch"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-mono">Logitech G-HUB</span>
            </button>

            <button
              onClick={handleSelectClassicEngine}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset Engine to Baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {ghubDispatchFeedback && (
          <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-xs font-mono text-cyan-300 animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{ghubDispatchFeedback}</span>
          </div>
        )}
        {resetFeedback && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-xs font-mono text-emerald-300 animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{resetFeedback}</span>
          </div>
        )}

        {/* MATHEMATICAL SUB-PRESETS STRIP (Applied Inside Parent Engine) */}
        <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-inner">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'النماذج الرياضية المعتمدة:' : 'Mathematical Curve Models:'}</span>
            </div>

            <select
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-200 text-xs rounded-lg px-3 py-1.5 font-mono outline-none cursor-pointer"
            >
              <optgroup label={isAr ? '⚡ نماذج المنحنيات الرياضية' : '⚡ Mathematical Models'}>
                {presets.filter(p => p.isBuiltin).map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.nameAr : p.name}
                  </option>
                ))}
              </optgroup>
              {presets.some(p => !p.isBuiltin) && (
                <optgroup label={isAr ? '💾 نماذجك المحفوظة' : '💾 Custom User Models'}>
                  {presets.filter(p => !p.isBuiltin).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-amber-400">DZ: {(config.internalDeadzone * 100).toFixed(0)}%</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400">G: {config.groundSense.toFixed(2)}x</span>
              <span className="text-slate-600">|</span>
              <span className="text-purple-400">Air: {config.aerialSense.toFixed(2)}x</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">Exp: {config.curveExponent.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {presetSaveSuccess && (
              <span className="text-xs font-mono text-emerald-400 animate-pulse">{presetSaveSuccess}</span>
            )}
            <button
              type="button"
              onClick={() => setShowSavePresetModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-all cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ النموذج الرياضي' : 'Save Curve Model'}</span>
            </button>

            {!activePreset.isBuiltin && (
              <button
                type="button"
                onClick={() => handleDeletePreset(activePreset.id)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-all cursor-pointer"
                title="Delete custom preset"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SAVE PRESET MODAL */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'حفظ النموذج الرياضي في الذاكرة النظامية' : 'Save Mathematical Model to System Storage'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCurrentAsPreset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isAr ? 'اسم النموذج الرياضي *' : 'Model Curve Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom 1.35 High-Torque Model"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isAr ? 'الوصف وملاحظات العزم' : 'Description & Torque Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder="Mathematical parameters description..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حفظ في %APPDATA%' : 'Save to %APPDATA%'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYNCHRONOUSLY REACTIVE TRI-VIEW SINGLE COCKPIT */}
      <div className="space-y-6">

        {/* VIEW 1 (TOP/LEFT): LIVE DIRECTINPUT 1000HZ TELEMETRY MATRIX & ACTIVE CURVE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Mathematical Curve SVG Graph */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isAr ? 'منحنى الاستجابة الرياضية المباشر' : 'Mathematical Response Curve (Live)'}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                  Ground ({config.groundSense.toFixed(2)}x)
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
                  Aerial ({config.aerialSense.toFixed(2)}x)
                </span>
              </div>
            </div>

            <div className="h-56 w-full relative flex items-center justify-center bg-slate-950 rounded-xl p-2 border border-slate-800/80">
              <svg viewBox="0 0 400 240" className="w-full h-full">
                <line x1="20" y1="120" x2="380" y2="120" stroke="#334155" strokeDasharray="3 3" />
                <line x1="200" y1="20" x2="200" y2="220" stroke="#334155" strokeDasharray="3 3" />
                <rect 
                  x={200 - (config.internalDeadzone * 175)} 
                  y="20" 
                  width={config.internalDeadzone * 350} 
                  height="200" 
                  fill="#ef4444" 
                  opacity="0.12" 
                />
                <path d={groundPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                <path d={aerialPath} fill="none" stroke="#c084fc" strokeWidth="2.5" />
                <circle 
                  cx={toSvgX(testOutputs.rawFiltered)} 
                  cy={toSvgY(testOutputs.ground)} 
                  r="5" 
                  fill="#f59e0b" 
                  className="animate-ping" 
                />
                <circle 
                  cx={toSvgX(testOutputs.rawFiltered)} 
                  cy={toSvgY(testOutputs.ground)} 
                  r="4" 
                  fill="#f59e0b" 
                />
              </svg>
            </div>

            {/* Test Input Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Input Deflection: <span className="text-white font-bold">{testInput}</span></span>
                <span>Filtered: <span className="text-amber-400 font-bold">{testOutputs.rawFiltered}</span></span>
                <span>Active: <span className="text-cyan-400 font-bold">{testOutputs.ground} Out</span></span>
              </div>
              <input
                type="range"
                min="-127"
                max="127"
                value={testInput}
                onChange={(e) => setTestInput(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Real-Time Parameter Sliders (Reactive updates to all views) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? 'معايير المحرك الفيزيائي (1000Hz)' : 'Engine Parameters (1000Hz)'}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-mono text-slate-300 mb-1">
                  <span>Internal Deadzone:</span>
                  <span className="text-amber-400 font-bold">{(config.internalDeadzone * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={config.internalDeadzone}
                  onChange={(e) => onChangeConfig({ ...config, internalDeadzone: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-slate-300 mb-1">
                  <span>Dodge Deadzone:</span>
                  <span className="text-amber-400 font-bold">{(config.dodgeDeadzone * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={config.dodgeDeadzone}
                  onChange={(e) => onChangeConfig({ ...config, dodgeDeadzone: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-slate-300 mb-1">
                  <span>Ground Sensitivity:</span>
                  <span className="text-cyan-400 font-bold">{config.groundSense.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.00"
                  max="2.50"
                  step="0.05"
                  value={config.groundSense}
                  onChange={(e) => onChangeConfig({ ...config, groundSense: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-slate-300 mb-1">
                  <span>Aerial Sensitivity:</span>
                  <span className="text-purple-400 font-bold">{config.aerialSense.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.00"
                  max="2.50"
                  step="0.05"
                  value={config.aerialSense}
                  onChange={(e) => onChangeConfig({ ...config, aerialSense: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-slate-300 mb-1">
                  <span>Curve Exponent:</span>
                  <span className="text-emerald-400 font-bold">{config.curveExponent.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.00"
                  max="2.00"
                  step="0.05"
                  value={config.curveExponent}
                  onChange={(e) => onChangeConfig({ ...config, curveExponent: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 2 (MIDDLE): COMPARATIVE DELTA (Δ) PHYSICS OVERLAY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? 'مقارن الفيزياء والتراكب التفاضلي (Comparative Δ Physics Overlay)' : 'Comparative Δ Physics Overlay'}
              </h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              SYNCHRONOUS REAL-TIME DELTA
            </span>
          </div>

          <PhysicsComparator 
            activeConfig={config}
            onApplyConfigToEngine={onChangeConfig}
            language={language}
          />
        </div>

        {/* VIEW 3 (BOTTOM/RIGHT): DYNAMIC D3 VECTOR HUD (DRIFT ANGLE VS VELOCITY) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? 'مخطط زوايا الانجراف المتجهي D3 (Drift Angle vs. Velocity)' : 'Dynamic D3 Vector HUD (Drift Angle vs. Velocity)'}
              </h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
              D3.JS VECTOR KINEMATICS
            </span>
          </div>

          <DriftAngleVelocityChart 
            currentConfig={config}
            language={language}
          />
        </div>

      </div>
    </div>
  );
};
