import React, { useState, useEffect } from 'react';
import { Language } from '../types/engine';
import { 
  Settings2, 
  FolderLock, 
  CheckCircle2, 
  AlertCircle, 
  FolderCheck, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  FileCode2,
  ExternalLink,
  Save,
  Radio
} from 'lucide-react';
import { 
  GHUB_DIRECTORY_PRESETS, 
  DEFAULT_GHUB_SCRIPTS_DIR, 
  getMandatoryGHubScriptDir, 
  setMandatoryGHubScriptDir, 
  validateGHubDirectoryPath,
  generateRobustGHubBatchScript
} from '../utils/ghubDirectoryConfig';

interface EngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onDispatchToast?: (msg: string) => void;
}

export const EngineSettingsModal: React.FC<EngineSettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onDispatchToast
}) => {
  const isAr = language === 'ar';

  const [currentPath, setCurrentPath] = useState<string>(() => getMandatoryGHubScriptDir());
  const [inputPath, setInputPath] = useState<string>(() => getMandatoryGHubScriptDir());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default_localappdata');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const active = getMandatoryGHubScriptDir();
      setCurrentPath(active);
      setInputPath(active);
      const matched = GHUB_DIRECTORY_PRESETS.find(p => p.path.toLowerCase() === active.toLowerCase());
      setSelectedPresetId(matched ? matched.id : 'custom');
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Preset Selection
  const handleSelectPreset = (preset: typeof GHUB_DIRECTORY_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setInputPath(preset.path);
    setValidationError(null);
  };

  // Handle Manual Input Change
  const handleInputChange = (val: string) => {
    setInputPath(val);
    setSelectedPresetId('custom');
    const validation = validateGHubDirectoryPath(val);
    if (!validation.isValid) {
      setValidationError(isAr ? (validation.errorAr || 'مسار غير صحيح') : (validation.errorEn || 'Invalid path'));
    } else {
      setValidationError(null);
    }
  };

  // Handle Save
  const handleSaveMandatoryPath = () => {
    const validation = validateGHubDirectoryPath(inputPath);
    if (!validation.isValid) {
      const err = isAr ? validation.errorAr : validation.errorEn;
      setValidationError(err || 'Invalid path');
      return;
    }

    const res = setMandatoryGHubScriptDir(inputPath);
    if (res.success) {
      const saved = getMandatoryGHubScriptDir();
      setCurrentPath(saved);
      setInputPath(saved);
      const msg = isAr 
        ? `✓ تم حفظ وتثبيت مسار G-HUB الإلزامي: ${saved}` 
        : `✓ Mandatory G-HUB script directory locked: ${saved}`;
      setSaveToast(msg);
      onDispatchToast?.(msg);
      setTimeout(() => setSaveToast(null), 3000);
    } else {
      setValidationError(res.error || 'Failed to save');
    }
  };

  // Handle Reset to Default
  const handleResetDefault = () => {
    const res = setMandatoryGHubScriptDir(DEFAULT_GHUB_SCRIPTS_DIR);
    if (res.success) {
      setCurrentPath(DEFAULT_GHUB_SCRIPTS_DIR);
      setInputPath(DEFAULT_GHUB_SCRIPTS_DIR);
      setSelectedPresetId('default_localappdata');
      setValidationError(null);
      const msg = isAr ? '✓ تم استعادة المسار الافتراضي لـ G-HUB' : '✓ Restored default G-HUB directory';
      setSaveToast(msg);
      onDispatchToast?.(msg);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Download Diagnostic Batch Verification File
  const handleDownloadDiagnosticBatch = () => {
    const batContent = generateRobustGHubBatchScript(
      `-- FNPro Master Engine Verified Lua Hook\n-- Locked Directory: ${inputPath}\nfunction OnEvent(event, arg)\n  -- 1000Hz direct script\nend\n`,
      inputPath
    );
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'verify_ghub_directory.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const msg = isAr ? '✓ تم تحميل ملف فحص واختبار المسار (verify_ghub_directory.bat)' : '✓ Downloaded verify_ghub_directory.bat!';
    setSaveToast(msg);
    onDispatchToast?.(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#050914] border-2 border-cyan-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-[0_0_50px_rgba(6,182,212,0.22)] overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/60 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.25)] text-cyan-400">
              <Settings2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white font-mono tracking-wide">
                  {isAr ? 'إعدادات مسار مجلد سكريبتات G-HUB الإلزامي' : 'Mandatory G-HUB Script Directory Settings'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/50 uppercase">
                  MANDATORY PATH
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {isAr
                  ? 'تحديد مسار المجلد الإلزامي لمنع أخطاء التنفيذ في ملفات .bat وسكريبتات العتاد'
                  : 'Mandatory directory configuration preventing Windows .bat execution and path errors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Save Toast Notification */}
        {saveToast && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto pr-1">
          
          {/* Active Locked Path Banner */}
          <div className="p-3.5 bg-[#080e1d] border-2 border-cyan-500/40 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FolderLock className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'المسار الفعلي النشط حالياً في ملفات .bat:' : 'Current Active Path in Backend .bat Files:'}</span>
              </span>
              <span className="text-emerald-400 font-bold px-2 py-0.5 bg-emerald-950/80 rounded border border-emerald-500/40">
                ACTIVE & LOCKED ✓
              </span>
            </div>
            <div className="p-2 bg-[#02050c] rounded-lg border border-cyan-500/30 text-cyan-300 font-mono text-xs break-all font-semibold select-all">
              {currentPath}
            </div>
          </div>

          {/* Preset Directory Selectors */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-slate-300 flex items-center justify-between">
              <span>{isAr ? 'اختر مساراً جاهزاً أو أدخل مساراً مخصصاً (إلزامي):' : 'Select Preset or Specify Custom Path (Mandatory):'}</span>
              <span className="text-[10px] text-slate-500 font-mono">Windows 10 / 11 Compatible</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GHUB_DIRECTORY_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-[#0f1d38] border-cyan-400 shadow-md ring-1 ring-cyan-400'
                        : 'bg-[#060a14] border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white truncate">{isAr ? preset.labelAr : preset.labelEn}</span>
                      {preset.isRecommended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          {isAr ? 'الموصى به' : 'REC'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 truncate">
                      {preset.path}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {isAr ? preset.descAr : preset.descEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editable Path Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold font-mono text-slate-300 flex items-center justify-between">
              <span>{isAr ? 'المسار المحدد الفعلي (Target Directory Path):' : 'Target Directory Path for Backend Batches:'}</span>
              <span className="text-[10px] font-mono text-amber-400">
                {selectedPresetId === 'custom' ? (isAr ? 'مسار مخصص' : 'Custom Path') : (isAr ? 'مسار محدد' : 'Selected Preset')}
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="%LOCALAPPDATA%\LGHUB\scripts"
                className={`w-full bg-[#030611] border rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-200 outline-none transition-all ${
                  validationError
                    ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'border-cyan-500/50 focus:border-cyan-400'
                }`}
              />
            </div>
            {validationError && (
              <p className="text-xs font-mono text-rose-400 flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Backend .BAT Preview Box */}
          <div className="p-3 bg-[#030611] border border-slate-800 rounded-xl space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-cyan-400 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>{isAr ? 'معاينة متغيّر المسار في ملفات .bat الخلفية:' : 'Backend .bat Variable Reference Preview:'}</span>
              </span>
              <span className="text-emerald-400 text-[10px]">Auto-Injected</span>
            </div>
            <pre className="text-[11px] text-slate-300 p-2 bg-[#010308] rounded border border-slate-800/80 overflow-x-auto whitespace-pre">
{`:: Lock Mandatory G-HUB Scripts Directory
set "GHUB_DIR=${inputPath}"
if not exist "%GHUB_DIR%" mkdir "%GHUB_DIR%" 2>nul
echo [*] Target G-HUB scripts directory locked: "%GHUB_DIR%"`}
            </pre>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="border-t border-cyan-900/40 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'استعادة الافتراضي' : 'Reset Default'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDiagnosticBatch}
              className="px-3 py-2 bg-[#0c1730] hover:bg-[#12234a] text-cyan-300 border border-cyan-500/40 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              title={isAr ? 'تحميل ملف فحص المسار لضمان عدم وجود أخطاء في الويندوز' : 'Download verification batch to test path validity on PC'}
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'فحص واختبار المسار (.bat)' : 'Verify Path (.bat)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSaveMandatoryPath}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isAr ? 'حفظ وتثبيت المسار الإلزامي' : 'Save & Lock Mandatory Path'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
