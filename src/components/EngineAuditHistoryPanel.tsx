import React, { useState, useEffect } from 'react';
import { Language, PhysicsConfig } from '../types/engine';
import { 
  getAuditLog, 
  clearAuditLog, 
  exportAuditLogJson, 
  AuditLogEntry, 
  recordAuditEntry 
} from '../utils/engineAuditLog';
import { 
  History, 
  RotateCcw, 
  Download, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Cpu, 
  ShieldCheck, 
  Search,
  ArrowRight,
  Activity,
  Layers
} from 'lucide-react';

interface EngineAuditHistoryPanelProps {
  language: Language;
  onRestoreConfig?: (config: PhysicsConfig) => void;
  currentConfig?: PhysicsConfig;
}

export const EngineAuditHistoryPanel: React.FC<EngineAuditHistoryPanelProps> = ({
  language,
  onRestoreConfig,
  currentConfig
}) => {
  const isAr = language === 'ar';
  const [entries, setEntries] = useState<AuditLogEntry[]>(() => getAuditLog());
  const [filterSection, setFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rollbackSuccessToast, setRollbackSuccessToast] = useState<string | null>(null);

  // Listen to live audit log update events from any part of the app
  useEffect(() => {
    const handleUpdate = () => {
      setEntries(getAuditLog());
    };
    window.addEventListener('fnpro_audit_log_updated', handleUpdate);
    return () => window.removeEventListener('fnpro_audit_log_updated', handleUpdate);
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (filterSection !== 'all' && e.section !== filterSection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKey = e.paramKey.toLowerCase().includes(q);
      const matchLabel = e.paramLabelAr.toLowerCase().includes(q) || e.paramLabelEn.toLowerCase().includes(q);
      const matchSec = e.sectionNameAr.toLowerCase().includes(q) || e.sectionNameEn.toLowerCase().includes(q);
      return matchKey || matchLabel || matchSec;
    }
    return true;
  });

  const handleClearHistory = () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من مسح سجل التعديلات بالكامل؟' : 'Are you sure you want to clear the audit history?')) {
      clearAuditLog();
      setEntries([]);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportAuditLogJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fnpro-engine-audit-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRollback = (entry: AuditLogEntry) => {
    if (currentConfig && onRestoreConfig && typeof entry.oldValue === 'number' && entry.paramKey in currentConfig) {
      const updated = {
        ...currentConfig,
        [entry.paramKey]: entry.oldValue
      };
      onRestoreConfig(updated);
      recordAuditEntry({
        section: entry.section,
        sectionNameAr: entry.sectionNameAr,
        sectionNameEn: entry.sectionNameEn,
        paramKey: entry.paramKey,
        paramLabelAr: entry.paramLabelAr,
        paramLabelEn: entry.paramLabelEn,
        oldValue: entry.newValue,
        newValue: entry.oldValue,
        changeType: 'rollback'
      });
      setRollbackSuccessToast(
        isAr 
          ? `✓ تم استعادة قيمة ${entry.paramLabelAr} إلى: ${entry.oldValue}` 
          : `✓ Rolled back ${entry.paramLabelEn} to: ${entry.oldValue}`
      );
      setTimeout(() => setRollbackSuccessToast(null), 3000);
    } else {
      setRollbackSuccessToast(
        isAr 
          ? `✓ تم تسجيل استرجاع الإحصائية: ${entry.paramLabelAr} (${entry.oldValue})` 
          : `✓ Parameter rollback registered: ${entry.paramLabelEn} (${entry.oldValue})`
      );
      setTimeout(() => setRollbackSuccessToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {rollbackSuccessToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3 text-center text-sm font-bold text-emerald-300 animate-pulse flex items-center justify-center gap-2 shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{rollbackSuccessToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'سجل التعديلات والعمليات الكامل (Engine Change Audit Trail)' : 'Complete Engine Change Audit Trail'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
              {entries.length} {isAr ? 'عملية مسجلة' : 'Recorded Events'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isAr
              ? 'نظام تتبع وإثبات شامل يسجل تلقائياً كل تعديل يطرأ على إحصائيات ومعايير المحرك الكلاسيكي، محرك أنريل، كيبورد زيرو، وتوقيتات الماكرو مع إمكانية التراجع والتصدير.'
              : 'Full historical audit trail automatically recording every parameter modification, sensitivity calibration, and engine preset change with 1-click rollback and export.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير السجل JSON' : 'Export JSON'}</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-400 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 rounded-lg transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسح السجل' : 'Clear Log'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All Events' },
            { id: 'classic_pro', labelAr: 'المحرك الكلاسيكي', labelEn: 'Classic Pro' },
            { id: 'unreal_symmetric', labelAr: 'محرك إنريل 1:-1', labelEn: 'Unreal 1:-1' },
            { id: 'keyboard_zero', labelAr: 'كيبورد زيرو', labelEn: 'Keyboard Zero' },
            { id: 'macros', labelAr: 'الماكرو الشامل', labelEn: 'Macros' },
            { id: 'radar_codex', labelAr: 'الرادار والكودكس', labelEn: 'Radar & Codex' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setFilterSection(sec.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterSection === sec.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {isAr ? sec.labelAr : sec.labelEn}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في التعديلات والإحصائيات...' : 'Search modified parameters...'}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>
      </div>

      {/* Audit Log Table / Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono text-slate-400">
          <span>{isAr ? 'التسلسل الزمني الدقيق للعمليات' : 'Chronological Audit Timeline'}</span>
          <span>{filteredEntries.length} {isAr ? 'سجلات مطابقة' : 'Matching Records'}</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            {isAr ? 'لا توجد سجلات تعديل مطابقة لمعايير البحث الحالية.' : 'No audit records matching the current filter criteria.'}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                {/* Event Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
                      {entry.timestampFormatted}
                    </span>
                    <span className="text-cyan-300 font-semibold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30 text-[10px]">
                      {isAr ? entry.sectionNameAr : entry.sectionNameEn}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                      {entry.changeType.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white pt-0.5">
                    {isAr ? entry.paramLabelAr : entry.paramLabelEn}
                    <span className="text-slate-500 font-normal text-xs ml-2 mr-2">({entry.paramKey})</span>
                  </div>

                  {/* Value Transition */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">القيمة السابقة:</span>
                    <span className="text-rose-400 font-bold line-through px-1.5 py-0.5 bg-rose-950/40 rounded border border-rose-500/20">
                      {String(entry.oldValue)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">القيمة المحدثة:</span>
                    <span className="text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-950/40 rounded border border-emerald-500/30">
                      {String(entry.newValue)}
                    </span>
                  </div>
                </div>

                {/* Rollback Action */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleRollback(entry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 rounded-lg transition-all cursor-pointer shadow-sm"
                    title={isAr ? 'استعادة هذه القيمة السابقة فوراً' : 'Revert parameter back to previous value'}
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                    <span>{isAr ? 'استرجاع القيمة' : 'Rollback'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
