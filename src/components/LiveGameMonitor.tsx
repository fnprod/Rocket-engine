import React, { useState, useEffect } from 'react';
import { PhysicsConfig, Language, SUPERSONIC_MIN_UU, SUPERSONIC_MAX_UU, LiveTelemetryState } from '../types/engine';
import { 
  Activity, 
  Gauge, 
  Radio, 
  Zap, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Flame, 
  Sparkles, 
  Compass, 
  Crosshair, 
  Layers, 
  RefreshCw, 
  Sliders, 
  Cpu, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Square
} from 'lucide-react';

interface LiveGameMonitorProps {
  physicsConfig: PhysicsConfig;
  language: Language;
}

export const LiveGameMonitor: React.FC<LiveGameMonitorProps> = ({
  physicsConfig,
  language,
}) => {
  const isAr = language === 'ar';

  // Environment Connection State
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTED');
  const [selectedHitbox, setSelectedHitbox] = useState<'Octane' | 'Fennec' | 'Dominus' | 'Batmobile'>('Octane');
  const [isSimulatingFeed, setIsSimulatingFeed] = useState<boolean>(true);

  // Live Telemetry Values
  const [telemetry, setTelemetry] = useState<LiveTelemetryState>({
    velocityUu: 2240,
    isSupersonic: true,
    boostPercent: 78,
    throttleInput: 1.0,
    steerInput: 0.12,
    pitchInput: -0.05,
    yawInput: 0.08,
    rollInput: 0.0,
    wheelsOnGround: [true, true, true, true],
    flipTimerRemaining: 1.45,
    hasFlipReset: true,
    activeKeyStrokes: ['W', 'G1_BOOST'],
    pingMs: 14,
    fps: 240,
  });

  // Telemetry stream simulation tick
  useEffect(() => {
    if (!isSimulatingFeed) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        // Natural fluctuations around supersonic velocity
        const deltaVel = (Math.random() - 0.48) * 45;
        const newVel = Math.min(SUPERSONIC_MAX_UU, Math.max(800, prev.velocityUu + deltaVel));
        const isSupersonic = newVel >= SUPERSONIC_MIN_UU;

        // Boost oscillation
        const newBoost = isSupersonic ? Math.max(10, prev.boostPercent - 0.8) : Math.min(100, prev.boostPercent + 1.2);

        // Random wheel state simulation (e.g. slight bounce)
        const allWheels = Math.random() > 0.15;
        const wheels: [boolean, boolean, boolean, boolean] = allWheels
          ? [true, true, true, true]
          : [true, false, true, true];

        return {
          ...prev,
          velocityUu: Math.round(newVel),
          isSupersonic,
          boostPercent: Math.round(newBoost),
          wheelsOnGround: wheels,
          hasFlipReset: allWheels,
          flipTimerRemaining: allWheels ? 1.45 : Math.max(0, prev.flipTimerRemaining - 0.05),
          steerInput: Number(((Math.random() - 0.5) * 0.4).toFixed(2)),
          pitchInput: Number(((Math.random() - 0.5) * 0.2).toFixed(2)),
          pingMs: Math.round(12 + Math.random() * 4),
        };
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isSimulatingFeed]);

  const handleToggleFeed = () => {
    setIsSimulatingFeed(!isSimulatingFeed);
  };

  const handleForceFlipReset = () => {
    setTelemetry((prev) => ({
      ...prev,
      wheelsOnGround: [true, true, true, true],
      hasFlipReset: true,
      flipTimerRemaining: 1.45,
    }));
  };

  const handleForceSupersonic = () => {
    setTelemetry((prev) => ({
      ...prev,
      velocityUu: SUPERSONIC_MAX_UU,
      isSupersonic: true,
      boostPercent: 100,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Connection status */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-wide">
              {isAr ? 'اللايف مونيتور ورادار الأشعة السينية (In-Game X-Ray HUD)' : 'Live Gameplay Telemetry & In-Game X-Ray Monitor'}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              TAGAME DIRECT CONNECTOR
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isAr
              ? 'مراقبة حية لمعطيات الفيزياء اللحظية، قراءة حساس الأشعة السينية للعجلات الأربع والفليب ريسيت، وسقف السرعة الخارقة (2200 - 2300 uu/s).'
              : 'Real-time telemetry reader tracking car physics vectors, 4-wheel contact suspension, flip reset detection, and supersonic velocity.'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hitbox Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 px-1 text-[11px]">{isAr ? 'الشاسيه:' : 'Hitbox:'}</span>
            {(['Octane', 'Fennec', 'Dominus'] as const).map((hb) => (
              <button
                key={hb}
                onClick={() => setSelectedHitbox(hb)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  selectedHitbox === hb ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {hb}
              </button>
            ))}
          </div>

          {/* Connection Toggle */}
          <button
            onClick={handleToggleFeed}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isSimulatingFeed
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isSimulatingFeed ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isSimulatingFeed ? (isAr ? 'البث المباشر نشط' : 'Feed Active') : (isAr ? 'البث متوقف' : 'Feed Paused')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: X-Ray Scanner & Velocity Vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: X-Ray 4-Wheel Contact & Flip Reset Diagnostic */}
        <div className="lg:col-span-6 bg-[#0b1120] border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {isAr ? 'ماسح الأشعة السينية للعجلات وفحص الفليب ريسيت' : 'X-Ray 4-Wheel Contact & Flip Reset Scanner'}
              </h3>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
              telemetry.hasFlipReset 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {telemetry.hasFlipReset ? (isAr ? 'فليب ريسيت متاح ✓' : 'FLIP RESET READY ✓') : (isAr ? 'لا يوجد فليب ✕' : 'NO FLIP ✕')}
            </span>
          </div>

          {/* Graphical X-Ray Car Chassis Visualizer */}
          <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 carbon-grid opacity-30 pointer-events-none" />

            {/* Car Chassis Center Frame */}
            <div className="relative w-44 h-64 border-2 border-cyan-500/40 rounded-3xl bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-between p-4 shadow-xl shadow-cyan-950/20">
              
              {/* Front Axle / Wheel Contact Indicators */}
              <div className="w-full flex items-center justify-between">
                {/* Front Left (FL) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-12 rounded-md border flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                    telemetry.wheelsOnGround[0]
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/50'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    FL
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    {telemetry.wheelsOnGround[0] ? 'CONTACT' : 'AIR'}
                  </span>
                </div>

                {/* Front Bumper Label */}
                <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase">
                  ▲ FRONT ▲
                </div>

                {/* Front Right (FR) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-12 rounded-md border flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                    telemetry.wheelsOnGround[1]
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/50'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    FR
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    {telemetry.wheelsOnGround[1] ? 'CONTACT' : 'AIR'}
                  </span>
                </div>
              </div>

              {/* Center Hitbox Profile & Orientation Details */}
              <div className="text-center space-y-1">
                <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  {selectedHitbox} Hitbox
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Pitch: {telemetry.pitchInput}° | Yaw: {telemetry.yawInput}°
                </div>
                <div className="text-[10px] font-mono text-amber-400 font-semibold">
                  {telemetry.hasFlipReset ? (isAr ? 'فليب لا نهائي نشط' : 'Infinite Reset Active') : `Timer: ${telemetry.flipTimerRemaining.toFixed(2)}s`}
                </div>
              </div>

              {/* Rear Axle / Wheel Contact Indicators */}
              <div className="w-full flex items-center justify-between">
                {/* Rear Left (RL) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-12 rounded-md border flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                    telemetry.wheelsOnGround[2]
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/50'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    RL
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    {telemetry.wheelsOnGround[2] ? 'CONTACT' : 'AIR'}
                  </span>
                </div>

                {/* Boost Exhaust Glow */}
                <div className="flex flex-col items-center">
                  <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                  <span className="text-[8px] font-mono text-amber-400">G1 BOOST</span>
                </div>

                {/* Rear Right (RR) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-12 rounded-md border flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                    telemetry.wheelsOnGround[3]
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/50'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    RR
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    {telemetry.wheelsOnGround[3] ? 'CONTACT' : 'AIR'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceFlipReset}
              className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg transition-colors cursor-pointer"
            >
              {isAr ? 'محاكاة تلامس العجلات الأربع (Flip Reset)' : 'Simulate 4-Wheel Contact'}
            </button>
            <button
              onClick={handleForceSupersonic}
              className="flex-1 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
            >
              {isAr ? 'محاكاة السرعة القصوى (2300 uu/s)' : 'Trigger Max Supersonic (2300 uu/s)'}
            </button>
          </div>
        </div>

        {/* Right Column: Speedometer & Telemetry KPIs */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Speedometer & Supersonic Indicator Card */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {isAr ? 'عداد السرعة اللحظي وسقف السوبرسونيك (2200 - 2300 uu/s)' : 'Real-Time Velocity & Supersonic Cap'}
                </h3>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                telemetry.isSupersonic
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {telemetry.isSupersonic ? '⚡ SUPERSONIC ACTIVE' : 'SUB-SUPERSONIC'}
              </span>
            </div>

            {/* Large Speed Display */}
            <div className="flex items-baseline justify-between">
              <div>
                <div className={`text-4xl font-extrabold font-mono tracking-tight ${
                  telemetry.isSupersonic ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {telemetry.velocityUu}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Unreal Units per second (uu/s)
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold font-mono text-white">
                  {((telemetry.velocityUu / 27.78) * 0.036).toFixed(1)} km/h
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  In-game physical equivalent
                </div>
              </div>
            </div>

            {/* Continuous Bar with 2200 Activation Marker */}
            <div className="space-y-1">
              <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-150 rounded-full ${
                    telemetry.isSupersonic
                      ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, (telemetry.velocityUu / SUPERSONIC_MAX_UU) * 100)}%` }}
                />
                {/* 2200 uu/s marker line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-400"
                  style={{ left: `${(SUPERSONIC_MIN_UU / SUPERSONIC_MAX_UU) * 100}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>0 uu/s</span>
                <span className="text-rose-400 font-bold">2200 uu/s (Supersonic Gate)</span>
                <span className="text-amber-400 font-bold">2300 uu/s (Engine Cap)</span>
              </div>
            </div>
          </div>

          {/* Telemetry Grid Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500">BOOST TANK</span>
              <div className="text-amber-400 font-bold text-base mt-1">{telemetry.boostPercent}%</div>
              <div className="text-[10px] text-slate-400">33.3% / sec burn</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500">ENGINE PING</span>
              <div className="text-emerald-400 font-bold text-base mt-1">{telemetry.pingMs} ms</div>
              <div className="text-[10px] text-slate-400">DirectX hook</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500">RENDER FPS</span>
              <div className="text-cyan-400 font-bold text-base mt-1">{telemetry.fps} FPS</div>
              <div className="text-[10px] text-slate-400">V-Sync G-Sync</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500">FLIP TIMER</span>
              <div className="text-purple-400 font-bold text-base mt-1">{telemetry.flipTimerRemaining.toFixed(2)}s</div>
              <div className="text-[10px] text-slate-400">Dodge window</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
