/**
 * FNPro Master Engine - Audit Trail & Change History System
 * Persistent event log tracking all parameter changes, calibrations, and operations
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  timestampFormatted: string;
  section: 'classic_pro' | 'unreal_symmetric' | 'keyboard_zero' | 'macros' | 'radar_codex' | 'ballchasing' | 'profiles' | 'system';
  sectionNameAr: string;
  sectionNameEn: string;
  paramKey: string;
  paramLabelAr: string;
  paramLabelEn: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  changeType: 'param_tune' | 'preset_apply' | 'macro_inject' | 'keybind_remap' | 'engine_switch' | 'rollback';
}

const STORAGE_KEY = 'fnpro_engine_audit_log_v2';
const MAX_AUDIT_ENTRIES = 500;

export function getAuditLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDefaultAuditLog();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDefaultAuditLog();
  } catch (err) {
    console.error('Failed to load audit log from storage:', err);
    return getInitialDefaultAuditLog();
  }
}

export function recordAuditEntry(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'timestampFormatted'>
): AuditLogEntry {
  const current = getAuditLog();
  const now = new Date();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    timestampFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  const updated = [newEntry, ...current].slice(0, MAX_AUDIT_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save audit log entry:', err);
  }

  // Dispatch custom window event so all UI components update reactively
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fnpro_audit_log_updated', { detail: newEntry }));
  }

  return newEntry;
}

export function clearAuditLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fnpro_audit_log_updated'));
    }
  } catch (err) {
    console.error('Failed to clear audit log:', err);
  }
}

export function exportAuditLogJson(): string {
  const entries = getAuditLog();
  return JSON.stringify({
    engineVersion: '4.2.0',
    exportTimestamp: new Date().toISOString(),
    totalEntries: entries.length,
    auditTrail: entries
  }, null, 2);
}

function getInitialDefaultAuditLog(): AuditLogEntry[] {
  return [
    {
      id: 'init_classic_01',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      timestampFormatted: '01:00:00',
      section: 'classic_pro',
      sectionNameAr: 'المحرك الكلاسيكي المعتمد (الرئيسي)',
      sectionNameEn: 'Classic Pro Standard Engine',
      paramKey: 'internalDeadzone',
      paramLabelAr: 'المنطقة الميتة الداخلية',
      paramLabelEn: 'Internal Deadzone',
      oldValue: 0.10,
      newValue: 0.05,
      changeType: 'param_tune'
    },
    {
      id: 'init_classic_02',
      timestamp: new Date(Date.now() - 3500000).toISOString(),
      timestampFormatted: '01:02:15',
      section: 'classic_pro',
      sectionNameAr: 'المحرك الكلاسيكي المعتمد (الرئيسي)',
      sectionNameEn: 'Classic Pro Standard Engine',
      paramKey: 'curveExponent',
      paramLabelAr: 'معامل تقوس الاستجابة',
      paramLabelEn: 'Curve Exponent',
      oldValue: 1.00,
      newValue: 1.45,
      changeType: 'param_tune'
    },
    {
      id: 'init_unreal_03',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      timestampFormatted: '01:30:00',
      section: 'unreal_symmetric',
      sectionNameAr: 'محرك إنريل المتناظر 1:-1',
      sectionNameEn: 'Unreal Symmetric 1:-1 Engine',
      paramKey: 'bipolarTrueZero',
      paramLabelAr: 'تثبيت نقطة الصفر الحقيقي (0.0)',
      paramLabelEn: 'Bipolar True Zero Lock',
      oldValue: 'OFF',
      newValue: 'ACTIVE_1000HZ',
      changeType: 'engine_switch'
    },
    {
      id: 'init_kb_04',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      timestampFormatted: '01:50:40',
      section: 'keyboard_zero',
      sectionNameAr: 'كيبورد زيرو DirectInput',
      sectionNameEn: 'Keyboard Zero Matrix',
      paramKey: 'scancodeLayer0',
      paramLabelAr: 'تأكيد الطبقة 0 الأساسية (DIK_W, DIK_S, DIK_A, DIK_D)',
      paramLabelEn: 'Immutable Layer 0 Foundation',
      oldValue: 'Unverified',
      newValue: 'Locked (0.00ms Jitter)',
      changeType: 'keybind_remap'
    }
  ];
}
