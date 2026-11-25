import type { CampaignState } from './strategicCampaign';

export const CAMPAIGN_SAVE_KEY = 'aether_prime_space_campaign_v2';
export const CAMPAIGN_WINDOW_NAME_PREFIX = '__AETHER_CAMPAIGN_V2__:';
const CAMPAIGN_IDB_NAME = 'aether_prime_campaign_db';
const CAMPAIGN_IDB_STORE = 'campaign_saves';
const CAMPAIGN_IDB_VERSION = 1;

export interface CampaignSaveLayerStatus {
  localStorage: boolean;
  sessionStorage: boolean;
  windowName: boolean;
  indexedDbQueued: boolean;
}

export interface CampaignStorageBackend {
  readLocalStorage: (key: string) => string | null;
  writeLocalStorage: (key: string, value: string) => boolean;
  removeLocalStorage: (key: string) => void;
  readSessionStorage: (key: string) => string | null;
  writeSessionStorage: (key: string, value: string) => boolean;
  removeSessionStorage: (key: string) => void;
  readWindowName: () => string;
  writeWindowName: (value: string) => boolean;
}

function createBrowserBackend(): CampaignStorageBackend {
  return {
    readLocalStorage: (key) => {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    writeLocalStorage: (key, value) => {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        window.localStorage.setItem(key, value);
        // Verify read-back to catch silent quota/ITP/ephemeral failures
        return window.localStorage.getItem(key) === value;
      } catch {
        return false;
      }
    },
    removeLocalStorage: (key) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // Ignore restricted storage
      }
    },
    readSessionStorage: (key) => {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    writeSessionStorage: (key, value) => {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) return false;
        window.sessionStorage.setItem(key, value);
        return window.sessionStorage.getItem(key) === value;
      } catch {
        return false;
      }
    },
    removeSessionStorage: (key) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
      } catch {
        // Ignore restricted storage
      }
    },
    readWindowName: () => {
      try {
        if (typeof window === 'undefined') return '';
        return typeof window.name === 'string' ? window.name : '';
      } catch {
        return '';
      }
    },
    writeWindowName: (value) => {
      try {
        if (typeof window === 'undefined') return false;
        window.name = value;
        return window.name === value;
      } catch {
        return false;
      }
    },
  };
}

const defaultBackend = createBrowserBackend();

/**
 * Computes a deterministic progression weight for comparing two valid campaign saves
 * when reconciling multiple persistence layers (localStorage, IndexedDB, sessionStorage, window.name).
 */
export function computeCampaignProgressScore(state: CampaignState): number {
  const levelCount = state.completedLevelIds?.length ?? 0;
  const mainCount = state.completedMainMissions?.length ?? 0;
  const optCount = state.completedOptionalIds?.length ?? 0;
  const xp = state.pilotProgress?.xp ?? 0;
  const credits = state.pilotProgress?.credits ?? 0;
  const medals = state.pilotProgress?.medals?.length ?? 0;
  const modules = (state.spaceLoadout?.ownedModules?.length ?? 0) + (state.spaceLoadout?.equippedModules?.length ?? 0);
  const upgrades =
    (state.spaceLoadout?.pulseLevel ?? 1) +
    (state.spaceLoadout?.plasmaLevel ?? 1) +
    (state.spaceLoadout?.empLevel ?? 1) +
    (state.spaceLoadout?.railLevel ?? 1) +
    (state.spaceLoadout?.shieldLevel ?? 1) +
    (state.spaceLoadout?.engineLevel ?? 1) +
    (state.spaceLoadout?.countermeasureLevel ?? 1) +
    (state.spaceLoadout?.alliedSupportLevel ?? 1) -
    8;
  const decisions = Object.keys(state.decisions ?? {}).length;
  const liveryChanged =
    state.pilotProgress?.activeCosmeticId &&
    state.pilotProgress.activeCosmeticId !== 'vanguard_standard'
      ? 1
      : 0;
  const shipChanged = state.spaceLoadout?.selectedShipId !== 'light_interceptor' ? 1 : 0;
  const extLevels = state.extinctionState?.completedLevelIds?.length ?? 0;
  const extBosses = state.extinctionState?.defeatedBossIds?.length ?? 0;
  const extCompleted = state.extinctionState?.extinctionCompleted ? 1 : 0;

  return (
    levelCount * 10000 +
    mainCount * 25000 +
    optCount * 5000 +
    extLevels * 11000 +
    extBosses * 6000 +
    extCompleted * 30000 +
    xp * 2 +
    credits +
    medals * 250 +
    modules * 600 +
    Math.max(0, upgrades) * 500 +
    decisions * 2000 +
    liveryChanged * 150 +
    shipChanged * 150 +
    (state.stats?.totalSpaceKills ?? 0) * 5
  );
}

/**
 * Returns true if the campaign state contains any genuine player progression or customization
 * beyond a pristine untouched fresh state.
 */
export function hasCampaignProgression(state: CampaignState): boolean {
  return (
    (state.saveRevision ?? 0) > 0 ||
    (state.completedLevelIds?.length ?? 0) > 0 ||
    (state.completedMainMissions?.length ?? 0) > 0 ||
    (state.completedOptionalIds?.length ?? 0) > 0 ||
    (state.extinctionState?.completedLevelIds?.length ?? 0) > 0 ||
    (state.extinctionState?.defeatedBossIds?.length ?? 0) > 0 ||
    Boolean(state.extinctionState?.extinctionCompleted) ||
    (state.pilotProgress?.xp ?? 0) > 0 ||
    (state.pilotProgress?.credits ?? 0) > 0 ||
    (state.pilotProgress?.medals?.length ?? 0) > 0 ||
    (state.pilotProgress?.activeCosmeticId ?? 'vanguard_standard') !== 'vanguard_standard' ||
    (state.spaceLoadout?.ownedModules?.length ?? 0) > 0 ||
    (state.spaceLoadout?.selectedShipId ?? 'light_interceptor') !== 'light_interceptor' ||
    Object.keys(state.decisions ?? {}).length > 0 ||
    (state.stats?.totalSpaceKills ?? 0) > 0 ||
    (state.discoveredRegions?.length ?? 1) > 1
  );
}

/**
 * Deterministically picks the authoritative save among valid candidates from different
 * persistence layers. Prefers higher saveRevision when timestamps are equal/newer,
 * then strictly newer savedAtIso, then higher progression score so stale caches never
 * overwrite real progress.
 */
export function selectAuthoritativeSave(candidates: CampaignState[]): CampaignState | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const cur = candidates[i];
    if (isCandidateFresher(cur, best)) {
      best = cur;
    }
  }
  return best;
}

export function isCandidateFresher(candidate: CampaignState, baseline: CampaignState): boolean {
  const candRev = candidate.saveRevision ?? 0;
  const baseRev = baseline.saveRevision ?? 0;
  const candTs = Date.parse(candidate.savedAtIso || '') || 0;
  const baseTs = Date.parse(baseline.savedAtIso || '') || 0;
  const candScore = computeCampaignProgressScore(candidate);
  const baseScore = computeCampaignProgressScore(baseline);

  // Never let an empty/default save overwrite a save with genuine progression unless explicitly cleared
  if (candScore === 0 && baseScore > 0) return false;
  if (candScore > 0 && baseScore === 0) return true;

  if (candRev !== baseRev && candRev > 0 && baseRev > 0) {
    return candRev > baseRev;
  }
  if (candTs !== baseTs) {
    return candTs > baseTs;
  }
  if (candScore !== baseScore) {
    return candScore > baseScore;
  }
  return candRev > baseRev;
}

function openCampaignDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(CAMPAIGN_IDB_NAME, CAMPAIGN_IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CAMPAIGN_IDB_STORE)) {
          db.createObjectStore(CAMPAIGN_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeIndexedDbRaw(serialized: string): boolean {
  if (typeof indexedDB === 'undefined') return false;
  void openCampaignDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(CAMPAIGN_IDB_STORE, 'readwrite');
      tx.objectStore(CAMPAIGN_IDB_STORE).put(serialized, CAMPAIGN_SAVE_KEY);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    } catch {
      db.close();
    }
  });
  return true;
}

export async function readCampaignFromIndexedDb(
  deserialize: (raw: string | null) => CampaignState | null,
): Promise<CampaignState | null> {
  const db = await openCampaignDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CAMPAIGN_IDB_STORE, 'readonly');
      const req = tx.objectStore(CAMPAIGN_IDB_STORE).get(CAMPAIGN_SAVE_KEY);
      req.onsuccess = () => {
        const raw = typeof req.result === 'string' ? req.result : null;
        db.close();
        resolve(deserialize(raw));
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

function clearIndexedDbKey(): void {
  if (typeof indexedDB === 'undefined') return;
  void openCampaignDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(CAMPAIGN_IDB_STORE, 'readwrite');
      tx.objectStore(CAMPAIGN_IDB_STORE).delete(CAMPAIGN_SAVE_KEY);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    } catch {
      db.close();
    }
  });
}

export function writeCampaignToAllLayers(
  serialized: string,
  backend: CampaignStorageBackend = defaultBackend,
  useIndexedDb = true,
): CampaignSaveLayerStatus {
  const lsOk = backend.writeLocalStorage(CAMPAIGN_SAVE_KEY, serialized);
  const ssOk = backend.writeSessionStorage(CAMPAIGN_SAVE_KEY, serialized);
  const wnOk = backend.writeWindowName(`${CAMPAIGN_WINDOW_NAME_PREFIX}${serialized}`);
  const idbOk = useIndexedDb ? writeIndexedDbRaw(serialized) : false;
  return {
    localStorage: lsOk,
    sessionStorage: ssOk,
    windowName: wnOk,
    indexedDbQueued: idbOk,
  };
}

export function readCampaignFromSyncLayers(
  deserialize: (raw: string | null) => CampaignState | null,
  serialize: (state: CampaignState) => string,
  backend: CampaignStorageBackend = defaultBackend,
): CampaignState | null {
  const rawLs = backend.readLocalStorage(CAMPAIGN_SAVE_KEY);
  const rawSs = backend.readSessionStorage(CAMPAIGN_SAVE_KEY);
  const rawWnFull = backend.readWindowName();
  const rawWn = rawWnFull.startsWith(CAMPAIGN_WINDOW_NAME_PREFIX)
    ? rawWnFull.slice(CAMPAIGN_WINDOW_NAME_PREFIX.length)
    : null;

  const parsedLs = deserialize(rawLs);
  const parsedSs = deserialize(rawSs);
  const parsedWn = deserialize(rawWn);

  const candidates: CampaignState[] = [];
  if (parsedLs) candidates.push(parsedLs);
  if (parsedSs) candidates.push(parsedSs);
  if (parsedWn) candidates.push(parsedWn);

  const authoritative = selectAuthoritativeSave(candidates);
  if (!authoritative) return null;

  // Self-heal any lagging or empty healthy storage layer without overwriting newer data
  const canonicalRaw = serialize(authoritative);
  if (!parsedLs || isCandidateFresher(authoritative, parsedLs)) {
    backend.writeLocalStorage(CAMPAIGN_SAVE_KEY, canonicalRaw);
  }
  if (!parsedSs || isCandidateFresher(authoritative, parsedSs)) {
    backend.writeSessionStorage(CAMPAIGN_SAVE_KEY, canonicalRaw);
  }
  if (!parsedWn || isCandidateFresher(authoritative, parsedWn)) {
    backend.writeWindowName(`${CAMPAIGN_WINDOW_NAME_PREFIX}${canonicalRaw}`);
  }

  return authoritative;
}

export function clearCampaignFromAllLayers(
  backend: CampaignStorageBackend = defaultBackend,
  useIndexedDb = true,
): void {
  backend.removeLocalStorage(CAMPAIGN_SAVE_KEY);
  backend.removeSessionStorage(CAMPAIGN_SAVE_KEY);
  const existingName = backend.readWindowName();
  if (existingName.startsWith(CAMPAIGN_WINDOW_NAME_PREFIX)) {
    backend.writeWindowName('');
  }
  if (useIndexedDb) {
    clearIndexedDbKey();
  }
}
