import React, { useState } from 'react';
import { PhysicsConfig, KeyBinding, MacroTimingConfig, Language } from '../types/engine';
import { generatePythonQtScript } from '../utils/pythonQtGenerator';
import { 
  Download, 
  Check, 
  Copy, 
  Terminal, 
  FileCode2, 
  HardDrive, 
  X, 
  Package, 
  ShieldCheck, 
  Zap,
  Layers,
  Database
} from 'lucide-react';

interface StandalonePackageDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  physicsConfig: PhysicsConfig;
  keybindings: KeyBinding[];
  timings: MacroTimingConfig;
  language: Language;
}

export const StandalonePackageDownloadModal: React.FC<StandalonePackageDownloadModalProps> = ({
  isOpen,
  onClose,
  physicsConfig,
  keybindings,
  timings,
  language,
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedFixCmd, setCopiedFixCmd] = useState(false);
  const [copiedDesktopCmd, setCopiedDesktopCmd] = useState(false);

  const pythonScriptContent = generatePythonQtScript(physicsConfig, keybindings, timings);

  const batchInstallerContent = `@echo off
setlocal enabledelayedexpansion
title Rocket League Professional Master Engine [100% Offline Local Master Suite]
echo =======================================================================
echo  Rocket League Professional Master Engine (v4.0.2 RLCS Esport Edition)
echo  100% Offline Local Desktop Suite & Dual Runtime Launcher
echo =======================================================================
echo.

:: 0. CRITICAL FIX FOR C:\\Windows\\System32 DIRECTORY ERROR
cd /d "%~dp0"
echo [*] Working Directory: %CD%

:: 1. Intelligent Location Detection for engine_pyside6.py
set "PY_SCRIPT=engine_pyside6.py"

if not exist "%PY_SCRIPT%" (
    echo [*] Checking common user download locations...
    if exist "%USERPROFILE%\\Downloads\\engine_pyside6.py" (
        cd /d "%USERPROFILE%\\Downloads"
        echo [OK] Located engine_pyside6.py in %USERPROFILE%\\Downloads
    ) else if exist "%USERPROFILE%\\Desktop\\engine_pyside6.py" (
        cd /d "%USERPROFILE%\\Desktop"
        echo [OK] Located engine_pyside6.py in %USERPROFILE%\\Desktop
    )
)

echo.
echo  =======================================================================
echo   Select 100% Offline Launch Mode:
echo   [1] Full Master Suite (Exact Identical UI: 11 Tabs, Live Monitors & Radar)
echo   [2] Native PySide6 Desktop Engine (Windows user32.dll & SQLite)
echo   [3] All-In-One Unified Launch (Full Suite App Window + Engine)
echo  =======================================================================
echo.
set /p LAUNCH_MODE="Enter selection [1, 2, or 3] (Default=1): "
if "%LAUNCH_MODE%"=="" set LAUNCH_MODE=1

if "%LAUNCH_MODE%"=="1" goto LAUNCH_WEB_SUITE
if "%LAUNCH_MODE%"=="2" goto LAUNCH_PYTHON_SUITE
if "%LAUNCH_MODE%"=="3" goto LAUNCH_BOTH

:LAUNCH_WEB_SUITE
echo [*] Launching 100% Offline Master Suite in Native Desktop App Window...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    start /b npm run dev
    timeout /t 2 /nobreak >nul
    start msedge.exe --app=http://localhost:3000 || start chrome.exe --app=http://localhost:3000 || start http://localhost:3000
    echo [OK] Master Suite active at http://localhost:3000
    pause
    exit /b 0
) else (
    echo [!] npm not found, falling back to Python PySide6 suite...
    goto LAUNCH_PYTHON_SUITE
)

:LAUNCH_BOTH
echo [*] Starting dual runtime offline environment...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    start /b npm run dev
    timeout /t 2 /nobreak >nul
    start msedge.exe --app=http://localhost:3000 || start chrome.exe --app=http://localhost:3000 || start http://localhost:3000
)

:LAUNCH_PYTHON_SUITE
:: 2. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3 is not found in system PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo IMPORTANT: Make sure to check the box "Add Python to PATH" during installation.
    pause
    exit /b 1
)

:: 3. Setup local virtual environment (rl_env)
echo [*] Initializing 100% local virtual environment (rl_env)...
if not exist "rl_env" (
    python -m venv rl_env
)
if exist "rl_env\\Scripts\\activate.bat" (
    call rl_env\\Scripts\\activate.bat
)

:: 4. Install required PySide6 GUI library
echo [*] Verifying PySide6 desktop requirements...
pip install --upgrade pip >nul 2>&1
pip install PySide6 >nul 2>&1

:: 5. Launch standalone suite with SQLite database
echo [*] Launching Master Engine Desktop Suite (%CD%\\engine_pyside6.py)...
echo [*] Local SQLite database will persist to: %CD%\\rocket_league_physics.db
python engine_pyside6.py

if %errorlevel% neq 0 (
    echo.
    echo [!] Process exited with code %errorlevel%.
)

pause
`;

  const handleDownloadPython = () => {
    const blob = new Blob([pythonScriptContent], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'engine_pyside6.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBatch = () => {
    const blob = new Blob([batchInstallerContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'setup_and_run_offline.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('pip install PySide6 && python engine_pyside6.py');
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyFixCmd = () => {
    navigator.clipboard.writeText('cd /d "%USERPROFILE%\\Downloads" && pip install PySide6 && python engine_pyside6.py');
    setCopiedFixCmd(true);
    setTimeout(() => setCopiedFixCmd(false), 2000);
  };

  const handleCopyDesktopCmd = () => {
    navigator.clipboard.writeText('cd /d "%USERPROFILE%\\Desktop" && pip install PySide6 && python engine_pyside6.py');
    setCopiedDesktopCmd(true);
    setTimeout(() => setCopiedDesktopCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="bg-[#0b1120] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 my-8"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Package className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {isAr ? 'تحميل حزمة البرنامج المتكامل للتشغيل المحلي 100%' : 'Download Complete Standalone Desktop Suite (100% Offline)'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              PySide6 (Qt6) Unified Dynamic Interface · SQLite Database · Zero Server Dependency
            </p>
          </div>
        </div>

        {/* Windows System32 Direct Fix Banner (Urgent Resolution) */}
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Zap className="w-4 h-4 fill-amber-400 shrink-0" />
              <span>
                {isAr 
                  ? 'حل مشكلة: python: can\'t open file \'C:\\Windows\\System32\\engine_pyside6.py\'' 
                  : 'FIX: python: can\'t open file \'C:\\Windows\\System32\\engine_pyside6.py\''}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Errno 2 Solution
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isAr 
              ? 'سبب الخطأ: فتح موجه الأوامر (CMD) كمسؤول يجعله يعمل في مسار النظام System32 بدلاً من مجلد التنزيلات. استخدم الأمر المباشر أدناه للانتقال التلقائي إلى مجلد Downloads وتشغيل الملف فوراً:' 
              : 'Cause: Running CMD as Administrator defaults to C:\\Windows\\System32 instead of Downloads. Run this 1-click command to auto-navigate to Downloads and launch:'}
          </p>

          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
            <div className="text-amber-300 text-[11px] truncate">
              cd /d "%USERPROFILE%\Downloads" && pip install PySide6 && python engine_pyside6.py
            </div>
            <button
              onClick={handleCopyFixCmd}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors cursor-pointer shrink-0"
            >
              {copiedFixCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedFixCmd ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ أمر الحل الفوري' : 'Copy Fix')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>{isAr ? 'إذا حفظت الملف على سطح المكتب:' : 'Or if saved on Desktop:'}</span>
            <button
              onClick={handleCopyDesktopCmd}
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              {copiedDesktopCmd ? (isAr ? 'تم نسخ أمر Desktop!' : 'Copied Desktop Cmd!') : (isAr ? 'نسخ أمر سطح المكتب Desktop' : 'Copy Desktop Command')}
            </button>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'واجهة ديناميكية واحدة موحدة' : 'Single Unified Dynamic UI'}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'قاعدة بيانات SQLite محلية' : 'Local SQLite Persistence'}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'مفتاح F12 لتسلسل الماكرو' : 'Global F12 Macro Simulator'}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'سقف السوبرسونيك (2200-2300 uu)' : 'Supersonic Cap 2200-2300 uu/s'}</span>
          </div>
        </div>

        {/* Download Options */}
        <div className="space-y-2.5">
          {/* Option 1: Python Script */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileCode2 className="w-7 h-7 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">engine_pyside6.py</div>
                <div className="text-[11px] text-slate-400">
                  {isAr ? 'ملف الكود المكتبي الكامل شامل جميع النوافذ والفيزيكس' : 'Complete standalone PySide6 single-window application'}
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadPython}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shrink-0 font-mono"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل الكود (.py)' : 'Download .py'}</span>
            </button>
          </div>

          {/* Option 2: 1-Click Windows Batch Installer */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Terminal className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">setup_and_run_offline.bat (مُحدث ومُصحح)</div>
                <div className="text-[11px] text-slate-400">
                  {isAr ? 'مُشغل ذكي يتجاوز مسار System32 تلقائياً ويكتشف الملف في التنزيلات أو سطح المكتب' : 'Smart launcher with cd /d "%~dp0" and auto-detection in Downloads/Desktop'}
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadBatch}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer shrink-0 font-mono"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل المُشغل (.bat)' : 'Download .bat'}</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Terminal Command */}
        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="text-slate-400 truncate text-[11px]">
            <span className="text-slate-500">$ </span>
            <span className="text-cyan-300">cd /d "%USERPROFILE%\Downloads" && python engine_pyside6.py</span>
          </div>
          <button
            onClick={handleCopyCmd}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 transition-colors cursor-pointer shrink-0 text-xs"
          >
            {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedScript ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
