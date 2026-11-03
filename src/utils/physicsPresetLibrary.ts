import { PhysicsConfig } from '../types/engine';
import { CLASSIC_ESPORTS_PHYSICS_CONFIG, UNREAL_SYMMETRIC_PHYSICS_CONFIG } from '../data/initialData';
import { isTauriDesktop, loadNativePresets, saveNativePresets } from '../services/gemini';

export interface PhysicsPreset {
  id: string;
  name: string;
  nameAr: string;
  category: 'mathematical' | 'hardware' | 'custom';
  categoryLabel: string;
  categoryLabelAr: string;
  description: string;
  descriptionAr: string;
  isBuiltin: boolean;
  config: PhysicsConfig;
  tags: string[];
  createdAt?: string;
}

// Pure Mathematical & Physical Curve Parameter Sets (Zero Player Bios/Personas)
export const DEFAULT_MATHEMATICAL_PRESETS: PhysicsPreset[] = [
  {
    id: 'linear_1_to_1',
    name: 'Linear Passthrough 1:1 (Direct Axis)',
    nameAr: 'تمرير خطي متماثل 1:1 (استجابة مباشرة)',
    category: 'mathematical',
    categoryLabel: 'Mathematical Model',
    categoryLabelAr: 'نموذج رياضي',
    description: 'Exact 1:1 linear physical input response with zero exponential curvature. Maximum raw precision for direct telemetry monitoring.',
    descriptionAr: 'استجابة فيزيائية خطية مباشرة 1:1 بدون أي انحناء أسي، دقة مطلقة لقراءة مستشعرات العتاد.',
    isBuiltin: true,
    tags: ['1:1 Linear', 'Zero Curvature', 'Raw Input'],
    config: {
      internalDeadzone: 0.02,
      dodgeDeadzone: 0.50,
      hardwareJitter: 0,
      groundSense: 1.00,
      aerialSense: 1.00,
      precisionMode: 1.00,
      curveExponent: 1.00,
      pollingRateAdj: 1,
      supersonicVelocity: 2300
    }
  },
  {
    id: 'high_torque_exp',
    name: 'High-Torque Exp 1.35 (Apex Control)',
    nameAr: 'منحنى عزم الدوران العالي 1.35 (تحكم قمة المنعطف)',
    category: 'mathematical',
    categoryLabel: 'Mathematical Model',
    categoryLabelAr: 'نموذج رياضي',
    description: '1.35 exponential curvature enabling aggressive initial angular torque with smooth sub-millimeter steering stability at high velocities.',
    descriptionAr: 'منحنى أسي 1.35 يوفر عزم دوران أولي فوري مع استقرار وثبات فائق للسرعات العالية.',
    isBuiltin: true,
    tags: ['Exp 1.35', 'High Torque', 'Apex Control', '1.50 Ground'],
    config: {
      internalDeadzone: 0.04,
      dodgeDeadzone: 0.65,
      hardwareJitter: 1,
      groundSense: 1.50,
      aerialSense: 1.45,
      precisionMode: 0.70,
      curveExponent: 1.35,
      pollingRateAdj: 1,
      supersonicVelocity: 2200
    }
  },
  {
    id: 'damped_jitter',
    name: 'Damped Hardware Jitter Filter (±2 Gate)',
    nameAr: 'فلتر منع الاهتزاز العتادي (بوابة ±2)',
    category: 'hardware',
    categoryLabel: 'Hardware Damping',
    categoryLabelAr: 'تخميد عتادي',
    description: 'Hardware deadband filter eliminating micro-vibrations from mechanical keyboard switches while preserving pure 1000Hz scancode throughput.',
    descriptionAr: 'فلتر عتادي لعزل الاهتزازات الناتجة عن مفاتيح الكيبورد الميكانيكية مع الحفاظ على تردد 1000Hz التام.',
    isBuiltin: true,
    tags: ['Jitter Damping', 'Mechanical Switch', '1000Hz Clean'],
    config: {
      internalDeadzone: 0.05,
      dodgeDeadzone: 0.70,
      hardwareJitter: 2,
      groundSense: 1.40,
      aerialSense: 1.40,
      precisionMode: 0.75,
      curveExponent: 1.45,
      pollingRateAdj: 1,
      supersonicVelocity: 2300
    }
  },
  {
    id: 'zero_bias_mechanical',
    name: 'Zero-Bias Mechanical Deadzone (0.02 DZ)',
    nameAr: 'منطقة ميتة ميكانيكية بدون انحياز (0.02)',
    category: 'hardware',
    categoryLabel: 'Hardware Damping',
    categoryLabelAr: 'تخميد عتادي',
    description: 'Ultra-tight 0.02 mechanical threshold designed for instantaneous flip cancellation and immediate micro-adjustments.',
    descriptionAr: 'حد ميكانيكي أدنى 0.02 لإلغاء الفليب اللحظي والتعديل الميكروي السريع بدون أي تأخير.',
    isBuiltin: true,
    tags: ['0.02 Deadzone', 'Zero Bias', 'Instant Cancel'],
    config: {
      internalDeadzone: 0.02,
      dodgeDeadzone: 0.55,
      hardwareJitter: 1,
      groundSense: 1.45,
      aerialSense: 1.65,
      precisionMode: 0.65,
      curveExponent: 1.25,
      pollingRateAdj: 1,
      supersonicVelocity: 2200
    }
  },
  {
    id: 'pure_telemetry_baseline',
    name: 'Pure Telemetry Baseline (1.45 / 0.05)',
    nameAr: 'الأساس الفيزيائي المعياري (1.45 / 0.05)',
    category: 'mathematical',
    categoryLabel: 'Mathematical Model',
    categoryLabelAr: 'نموذج رياضي',
    description: 'Standard baseline physics parameters for comparative delta analysis and benchmark calibration.',
    descriptionAr: 'المعايير الفيزيائية المعيارية للمقارنة وحساب الفروقات التفاضلية (Δ).',
    isBuiltin: true,
    tags: ['Standard Baseline', 'Esports Foundation'],
    config: { ...CLASSIC_ESPORTS_PHYSICS_CONFIG }
  }
];

// Alias for backwards compatibility
export const DEFAULT_PRO_PRESETS = DEFAULT_MATHEMATICAL_PRESETS;

let customPresetsCache: PhysicsPreset[] = [];

/**
 * Syncs presets from native filesystem (%APPDATA%/RocketLeagueMasterEngine/presets.json)
 */
export async function syncPresetsWithNative(): Promise<PhysicsPreset[]> {
  if (isTauriDesktop()) {
    try {
      const raw = await loadNativePresets();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          customPresetsCache = parsed.filter(p => !p.isBuiltin);
        }
      }
    } catch (e) {
      console.warn('Could not read presets from native AppData:', e);
    }
  }
  return [...DEFAULT_MATHEMATICAL_PRESETS, ...customPresetsCache];
}

/**
 * Loads all available presets (default built-ins + custom stored presets)
 */
export function getPresetLibrary(): PhysicsPreset[] {
  return [...DEFAULT_MATHEMATICAL_PRESETS, ...customPresetsCache];
}

/**
 * Saves a custom physics preset directly to native AppData storage
 */
export function saveCustomPreset(params: {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  config: PhysicsConfig;
  tags?: string[];
}): PhysicsPreset {
  const trimmedName = params.name.trim();
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newPreset: PhysicsPreset = {
    id,
    name: trimmedName || `Custom Curve ${new Date().toLocaleTimeString()}`,
    nameAr: params.nameAr?.trim() || trimmedName || 'منحنى مخصص',
    category: 'custom',
    categoryLabel: 'Custom Model',
    categoryLabelAr: 'نموذج مخصص',
    description: params.description?.trim() || 'Custom user tuned mathematical curve.',
    descriptionAr: params.descriptionAr?.trim() || 'منحنى رياضي مخصص تم ضبطه بواسطة المستخدم.',
    isBuiltin: false,
    config: { ...params.config },
    tags: params.tags && params.tags.length > 0 ? params.tags : ['Custom', 'User Curve'],
    createdAt: new Date().toISOString()
  };

  customPresetsCache = [...customPresetsCache.filter(p => p.id !== id), newPreset];

  if (isTauriDesktop()) {
    saveNativePresets(JSON.stringify(customPresetsCache, null, 2)).catch((err) => {
      console.error('Failed to persist preset to native storage:', err);
    });
  }

  return newPreset;
}

/**
 * Deletes a custom preset by ID from native storage
 */
export function deleteCustomPreset(id: string): boolean {
  customPresetsCache = customPresetsCache.filter(p => p.id !== id);

  if (isTauriDesktop()) {
    saveNativePresets(JSON.stringify(customPresetsCache, null, 2)).catch((err) => {
      console.error('Failed to update native preset file on deletion:', err);
    });
  }

  return true;
}

/**
 * Clears custom presets and resets library to built-in presets
 */
export function resetPresetLibrary(): void {
  customPresetsCache = [];
  if (isTauriDesktop()) {
    saveNativePresets('[]').catch(console.error);
  }
}
