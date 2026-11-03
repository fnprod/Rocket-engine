import { GameProfile, PhysicsConfig, KeyBinding } from '../types/engine';
import { CLASSIC_ESPORTS_PHYSICS_CONFIG, UNREAL_SYMMETRIC_PHYSICS_CONFIG, INITIAL_GAME_PROFILES } from '../data/initialData';

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  formattedTime: string;
  name: string;
  description: string;
  profiles: GameProfile[];
  activeProfileId: string;
  physicsConfig: PhysicsConfig;
  keybindings?: KeyBinding[];
  isAutoSaved?: boolean;
}

const STORAGE_KEY = 'rocket_league_version_snapshots_v1';

/**
 * Built-in default baseline snapshots allowing users to instantly revert to
 * either the pre-modification state or the post-modification state.
 */
export const DEFAULT_VERSION_SNAPSHOTS: VersionSnapshot[] = [
  {
    id: 'snap_classic_esports_baseline',
    timestamp: Date.now() - 3600000,
    formattedTime: new Date(Date.now() - 3600000).toLocaleString(),
    name: 'Classic Esports Pro Standard Baseline (Pre-Edit)',
    description: 'Original verified settings preferred before recent changes: Deadzone 0.05, Exponent 1.45, Jitter ±2, Ground 1.50x, Aerial 1.30x.',
    profiles: INITIAL_GAME_PROFILES,
    activeProfileId: 'my_unified_profile',
    physicsConfig: CLASSIC_ESPORTS_PHYSICS_CONFIG,
    isAutoSaved: false,
  },
  {
    id: 'snap_unreal_symmetric_baseline',
    timestamp: Date.now() - 1800000,
    formattedTime: new Date(Date.now() - 1800000).toLocaleString(),
    name: 'Unreal Engine 1/-1 Dynamic Symmetric Baseline',
    description: 'Precision 1/-1 bipolar steering (D/A) and roll (E/Q) with dynamic deadzone rescaling (0.02) and ±20 jitter filter.',
    profiles: INITIAL_GAME_PROFILES,
    activeProfileId: 'my_unified_profile',
    physicsConfig: UNREAL_SYMMETRIC_PHYSICS_CONFIG,
    isAutoSaved: false,
  }
];

/**
 * Creates a new VersionSnapshot capturing the active state before modifications.
 */
export function createVersionSnapshot(
  name: string,
  description: string,
  profiles: GameProfile[],
  activeProfileId: string,
  physicsConfig: PhysicsConfig,
  keybindings?: KeyBinding[],
  isAutoSaved = false
): VersionSnapshot {
  const now = new Date();
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.getTime(),
    formattedTime: now.toLocaleString(),
    name: name.trim() || `Snapshot (${now.toLocaleTimeString()})`,
    description: description.trim() || 'Manual configuration checkpoint before changes',
    profiles: JSON.parse(JSON.stringify(profiles)),
    activeProfileId,
    physicsConfig: JSON.parse(JSON.stringify(physicsConfig)),
    keybindings: keybindings ? JSON.parse(JSON.stringify(keybindings)) : undefined,
    isAutoSaved,
  };
}

/**
 * Loads snapshots from localStorage with fallback to default preset snapshots.
 */
export function loadSnapshotsFromStorage(): VersionSnapshot[] {
  if (typeof window === 'undefined') {
    return DEFAULT_VERSION_SNAPSHOTS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VERSION_SNAPSHOTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load version snapshots from localStorage:', err);
  }
  return DEFAULT_VERSION_SNAPSHOTS;
}

/**
 * Saves snapshots array to localStorage.
 */
export function saveSnapshotsToStorage(snapshots: VersionSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (err) {
    console.warn('Failed to save version snapshots to localStorage:', err);
  }
}

/**
 * Helper to compute a hash or fingerprint of a state to prevent duplicate consecutive auto-saves.
 */
export function computeStateFingerprint(
  activeProfileId: string,
  profiles: GameProfile[],
  physicsConfig: PhysicsConfig
): string {
  const activeProf = profiles.find(p => p.id === activeProfileId) || profiles[0];
  return `${activeProfileId}_${activeProf?.deadzoneOverride}_${activeProf?.aerialSenseOverride}_${activeProf?.configPath}_${physicsConfig.internalDeadzone}_${physicsConfig.curveExponent}_${physicsConfig.groundSense}_${physicsConfig.aerialSense}`;
}

/**
 * Pushes a new auto-saved snapshot into the list, capping auto-snapshots to the last 5 states.
 * Rejects duplicate states if the latest snapshot matches the current fingerprint.
 */
export function pushAutoSnapshot(
  existingSnapshots: VersionSnapshot[],
  newSnapshot: VersionSnapshot,
  maxAutoCount = 5
): VersionSnapshot[] {
  // Filter out any older duplicate with the exact same fingerprint
  const newFp = computeStateFingerprint(newSnapshot.activeProfileId, newSnapshot.profiles, newSnapshot.physicsConfig);
  
  if (existingSnapshots.length > 0) {
    const latest = existingSnapshots[0];
    const latestFp = computeStateFingerprint(latest.activeProfileId, latest.profiles, latest.physicsConfig);
    if (newFp === latestFp) {
      // State hasn't changed from the latest snapshot; avoid creating duplicate clutter
      return existingSnapshots;
    }
  }

  // Separate auto-saved from manual/preset baseline snapshots
  const manualAndBaselines = existingSnapshots.filter(s => !s.isAutoSaved);
  const autoSnapshots = existingSnapshots.filter(s => s.isAutoSaved);

  // Keep only the most recent (maxAutoCount - 1) auto snapshots, then prepend the new one
  const trimmedAuto = [newSnapshot, ...autoSnapshots].slice(0, maxAutoCount);

  // Combine and sort by timestamp descending
  return [...trimmedAuto, ...manualAndBaselines].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns strictly the last 5 configuration states (auto-snapshots), formatted cleanly for 1-click restore.
 */
export function getRecentAutoSnapshots(
  snapshots: VersionSnapshot[],
  count = 5
): VersionSnapshot[] {
  const autos = snapshots.filter(s => s.isAutoSaved);
  if (autos.length >= count) {
    return autos.slice(0, count);
  }
  // If fewer than count auto-snapshots exist, backfill with default/earlier snapshots so user always has 5 states available to restore
  const nonAutos = snapshots.filter(s => !s.isAutoSaved);
  return [...autos, ...nonAutos].slice(0, count);
}

/**
 * Validates a snapshot object integrity.
 */
export function validateSnapshotIntegrity(snapshot: unknown): snapshot is VersionSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const s = snapshot as Partial<VersionSnapshot>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    Array.isArray(s.profiles) &&
    s.profiles.length > 0 &&
    typeof s.activeProfileId === 'string' &&
    s.physicsConfig !== null
  );
}

export function exportSnapshotsAsJson(snapshots: VersionSnapshot[]): string {
  return JSON.stringify(snapshots, null, 2);
}

export function formatSnapshotDateTime(timestamp: number, isAr = false): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      return { dateStr: '--', timeStr: '--' };
    }
    const locale = isAr ? 'ar-SA' : 'en-US';
    const dateStr = d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: '--', timeStr: '--' };
  }
}


