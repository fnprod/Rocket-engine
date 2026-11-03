import React, { useState, useEffect } from 'react';
import { 
  PhysicsConfig, 
  KeyBinding, 
  MacroTimingConfig, 
  GameProfile, 
  ActiveTab, 
  Language 
} from './types/engine';
import { 
  INITIAL_PHYSICS_CONFIG, 
  INITIAL_KEYBINDINGS, 
  INITIAL_MACRO_TIMINGS, 
  INITIAL_GAME_PROFILES 
} from './data/initialData';
import { Header } from './components/Header';
import { ClassicProEngine } from './components/ClassicProEngine';
import { UnrealSymmetricEngine } from './components/UnrealSymmetricEngine';
import { BallchasingCloudHub } from './components/BallchasingCloudHub';
import { LiquipediaSyncPanel } from './components/LiquipediaSyncPanel';
import { TauriInputProfileManager } from './components/TauriInputProfileManager';
import { StandalonePackageDownloadModal } from './components/StandalonePackageDownloadModal';
import { AdminExportModal } from './components/AdminExportModal';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Flame, 
  CheckCircle2,
  Tv,
  HardDrive
} from 'lucide-react';
import { initTempScratchBuffers, initTelemetryDb, getHardwareFingerprint } from './services/fnproNativeBridge';
import { recordAuditEntry } from './utils/engineAuditLog';

const STORAGE_KEY_PHYSICS = 'fnpro_unified_physics_config';
const STORAGE_KEY_KEYBINDINGS = 'fnpro_unified_keybindings';
const STORAGE_KEY_MACRO_TIMINGS = 'fnpro_unified_macro_timings';
const STORAGE_KEY_PROFILES = 'fnpro_unified_game_profiles';
const STORAGE_KEY_ACTIVE_PROFILE = 'fnpro_unified_active_profile_id';
const STORAGE_KEY_LANGUAGE = 'fnpro_unified_language';

export default function App() {
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PHYSICS) || localStorage.getItem('fnpro_classic_pro_config_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.curveExponent === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading physics config from storage:', e);
      }
    }
    return INITIAL_PHYSICS_CONFIG;
  });

  const [keybindings, setKeybindings] = useState<KeyBinding[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_KEYBINDINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading keybindings from storage:', e);
      }
    }
    return INITIAL_KEYBINDINGS;
  });

  const [macroTimings, setMacroTimings] = useState<MacroTimingConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MACRO_TIMINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.fastAerialHoldMs === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading macro timings from storage:', e);
      }
    }
    return INITIAL_MACRO_TIMINGS;
  });

  const [gameProfiles, setGameProfiles] = useState<GameProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading profiles from storage:', e);
      }
    }
    return INITIAL_GAME_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE);
      if (saved) return saved;
    }
    return 'my_unified_profile';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        return tabParam as ActiveTab;
      }
      if (params.get('streamer_overlay') === '1') {
        return 'unified_radar';
      }
    }
    return 'classic_pro';
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
      if (saved === 'ar' || saved === 'en') return saved;
    }
    return 'ar';
  });

  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showDevHub, setShowDevHub] = useState<boolean>(false);
  const [f12Notification, setF12Notification] = useState<string | null>(null);

  const isAr = language === 'ar';

  // Persistent synchronization to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PHYSICS, JSON.stringify(physicsConfig));
      localStorage.setItem('fnpro_classic_pro_config_v2', JSON.stringify(physicsConfig));
    } catch {}
  }, [physicsConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_KEYBINDINGS, JSON.stringify(keybindings));
    } catch {}
  }, [keybindings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MACRO_TIMINGS, JSON.stringify(macroTimings));
    } catch {}
  }, [macroTimings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(gameProfiles));
    } catch {}
  }, [gameProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, activeProfileId);
    } catch {}
  }, [activeProfileId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, language);
    } catch {}
  }, [language]);

  // Initialize Native Temp Scratch Buffers & SQLite WAL Database on mount
  useEffect(() => {
    initTempScratchBuffers().catch(console.error);
    initTelemetryDb().catch(console.error);
    getHardwareFingerprint().catch(console.error);
  }, []);

  // Global F12 hotkey listener for mechanical sequence check
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.code === 'F12') {
        e.preventDefault();
        setF12Notification(
          isAr 
            ? '⚡ تم تشغيل اختبار التسلسل الفيزيائي F12: (تيربو 2300 uu/s -> قفز عمودي -> درفت وانجراف -> استعادة التوازن)'
            : '⚡ F12 Mechanical Sequence Triggered: (2300 uu/s Boost -> Liftoff -> Drift -> Ground Recovery)'
        );
        setTimeout(() => setF12Notification(null), 4000);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAr]);

  const handleUpdateProfile = (updated: GameProfile) => {
    const oldProf = gameProfiles.find(p => p.id === updated.id);
    setGameProfiles(gameProfiles.map((p) => (p.id === updated.id ? updated : p)));
    recordAuditEntry({
      section: 'profiles',
      sectionNameAr: 'التهيئة وملفات اللعبة',
      sectionNameEn: 'Profiles & Configurations',
      paramKey: `profile_${updated.id}`,
      paramLabelAr: `بروفايل: ${updated.nameAr || updated.name}`,
      paramLabelEn: `Profile: ${updated.name}`,
      oldValue: oldProf?.tier || 'Custom',
      newValue: updated.tier,
      changeType: 'param_tune'
    });
  };

  const handleAddNewProfile = (newProf: GameProfile) => {
    setGameProfiles([...gameProfiles, newProf]);
    setActiveProfileId(newProf.id);
    recordAuditEntry({
      section: 'profiles',
      sectionNameAr: 'التهيئة وملفات اللعبة',
      sectionNameEn: 'Profiles & Configurations',
      paramKey: `profile_${newProf.id}`,
      paramLabelAr: `إنشاء بروفايل: ${newProf.nameAr || newProf.name}`,
      paramLabelEn: `Create Profile: ${newProf.name}`,
      oldValue: 'None',
      newValue: newProf.tier,
      changeType: 'preset_apply'
    });
  };

  const handleDeleteProfile = (id: string) => {
    const target = gameProfiles.find(p => p.id === id);
    setGameProfiles(gameProfiles.filter((p) => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId('my_unified_profile');
    }
    if (target) {
      recordAuditEntry({
        section: 'profiles',
        sectionNameAr: 'التهيئة وملفات اللعبة',
        sectionNameEn: 'Profiles & Configurations',
        paramKey: `profile_${target.id}`,
        paramLabelAr: `حذف بروفايل: ${target.nameAr || target.name}`,
        paramLabelEn: `Delete Profile: ${target.name}`,
        oldValue: target.name,
        newValue: 'Deleted',
        changeType: 'preset_apply'
      });
    }
  };

  const handleImportProfiles = (importedProfiles: GameProfile[]) => {
    const existingMap = new Map(gameProfiles.map((p) => [p.id, p]));
    importedProfiles.forEach((p) => existingMap.set(p.id, p));
    const merged = Array.from(existingMap.values());
    setGameProfiles(merged);
    if (importedProfiles.length > 0) {
      setActiveProfileId(importedProfiles[0].id);
      recordAuditEntry({
        section: 'profiles',
        sectionNameAr: 'التهيئة وملفات اللعبة',
        sectionNameEn: 'Profiles & Configurations',
        paramKey: 'batch_import',
        paramLabelAr: 'استيراد جماعي للملفات',
        paramLabelEn: 'Batch Profile Import',
        oldValue: `${gameProfiles.length} profiles`,
        newValue: `${merged.length} profiles`,
        changeType: 'preset_apply'
      });
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#090d16] text-slate-200 carbon-grid selection:bg-cyan-500 selection:text-slate-950"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        onOpenDeveloperHub={() => setShowDevHub(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* F12 Global Sequence Trigger Notification */}
        {f12Notification && (
          <div className="bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/20 border-2 border-amber-500/60 rounded-xl p-3.5 text-center text-sm font-bold text-amber-300 animate-pulse flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{f12Notification}</span>
          </div>
        )}

        {/* Quick Status / Engine Telemetry Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">FNPRO-MASTER-ENGINE v4.2.0</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-400 font-semibold">{isAr ? 'محرك تيك 1000Hz أصيل' : '1000Hz DIRECTINPUT ENGINE'}</span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-400 font-semibold">Tauri v2 + Rust MSVC</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-semibold">G-HUB UUID + SQLite WAL</span>
              <span className="text-slate-500">·</span>
              <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                ⚡ 2200 - 2300 uu/s Supersonic Cap
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px] font-bold">{isAr ? 'البروفايل الحركي:' : 'Profile:'}</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {gameProfiles.find(p => p.id === activeProfileId)?.name || 'FNPro Master Profile'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px] font-bold">{isAr ? 'مفتاح الكاميرا:' : 'Camera:'}</span>
              <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                SPACE (Ball Cam)
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px] font-bold">{isAr ? 'الاستجابة:' : 'Linearity:'}</span>
              <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                Exp {physicsConfig.curveExponent} · Deadzone {physicsConfig.internalDeadzone}
              </span>
            </div>
          </div>
        </div>

        {/* Unified Master Engine Views */}
        <div className="transition-all duration-200">
          {(activeTab === 'classic_pro' || 
            activeTab === 'physics' || 
            activeTab === 'layer0' || 
            activeTab === 'unified_radar' || 
            activeTab === 'streamer_overlay' || 
            activeTab === 'mechanics' || 
            activeTab === 'macros' || 
            activeTab === 'replay_analyzer' || 
            activeTab === 'history_audit' || 
            activeTab === 'cpp_lua_studio') && (
            <ClassicProEngine
              config={physicsConfig}
              onChangeConfig={setPhysicsConfig}
              keybindings={keybindings}
              onChangeKeybindings={setKeybindings}
              macroTimings={macroTimings}
              onChangeTimings={setMacroTimings}
              initialBranch={
                activeTab === 'layer0' || activeTab === 'macros'
                  ? 'keyboard_macros'
                  : activeTab === 'unified_radar' || activeTab === 'streamer_overlay' || activeTab === 'mechanics'
                  ? 'radar_codex'
                  : activeTab === 'cpp_lua_studio'
                  ? 'cpp_lua_studio'
                  : activeTab === 'replay_analyzer'
                  ? 'replay_ai'
                  : activeTab === 'history_audit'
                  ? 'audit_trail'
                  : undefined
              }
              language={language}
              onDispatchToast={(msg) => {
                setF12Notification(msg);
                setTimeout(() => setF12Notification(null), 3500);
              }}
            />
          )}

          {activeTab === 'unreal_symmetric' && (
            <UnrealSymmetricEngine
              config={physicsConfig}
              onChangeConfig={setPhysicsConfig}
              language={language}
              onDispatchToast={(msg) => {
                setF12Notification(msg);
                setTimeout(() => setF12Notification(null), 3500);
              }}
            />
          )}

          {activeTab === 'ballchasing_cloud' && (
            <BallchasingCloudHub
              language={language}
            />
          )}

          {(activeTab === 'profiles' || activeTab === 'gaming_profiles') && (
            <TauriInputProfileManager
              profiles={gameProfiles}
              activeProfileId={activeProfileId}
              onSelectProfile={setActiveProfileId}
              onUpdateProfile={handleUpdateProfile}
              onAddNewProfile={handleAddNewProfile}
              onDeleteProfile={handleDeleteProfile}
              onImportProfiles={handleImportProfiles}
              onRestorePhysicsConfig={setPhysicsConfig}
              onRestoreKeybindings={setKeybindings}
              physicsConfig={physicsConfig}
              keybindings={keybindings}
              language={language}
            />
          )}

          {activeTab === 'liquipedia' && (
            <LiquipediaSyncPanel
              physicsConfig={physicsConfig}
              onApplyPhysicsConfig={setPhysicsConfig}
              language={language}
            />
          )}
        </div>

        {/* Native Desktop Systems Footer */}
        <footer className="pt-8 pb-4 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-mono text-[11px]">
            FNPro Master Engine v4.2.0 · Windows 11 Native Architecture (Tauri v2 + Rust MSVC)
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>DirectInput 1000Hz Hook</span>
            <span>·</span>
            <span>G-HUB UUID Scripts</span>
            <span>·</span>
            <span>SQLite WAL Telemetry</span>
            <span>·</span>
            <span>Ballchasing REST API</span>
          </div>
        </footer>

      </main>

      {/* Admin & Dev Suite Source Exporter & System Restore Modal */}
      <AdminExportModal
        isOpen={showDevHub}
        onClose={() => setShowDevHub(false)}
        language={language}
        profiles={gameProfiles}
        physicsConfig={physicsConfig}
        keybindings={keybindings}
        activeProfileId={activeProfileId}
        onRestorePhysicsConfig={setPhysicsConfig}
        onRestoreKeybindings={setKeybindings}
        onRestoreProfiles={setGameProfiles}
      />

      {/* Standalone Package Download Modal */}
      {showDownloadModal && (
        <StandalonePackageDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          physicsConfig={physicsConfig}
          keybindings={keybindings}
          timings={macroTimings}
          language={language}
        />
      )}
    </div>
  );
}
