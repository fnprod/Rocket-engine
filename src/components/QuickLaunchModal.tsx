import React, { useState } from 'react';
import { Language, PhysicsConfig, KeyBinding, MacroTimingConfig } from '../types/engine';
import { generateLuaScript } from '../utils/luaGenerator';
import { 
  generateGHubLaunchBatchScript, 
  generateGHubLaunchPowerShellScript, 
  getGHubWindowsCommand, 
  getGHubPowerShellCommand 
} from '../utils/ghubLauncher';
import { getMandatoryGHubScriptDir } from '../utils/ghubDirectoryConfig';
import { 
  Rocket, 
  ExternalLink, 
  Copy, 
  Check, 
  Play, 
  Terminal, 
  AlertCircle, 
  ShieldCheck,
  Sparkles,
  Download,
  FileCode,
  Zap
} from 'lucide-react';

interface QuickLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'rocket_league' | 'logitech_ghub';
  language: Language;
  physicsConfig: PhysicsConfig;
  keybindings: KeyBinding[];
  timings: MacroTimingConfig;
}

export const QuickLaunchModal: React.FC<QuickLaunchModalProps> = ({
  isOpen,
  onClose,
  mode,
  language,
  physicsConfig,
  keybindings,
  timings,
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const [copiedLua, setCopiedLua] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedGHubCmd, setCopiedGHubCmd] = useState(false);
  const [copiedGHubPS, setCopiedGHubPS] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  const luaCode = generateLuaScript(physicsConfig, keybindings, timings);
  const ghubWinCmd = getGHubWindowsCommand();
  const ghubPsCmd = getGHubPowerShellCommand();

  const handleLaunchProtocol = (protocol: string, name: string) => {
    try {
      const a = document.createElement('a');
      a.href = protocol;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setLaunchStatus(
        isAr 
          ? `✓ تم إرسال إشارة التشغيل لبروتوكول ${name} (إذا لم يفتح تلقائياً، استخدم خيار أوامر CMD أدناه)` 
          : `✓ Dispatched launch signal to ${name} (if not registered, use CMD/PowerShell below)`
      );
      setTimeout(() => setLaunchStatus(null), 4000);
    } catch (err) {
      setLaunchStatus(isAr ? 'يرجى استخدام أمر التشغيل السريع أدناه' : 'Use direct launch commands below');
    }
  };

  const handleCopyLua = () => {
    navigator.clipboard.writeText(luaCode);
    setCopiedLua(true);
    setTimeout(() => setCopiedLua(false), 2500);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  const handleCopyGHubCmd = () => {
    navigator.clipboard.writeText(ghubWinCmd);
    setCopiedGHubCmd(true);
    setTimeout(() => setCopiedGHubCmd(false), 2500);
  };

  const handleCopyGHubPS = () => {
    navigator.clipboard.writeText(ghubPsCmd);
    setCopiedGHubPS(true);
    setTimeout(() => setCopiedGHubPS(false), 2500);
  };

  const handleDownloadGHubBat = () => {
    const batContent = generateGHubLaunchBatchScript(luaCode);
    const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Launch_Logitech_GHUB.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLaunchStatus(isAr ? '✓ تم تحميل مشغل لوجيتك السريع (Launch_Logitech_GHUB.bat)!' : '✓ Downloaded Launch_Logitech_GHUB.bat!');
    setTimeout(() => setLaunchStatus(null), 3500);
  };

  const handleDownloadGHubPs1 = () => {
    const ps1Content = generateGHubLaunchPowerShellScript(luaCode);
    const blob = new Blob([ps1Content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Start_Logitech_GHUB.ps1';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLaunchStatus(isAr ? '✓ تم تحميل سكريبت Start_Logitech_GHUB.ps1!' : '✓ Downloaded Start_Logitech_GHUB.ps1!');
    setTimeout(() => setLaunchStatus(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {mode === 'rocket_league' ? (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Rocket className="w-4 h-4 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <span className="font-mono font-bold text-xs">GH</span>
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'rocket_league' 
                  ? (isAr ? 'مشغّل لعبة روكيت ليج السريع' : 'Rocket League Quick Launcher')
                  : (isAr ? 'مشغّل برنامج لوجيتك جي هوب (Logitech G HUB)' : 'Logitech G HUB Launcher & Link')
                }
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'rocket_league'
                  ? (isAr ? 'تشغيل فوري عبر Steam أو Epic Games مع إعدادات المحرك' : 'Direct execution via Steam or Epic Games protocol')
                  : (isAr ? 'فتح تطبيق لوجيتك ونسخ السكريبت المتزامن' : 'Direct integration & script injection')
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer p-1 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content for Rocket League */}
        {mode === 'rocket_league' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Steam Button */}
              <button
                onClick={() => handleLaunchProtocol('steam://rungameid/252950', 'Steam')}
                className="p-3.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    {isAr ? 'تشغيل عبر ستيم (Steam)' : 'Launch via Steam'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">steam://rungameid/252950</div>
              </button>

              {/* Epic Games Button */}
              <button
                onClick={() => handleLaunchProtocol('com.epicgames.launcher://apps/Sugar?action=launch', 'Epic Games')}
                className="p-3.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400">
                    {isAr ? 'تشغيل عبر إيبك (Epic Games)' : 'Launch via Epic Games'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">com.epicgames.launcher://</div>
              </button>
            </div>

            {/* Run via Command Line / Shortcut */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-500" />
                  {isAr ? 'أمر التشغيل السريع في ويندوز (Windows Run / CMD)' : 'Windows Direct Launch Command'}
                </span>
                <button
                  onClick={() => handleCopyCommand('start "" "C:\\Program Files\\Epic Games\\rocketleague\\Binaries\\Win64\\RocketLeague.exe"')}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {copiedCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCommand ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الأمر' : 'Copy')}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded truncate">
                start "" "C:\Program Files\Epic Games\rocketleague\Binaries\Win64\RocketLeague.exe"
              </div>
            </div>

            {/* Status Feedback */}
            {launchStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{launchStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Content for Logitech G HUB */}
        {mode === 'logitech_ghub' && (
          <div className="space-y-4">
            
            {/* Launch Status Banner */}
            {launchStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{launchStatus}</span>
              </div>
            )}

            {/* Row 1: Direct Protocol & Copy Lua Script */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleLaunchProtocol('lghub://', 'Logitech G HUB')}
                className="p-3.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400">
                    {isAr ? '1. فتح تطبيق Logitech G HUB' : '1. Launch Logitech G HUB'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                </div>
                <div className="text-[11px] font-mono text-cyan-400 mt-1">Protocol: lghub://</div>
              </button>

              <button
                onClick={handleCopyLua}
                className="p-3.5 bg-cyan-950/40 hover:bg-cyan-900/40 rounded-xl border border-cyan-500/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">
                    {isAr ? '2. نسخ سكريبت لوا 1000Hz' : '2. Copy 1000Hz Lua Script'}
                  </span>
                  {copiedLua ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {copiedLua ? (isAr ? '✓ جاهز للصق في جي هوب!' : '✓ Ready to paste in G HUB!') : (isAr ? 'كود محرك 1000Hz فائق الاستجابة' : 'Ultra-Fast 1000Hz Engine')}
                </div>
              </button>
            </div>

            {/* Row 2: Windows CMD & PowerShell Direct Run Commands */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              {/* Windows CMD Command */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? 'أمر التشغيل المباشر في ويندوز (Windows CMD / Run):' : 'Windows Direct Launch (CMD / Run):'}</span>
                  </span>
                  <button
                    onClick={handleCopyGHubCmd}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedGHubCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedGHubCmd ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الأمر' : 'Copy CMD')}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded truncate border border-slate-800/80">
                  {ghubWinCmd}
                </div>
              </div>

              {/* PowerShell Command */}
              <div className="space-y-1 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'أمر PowerShell للتشغيل السريع:' : 'PowerShell Direct Start:'}</span>
                  </span>
                  <button
                    onClick={handleCopyGHubPS}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedGHubPS ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedGHubPS ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ PowerShell' : 'Copy PS')}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-amber-400/90 bg-slate-900 p-2 rounded truncate border border-slate-800/80">
                  {ghubPsCmd}
                </div>
              </div>
            </div>

            {/* Row 3: Standalone 1-Click Launchers (.bat & .ps1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleDownloadGHubBat}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'تحميل مشغل لوجيتك (.bat)' : 'Download Launcher (.bat)'}</span>
              </button>

              <button
                onClick={handleDownloadGHubPs1}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-950/40"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل حاقن سكريبت (.ps1)' : 'Download Injector (.ps1)'}</span>
              </button>
            </div>

            {/* Mandatory G-HUB Scripts Directory Locked Indicator */}
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <span>📁 {isAr ? 'مسار مجلد G-HUB الإلزامي المعتمد:' : 'Mandatory G-HUB Directory:'}</span>
              </span>
              <span className="text-cyan-300 font-bold select-all bg-[#080d1a] px-2 py-0.5 rounded border border-slate-800 text-[11px] truncate max-w-full">
                {getMandatoryGHubScriptDir()}
              </span>
            </div>

            {/* 3 Steps Guide */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-200">
                {isAr ? 'خطوات دمج المحرك مع لوجيتك جي هوب (Logitech G HUB):' : 'How to apply in Logitech G HUB:'}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>{isAr ? 'افتح برنامج Logitech G HUB واختر بروفايل Rocket League.' : 'Open Logitech G HUB and select Rocket League profile.'}</li>
                <li>{isAr ? 'اضغط على أيقونة البرمجة النصية (Scripting / Lua Script).' : 'Click on the Scripting (Lua Editor) tab.'}</li>
                <li>{isAr ? 'الصق سكريبت لوا 1000Hz المحدث ثم اضغط Ctrl+S لحفظه.' : 'Paste the updated 1000Hz Lua script and press Ctrl+S to save.'}</li>
              </ol>
            </div>

            {/* Telemetry Status Bar */}
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isAr ? 'مزامنة 1000Hz جاهزة' : '1000Hz Ready'}</span>
              </span>
              <span>G1 Boost · G2 Jump · G3 Rear · MB4 Speedflip</span>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
