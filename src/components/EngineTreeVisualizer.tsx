import React, { useState, useEffect } from 'react';
import { Language, PhysicsConfig } from '../types/engine';
import { 
  Rocket, 
  GitBranch, 
  Cpu, 
  Keyboard, 
  Crosshair, 
  Tv, 
  Code2, 
  FileSearch, 
  History, 
  Activity, 
  Compass, 
  Zap, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface EngineTreeVisualizerProps {
  language: Language;
  config: PhysicsConfig;
  activeBranch: string;
  onSelectBranch: (branchId: string) => void;
}

export const EngineTreeVisualizer: React.FC<EngineTreeVisualizerProps> = ({
  language,
  config,
  activeBranch,
  onSelectBranch
}) => {
  const isAr = language === 'ar';
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Dynamic live pulse and metric ticker running across all 8 branches
  const [dynamicCycle, setDynamicCycle] = useState<number>(0);
  const [liveMetrics, setLiveMetrics] = useState({
    directInputHertz: 1000,
    ghubScriptArmed: true,
    polarVectorR: 1.42,
    d3SlipAngle: 38.4,
    chassisPitchRate: 14.2,
    cppMemoryHookAddress: '0x7FFD2B8A',
    replayFramesParsed: 18450,
    sqliteWalCommits: 48
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setDynamicCycle(prev => (prev + 1) % 100);
      setLiveMetrics(prev => ({
        directInputHertz: 998 + Math.floor(Math.sin(Date.now() / 300) * 4),
        ghubScriptArmed: true,
        polarVectorR: Number((1.38 + Math.sin(Date.now() / 600) * 0.12).toFixed(2)),
        d3SlipAngle: Number((36.5 + Math.sin(Date.now() / 450) * 8.2).toFixed(1)),
        chassisPitchRate: Number((12.0 + Math.cos(Date.now() / 500) * 4.5).toFixed(1)),
        cppMemoryHookAddress: '0x7FFD2B8A',
        replayFramesParsed: prev.replayFramesParsed + 2,
        sqliteWalCommits: prev.sqliteWalCommits
      }));
    }, 120);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#040711] border-2 border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.12)] space-y-5 transition-all">
      {/* Header with status and collapse toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-900/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <GitBranch className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black font-mono text-cyan-100 tracking-wider uppercase">
                {isAr ? 'شجرة المحرك الكلاسيكي الديناميكية (1 ➔ 2 ➔ 4 ➔ 8 Hierarchy Tree)' : 'Classic Pro Engine Interconnected Dynamic Tree (1 ➔ 2 ➔ 4 ➔ 8)'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-400/50 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{isAr ? 'كل الفروع نشطة وتغذي المحرك الرئيسي' : 'ALL 8 LEAVES FEEDING MASTER'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'هيكلية شجرية مترابطة تبدأ من الجذع الرئيسي وتتفرع لقسمين ثم 4 أقسام ثم 8 نهايات متخصصة تعمل وتغذي المحرك الرئيسي بالوقت الفعلي.'
                : 'Interconnected tree: 1 Master Root feeds into 2 Trunks, 4 Branches, and 8 Leaves that concurrently run and feed live signals back to Classic Pro.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsTreeExpanded(!isTreeExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a1122] hover:bg-[#121c38] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-sm shrink-0"
        >
          {isTreeExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>{isAr ? 'طي الشجرة' : 'Collapse Tree'}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{isAr ? 'توسيع الشجرة' : 'Expand Tree'}</span>
            </>
          )}
        </button>
      </div>

      {isTreeExpanded && (
        <div className="space-y-6 pt-1">
          {/* ============================================================== */}
          {/* LEVEL 0: ROOT MASTER ENGINE (1) */}
          {/* ============================================================== */}
          <div className="flex flex-col items-center">
            <div 
              onClick={() => onSelectBranch('physics_curve')}
              className={`w-full max-w-xl p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative overflow-hidden group shadow-xl ${
                activeBranch === 'physics_curve'
                  ? 'bg-gradient-to-b from-[#0e213d] to-[#081326] border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] ring-1 ring-cyan-300'
                  : 'bg-[#080e1d] border-cyan-500/40 hover:border-cyan-400/80 hover:bg-[#0c162e]'
              }`}
            >
              {/* Top scanning pulse */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase">
                  ROOT [1/1] · {isAr ? 'الجذع الرئيسي المعتمد' : 'MASTER ENGINE ROOT'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>1000Hz DirectInput Synced</span>
                </span>
              </div>

              <h3 className="text-base font-black text-white font-mono flex items-center justify-center gap-2">
                <Rocket className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Classic Pro Standard Engine (المحرك الكلاسيكي الرئيسي)</span>
              </h3>

              <div className="mt-2.5 grid grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-1.5 bg-[#030712] rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Ground Sens</div>
                  <div className="text-cyan-300 font-bold">{config.groundSense}x</div>
                </div>
                <div className="p-1.5 bg-[#030712] rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Deadzone</div>
                  <div className="text-emerald-300 font-bold">{config.internalDeadzone}</div>
                </div>
                <div className="p-1.5 bg-[#030712] rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Exponent</div>
                  <div className="text-amber-300 font-bold">{config.curveExponent}</div>
                </div>
                <div className="p-1.5 bg-[#030712] rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Supersonic</div>
                  <div className="text-rose-300 font-bold">2200 uu/s</div>
                </div>
              </div>
            </div>

            {/* Downward connecting branch conduit lines */}
            <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-cyan-500/40 animate-pulse my-1"></div>
            <div className="w-3/4 max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent relative">
              <div 
                className="absolute top-[-3px] w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all"
                style={{ left: `${(dynamicCycle * 1.5) % 95}%` }}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* LEVEL 1: TWO MAIN TRUNKS (2) */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* TRUNK A: Hardware & Input Kinematics */}
            <div className="p-3.5 bg-gradient-to-b from-[#091124] to-[#060c18] border-2 border-cyan-500/50 rounded-xl space-y-2 shadow-lg relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase">
                  TRUNK [1/2] · {isAr ? 'فرع المدخلات والعتاد' : 'INPUT & HARDWARE'}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                  {liveMetrics.directInputHertz} Hz Active
                </span>
              </div>
              <h4 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'الفرع 1: المدخلات وحركيات العتاد (Hardware Kinematics)' : 'Trunk A: Hardware & DirectInput Kinematics'}</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAr
                  ? 'يتحكم في إشارات كيبورد زيرو، مصفوفات 1000Hz، وأزرار الماكرو في G-HUB بدون تأخير إدخال.'
                  : 'Drives sub-millisecond DirectInput polling, 1000Hz anti-ghosting matrix, and low-latency G-HUB hooks.'}
              </p>
            </div>

            {/* TRUNK B: Physics & Core Subsystems */}
            <div className="p-3.5 bg-gradient-to-b from-[#140f26] to-[#0a0718] border-2 border-purple-500/50 rounded-xl space-y-2 shadow-lg relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 uppercase">
                  TRUNK [2/2] · {isAr ? 'فرع الفيزياء والمحركات' : 'PHYSICS & SUBSYSTEMS'}
                </span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded">
                  DirectX 11/12 Engine
                </span>
              </div>
              <h4 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>{isAr ? 'الفرع 2: أنظمة الفيزياء ومحركات C++ والذاكرة' : 'Trunk B: Physics, C++ DLLs & Telemetry'}</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAr
                  ? 'يغذي محرك اللعبة بالمعادلات الفيزيائية، زوايا الانجراف D3، مكتبات C++ الخمس، وتدقيق التغييرات.'
                  : 'Supplies kinematic differential curves, live D3 slip telemetry, 5 native C++ DLLs, and SQLite audit logs.'}
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* LEVEL 2: FOUR MAJOR SUBSYSTEM BRANCHES (4) */}
          {/* ============================================================== */}
          <div className="text-center pt-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              ─── {isAr ? 'الأقسام الأربعة الفرعية (4 Major Subsystem Branches)' : 'Level 2: Four Core Subsystem Branches'} ───
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Branch 1 */}
            <div
              onClick={() => onSelectBranch('keyboard_macros')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                activeBranch === 'keyboard_macros'
                  ? 'bg-[#0f1d38] border-cyan-400 shadow-md ring-1 ring-cyan-400'
                  : 'bg-[#070d1a] border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                <span>BRANCH 1/4</span>
                <span className="text-emerald-400 font-bold">1000Hz</span>
              </div>
              <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'كيبورد زيرو والماكرو' : 'Keyboard & Macros'}</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                {isAr ? 'سكريبتات G-HUB وأزرار MB4/MB5' : 'G-HUB key-scripts & matrix'}
              </p>
            </div>

            {/* Branch 2 */}
            <div
              onClick={() => onSelectBranch('radar_codex')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                activeBranch === 'radar_codex'
                  ? 'bg-[#0f1d38] border-cyan-400 shadow-md ring-1 ring-cyan-400'
                  : 'bg-[#070d1a] border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                <span>BRANCH 2/4</span>
                <span className="text-cyan-300 font-bold">D3 LIVE</span>
              </div>
              <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'رادار المتجهات وكوديكس' : 'Radar & D3 Codex'}</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                {isAr ? 'مراقب زاوية الانجراف D3 والحركات' : 'Real-time D3 drift & mechanics'}
              </p>
            </div>

            {/* Branch 3 */}
            <div
              onClick={() => onSelectBranch('directx_monitor')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                activeBranch === 'directx_monitor'
                  ? 'bg-[#181033] border-purple-400 shadow-md ring-1 ring-purple-400'
                  : 'bg-[#070d1a] border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                <span>BRANCH 3/4</span>
                <span className="text-purple-300 font-bold">DirectX 11/12</span>
              </div>
              <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-purple-400" />
                <span>{isAr ? 'مراقب DirectX والتليمينتري' : 'DirectX Monitor'}</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                {isAr ? 'بث الإشارات الحية من اللعبة' : 'Live game telemetric stream'}
              </p>
            </div>

            {/* Branch 4 */}
            <div
              onClick={() => onSelectBranch('cpp_lua_studio')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                activeBranch === 'cpp_lua_studio'
                  ? 'bg-[#181033] border-purple-400 shadow-md ring-1 ring-purple-400'
                  : 'bg-[#070d1a] border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                <span>BRANCH 4/4</span>
                <span className="text-emerald-400 font-bold">5 C++ DLLs</span>
              </div>
              <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span>{isAr ? 'استوديو C++ و Lua 5.4' : 'C++ & Lua Studio'}</span>
              </h5>
              <p className="text-[10px] text-slate-400">
                {isAr ? 'محركات الذاكرة المنخفضة والربط' : 'Zero-copy memory engines'}
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* LEVEL 3: EIGHT SPECIALIZED LEAVES RUNNING CONCURRENTLY (8) */}
          {/* ============================================================== */}
          <div className="text-center pt-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              ─── {isAr ? 'الأوراق الثمانية المتخصصة الحية (8 Specialized Dynamic Leaves)' : 'Level 3: Eight Specialized Dynamic Leaves'} ───
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Leaf 1 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-cyan-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span>LEAF 1/8</span>
                <span className="text-emerald-400">0.01ms</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">DirectInput Raw</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {liveMetrics.directInputHertz} Hz scan rate
              </div>
            </div>

            {/* Leaf 2 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-cyan-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span>LEAF 2/8</span>
                <span className="text-emerald-400">ARMED</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">G-HUB Key-Scripts</div>
              <div className="text-[10px] text-slate-400 font-mono">
                MB4 Aerial / MB5 Flip
              </div>
            </div>

            {/* Leaf 3 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-cyan-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span>LEAF 3/8</span>
                <span className="text-cyan-300">r={liveMetrics.polarVectorR}</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">Polar Vectors</div>
              <div className="text-[10px] text-slate-400 font-mono">
                10 Core Mechanics
              </div>
            </div>

            {/* Leaf 4 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-cyan-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span>LEAF 4/8</span>
                <span className="text-amber-300">{liveMetrics.d3SlipAngle}°</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">D3 Slip Telemetry</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Dynamic Drift Angle
              </div>
            </div>

            {/* Leaf 5 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-purple-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>LEAF 5/8</span>
                <span className="text-purple-300">{liveMetrics.chassisPitchRate}°/s</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">Chassis Normals</div>
              <div className="text-[10px] text-slate-400 font-mono">
                4-Wheel Contact Normal
              </div>
            </div>

            {/* Leaf 6 */}
            <div className="p-2.5 bg-[#050811] rounded-xl border border-purple-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>LEAF 6/8</span>
                <span className="text-emerald-400">HOOKED</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">C++ Memory Hook</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {liveMetrics.cppMemoryHookAddress}
              </div>
            </div>

            {/* Leaf 7 */}
            <div 
              onClick={() => onSelectBranch('replay_ai')}
              className="p-2.5 bg-[#050811] rounded-xl border border-purple-500/30 space-y-1 cursor-pointer hover:border-purple-400"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>LEAF 7/8</span>
                <span className="text-purple-300">AI</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">Replay Analyzer</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {liveMetrics.replayFramesParsed} frames
              </div>
            </div>

            {/* Leaf 8 */}
            <div 
              onClick={() => onSelectBranch('audit_trail')}
              className="p-2.5 bg-[#050811] rounded-xl border border-purple-500/30 space-y-1 cursor-pointer hover:border-purple-400"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>LEAF 8/8</span>
                <span className="text-emerald-400">WAL OK</span>
              </div>
              <div className="text-xs font-bold text-white font-mono truncate">SQLite WAL History</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {liveMetrics.sqliteWalCommits} mutations saved
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
