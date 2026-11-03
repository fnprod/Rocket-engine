import { GameProfile, PhysicsConfig } from '../types/engine';
import { VersionSnapshot, validateSnapshotIntegrity } from './versionSnapshotManager';

export interface ProfileValidationResult {
  valid: boolean;
  profiles: GameProfile[];
  error?: string;
  errorAr?: string;
}

export interface BatchExportBundle {
  app: 'RocketLeague_MasterEngine';
  bundleType: 'master_engine_batch_export';
  version: string;
  exportedAt: string;
  metadata: {
    profilesCount: number;
    snapshotsCount: number;
    activeProfileId: string;
    engineFrequency: string;
  };
  activeProfileId?: string;
  profiles: GameProfile[];
  snapshots: VersionSnapshot[];
  activePhysicsConfig?: PhysicsConfig;
}

export interface BatchValidationResult {
  valid: boolean;
  profiles: GameProfile[];
  snapshots: VersionSnapshot[];
  activeProfileId?: string;
  activePhysicsConfig?: PhysicsConfig;
  error?: string;
  errorAr?: string;
}

const VALID_TIERS: Set<GameProfile['tier']> = new Set([
  'Competitive 1v1',
  'RLCS 3v3',
  'Freestyle Mechanics',
  'Custom'
]);

/**
 * Validates a single object as a conformant GameProfile schema.
 */
function validateSingleProfile(item: unknown, index?: number): { profile?: GameProfile; error?: string; errorAr?: string } {
  const prefix = index !== undefined ? `Profile #${index + 1}: ` : '';
  const prefixAr = index !== undefined ? `البروفايل #${index + 1}: ` : '';

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      error: `${prefix}Must be a valid JSON object.`,
      errorAr: `${prefixAr}يجب أن يكون كائن JSON صالحاً.`
    };
  }

  const obj = item as Record<string, unknown>;

  // 1. Validate ID
  if (typeof obj.id !== 'string' || obj.id.trim() === '') {
    return {
      error: `${prefix}Missing or empty required field 'id'.`,
      errorAr: `${prefixAr}حقل 'id' مفقود أو فارغ.`
    };
  }

  // 2. Validate Name
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return {
      error: `${prefix}Missing or empty required field 'name'.`,
      errorAr: `${prefixAr}حقل 'name' مفقود أو فارغ.`
    };
  }

  // 3. Validate deadzoneOverride
  if (typeof obj.deadzoneOverride !== 'number' || isNaN(obj.deadzoneOverride) || obj.deadzoneOverride < 0 || obj.deadzoneOverride > 1) {
    return {
      error: `${prefix}Field 'deadzoneOverride' must be a number between 0.0 and 1.0.`,
      errorAr: `${prefixAr}حقل 'deadzoneOverride' يجب أن يكون رقماً بين 0.0 و 1.0.`
    };
  }

  // 4. Validate aerialSenseOverride
  if (typeof obj.aerialSenseOverride !== 'number' || isNaN(obj.aerialSenseOverride) || obj.aerialSenseOverride <= 0 || obj.aerialSenseOverride > 10) {
    return {
      error: `${prefix}Field 'aerialSenseOverride' must be a positive number up to 10.0.`,
      errorAr: `${prefixAr}حقل 'aerialSenseOverride' يجب أن يكون رقماً موجباً حتى 10.0.`
    };
  }

  // 5. Validate Tier (normalize if invalid)
  let tier: GameProfile['tier'] = 'Custom';
  if (typeof obj.tier === 'string' && VALID_TIERS.has(obj.tier as GameProfile['tier'])) {
    tier = obj.tier as GameProfile['tier'];
  }

  // 6. Validate customBindings
  let customBindings: Record<string, string> = {};
  if (obj.customBindings && typeof obj.customBindings === 'object' && !Array.isArray(obj.customBindings)) {
    const rawBindings = obj.customBindings as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawBindings)) {
      if (typeof v === 'string') {
        customBindings[k] = v;
      }
    }
  }

  const sanitized: GameProfile = {
    id: obj.id.trim(),
    name: obj.name.trim(),
    nameAr: typeof obj.nameAr === 'string' && obj.nameAr.trim() ? obj.nameAr.trim() : obj.name.trim(),
    icon: typeof obj.icon === 'string' && obj.icon.trim() ? obj.icon.trim() : 'trophy',
    tier,
    configPath: typeof obj.configPath === 'string' && obj.configPath.trim() 
      ? obj.configPath.trim() 
      : '%USERPROFILE%\\Documents\\My Games\\Rocket League\\TAGame\\Config\\TAInput.ini',
    gameExePath: typeof obj.gameExePath === 'string' && obj.gameExePath.trim()
      ? obj.gameExePath.trim()
      : 'C:\\Program Files\\Epic Games\\rocketleague\\Binaries\\Win64\\RocketLeague.exe',
    launchProtocol: typeof obj.launchProtocol === 'string' && obj.launchProtocol.trim()
      ? obj.launchProtocol.trim()
      : 'steam://rungameid/252950',
    description: typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim()
      : `Imported Rocket League esports profile (${tier}).`,
    deadzoneOverride: Number(obj.deadzoneOverride.toFixed(3)),
    aerialSenseOverride: Number(obj.aerialSenseOverride.toFixed(2)),
    powershellCommand: typeof obj.powershellCommand === 'string' ? obj.powershellCommand : undefined,
    customBindings,
  };

  return { profile: sanitized };
}

/**
 * Validates any JSON input (parsed or string) against the GameProfile schema.
 * Handles:
 *   - Direct GameProfile object
 *   - Array of GameProfile objects
 *   - Envelope: { profiles: GameProfile[], activeProfileId?: string }
 */
export function validateProfileSchema(rawData: unknown): ProfileValidationResult {
  let parsed: unknown = rawData;

  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return {
        valid: false,
        profiles: [],
        error: 'Invalid JSON format. Please check syntax.',
        errorAr: 'صيغة JSON غير صحيحة. يرجى التحقق من الأقواس وبنية النص.',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      profiles: [],
      error: 'Root JSON payload must be an object or an array of profiles.',
      errorAr: 'يجب أن يكون ملف JSON كائناً أو مصفوفة من البروفايلات.',
    };
  }

  const collected: GameProfile[] = [];

  // Case A: Envelope with `profiles` array
  if ('profiles' in parsed && Array.isArray((parsed as { profiles: unknown }).profiles)) {
    const list = (parsed as { profiles: unknown[] }).profiles;
    if (list.length === 0) {
      return {
        valid: false,
        profiles: [],
        error: "Envelope contains an empty 'profiles' array.",
        errorAr: "الملف يحتوي على مصفوفة 'profiles' فارغة.",
      };
    }

    for (let i = 0; i < list.length; i++) {
      const res = validateSingleProfile(list[i], i);
      if (res.error || !res.profile) {
        return {
          valid: false,
          profiles: [],
          error: res.error,
          errorAr: res.errorAr,
        };
      }
      collected.push(res.profile);
    }

    return { valid: true, profiles: collected };
  }

  // Case B: Direct Array of profiles
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        valid: false,
        profiles: [],
        error: 'JSON array is empty. At least one profile is required.',
        errorAr: 'مصفوفة JSON فارغة. مطلوب بروفايل واحد على الأقل.',
      };
    }

    for (let i = 0; i < parsed.length; i++) {
      const res = validateSingleProfile(parsed[i], i);
      if (res.error || !res.profile) {
        return {
          valid: false,
          profiles: [],
          error: res.error,
          errorAr: res.errorAr,
        };
      }
      collected.push(res.profile);
    }

    return { valid: true, profiles: collected };
  }

  // Case C: Single GameProfile object
  const singleRes = validateSingleProfile(parsed);
  if (singleRes.error || !singleRes.profile) {
    return {
      valid: false,
      profiles: [],
      error: singleRes.error,
      errorAr: singleRes.errorAr,
    };
  }

  return { valid: true, profiles: [singleRes.profile] };
}

/**
 * Serializes profiles into a clean, shareable JSON backup package.
 */
export function exportProfilesAsJson(
  profiles: GameProfile[], 
  activeProfileId?: string
): string {
  const payload = {
    app: 'RocketLeague_MasterEngine',
    version: '4.0.2',
    exportedAt: new Date().toISOString(),
    activeProfileId: activeProfileId || (profiles[0] ? profiles[0].id : 'my_unified_profile'),
    profilesCount: profiles.length,
    profiles,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Serializes both all profiles AND all version snapshots into a single unified JSON bundle for offline backup.
 */
export function exportBatchBundleAsJson(
  profiles: GameProfile[],
  snapshots: VersionSnapshot[],
  activeProfileId?: string,
  activePhysicsConfig?: PhysicsConfig
): string {
  const chosenActiveId = activeProfileId || (profiles[0] ? profiles[0].id : 'my_unified_profile');
  const bundle: BatchExportBundle = {
    app: 'RocketLeague_MasterEngine',
    bundleType: 'master_engine_batch_export',
    version: '4.0.2',
    exportedAt: new Date().toISOString(),
    metadata: {
      profilesCount: profiles.length,
      snapshotsCount: snapshots.length,
      activeProfileId: chosenActiveId,
      engineFrequency: '120Hz / 1000Hz DirectInput',
    },
    activeProfileId: chosenActiveId,
    profiles,
    snapshots,
    activePhysicsConfig,
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Validates a batch export bundle that contains both profiles and snapshots.
 */
export function validateBatchExportBundle(rawData: unknown): BatchValidationResult {
  let parsed: unknown = rawData;
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return {
        valid: false,
        profiles: [],
        snapshots: [],
        error: 'Invalid JSON format. Please verify syntax.',
        errorAr: 'صيغة JSON غير صحيحة. يرجى التحقق من بنية النص.',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      profiles: [],
      snapshots: [],
      error: 'Bundle root must be a JSON object.',
      errorAr: 'يجب أن يكون جذر الحزمة كائناً بصيغة JSON.',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check profiles array
  if (!Array.isArray(obj.profiles) || obj.profiles.length === 0) {
    return {
      valid: false,
      profiles: [],
      snapshots: [],
      error: 'Batch bundle must contain a non-empty profiles array.',
      errorAr: 'يجب أن تحتوي الحزمة الشاملة على مصفوفة بروفايلات غير فارغة.',
    };
  }

  const validProfiles: GameProfile[] = [];
  for (let i = 0; i < obj.profiles.length; i++) {
    const res = validateSingleProfile(obj.profiles[i], i);
    if (res.error || !res.profile) {
      return {
        valid: false,
        profiles: [],
        snapshots: [],
        error: res.error,
        errorAr: res.errorAr,
      };
    }
    validProfiles.push(res.profile);
  }

  // Check snapshots array if present
  const validSnapshots: VersionSnapshot[] = [];
  if (Array.isArray(obj.snapshots)) {
    for (let i = 0; i < obj.snapshots.length; i++) {
      const snap = obj.snapshots[i];
      if (validateSnapshotIntegrity(snap)) {
        validSnapshots.push(snap);
      }
    }
  }

  const extractedActiveId = typeof obj.activeProfileId === 'string'
    ? obj.activeProfileId
    : (obj.metadata && typeof (obj.metadata as Record<string, unknown>).activeProfileId === 'string')
      ? ((obj.metadata as Record<string, unknown>).activeProfileId as string)
      : undefined;

  return {
    valid: true,
    profiles: validProfiles,
    snapshots: validSnapshots,
    activeProfileId: extractedActiveId,
    activePhysicsConfig: (obj.activePhysicsConfig && typeof obj.activePhysicsConfig === 'object')
      ? (obj.activePhysicsConfig as PhysicsConfig)
      : undefined,
  };
}
