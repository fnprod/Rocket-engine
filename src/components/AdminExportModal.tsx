import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { getAllProjectFiles } from '../utils/sourceBundleRegistry';
import { Language, GameProfile, PhysicsConfig, KeyBinding } from '../types/engine';
import { 
  VersionSnapshot, 
  createVersionSnapshot, 
  loadSnapshotsFromStorage, 
  saveSnapshotsToStorage,
  exportSnapshotsAsJson,
  validateSnapshotIntegrity
} from '../utils/versionSnapshotManager';
import { 
  X, 
  Download, 
  CheckCircle2, 
  FolderArchive, 
  FileCode, 
  Terminal, 
  ShieldCheck, 
  Copy, 
  Check, 
  Cpu, 
  HardDrive, 
  BookOpen, 
  GitBranch,
  Layers,
  Sparkles,
  Bookmark,
  Camera,
  History,
  RotateCcw,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Clock,
  Settings
} from 'lucide-react';

interface AdminExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  profiles?: GameProfile[];
  physicsConfig?: PhysicsConfig;
  keybindings?: KeyBinding[];
  activeProfileId?: string;
  onRestorePhysicsConfig?: (config: PhysicsConfig) => void;
  onRestoreKeybindings?: (bindings: KeyBinding[]) => void;
  onRestoreProfiles?: (profiles: GameProfile[]) => void;
}

export const AdminExportModal: React.FC<AdminExportModalProps> = ({
  isOpen,
  onClose,
  language,
  profiles = [],
  physicsConfig,
  keybindings = [],
  activeProfileId = '',
  onRestorePhysicsConfig,
  onRestoreKeybindings,
  onRestoreProfiles,
}) => {
  const isAr = language === 'ar';
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zip_exporter' | 'system_snapshots' | 'bootstrapper' | 'powershell_psm1' | 'git_workflow' | 'file_manifest'>('zip_exporter');

  // System Restore Points & Snapshots state
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>(() => loadSnapshotsFromStorage());
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSnapName, setNewSnapName] = useState<string>('');
  const [newSnapDesc, setNewSnapDesc] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');

  // Load all authentic project files
  const projectFiles = useMemo(() => {
    return getAllProjectFiles();
  }, []);

  const fileEntries = useMemo(() => {
    return Object.entries(projectFiles).sort(([a], [b]) => a.localeCompare(b));
  }, [projectFiles]);

  const totalBytes = useMemo(() => {
    return fileEntries.reduce((acc, [_, content]) => acc + content.length, 0);
  }, [fileEntries]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleDownloadFullZip = async () => {
    setIsZipping(true);
    setZipProgress(10);
    try {
      const zip = new JSZip();

      // Add every single real production file into the archive
      for (const [relativePath, content] of fileEntries) {
        if (relativePath.endsWith('.ico') || relativePath.endsWith('.icns') || relativePath.endsWith('.png')) {
          zip.file(relativePath, content, { base64: true });
        } else {
          zip.file(relativePath, content);
        }
      }

      setZipProgress(50);

      // Generate binary ZIP blob with compression
      const blob = await zip.generateAsync(
        { 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          setZipProgress(Math.round(50 + metadata.percent * 0.5));
        }
      );

      setZipProgress(100);

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fnpro-master-engine-source.zip';
      link.click();
      URL.revokeObjectURL(url);

      setDownloadSuccessToast(
        isAr 
          ? `✓ تم تحميل الحزمة الكاملة (${fileEntries.length} ملفات · ${(totalBytes / 1024).toFixed(1)} KB) بنجاح!` 
          : `✓ Successfully packaged & downloaded fnpro-master-engine-source.zip (${fileEntries.length} files · ${(totalBytes / 1024).toFixed(1)} KB)`
      );
      setTimeout(() => setDownloadSuccessToast(null), 4500);
    } catch (err: unknown) {
      console.error('ZIP compilation error:', err);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  const bootstrapperScript = projectFiles['install_dependencies.ps1'] || '';
  const psm1Script = projectFiles['FNProEngine.psm1'] || '';

  // SNAPSHOT MANAGEMENT HANDLERS
  const handleCreateSnapshot = () => {
    const name = newSnapName.trim() || `Dev Checkpoint (${new Date().toLocaleTimeString()})`;
    const desc = newSnapDesc.trim() || (isAr ? 'نقطة استعادة وتطوير يدوية قبل التعديلات' : 'Manual dev checkpoint');
    
    if (!physicsConfig) return;
    const snap = createVersionSnapshot(
      name,
      desc,
      profiles,
      activeProfileId,
      physicsConfig,
      keybindings,
      false
    );

    const updated = [snap, ...snapshots];
    setSnapshots(updated);
    saveSnapshotsToStorage(updated);
    setShowCreateModal(false);
    setNewSnapName('');
    setNewSnapDesc('');
    setDownloadSuccessToast(isAr ? `✓ تم إنشاء نقطة الاستعادة "${snap.name}" بنجاح!` : `✓ Restore point "${snap.name}" created!`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  const handleRestoreSnapshot = (snap: VersionSnapshot) => {
    if (onRestorePhysicsConfig && snap.physicsConfig) {
      onRestorePhysicsConfig(snap.physicsConfig);
    }
    if (onRestoreKeybindings && snap.keybindings) {
      onRestoreKeybindings(snap.keybindings);
    }
    if (onRestoreProfiles && snap.profiles && snap.profiles.length > 0) {
      onRestoreProfiles(snap.profiles);
    }
    setDownloadSuccessToast(
      isAr 
        ? `✓ تم استعادة إعدادات نقطة الاستعادة "${snap.name}" بنجاح وتطبيقها على المحرك!` 
        : `✓ Restored configuration from snapshot "${snap.name}" successfully!`
    );
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    saveSnapshotsToStorage(updated);
  };

  const handleExportSnapshots = () => {
    const jsonStr = exportSnapshotsAsJson(snapshots);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fnpro_system_restore_points_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccessToast(isAr ? '✓ تم تصدير كافة نقاط الاستعادة كملف JSON بنجاح!' : '✓ Exported all restore points to JSON!');
    setTimeout(() => setDownloadSuccessToast(null), 3000);
  };

  const handleImportSnapshots = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const valid = list.filter(validateSnapshotIntegrity);
      if (valid.length === 0) {
        alert(isAr ? 'خطأ: لم يتم العثور على نقاط استعادة صالحة في ملف JSON.' : 'Error: No valid restore points found in JSON.');
        return;
      }
      const merged = [...valid, ...snapshots.filter(s => !valid.some(v => v.id === s.id))];
      setSnapshots(merged);
      saveSnapshotsToStorage(merged);
      setShowImportDialog(false);
      setImportJsonText('');
      setDownloadSuccessToast(isAr ? `✓ تم استيراد ${valid.length} نقطة استعادة بنجاح!` : `✓ Imported ${valid.length} restore points!`);
      setTimeout(() => setDownloadSuccessToast(null), 3500);
    } catch {
      alert(isAr ? 'خطأ في قراءة ملف JSON' : 'Invalid JSON content');
    }
  };

  const gitCommands = `# FNPro Master Engine - Git Automation Script
# Author: userfn-git | Email: fnprospace@gmail.com
# Repository: https://github.com/userfn-git/FNProMasterEngine.git

git init
git config user.name "userfn-git"
git config user.email "fnprospace@gmail.com"
git remote remove origin 2>$null
git remote add origin https://github.com/userfn-git/FNProMasterEngine.git
git add .
git commit -m "feat: FNPro Master Engine v4.2.0 - Complete Windows 11 Native Architecture"
git branch -M main
git push -u origin main
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="bg-[#0b1120] border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden font-sans"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isAr ? 'مركز تصدير الكود وإدارة نقاط الاستعادة' : 'FNPro Source Exporter & System Restore Hub'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded font-bold">
                  ZERO MOCKS · 100% PRODUCTION CODE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Author: <strong className="text-cyan-300">userfn-git</strong> · Email: <strong className="text-amber-300">fnprospace@gmail.com</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {downloadSuccessToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-3 text-center text-xs font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccessToast}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto no-scrollbar">
          {[
            { id: 'zip_exporter', label: isAr ? 'حزم وتحميل المشروع (.ZIP)' : 'Full Source Exporter (.ZIP)', icon: Download },
            { id: 'system_snapshots', label: isAr ? `نقاط استعادة وتطوير المحرك (${snapshots.length})` : `System Restore Points (${snapshots.length})`, icon: Bookmark },
            { id: 'file_manifest', label: isAr ? 'فهرس الملفات الحقيقية' : `Project Tree (${fileEntries.length} Files)`, icon: Layers },
            { id: 'bootstrapper', label: isAr ? 'مثبت وندوز 11 (install_dependencies.ps1)' : 'Windows Bootstrapper (.ps1)', icon: Terminal },
            { id: 'powershell_psm1', label: isAr ? 'موديول بنشمارك (FNProEngine.psm1)' : 'DirectInput Module (.psm1)', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: FULL SOURCE EXPORTER (.ZIP) */}
          {activeTab === 'zip_exporter' && (
            <div className="space-y-5">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? 'حزمة الكود المصدري الشاملة (Production Standalone Archive)' : 'Production Standalone Source Code Archive (.ZIP)'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr 
                        ? 'تجمع هذه الأداة كافة ملفات المشروع الحقيقية (بما فيها مجلد src بالكامل، واجهة React، ملفات Rust IPC في src-tauri، وموديولات PowerShell) بدون أي اختصار أو نصوص وهمية.'
                        : 'Bundles the authentic complete project tree (including full src/ directory, all React components, Rust IPC handlers in src-tauri, and PowerShell modules) with zero placeholders.'}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="text-cyan-300 font-bold">{fileEntries.length} Verified Files</div>
                    <div className="text-slate-500">{(totalBytes / 1024).toFixed(1)} KB Uncompressed</div>
                  </div>
                </div>

                {/* Progress bar during archiving */}
                {isZipping && (
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Packaging Source Files...</span>
                      <span className="text-cyan-400">{zipProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-150"
                        style={{ width: `${zipProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handleDownloadFullZip}
                    disabled={isZipping}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-950/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${isZipping ? 'animate-bounce' : ''}`} />
                    <span>{isZipping ? 'Generating Real ZIP...' : 'Download Full Source Code (.ZIP)'}</span>
                  </button>
                  <span className="text-xs font-mono text-slate-500">
                    Target: <code className="text-cyan-300">fnpro-master-engine-source.zip</code>
                  </span>
                </div>
              </div>

              {/* Verified Subsystems Architecture Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Root Environment</div>
                  <div className="text-white font-bold">Windows 11 MSVC Native</div>
                  <div className="text-slate-400 text-[11px]">Node.js LTS + Vite + Tailwind</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Backend Engine</div>
                  <div className="text-cyan-300 font-bold">Tauri v2 + Rust 2021</div>
                  <div className="text-slate-400 text-[11px]">1000Hz DirectInput + Boxcars</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Persistence & Vault</div>
                  <div className="text-amber-300 font-bold">%APPDATA% + %TEMP%</div>
                  <div className="text-slate-400 text-[11px]">SQLite WAL + Ring Buffer (64KB)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM RESTORE POINTS (نقاط استعادة وتطوير المحرك الشاملة) */}
          {activeTab === 'system_snapshots' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-emerald-400" />
                      <span>{isAr ? 'نقاط استعادة وتطوير المحرك الشاملة (System Restore Points)' : 'System Restore Points & Development Snapshots'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAr 
                        ? 'إدارة نقاط الاستعادة المعمارية للمحرك، التراجع الفوري لأي نقطة سابقة بنقرة واحدة، مع التصدير والاستيراد المستقل.' 
                        : 'System-wide development checkpoints, 1-click engine rollback, and offline backup bundles.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowCreateModal(!showCreateModal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition shadow-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'إنشاء نقطة استعادة' : 'New Checkpoint'}</span>
                    </button>

                    <button
                      onClick={handleExportSnapshots}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تصدير JSON' : 'Export JSON'}</span>
                    </button>

                    <button
                      onClick={() => setShowImportDialog(!showImportDialog)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'استيراد JSON' : 'Import JSON'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Create Modal Form */}
                {showCreateModal && (
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isAr ? 'التقاط نقطة استعادة جديدة من الحالة الحالية' : 'Capture Current Engine State Checkpoint'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={isAr ? 'اسم نقطة الاستعادة (مثلاً: قبل تعديل الدوران 1.50x)' : 'Snapshot name'}
                        value={newSnapName}
                        onChange={(e) => setNewSnapName(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
                      />
                      <input
                        type="text"
                        placeholder={isAr ? 'وصف النقطة أو الغرض منها' : 'Snapshot description'}
                        value={newSnapDesc}
                        onChange={(e) => setNewSnapDesc(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleCreateSnapshot}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow cursor-pointer"
                      >
                        {isAr ? 'حفظ النقطة الآن' : 'Save Checkpoint'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Import Form */}
                {showImportDialog && (
                  <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-2 animate-in fade-in">
                    <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'لصق أو استيراد كود نقاط الاستعادة JSON' : 'Paste or Import Snapshots JSON'}</span>
                    </div>
                    <textarea
                      rows={3}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder="Paste JSON array of snapshots here..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300 outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setImportJsonText(evt.target?.result as string || '');
                            reader.readAsText(file);
                          }
                        }}
                        className="text-xs text-slate-400"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowImportDialog(false)} className="px-3 py-1 text-xs text-slate-400">
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleImportSnapshots}
                          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          {isAr ? 'استيراد' : 'Import'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline List of Snapshots */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {snapshots.map((snap) => {
                    const d = new Date(snap.timestamp);
                    const dateFormatted = isNaN(d.getTime()) ? '--' : d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    const timeFormatted = isNaN(d.getTime()) ? '--' : d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <div
                        key={snap.id}
                        className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">{snap.name}</span>
                            {snap.isAutoSaved ? (
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded font-mono">
                                AUTO-SAVE
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold font-mono">
                                DEV-CHECKPOINT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{snap.description}</p>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{dateFormatted}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>{timeFormatted}</span>
                            </span>
                            <span className="text-cyan-400">DZ: {snap.physicsConfig.internalDeadzone}</span>
                            <span className="text-amber-400">EXP: {snap.physicsConfig.curveExponent}</span>
                            <span className="text-emerald-400">AERIAL: {snap.physicsConfig.aerialSense}x</span>
                            <span className="text-purple-400">GROUND: {snap.physicsConfig.groundSense}x</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreSnapshot(snap)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isAr ? 'استعادة فورية' : 'Revert State'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Delete Snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECT TREE MANIFEST */}
          {activeTab === 'file_manifest' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Verified Files Included in ZIP:</span>
                <span className="text-cyan-400 font-bold">{fileEntries.length} Total Files</span>
              </div>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 max-h-[50vh] overflow-y-auto space-y-1.5 divide-y divide-slate-900">
                {fileEntries.map(([path, content]) => (
                  <div key={path} className="flex items-center justify-between py-1 text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{path}</span>
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {(content.length / 1024).toFixed(1)} KB ({content.split('\n').length} lines)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WINDOWS BOOTSTRAPPER (.ps1) */}
          {activeTab === 'bootstrapper' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  File: <code className="text-cyan-300">install_dependencies.ps1</code> ({bootstrapperScript.split('\n').length} lines)
                </span>
                <button
                  onClick={() => copyToClipboard(bootstrapperScript, 'ps1')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  {copiedLabel === 'ps1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLabel === 'ps1' ? 'Copied Full Script!' : 'Copy Entire .ps1'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[50vh] leading-relaxed">
                {bootstrapperScript}
              </pre>
            </div>
          )}

          {/* TAB 4: POWERSHELL PSM1 BENCHMARK MODULE */}
          {activeTab === 'powershell_psm1' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  File: <code className="text-cyan-300">FNProEngine.psm1</code> ({psm1Script.split('\n').length} lines)
                </span>
                <button
                  onClick={() => copyToClipboard(psm1Script, 'psm1')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  {copiedLabel === 'psm1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLabel === 'psm1' ? 'Copied Full Module!' : 'Copy Entire .psm1'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[50vh] leading-relaxed">
                {psm1Script}
              </pre>
            </div>
          )}

          {/* TAB 5: GIT WORKFLOW */}
          {activeTab === 'git_workflow' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Target: <code className="text-cyan-300">https://github.com/userfn-git/FNProMasterEngine.git</code>
                </span>
                <button
                  onClick={() => copyToClipboard(gitCommands, 'git')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  {copiedLabel === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLabel === 'git' ? 'Copied Commands!' : 'Copy Git Commands'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-[50vh] leading-relaxed">
                {gitCommands}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>FNPro Master Engine v4.2.0 · Windows 11 MSVC Standalone Package</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
