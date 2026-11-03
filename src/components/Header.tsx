import React, { useState } from 'react';
import { ActiveTab, Language } from '../types/engine';
import { EsportBrandLogo } from './EsportBrandLogo';
import { 
  Rocket, 
  Settings2, 
  Keyboard, 
  Timer, 
  Gamepad2, 
  Languages,
  Tv,
  Trophy,
  FileSearch,
  CheckCircle2,
  Wrench,
  Terminal,
  Compass,
  Crosshair,
  Cloud,
  History,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  Play,
  GitBranch,
  Code2
} from 'lucide-react';
import { isTauriDesktop } from '../services/gemini';
import { GitHubSyncModal } from './GitHubSyncModal';
import { EngineSettingsModal } from './EngineSettingsModal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onOpenDeveloperHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onOpenDeveloperHub,
}) => {
  const isAr = language === 'ar';
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);
  const [showRLLaunchModal, setShowRLLaunchModal] = useState<boolean>(false);
  const [showGitHubModal, setShowGitHubModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  const epicLaunchUri = 'com.epicgames.launcher://apps/Sugar?action=launch&silent=true';
  const windowsRunCmd = 'start com.epicgames.launcher://apps/Sugar?action=launch';

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(windowsRunCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off\r\necho ========================================================\r\necho   FNPro Master Engine - Rocket League Quick Launcher\r\necho ========================================================\r\nstart com.epicgames.launcher://apps/Sugar?action=launch\r\nexit\r\n`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'launch_rocket_league.bat';
    link.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { 
      id: 'classic_pro' as ActiveTab, 
      label: isAr ? 'المحرك الكلاسيكي (الرئيسي)' : 'Classic Pro Engine', 
      badge: isAr ? 'شجرة المحرك الموحدة' : 'Master Tree',
      icon: Rocket,
      isPrimaryBranch: (tab: ActiveTab) => 
        tab === 'classic_pro' || tab === 'physics' || tab === 'layer0' || 
        tab === 'unified_radar' || tab === 'macros' || tab === 'cpp_lua_studio' || 
        tab === 'replay_analyzer' || tab === 'history_audit' || tab === 'streamer_overlay' || tab === 'mechanics'
    },
    { 
      id: 'unreal_symmetric' as ActiveTab, 
      label: isAr ? 'إنريل المتناظر 1:-1' : 'Unreal Symmetric 1:-1', 
      badge: '[-1.0 ↔ +1.0]',
      icon: Compass,
      isPrimaryBranch: (tab: ActiveTab) => tab === 'unreal_symmetric'
    },
    { 
      id: 'ballchasing_cloud' as ActiveTab, 
      label: isAr ? 'سحابة Ballchasing' : 'Ballchasing Cloud', 
      badge: 'Cloud Sync',
      icon: Cloud,
      isPrimaryBranch: (tab: ActiveTab) => tab === 'ballchasing_cloud'
    },
    { 
      id: 'profiles' as ActiveTab, 
      label: isAr ? 'التهيئة والملفات (TAInput)' : 'Profiles & TAInput.ini', 
      badge: 'DirectInput',
      icon: Gamepad2,
      isPrimaryBranch: (tab: ActiveTab) => tab === 'profiles' || tab === 'gaming_profiles'
    },
    { 
      id: 'liquipedia' as ActiveTab, 
      label: isAr ? 'مزامنة Liquipedia' : 'Liquipedia RLCS', 
      badge: 'Esports Tier',
      icon: Trophy,
      isPrimaryBranch: (tab: ActiveTab) => tab === 'liquipedia'
    },
  ];

  // 1-Click Native Logitech G HUB Execution (Zero copy popups or modals)
  const handleLaunchGHub = async () => {
    if (isTauriDesktop()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('launch_logitech_ghub');
        setDispatchToast(isAr ? '✓ تم تشغيل لوجيتك G-HUB بنجاح!' : '✓ Logitech G-HUB dispatched!');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setDispatchToast(`Notice: ${msg}`);
      }
    } else {
      window.open('lghub://', '_self');
      setDispatchToast('Dispatched lghub://');
    }
    setTimeout(() => setDispatchToast(null), 3000);
  };

  // 1-Click Native Rocket League Launch
  const handleLaunchRocketLeague = async () => {
    if (isTauriDesktop()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('launch_rocket_league');
        setDispatchToast(isAr ? '✓ تم إطلاق روكيت ليج عبر المحرك!' : '✓ Rocket League dispatched!');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setDispatchToast(`Notice: ${msg}`);
      }
    } else {
      // Safe anchor dispatch (does not get blocked by window.open iframes)
      try {
        const a = document.createElement('a');
        a.href = epicLaunchUri;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        // ignore
      }
      setShowRLLaunchModal(true);
      setDispatchToast(isAr ? 'تشغيل روكيت ليج...' : 'Dispatched Rocket League');
    }
    setTimeout(() => setDispatchToast(null), 3000);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center shrink-0">
            <EsportBrandLogo size={44} showText={true} />
          </div>

          {/* Zone 2: PC-First 5 Top-Level Master Categories */}
          <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isPrimaryBranch(activeTab);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-cyan-300 border-2 border-cyan-500/60 shadow-md shadow-cyan-950/40 scale-[1.02]'
                      : 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: PC Desktop Hardware Launchers & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {dispatchToast && (
              <span className="text-[11px] font-mono font-bold text-emerald-400 animate-in fade-in bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/40">
                {dispatchToast}
              </span>
            )}

            {/* Direct 1-Click Rocket League Launch */}
            <button
              onClick={handleLaunchRocketLeague}
              title={isAr ? 'تشغيل روكيت ليج المباشر (1-Click)' : 'Launch Rocket League (1-Click)'}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl transition-all shadow-md shadow-amber-950/30 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>{isAr ? 'تشغيل RL' : 'Launch RL'}</span>
            </button>

            {/* Direct 1-Click GitHub Repository Sync */}
            <button
              onClick={() => setShowGitHubModal(true)}
              title={isAr ? 'مزامنة مستودع GitHub فوراً (userfn-git/FNProMasterEngine)' : 'Sync to GitHub (userfn-git/FNProMasterEngine)'}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all shadow-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'مزامنة GitHub' : 'GitHub Sync'}</span>
            </button>

            {/* Direct 1-Click Logitech G-HUB Launch */}
            <button
              onClick={handleLaunchGHub}
              title={isAr ? 'تشغيل برنامج لوجيتك G-HUB المباشر (1-Click)' : '1-Click Launch Logitech G-HUB (1000Hz)'}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 rounded-xl transition-all shadow-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-mono">Logitech G-HUB</span>
            </button>

            {/* Developer & Admin Hub Modal Trigger */}
            <button
              onClick={onOpenDeveloperHub}
              title={isAr ? 'مركز المطورين والإدارة (GitHub · Source ZIP · HWID · Bootstrapper)' : 'Admin & Dev Suite (Git · Source ZIP · HWID · Bootstrapper)'}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'إدارة المحرك والمطورين' : 'Admin & Dev'}</span>
            </button>

            {/* Mandatory G-HUB Directory & Engine Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title={isAr ? 'إعدادات المحرك وتحديد مسار مجلد G-HUB الإلزامي' : 'Engine Settings & Mandatory G-HUB Directory'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#0d1627] hover:bg-[#142340] text-amber-300 border border-amber-500/40 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'إعدادات G-HUB' : 'G-HUB Settings'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Languages className="w-4 h-4 text-slate-400" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Mandatory G-HUB Directory Settings Modal */}
      <EngineSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        language={language}
        onDispatchToast={setDispatchToast}
      />

      {/* Local Rocket League Launcher Helper Modal */}
      {showRLLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div 
            className="bg-[#0b1120] border border-amber-500/40 rounded-2xl w-full max-w-lg p-5 shadow-2xl shadow-amber-950/40 space-y-4"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'مشغّل روكيت ليج المباشر لويندوز 11' : 'Rocket League Local Windows Launcher'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'بروتوكول Epic Games الرسمي ومثبت التشغيل السريع' : 'Official Epic Games protocol & quick launch scripts'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRLLaunchModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr
                ? 'تم إرسال أمر التشغيل تلقائياً. إذا منع المتصفح تشغيل التطبيق المباشر بسبب قيود الأمان، يمكنك استخدام الخيارات التالية فوراً:'
                : 'The launch protocol was dispatched. If your browser restricts direct application execution, use one of the verified local options below:'}
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Direct Link */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? 'الرابط المباشر للبروتوكول' : 'Direct Protocol Link'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {epicLaunchUri}
                  </div>
                </div>
                <a
                  href={epicLaunchUri}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm shrink-0 whitespace-nowrap"
                >
                  {isAr ? 'فتح اللعبة الآن' : 'Launch Game'}
                </a>
              </div>

              {/* Option 2: Copy Windows Run Command */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{isAr ? 'أمر نافذة تشغيل ويندوز (Win + R)' : 'Windows Run Dialog Command (Win + R)'}</span>
                  </span>
                  <button
                    onClick={handleCopyCmd}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 transition cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الأمر' : 'Copy')}</span>
                  </button>
                </div>
                <pre className="p-2 bg-slate-950 border border-slate-800/80 rounded font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {windowsRunCmd}
                </pre>
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'اضغط Win + R على الكيبورد، الصق الأمر واضغط Enter.' : 'Press Win+R on your keyboard, paste this command, and hit Enter.'}
                </div>
              </div>

              {/* Option 3: Download .BAT Launcher */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تحميل ملف التشغيل السريع (.bat)' : 'Download 1-Click Batch File (.bat)'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isAr ? 'ملف آمن لتشغيل روكيت ليج بنقرة واحدة دائماً' : 'Safe local batch script for launching Rocket League instantly'}
                  </div>
                </div>
                <button
                  onClick={handleDownloadBat}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
                >
                  {isAr ? 'تحميل .bat' : 'Download .bat'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              <span className="truncate max-w-[320px]">Binaries: ...\Binaries\Win64\RocketLeague.exe</span>
              <button
                onClick={() => setShowRLLaunchModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Sync Modal */}
      <GitHubSyncModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        language={language}
      />
    </header>
  );
};
