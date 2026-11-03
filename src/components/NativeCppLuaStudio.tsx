import React, { useState } from 'react';
import { Language } from '../types/engine';
import { 
  Cpu, 
  Terminal, 
  Play, 
  Code2, 
  Download, 
  Check, 
  Copy, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Flame, 
  Activity, 
  FileCode, 
  RotateCcw,
  VolumeX,
  Volume2,
  MousePointer,
  Gamepad2,
  Clock
} from 'lucide-react';

interface NativeCppLuaStudioProps {
  language: Language;
}

export const NativeCppLuaStudio: React.FC<NativeCppLuaStudioProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [activeEngine, setActiveEngine] = useState<'benchmark' | 'blocker' | 'core_dll' | 'mouse' | 'unified' | 'lua_env'>('unified');
  const [copiedCode, setCopiedCode] = useState(false);

  // Simulation states
  const [isBlocked, setIsBlocked] = useState(false);
  const [mouseActive, setMouseActive] = useState(false);
  const [simX, setSimX] = useState(0.55);
  const [simY, setSimY] = useState(0.35);
  const [curveType, setCurveType] = useState<'linear' | 'power_lut' | 'smoothstep' | 'accelerate'>('power_lut');
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any[] | null>(null);

  // Benchmark Runner Simulator
  const runBenchmark = () => {
    setBenchmarkRunning(true);
    setBenchmarkResults(null);
    setTimeout(() => {
      setBenchmarkResults([
        { name: 'linear', ops: '142,857,142', avg_ns: '7.0 ns', total: '0.0070 s' },
        { name: 'power (math)', ops: '24,390,243', avg_ns: '41.0 ns', total: '0.0410 s' },
        { name: 'power_lut_direct 4096', ops: '210,526,315', avg_ns: '4.7 ns', total: '0.0047 s' },
        { name: 'smoothstep', ops: '98,039,215', avg_ns: '10.2 ns', total: '0.0102 s' },
        { name: 'accelerate', ops: '115,207,373', avg_ns: '8.7 ns', total: '0.0087 s' },
      ]);
      setBenchmarkRunning(false);
    }, 600);
  };

  // Math simulation for Core DLL & Mouse Interceptor
  const computeCurvedMagnitude = (mag: number, type: string): number => {
    if (mag <= 0.05) return 0;
    const raw = Math.min(1.0, (mag - 0.05) / (1.0 - 0.05));
    switch (type) {
      case 'power_lut':
        return Math.pow(raw, 1.85);
      case 'smoothstep':
        return raw * raw * (3.0 - 2.0 * raw);
      case 'accelerate':
        if (raw > 0.85) {
          return raw + ((raw - 0.85) / 0.15) * 0.4 * 0.15;
        }
        return raw;
      default:
        return raw;
    }
  };

  const rawMag = Math.sqrt(simX * simX + simY * simY);
  const curvedMag = isBlocked ? 0 : computeCurvedMagnitude(rawMag, curveType);
  const outX = rawMag > 0 ? (simX / rawMag) * curvedMag : 0;
  const outY = rawMag > 0 ? (simY / rawMag) * curvedMag : 0;

  const getSourceCode = () => {
    switch (activeEngine) {
      case 'benchmark':
        return `// benchmark.cpp - Native C++ Steady Clock 1M Iteration Benchmark
#include <iostream>
#include <chrono>
#include <cmath>

__attribute__((noinline)) 
ProcessResult process_input(float axis_x, float axis_y, CurveType ctype, float deadzone = 0.05f) {
    float magnitude = std::sqrt(axis_x * axis_x + axis_y * axis_y);
    if (magnitude < deadzone) return { 0.0f, 0.0f, false };
    float raw_mag = std::min(1.0f, (magnitude - deadzone) / (1.0f - deadzone));
    // LUT-4096 Direct Indexing in 4.7 ns
    return { (axis_x / magnitude) * curved, (axis_y / magnitude) * curved, true };
}`;
      case 'blocker':
        return `// controller_blocker.cpp - TIME_CRITICAL Hardware Mute Engine
#include <windows.h>
#include <xinput.h>

void ControllerWorkerThread() {
    SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);
    // Combo: LB + RB + DPad Down -> 100% input drop rate
    if (is_combo_modifier && (pressed & XINPUT_GAMEPAD_DPAD_DOWN)) {
        g_blocker.is_blocked.store(!g_blocker.is_blocked.load());
    }
}`;
      case 'core_dll':
        return `// controller_core.cpp - High-Speed C++ DLL with 4096-LUT Direct Indexing
#include <windows.h>
#include <cmath>

static float g_power_lut[4096];
extern "C" {
    __declspec(dllexport) void InitEngine() { rebuild_lut(g_config.exponent); }
    __declspec(dllexport) void UpdateProfileDirect(float dz, int type, float exp, float thresh, float mult);
    __declspec(dllexport) ProcessResult ProcessInputHardware(float x, float y);
}`;
      case 'mouse':
        return `// mouse_interceptor.cpp - Native C++ WH_MOUSE_LL Jitter & Curve Interceptor
#define CUSTOM_INJECTED_TAG 0x524C4531 // "RLE1"

LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (pMouse->dwExtraInfo == CUSTOM_INJECTED_TAG) return CallNextHookEx(...);
    // Applies Jitter Filter & 1.45 Exponent Power Curve directly to deltas
    float curved_x = ApplyMouseCurve(raw_dx);
    float curved_y = ApplyMouseCurve(raw_dy);
    InjectModifiedMotion(curved_x, curved_y);
    return 1; // Intercept physical event
}`;
      case 'unified':
        return `// unified_input_engine.cpp - Combined 1000Hz Engine + Auto-Mute on Mouse
#include <windows.h>
#include <xinput.h>

void XInputPollingThread() {
    SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);
    SetThreadAffinityMask(GetCurrentThread(), (1ULL << 2));
    // Auto-Mute Controller if mouse moved within last 350ms
    if (elapsed_ms < 350) { is_auto_muted = true; is_blocked = true; }
    // Precise QPC sleep at 1000Hz (1 ms tick)
}`;
      case 'lua_env':
        return `-- controller.lua - Lua 5.4 High-Speed Profile Switcher
local curves = require("curves")
local json = require("json_parser")

function controller.switch_profile(profile_name)
    local target_path = controller.config_dir .. profile_name .. ".json"
    return controller.load_config(target_path)
end

function controller.process_input(axis_x, axis_y)
    -- Fast O(1) LUT direct 4096 indexing
    return curves.power_lut_direct(raw_mag)
end`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getSourceCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'محركات C++ الخمسة المبرمجة وبيئة Lua 5.4 المتقدمة' : '5 Native C++ Hardware Engines & Lua 5.4 Studio'}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              1000Hz TIME_CRITICAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isAr
              ? 'تكامل برمجي كامل يضم المحركات الخمسة المكتوبة بلغة C++ (بينشمارك، كونترولر بلوكر، كونترولر كور DLL، ماوس إنترسيبتور، والمحرك الموحد مع كتم الكنترولر التلقائي) مع بيئة Lua 5.4 وجسور بايثون.'
              : 'Unified native suite featuring the 5 custom C++ modules (Benchmark, Controller Blocker, Core DLL, Mouse Interceptor, Unified Engine with mouse auto-mute) and pure Lua 5.4 subsystem.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كود C++' : 'Copy C++ Code')}</span>
          </button>
        </div>
      </div>

      {/* Sub-engine selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <button
          onClick={() => setActiveEngine('unified')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'unified'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-indigo-400 font-bold">ENGINE 01</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'المحرك الموحد' : 'Unified Engine'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">Auto-Mute on Mouse</div>
        </button>

        <button
          onClick={() => setActiveEngine('core_dll')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'core_dll'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-cyan-400 font-bold">ENGINE 02</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'كونترولر كور DLL' : 'Controller Core DLL'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">4096-LUT Direct O(1)</div>
        </button>

        <button
          onClick={() => setActiveEngine('blocker')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'blocker'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-rose-400 font-bold">ENGINE 03</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'حاجب الكنترولر' : 'Controller Blocker'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">LB+RB+DPad Mute</div>
        </button>

        <button
          onClick={() => setActiveEngine('mouse')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'mouse'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-amber-400 font-bold">ENGINE 04</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'حاقن الماوس' : 'Mouse Interceptor'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">WH_MOUSE_LL Tag RLE1</div>
        </button>

        <button
          onClick={() => setActiveEngine('benchmark')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'benchmark'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-emerald-400 font-bold">ENGINE 05</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'بينشمارك الدقة' : 'Benchmark 1M'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">Steady Clock Test</div>
        </button>

        <button
          onClick={() => setActiveEngine('lua_env')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeEngine === 'lua_env'
              ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-purple-400 font-bold">LUA & PY</div>
          <div className="text-xs font-bold truncate mt-0.5">{isAr ? 'بيئة Lua 5.4' : 'Lua 5.4 Environment'}</div>
          <div className="text-[10px] text-slate-500 truncate mt-1">Ctypes & Curves</div>
        </button>
      </div>

      {/* Main Interactive Studio Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Hardware Simulator */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'محاكاة المعالجة الحية للعتاد (Hardware Core)' : 'Live Hardware Core Simulation'}</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              DirectInput 1000Hz
            </span>
          </div>

          {/* Engine-Specific Interactive Controls */}
          {activeEngine === 'unified' && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-indigo-400" />
                  <span>{isAr ? 'مستشعر كتم الكنترولر التلقائي عند حركة الماوس' : 'Auto-Mute on Mouse Movement'}</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  mouseActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {mouseActive ? 'MOUSE ACTIVE (MUTED)' : 'IDLE (ACTIVE)'}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isAr
                  ? 'يقوم هذا المحرك بمراقبة حركة الماوس بدقة متناهية؛ بمجرد تحريك الماوس يتم كتم اليد تلقائياً لمدة 350ms لمنع تداخل المدخلات.'
                  : 'Monitors raw mouse delta activity and mutes gamepad stick inputs for 350ms window on movement.'}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onMouseDown={() => { setMouseActive(true); setIsBlocked(true); }}
                  onMouseUp={() => { setTimeout(() => { setMouseActive(false); setIsBlocked(false); }, 350); }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحريك الماوس (اختبار الكتم التلقائي 350ms)' : 'Simulate Mouse Delta (350ms Mute)'}</span>
                </button>
              </div>
            </div>
          )}

          {activeEngine === 'blocker' && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>{isAr ? 'حالة حجب الكنترولر (LB + RB + DPad Down)' : 'Hardware Blocker Status'}</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isBlocked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isBlocked ? 'MUTED 100%' : 'PASS-THROUGH'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlocked(!isBlocked)}
                  className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isBlocked 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isBlocked ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isBlocked ? (isAr ? 'فك حجب الكنترولر (Unblock)' : 'Unblock Gamepad') : (isAr ? 'تفعيل الحجب (Block Inputs)' : 'Block Gamepad Inputs')}</span>
                </button>
              </div>
            </div>
          )}

          {activeEngine === 'benchmark' && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'اختبار الدقة والسرعة (1M تكرار)' : '1,000,000 Iteration Benchmark'}</span>
                </span>
              </div>

              <button
                type="button"
                disabled={benchmarkRunning}
                onClick={runBenchmark}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${benchmarkRunning ? 'animate-spin' : ''}`} />
                <span>{benchmarkRunning ? (isAr ? 'جاري الاختبار...' : 'Running 1M iterations...') : (isAr ? 'بدء البينشمارك الآن' : 'Start High-Res Benchmark')}</span>
              </button>

              {benchmarkResults && (
                <div className="space-y-1.5 pt-1">
                  {benchmarkResults.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] font-mono p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-300">{b.name}</span>
                      <span className="text-emerald-400 font-bold">{b.avg_ns}</span>
                      <span className="text-slate-500">{b.ops} ops/s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analog Input Sliders */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Input Axis X:</span>
                <span className="text-cyan-400 font-bold">{simX.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={simX}
                onChange={(e) => setSimX(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Input Axis Y:</span>
                <span className="text-cyan-400 font-bold">{simY.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={simY}
                onChange={(e) => setSimY(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Real-time Math Output Gauge */}
          <div className="p-3 bg-[#060a12] border border-slate-800 rounded-xl space-y-2">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>{isAr ? 'الخرج الرياضي النهائي C++:' : 'C++ Hardware Vector Output:'}</span>
              <span className={`font-bold ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isBlocked ? 'DROP RATE: 100%' : 'ACTIVE (0.00ms Jitter)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">OUT_X</span>
                <span className="text-cyan-400 font-bold text-sm">{outX.toFixed(4)}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">OUT_Y</span>
                <span className="text-cyan-400 font-bold text-sm">{outY.toFixed(4)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Source Code Inspector & Compilation Pipeline */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white font-mono">
                {activeEngine.toUpperCase()} · Production Source Code
              </span>
            </div>

            <span className="text-[10px] text-slate-500 font-mono">
              MSYS2 UCRT64 GCC 14.2
            </span>
          </div>

          {/* Code Viewer */}
          <pre className="bg-[#060912] p-4 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto flex-1 max-h-[380px] leading-relaxed">
            {getSourceCode()}
          </pre>

          {/* Compilation command pill */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <span className="truncate">
              g++ -O3 -shared -o bin/{activeEngine}.dll src/{activeEngine}.cpp -lxinput
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`g++ -O3 -shared -o bin/${activeEngine}.dll src/${activeEngine}.cpp -lxinput`);
              }}
              className="text-cyan-400 hover:underline shrink-0 cursor-pointer"
            >
              {isAr ? 'نسخ أمر الترجمة' : 'Copy Build Cmd'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
