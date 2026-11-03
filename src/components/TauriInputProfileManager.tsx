import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GameProfile, PhysicsConfig, KeyBinding, Language } from '../types/engine';
import { generateTAInputIni, generatePowerShellInstaller } from '../utils/iniGenerator';
import { 
  validateProfileSchema, 
  exportProfilesAsJson, 
  ProfileValidationResult,
  exportBatchBundleAsJson,
  validateBatchExportBundle,
  BatchValidationResult,
  BatchExportBundle
} from '../utils/profileSchemaValidator';
import { VersionSnapshot, loadSnapshotsFromStorage, saveSnapshotsToStorage, formatSnapshotDateTime } from '../utils/versionSnapshotManager';
export { formatSnapshotDateTime };
import { ReplayAnalyzer } from './ReplayAnalyzer';
import { LiveGameMonitor } from './LiveGameMonitor';
import { 
  Gamepad2, 
  Plus, 
  FileCode, 
  Copy, 
  Download, 
  Check, 
  FolderOpen, 
  Settings, 
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Terminal,
  Flame,
  Trophy,
  Zap,
  Play,
  FileSearch,
  Upload,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Clock,
  Package,
  Activity
} from 'lucide-react';

interface TauriInputProfileManagerProps {
  profiles: GameProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: GameProfile) => void;
  onAddNewProfile: (profile: GameProfile) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfiles?: (profiles: GameProfile[]) => void;
  onRestorePhysicsConfig?: (config: PhysicsConfig) => void;
  onRestoreKeybindings?: (bindings: KeyBinding[]) => void;
  physicsConfig: PhysicsConfig;
  keybindings: KeyBinding[];
  language: Language;
}

export const TauriInputProfileManager: React.FC<TauriInputProfileManagerProps> = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onAddNewProfile,
  onDeleteProfile,
  onImportProfiles,
  onRestorePhysicsConfig,
  onRestoreKeybindings,
  physicsConfig,
  keybindings,
  language,
}) => {
  const isAr = language === 'ar';
  const [subTab, setSubTab] = useState<'profiles' | 'telemetry_monitor' | 'replay_analyzer'>('profiles');
  const [copiedIni, setCopiedIni] = useState(false);
  const [copiedPS, setCopiedPS] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPowerShellModal, setShowPowerShellModal] = useState(false);


  // Export & Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importValidation, setImportValidation] = useState<ProfileValidationResult | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [copiedExportJson, setCopiedExportJson] = useState(false);
  const [copiedBatchJson, setCopiedBatchJson] = useState(false);
  const [batchSnapshotsToImport, setBatchSnapshotsToImport] = useState<VersionSnapshot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New profile state
  const [newGameName, setNewGameName] = useState('');
  const [newTier, setNewTier] = useState<GameProfile['tier']>('Competitive 1v1');
  const [newConfigPath, setNewConfigPath] = useState('%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Config\\TAInput.ini');

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const generatedIni = generateTAInputIni(activeProfile, physicsConfig, keybindings);
  const generatedPowerShell = generatePowerShellInstaller(activeProfile, generatedIni);

  const handleCopyIni = () => {
    navigator.clipboard.writeText(generatedIni);
    setCopiedIni(true);
    setTimeout(() => setCopiedIni(false), 2000);
  };

  const handleCopyPowerShell = () => {
    navigator.clipboard.writeText(generatedPowerShell);
    setCopiedPS(true);
    setTimeout(() => setCopiedPS(false), 2000);
  };

  const handleDownloadIni = () => {
    const blob = new Blob([generatedIni], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TAInput.ini';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPS1 = () => {
    const blob = new Blob([generatedPowerShell], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Install_RL_TAInput_${activeProfile.id}.ps1`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export profiles as clean JSON package
  const handleExportJson = () => {
    const jsonStr = exportProfilesAsJson(profiles, activeProfileId);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rocket_league_profiles_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyExportJson = () => {
    const jsonStr = exportProfilesAsJson(profiles, activeProfileId);
    navigator.clipboard.writeText(jsonStr);
    setCopiedExportJson(true);
    setTimeout(() => setCopiedExportJson(false), 2000);
  };

  const handleCopyBatchJson = () => {
    const currentSnapshots = loadSnapshotsFromStorage();
    const batchJson = exportBatchBundleAsJson(profiles, currentSnapshots, activeProfileId, physicsConfig);
    navigator.clipboard.writeText(batchJson);
    setCopiedBatchJson(true);
    setTimeout(() => setCopiedBatchJson(false), 2000);
  };

  // Process JSON input detecting either a BatchExportBundle or standard GameProfile(s)
  const processJsonInput = (content: string) => {
    setImportText(content);
    if (!content.trim()) {
      setImportValidation(null);
      setBatchSnapshotsToImport([]);
      return;
    }

    // Check if payload is a batch export bundle
    const batchRes = validateBatchExportBundle(content);
    if (batchRes.valid && (batchRes.snapshots.length > 0 || content.includes('master_engine_batch_export'))) {
      setBatchSnapshotsToImport(batchRes.snapshots);
      setImportValidation({
        valid: true,
        profiles: batchRes.profiles,
      });
      return;
    }

    // Fallback to standard profile schema validation
    setBatchSnapshotsToImport([]);
    const result = validateProfileSchema(content);
    setImportValidation(result);
  };

  // Handle file upload for JSON import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonInput(content);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle text area change for raw JSON import
  const handleTextChange = (text: string) => {
    processJsonInput(text);
  };

  // Commit valid imported profiles to state
  const handleCommitImport = () => {
    if (!importValidation || !importValidation.valid || importValidation.profiles.length === 0) {
      return;
    }

    if (onImportProfiles) {
      onImportProfiles(importValidation.profiles);
    } else {
      importValidation.profiles.forEach((p) => {
        const exists = profiles.some((existing) => existing.id === p.id);
        if (exists) {
          onUpdateProfile(p);
        } else {
          onAddNewProfile(p);
        }
      });
    }

    if (importValidation.profiles[0]) {
      onSelectProfile(importValidation.profiles[0].id);
    }

    // Merge batch snapshots if imported from a batch bundle into system snapshots store
    let snapshotsImportedCount = 0;
    if (batchSnapshotsToImport.length > 0) {
      const currentSnapshots = loadSnapshotsFromStorage();
      const existingIds = new Set(currentSnapshots.map((s) => s.id));
      const newSnapshots = batchSnapshotsToImport.filter((s) => !existingIds.has(s.id));
      if (newSnapshots.length > 0) {
        const mergedSnapshots = [...newSnapshots, ...currentSnapshots];
        saveSnapshotsToStorage(mergedSnapshots);
        snapshotsImportedCount = newSnapshots.length;
      }
    }

    setImportSuccessMsg(
      isAr
        ? snapshotsImportedCount > 0
          ? `تم استيراد الحزمة الشاملة: ${importValidation.profiles.length} بروفايل و ${snapshotsImportedCount} نسخة إصدار احتياطية بنجاح!`
          : `تم استيراد ودمج ${importValidation.profiles.length} بروفايل بنجاح!`
        : snapshotsImportedCount > 0
          ? `Successfully imported batch bundle: ${importValidation.profiles.length} profiles and ${snapshotsImportedCount} snapshots restored!`
          : `Successfully validated and merged ${importValidation.profiles.length} profile(s)!`
    );

    setTimeout(() => {
      setImportSuccessMsg(null);
      setShowImportModal(false);
      setImportText('');
      setImportValidation(null);
      setBatchSnapshotsToImport([]);
    }, 1800);
  };

  const handleLoadSampleBatchJson = () => {
    const currentSnapshots = loadSnapshotsFromStorage();
    const sampleBatchStr = exportBatchBundleAsJson(profiles, currentSnapshots, activeProfileId, physicsConfig);
    processJsonInput(sampleBatchStr);
  };

  const handleLoadSampleJson = () => {
    const sample = {
      app: 'RocketLeague_MasterEngine',
      version: '4.0.2',
      profiles: [
        {
          id: 'sample_rlcs_speedflip',
          name: 'RLCS Speedflip Pro Edition',
          nameAr: 'نسخة آر إل سي إس سبيد فليب الاحترافية',
          icon: 'trophy',
          tier: 'RLCS 3v3',
          configPath: '%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Config\\TAInput.ini',
          gameExePath: 'C:\\Program Files\\Epic Games\\rocketleague\\Binaries\\Win64\\RocketLeague.exe',
          launchProtocol: 'steam://rungameid/252950',
          description: 'Calibrated specifically for rapid kickoff cancellation and aerial recovery.',
          deadzoneOverride: 0.05,
          aerialSenseOverride: 1.30,
          customBindings: {
            YawAxis: 'MouseX',
            PitchAxis: 'MouseY',
            Boost: 'RightMouseButton',
            AirRollLeft: 'Q'
          }
        }
      ]
    };
    const sampleStr = JSON.stringify(sample, null, 2);
    processJsonInput(sampleStr);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) return;

    const id = `rl_profile_${Date.now()}`;
    const newProf: GameProfile = {
      id,
      name: newGameName.trim(),
      nameAr: newGameName.trim(),
      icon: 'trophy',
      tier: newTier,
      configPath: newConfigPath.trim(),
      gameExePath: 'C:\\Program Files\\Epic Games\\rocketleague\\Binaries\\Win64\\RocketLeague.exe',
      launchProtocol: 'steam://rungameid/252950',
      description: `Custom Rocket League esports profile calibrated for ${newTier}.`,
      deadzoneOverride: physicsConfig.internalDeadzone,
      aerialSenseOverride: physicsConfig.aerialSense,
      customBindings: {},
    };

    onAddNewProfile(newProf);
    setNewGameName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'بروفايلات روكيت ليج الاحترافية وتوليد TAInput.ini' : 'Rocket League Esports Profiles & TAInput.ini'}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{profiles.length} {isAr ? 'بروفايلات متاحة' : 'Profiles'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            {isAr
              ? 'إدارة بروفايلات الاحتراف لروكيت ليج وتوليد أوامر TAInput.ini ونشرها عبر سكريبتات PowerShell مباشرة على الجهاز المحلي.'
              : 'Manage competitive Rocket League configurations, calibrate deadzones, and deploy official TAInput.ini bindings.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            title={isAr ? 'تصدير كافة البروفايلات كملف JSON' : 'Export profiles as JSON backup file'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-900/50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'تصدير JSON' : 'Export JSON'}</span>
          </button>

          {/* Import JSON Button */}
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportText('');
              setImportValidation(null);
            }}
            title={isAr ? 'استيراد بروفايلات من ملف أو نص JSON والتحقق منها' : 'Import and validate profiles from JSON file or text'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-900/50 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'استيراد JSON' : 'Import JSON'}</span>
          </button>

          {/* PowerShell Deployer Button */}
          <button
            onClick={() => setShowPowerShellModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>PowerShell Deployer</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'إضافة بروفايل RL' : 'Add RL Profile'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation (Profiles & INI vs Replay Analyzer) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSubTab('profiles')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono whitespace-nowrap ${
            subTab === 'profiles'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>{isAr ? 'بروفايلات RLCS وتعديل TAInput.ini' : 'RLCS Profiles & TAInput.ini'}</span>
        </button>

        <button
          onClick={() => setSubTab('telemetry_monitor')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono whitespace-nowrap ${
            subTab === 'telemetry_monitor'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isAr ? 'مراقب DirectX والاتصال الحي' : 'DirectX & Telemetry Monitor'}</span>
        </button>

        <button
          onClick={() => setSubTab('replay_analyzer')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono whitespace-nowrap ${
            subTab === 'replay_analyzer'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>{isAr ? 'تحليل الريبلايات (.replay) والربط الدقيق' : 'Replay Analysis & TAInput Correlation'}</span>
        </button>
      </div>

      {/* SUBTAB: TELEMETRY & DIRECTX MONITOR */}
      {subTab === 'telemetry_monitor' && (
        <LiveGameMonitor
          physicsConfig={physicsConfig}
          language={language}
        />
      )}

      {/* SUBTAB 2: REPLAY ANALYZER */}
      {subTab === 'replay_analyzer' && (
        <ReplayAnalyzer
          physicsConfig={physicsConfig}
          keybindings={keybindings}
          language={language}
        />
      )}

      {/* SUBTAB 3: PURE ROCKET LEAGUE COMPETITIVE PROFILE CARDS */}
      {subTab === 'profiles' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {profiles.map((p) => {
          const isSelected = p.id === activeProfileId;
          return (
            <div
              key={p.id}
              onClick={() => onSelectProfile(p.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-950/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {p.icon === 'shield' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  {p.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                  {p.icon === 'trophy' && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                  {p.icon === 'zap' && <Zap className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{isAr ? p.nameAr : p.name}</span>
                </span>
                {isSelected && (
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="mt-2 text-[11px] font-mono text-cyan-400">
                Tier: <strong className="text-slate-200">{p.tier}</strong>
              </div>

              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
              
              <div className="mt-3 text-[10px] font-mono text-slate-500 truncate">
                Target: {p.configPath}
              </div>

              {p.id.startsWith('rl_profile_') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProfile(p.id);
                  }}
                  className="absolute bottom-2 right-2 p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Profile Configuration & Live INI Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Path & Overrides Editor */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              {isAr ? `تعديل مسار ملف روكيت ليج (${activeProfile.name})` : `Rocket League Config (${activeProfile.name})`}
            </span>
          </div>

          {/* Config File Path */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isAr ? 'مسار ملف TAInput.ini في ويندوز' : 'Target TAInput.ini Path'}</span>
              <span className="text-[10px] text-cyan-400 font-mono">Unreal Engine Config</span>
            </label>
            <input
              type="text"
              value={activeProfile.configPath}
              onChange={(e) => onUpdateProfile({ ...activeProfile, configPath: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-2 focus:border-cyan-400 outline-none"
            />
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'مسار ملف TAInput.ini الرسمي حيث تقرأ روكيت ليج توزيعات الأزرار والمنطقة الميتة.'
                : 'Default Rocket League directory on local disk where bindings are read.'}
            </p>
          </div>

          {/* Overrides: Deadzone & Aerial Sense */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {isAr ? 'المنطقة الميتة للبروفايل' : 'Profile Deadzone'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.25"
                value={activeProfile.deadzoneOverride}
                onChange={(e) => onUpdateProfile({ ...activeProfile, deadzoneOverride: parseFloat(e.target.value) || 0.05 })}
                className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-400 rounded-lg px-3 py-2 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {isAr ? 'حساسية الجو للبروفايل' : 'Aerial Sensitivity'}
              </label>
              <input
                type="number"
                step="0.05"
                min="0.80"
                max="2.50"
                value={activeProfile.aerialSenseOverride}
                onChange={(e) => onUpdateProfile({ ...activeProfile, aerialSenseOverride: parseFloat(e.target.value) || 1.50 })}
                className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-amber-400 rounded-lg px-3 py-2 outline-none"
              />
            </div>
          </div>



          {/* 1-Click PowerShell Direct Runner Card */}
          <div className="p-3 bg-gradient-to-br from-blue-950/40 to-slate-950 rounded-xl border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                {isAr ? 'أمر التثبيت السريع عبر PowerShell' : 'Quick PowerShell Direct Command'}
              </span>
              <button
                onClick={handleCopyPowerShell}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPS ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPS ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy')}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'انسخ هذا الأمر وشغله في نافذة PowerShell؛ يقوم تلقائياً بإنشاء نسخة احتياطية آمنة وكتابة الإعدادات بدون أي تعارض.'
                : 'Copies automated PowerShell script that creates a safe backup and writes TAInput.ini.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowPowerShellModal(true)}
                className="w-full py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isAr ? 'عرض وتنزيل سكريبت PowerShell (.ps1)' : 'Inspect & Download .ps1'}</span>
              </button>
            </div>
          </div>

          {/* Safety note card */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'تطبيق محلي قانوني وآمن 100%' : '100% Legal & Safe Configuration'}</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {isAr
                ? 'تعديل ملف TAInput.ini معتمد بالكامل في بطولات Psyonix و RLCS ولا يُعد تعديلاً على ملفات اللعبة التنفيذية.'
                : 'TAInput.ini editing is 100% compliant with Psyonix/RLCS esports guidelines. No game binaries are altered.'}
            </p>
          </div>

        </div>

        {/* Right: Live Syntax-Highlighted TAInput.ini Output */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white font-mono">
                TAInput.ini (Rocket League Esport)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyIni}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                {copiedIni ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIni ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ الملف' : 'Copy INI')}</span>
              </button>

              <button
                onClick={handleDownloadIni}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل TAInput.ini' : 'Download INI'}</span>
              </button>
            </div>
          </div>

          {/* INI Code Block */}
          <pre className="bg-[#070b14] p-4 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[380px] leading-relaxed">
            {generatedIni}
          </pre>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {isAr ? 'مضبوط خصيصاً لروكيت ليج: Space = Camera Switch، القفز والبوست في لوجيتك G.' : 'RLCS Tuned: Space = Ball Cam, G1 Boost, G2 Jump, G3 Rear Camera.'}
            </span>
            <span className="font-mono text-slate-400">
              {generatedIni.split('\n').length} lines
            </span>
          </div>

        </div>

      </div>

      </>
    )}



      {/* PowerShell Script Modal */}
      {showPowerShellModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مُثبت ملف TAInput.ini الآلي عبر PowerShell' : 'PowerShell Local Deployer (.ps1)'}
                </h3>
              </div>
              <button
                onClick={() => setShowPowerShellModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isAr
                ? 'يقوم هذا السكريبت بإنشاء مسار مجلد الإعدادات تلقائياً، وإنشاء نسخة احتياطية مؤرخة (Backup)، وحقن الإعدادات بدقة بدون أخطاء.'
                : 'This legal PowerShell script verifies the Rocket League directory, makes a timestamped backup, and injects TAInput.ini.'}
            </p>

            <pre className="p-3 bg-[#070b14] rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 max-h-72 overflow-x-auto leading-relaxed">
              {generatedPowerShell}
            </pre>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{isAr ? 'نسخة احتياطية تلقائية مفعلة' : 'Automated Backup Included'}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyPowerShell}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPS ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPS ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الأمر' : 'Copy Script')}</span>
                </button>

                <button
                  onClick={handleDownloadPS1}
                  className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل ملف .ps1' : 'Download .ps1'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Game Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                {isAr ? 'إضافة بروفايل روكيت ليج احترافي' : 'Add Rocket League Esport Profile'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isAr ? 'اسم البروفايل (مثل: RLCS Scrims / Aerial Focus)' : 'Profile Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RLCS Scrims / Aerial Focus"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isAr ? 'التصنيف' : 'Competitive Tier'}
                </label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
                >
                  <option value="Competitive 1v1">Competitive 1v1</option>
                  <option value="RLCS 3v3">RLCS 3v3 Tournament</option>
                  <option value="Freestyle Mechanics">Freestyle Mechanics</option>
                  <option value="Custom">Custom Scrim</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  {isAr ? 'إنشاء البروفايل' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Profiles JSON Modal (Schema Validated) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <FileJson className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'استيراد بروفايلات روكيت ليج (JSON Schema Validated)' : 'Import Rocket League Profiles (JSON Schema)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr 
                      ? 'التحقق الصارم من صحة الحقول (Deadzone، Aerial Sense، Tiers، Custom Bindings) قبل الدمج' 
                      : 'Strict schema verification for deadzone, aerial sensitivity, tiers, and custom bindings.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Success toast if merged */}
            {importSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Actions Bar: Upload File, Load Sample, Copy Current, Batch Options */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'رفع ملف .json من الجهاز' : 'Upload .json file'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'نموذج بروفايل RLCS' : 'Load Sample Profile'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleBatchJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-900/30 hover:bg-purple-800/50 text-purple-200 border border-purple-700/50 rounded-lg transition-colors cursor-pointer"
                title={isAr ? 'تحميل حزمة شاملة تجريبية تتضمن البروفايلات وسجل نقاط الاستعادة' : 'Load sample batch bundle containing profiles and snapshots'}
              >
                <Package className="w-3.5 h-3.5 text-purple-300" />
                <span>{isAr ? 'نموذج حزمة شاملة (Batch)' : 'Load Sample Batch'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBatchJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/50 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>{copiedBatchJson ? (isAr ? 'تم نسخ الحزمة!' : 'Copied Batch!') : (isAr ? 'نسخ الحزمة الشاملة' : 'Copy Batch JSON')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer ml-auto"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{copiedExportJson ? (isAr ? 'تم نسخ الـ JSON!' : 'Copied JSON!') : (isAr ? 'نسخ البروفايلات' : 'Copy Profiles JSON')}</span>
              </button>
            </div>

            {/* Textarea for Direct JSON Paste */}
            <div className="flex-1 flex flex-col min-h-0 space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'أو الصق كود الـ JSON هنا مباشرة:' : 'Or paste JSON schema directly:'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Accepts: BatchExportBundle | GameProfile | GameProfile[]</span>
              </label>
              <textarea
                value={importText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`{\n  "app": "RocketLeague_MasterEngine",\n  "bundleType": "master_engine_batch_export",\n  "profiles": [...],\n  "snapshots": [...]\n}`}
                className="w-full flex-1 min-h-[130px] max-h-[200px] bg-slate-950 font-mono text-xs text-cyan-200 border border-slate-700 rounded-xl p-3 focus:border-cyan-400 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Validation Feedback Banner */}
            {importValidation && (
              <div className="space-y-2">
                {importValidation.valid ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {isAr
                            ? `مخطط صالح ومعتمد ✓ - تم التحقق من (${importValidation.profiles.length}) بروفايل بنجاح`
                            : `Valid & Verified Schema ✓ - Found ${importValidation.profiles.length} profile(s)`}
                        </span>
                      </div>
                      {batchSnapshotsToImport.length > 0 && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>+{batchSnapshotsToImport.length} {isAr ? 'نسخ استعادة' : 'Snapshots'}</span>
                        </span>
                      )}
                    </div>

                    {/* Previews of valid profiles */}
                    <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto pt-0.5">
                      {importValidation.profiles.map((p, idx) => (
                        <div
                          key={p.id + idx}
                          className="bg-slate-900 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 flex items-center gap-2"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-white">{isAr ? p.nameAr || p.name : p.name}</span>
                          <span className="text-cyan-400 font-mono text-[10px]">[{p.tier}]</span>
                          <span className="text-slate-400 text-[10px]">DZ: {p.deadzoneOverride} | Aerial: {p.aerialSenseOverride}x</span>
                        </div>
                      ))}
                    </div>

                    {/* Batch Snapshots Detected Preview */}
                    {batchSnapshotsToImport.length > 0 && (
                      <div className="pt-2 border-t border-purple-500/30">
                        <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-semibold mb-1">
                          <Package className="w-3.5 h-3.5 text-purple-400" />
                          <span>{isAr ? 'نقاط الاستعادة المضمنة في الحزمة الشاملة:' : 'Version Snapshots included in Batch Bundle:'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                          {batchSnapshotsToImport.map((s, idx) => (
                            <div
                              key={s.id + idx}
                              className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-600/40 text-[10px] text-purple-200 flex items-center gap-1 font-mono"
                            >
                              <Clock className="w-2.5 h-2.5 text-purple-400" />
                              <span className="font-sans font-medium">{s.name}</span>
                              <span className="text-slate-400">({s.formattedTime || new Date(s.timestamp).toLocaleTimeString()})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-red-200">
                        {isAr ? 'فشل التحقق من صحة المخطط (Schema Validation Failed):' : 'Schema Validation Failed:'}
                      </span>
                      <p className="mt-0.5 text-red-300 font-mono text-[11px]">
                        {isAr ? importValidation.errorAr || importValidation.error : importValidation.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div className="text-[11px] text-slate-500">
                {isAr
                  ? 'يتم الحفاظ على البروفايل الرئيسي الموحد مع دمج البروفايلات الجديدة.'
                  : 'Master unified profile is protected; new profiles will be merged safely.'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportValidation(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={!importValidation || !importValidation.valid || importValidation.profiles.length === 0}
                  onClick={handleCommitImport}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    importValidation?.valid
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `دمج وحفظ في النظام (${importValidation?.valid ? importValidation.profiles.length : 0})`
                      : `Merge & Save Profiles (${importValidation?.valid ? importValidation.profiles.length : 0})`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
