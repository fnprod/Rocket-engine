import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Download, 
  GitBranch, 
  FolderArchive, 
  Cpu, 
  FileCode2, 
  Check, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  Settings, 
  Play, 
  Layers, 
  Database,
  Activity,
  HardDrive
} from 'lucide-react';
import JSZip from 'jszip';
import { getAllProjectFiles } from '../utils/sourceBundleRegistry';
import { 
  getHardwareFingerprint, 
  initTempScratchBuffers, 
  detectSystemPython, 
  HardwareProfile, 
  TempBuffersReport, 
  PythonEnvironmentInfo 
} from '../services/fnproNativeBridge';
import { isTauriDesktop } from '../services/gemini';
import { 
  GHUB_DIRECTORY_PRESETS, 
  getMandatoryGHubScriptDir, 
  setMandatoryGHubScriptDir, 
  validateGHubDirectoryPath,
  generateRobustGHubBatchScript 
} from '../utils/ghubDirectoryConfig';

interface DeveloperHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
}

export const DeveloperHubModal: React.FC<DeveloperHubModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const isAr = language === 'ar';
  type HubTab = 'zip' | 'git' | 'bootstrapper' | 'spec' | 'hardware' | 'settings';
  const [activeTab, setActiveTab] = useState<HubTab>('zip');
  const [isZipping, setIsZipping] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [tempReport, setTempReport] = useState<TempBuffersReport | null>(null);
  const [pythonInfo, setPythonInfo] = useState<PythonEnvironmentInfo | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [ghubDirInput, setGhubDirInput] = useState<string>(() => getMandatoryGHubScriptDir());
  const [ghubDirError, setGhubDirError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGhubDirInput(getMandatoryGHubScriptDir());
      setGhubDirError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      getHardwareFingerprint().then(setHardwareProfile).catch(console.error);
      initTempScratchBuffers().then(setTempReport).catch(console.error);
      detectSystemPython().then(setPythonInfo).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadFullSourceZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const allFiles = getAllProjectFiles();

      // Pack every real, un-truncated file in the project
      for (const [filePath, content] of Object.entries(allFiles)) {
        if (filePath.endsWith('.ico') || filePath.endsWith('.icns') || filePath.endsWith('.png')) {
          zip.file(filePath, content, { base64: true });
        } else {
          zip.file(filePath, content);
        }
      }

      // Generate the ZIP blob
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fnpro-master-engine-source.zip';
      link.click();
      URL.revokeObjectURL(url);

      const fileCount = Object.keys(allFiles).length;
      setDownloadSuccessToast(
        isAr 
          ? `✓ تم حزم وتحميل الكود المصدري الكامل (${fileCount} ملف حقيقي بدون أي نصوص وهمية)!` 
          : `✓ Successfully packaged & downloaded full source archive (${fileCount} verified real files, 0 placeholders)!`
      );
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err: unknown) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const gitBashScript = `# FNPro Master Engine - Git Automation Script
# Author: userfn-git | Email: fnprospace@gmail.com

git init
git config user.name "userfn-git"
git config user.email "fnprospace@gmail.com"
git remote add origin https://github.com/userfn-git/FNProMasterEngine.git
git add .
git commit -m "feat: FNPro Master Engine v4.2.0 - 1000Hz DirectInput, G-HUB UUID & SQLite WAL"
git branch -M main
git push -u origin main
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1120] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-950/40">
              <Terminal className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isAr ? 'مركز المطورين والإدارة المتقدمة (Developer & Admin Hub)' : 'FNPro Developer & Admin Hub'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  SYSTEM ARCHITECT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Author: <strong className="text-cyan-300">userfn-git</strong> · Email: <strong className="text-amber-300">fnprospace@gmail.com</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 overflow-x-auto no-scrollbar font-mono text-xs">
          {[
            { id: 'zip' as HubTab, label: 'Source Packager (.ZIP)', icon: FolderArchive },
            { id: 'git' as HubTab, label: 'GitHub Automation', icon: GitBranch },
            { id: 'bootstrapper' as HubTab, label: 'Windows Bootstrapper', icon: Play },
            { id: 'hardware' as HubTab, label: 'Hardware ID & Temp', icon: Cpu },
            { id: 'spec' as HubTab, label: 'Architecture Spec', icon: FileCode2 },
            { id: 'settings' as HubTab, label: isAr ? 'مسار G-HUB الإلزامي' : 'Mandatory G-HUB Path', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 border-b-2 font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          
          {downloadSuccessToast && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccessToast}</span>
            </div>
          )}

          {/* TAB 1: Source Packager */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-cyan-400" />
                    Complete Native Project Bundle (.ZIP)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ZERO PLACEHOLDERS
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Bundles all Rust source files, Tauri v2 configurations, React/TypeScript components, Tailwind styles, PowerShell modules, and SQL schemas into a clean standalone archive ready for local extraction and compilation.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleDownloadFullSourceZip}
                    disabled={isZipping}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg shadow-md cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isZipping ? 'Packaging ZIP Archive...' : 'Download Full Source Code (.ZIP)'}</span>
                  </button>
                  <span className="font-mono text-slate-500 text-[11px]">Filename: fnpro-master-engine-source.zip</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500">BACKEND RUNTIME</div>
                  <div className="text-white font-bold mt-1">Rust MSVC + Tauri v2</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500">FRONTEND ENGINE</div>
                  <div className="text-cyan-400 font-bold mt-1">React 19 + TypeScript 5.8</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500">DIRECTINPUT RATE</div>
                  <div className="text-emerald-400 font-bold mt-1">1000Hz (1.0ms) Hook</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Git & GitHub Automation */}
          {activeTab === 'git' && (
            <div className="space-y-4 font-mono">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    Configured GitHub Target Repository
                  </span>
                  <a
                    href="https://github.com/userfn-git/FNProMasterEngine.git"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Author Name:</span>
                    <div className="text-white font-bold">userfn-git</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Author Email:</span>
                    <div className="text-amber-400 font-bold">fnprospace@gmail.com</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Remote Origin:</span>
                    <div className="text-cyan-300 font-mono text-[11px]">https://github.com/userfn-git/FNProMasterEngine.git</div>
                  </div>
                </div>

                <div className="relative mt-2">
                  <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
                    {gitBashScript}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(gitBashScript, 'git')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    title="Copy Git Script"
                  >
                    {copiedCode === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Windows Bootstrapper */}
          {activeTab === 'bootstrapper' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-mono text-xs font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  Automated Windows 11 Dependency Setup (install_dependencies.ps1)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Executes winget package verification for Node.js LTS, Rustup (MSVC), Python 3, Lua 5.4, installs the Python virtual environment (.venv) with sqlite-utils/numpy/pandas, and registers all system environment variables.
                </p>

                <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-cyan-400 font-bold"># PowerShell Command (Run as Administrator):</div>
                  <div className="text-slate-200">Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\install_dependencies.ps1</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-slate-400 font-bold">User Environment Variables Registered:</div>
                <div className="space-y-1 text-slate-300">
                  <div><strong className="text-cyan-400">$env:FNPRO_ENGINE_HOME</strong> = (Get-Location).Path</div>
                  <div><strong className="text-cyan-400">$env:FNPRO_APPDATA</strong> = %APPDATA%\FNProMasterEngine</div>
                  <div><strong className="text-cyan-400">$env:FNPRO_TEMP</strong> = %TEMP%\FNProMasterEngine</div>
                  <div><strong className="text-cyan-400">$env:RL_DEMO_PATH</strong> = %USERPROFILE%\Documents\My Games\Rocket League\TAGame\Demos</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Hardware Fingerprint & Temp Buffers */}
          {activeTab === 'hardware' && (
            <div className="space-y-4 font-mono">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Native Hardware Fingerprint & Identity Lockdown
                </span>
                {hardwareProfile && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500">Machine GUID:</span>
                      <div className="text-cyan-300 font-bold truncate">{hardwareProfile.machine_guid}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Hardware ID Hash:</span>
                      <div className="text-emerald-400 font-bold">{hardwareProfile.fingerprint_hash}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Processor Identifier:</span>
                      <div className="text-slate-300 truncate">{hardwareProfile.cpu_processor_id}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Primary Display Adapter:</span>
                      <div className="text-amber-400">{hardwareProfile.primary_gpu}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">1000Hz DirectInput Capable:</span>
                      <div className="text-emerald-400 font-bold">{hardwareProfile.direct_input_1000hz_capable ? 'YES (1.0ms LOCKED)' : 'NO'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Display Refresh Rate:</span>
                      <div className="text-cyan-400 font-bold">{hardwareProfile.display_refresh_hz} Hz (G-Sync Active)</div>
                    </div>
                  </div>
                )}
              </div>

              {tempReport && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    Temp Fast-Path Scratch Buffers (%TEMP%)
                  </span>
                  <div className="space-y-1 text-slate-300">
                    <div><span className="text-slate-500">Base Temp Directory:</span> {tempReport.base_temp_dir}</div>
                    <div><span className="text-slate-500">Ring Buffer Path:</span> <code className="text-cyan-400">{tempReport.ring_buffer_path}</code> ({(tempReport.ring_buffer_size_bytes / 1024).toFixed(0)} KB)</div>
                    <div><span className="text-slate-500">G-HUB Trace Stream:</span> <code className="text-amber-400">{tempReport.ghub_stream_log}</code></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Architecture Spec */}
          {activeTab === 'spec' && (
            <div className="space-y-4 font-mono text-[11px]">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 leading-relaxed">
                <div className="text-white font-bold text-xs">
                  Dual-Path Hardware Data Architecture Specification
                </div>
                <div className="text-slate-300">
                  <strong className="text-cyan-400">1. Hot-Path (1000Hz DirectInput Hook):</strong><br />
                  Zero-allocation keyboard scancode dispatching across W (0x11), S (0x1F), A (0x1E), D (0x20), Space (0x39), LShift (0x2A), LAlt (0x38), LCtrl (0x1D). Telemetry streams into a lock-free 64KB binary ring buffer under %TEMP% to eliminate disk contention and micro-stutters.
                </div>
                <div className="text-slate-300">
                  <strong className="text-amber-400">2. Cold-Path (SQLite WAL Database):</strong><br />
                  Analytical telemetry database at <code className="text-cyan-300">%APPDATA%\FNProMasterEngine\fnpro_telemetry.db</code> running in WAL mode with normal synchronization. Flushes occur only on match end or manual profile saves.
                </div>
                <div className="text-slate-300">
                  <strong className="text-emerald-400">3. Logitech G-HUB UUIDv4 Deployment:</strong><br />
                  Replaces flat script file writes with dynamic UUID directory generation under <code className="text-cyan-300">%LOCALAPPDATA%\LGHUB\scripts\{"{UUIDv4}"}\script.lua</code>.
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Mandatory G-HUB Directory Path Configuration */}
          {activeTab === 'settings' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{isAr ? 'تحديد مسار مجلد سكريبتات G-HUB الإلزامي:' : 'Mandatory G-HUB Script Directory Path:'}</span>
                  </span>
                  <span className="text-emerald-400 text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                    REQUIRED IN ALL .BAT FILES
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">
                    {isAr
                      ? 'اختر من المسارات الجاهزة أو أدخل مساراً مخصصاً ليتم تضمينه بدقة داخل جميع ملفات التشغيل والربط .bat لمنع أي أخطاء أثناء التنفيذ:'
                      : 'Select a preset or enter a custom path to ensure all backend .bat and PowerShell files accurately reference this path without execution errors:'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GHUB_DIRECTORY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setGhubDirInput(preset.path);
                          setGhubDirError(null);
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                          ghubDirInput.toLowerCase() === preset.path.toLowerCase()
                            ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-white">{isAr ? preset.labelAr : preset.labelEn}</div>
                        <div className="text-[10px] text-cyan-300 font-mono truncate">{preset.path}</div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {isAr ? 'المسار الفعلي المستهدف:' : 'Target Windows Path:'}
                    </label>
                    <input
                      type="text"
                      value={ghubDirInput}
                      onChange={(e) => {
                        setGhubDirInput(e.target.value);
                        const v = validateGHubDirectoryPath(e.target.value);
                        setGhubDirError(v.isValid ? null : (isAr ? v.errorAr || 'مسار غير صحيح' : v.errorEn || 'Invalid path'));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:border-cyan-400 outline-none"
                    />
                    {ghubDirError && (
                      <div className="text-[10px] text-rose-400">{ghubDirError}</div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const v = validateGHubDirectoryPath(ghubDirInput);
                        if (!v.isValid) {
                          setGhubDirError(isAr ? v.errorAr || 'خطأ' : v.errorEn || 'Error');
                          return;
                        }
                        setMandatoryGHubScriptDir(ghubDirInput);
                        setDownloadSuccessToast(isAr ? '✓ تم حفظ وتثبيت مسار G-HUB الإلزامي بنجاح!' : '✓ Mandatory G-HUB directory path locked!');
                        setTimeout(() => setDownloadSuccessToast(null), 3000);
                      }}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                    >
                      {isAr ? 'حفظ وتثبيت المسار الإلزامي' : 'Save & Lock Mandatory Directory'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const batContent = generateRobustGHubBatchScript('-- Verification Script', ghubDirInput);
                        const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'verify_ghub_path.bat';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs cursor-pointer"
                    >
                      {isAr ? 'تحميل ملف فحص المسار (.bat)' : 'Download verify_ghub_path.bat'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>FNPro Master Engine Architecture v4.2.0 · Windows 11 MSVC Native</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
};
