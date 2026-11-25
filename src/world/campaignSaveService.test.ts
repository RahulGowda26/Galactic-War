import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_SAVE_KEY,
  CAMPAIGN_WINDOW_NAME_PREFIX,
  clearCampaignFromAllLayers,
  hasCampaignProgression,
  isCandidateFresher,
  readCampaignFromSyncLayers,
  selectAuthoritativeSave,
  writeCampaignToAllLayers,
  type CampaignStorageBackend,
} from './campaignSaveService';
import {
  applyLevelCompletionWithSummary,
  createInitialCampaignState,
  deserializeCampaignState,
  selectPilotCosmeticLivery,
  serializeCampaignState,
} from './strategicCampaign';

function createMemoryBackend(opts?: {
  blockLocalStorage?: boolean;
  blockSessionStorage?: boolean;
  blockWindowName?: boolean;
}): CampaignStorageBackend & {
  ls: Map<string, string>;
  ss: Map<string, string>;
  winName: string;
} {
  const ls = new Map<string, string>();
  const ss = new Map<string, string>();
  const state = {
    ls,
    ss,
    winName: '',
    readLocalStorage(key: string) {
      if (opts?.blockLocalStorage) return null;
      return ls.get(key) ?? null;
    },
    writeLocalStorage(key: string, value: string) {
      if (opts?.blockLocalStorage) return false;
      ls.set(key, value);
      return true;
    },
    removeLocalStorage(key: string) {
      if (opts?.blockLocalStorage) return;
      ls.delete(key);
    },
    readSessionStorage(key: string) {
      if (opts?.blockSessionStorage) return null;
      return ss.get(key) ?? null;
    },
    writeSessionStorage(key: string, value: string) {
      if (opts?.blockSessionStorage) return false;
      ss.set(key, value);
      return true;
    },
    removeSessionStorage(key: string) {
      if (opts?.blockSessionStorage) return;
      ss.delete(key);
    },
    readWindowName() {
      if (opts?.blockWindowName) return '';
      return state.winName;
    },
    writeWindowName(value: string) {
      if (opts?.blockWindowName) return false;
      state.winName = value;
      return true;
    },
  };
  return state;
}

test('multi-layer campaign save persists levels, unlockedLevelIds, XP, credits, medals, and livery when localStorage works', () => {
  const backend = createMemoryBackend();
  let state = createInitialCampaignState('normal');
  assert.equal(hasCampaignProgression(state), false);

  const run1 = applyLevelCompletionWithSummary(state, 'op01_l1', {
    spaceKills: 6,
    shotsFired: 20,
    shotsHit: 14,
    hullRemainingPct: 96,
    elapsedSec: 40,
    combatScore: 2200,
    maxCombo: 6,
    nearMissCount: 3,
    missilesEvaded: 2,
  });
  state = { ...run1.state, saveRevision: 1 };
  assert.equal(hasCampaignProgression(state), true);
  assert.ok(state.completedLevelIds.includes('op01_l1'));
  assert.ok(state.unlockedLevelIds.includes('op01_l2'));
  assert.ok(state.pilotProgress.medals.includes('Evasive Ghost'));
  assert.ok(state.pilotProgress.medals.includes('Deadeye Marksman'));
  assert.ok(state.pilotProgress.xp > 0);
  assert.ok(state.pilotProgress.credits > 0);

  const status = writeCampaignToAllLayers(serializeCampaignState(state), backend, false);
  assert.equal(status.localStorage, true);
  assert.equal(status.sessionStorage, true);
  assert.equal(status.windowName, true);

  const loaded = readCampaignFromSyncLayers(
    deserializeCampaignState,
    serializeCampaignState,
    backend,
  );
  assert.ok(loaded);
  assert.deepEqual(loaded.completedLevelIds, ['op01_l1']);
  assert.ok(loaded.unlockedLevelIds.includes('op01_l2'));
  assert.equal(loaded.currentLevelId, 'op01_l2');
  assert.equal(loaded.pilotProgress.xp, state.pilotProgress.xp);
  assert.equal(loaded.pilotProgress.credits, state.pilotProgress.credits);
  assert.deepEqual(loaded.pilotProgress.medals, state.pilotProgress.medals);
});

test('Safari cross-origin iframe fallback preserves full progress & livery via window.name when localStorage & sessionStorage are blocked', () => {
  const blockedBackend = createMemoryBackend({
    blockLocalStorage: true,
    blockSessionStorage: true,
  });

  // Clear OP 01 LVL 1 + LVL 2 to unlock Rank 1 (vanguard_cobalt livery)
  let state = createInitialCampaignState('normal');
  state = applyLevelCompletionWithSummary(state, 'op01_l1', {
    spaceKills: 6,
    shotsFired: 16,
    shotsHit: 12,
    hullRemainingPct: 95,
    elapsedSec: 38,
    combatScore: 2100,
    maxCombo: 5,
  }).state;
  state = applyLevelCompletionWithSummary(state, 'op01_l2', {
    spaceKills: 8,
    shotsFired: 20,
    shotsHit: 14,
    hullRemainingPct: 92,
    elapsedSec: 45,
    combatScore: 2400,
    maxCombo: 6,
  }).state;
  const liveryRes = selectPilotCosmeticLivery(state, 'vanguard_cobalt');
  assert.equal(liveryRes.applied, true);
  state = { ...liveryRes.state, saveRevision: 3 };

  const status = writeCampaignToAllLayers(serializeCampaignState(state), blockedBackend, false);
  assert.equal(status.localStorage, false);
  assert.equal(status.sessionStorage, false);
  assert.equal(status.windowName, true);
  assert.ok(blockedBackend.winName.startsWith(CAMPAIGN_WINDOW_NAME_PREFIX));

  // Simulate iframe reload with localStorage/sessionStorage still blocked
  const restored = readCampaignFromSyncLayers(
    deserializeCampaignState,
    serializeCampaignState,
    blockedBackend,
  );
  assert.ok(restored);
  assert.deepEqual(restored.completedLevelIds, ['op01_l1', 'op01_l2']);
  assert.ok(restored.unlockedLevelIds.includes('op01_l3'));
  assert.equal(restored.currentLevelId, 'op01_l3');
  assert.equal(restored.pilotProgress.activeCosmeticId, 'vanguard_cobalt');
  assert.equal(restored.pilotProgress.xp, state.pilotProgress.xp);
  assert.equal(restored.pilotProgress.credits, state.pilotProgress.credits);
});

test('multi-layer reconciliation picks strictly fresher save, self-heals stale localStorage, and refuses empty overwrite', () => {
  const backend = createMemoryBackend();
  const emptyDefault = createInitialCampaignState('normal');
  const cleared1 = {
    ...applyLevelCompletionWithSummary(emptyDefault, 'op01_l1', {
      spaceKills: 5,
      shotsFired: 15,
      shotsHit: 10,
      hullRemainingPct: 90,
      elapsedSec: 45,
      combatScore: 1800,
      maxCombo: 4,
    }).state,
    saveRevision: 2,
    savedAtIso: '2026-11-24T12:00:00.000Z',
  };
  const cleared2 = {
    ...applyLevelCompletionWithSummary(cleared1, 'op01_l2', {
      spaceKills: 7,
      shotsFired: 20,
      shotsHit: 14,
      hullRemainingPct: 88,
      elapsedSec: 50,
      combatScore: 2200,
      maxCombo: 5,
    }).state,
    saveRevision: 4,
    savedAtIso: '2026-11-24T12:05:00.000Z',
  };

  // Fresh default save must NEVER beat a progressed save
  assert.equal(isCandidateFresher(emptyDefault, cleared1), false);
  assert.equal(selectAuthoritativeSave([emptyDefault, cleared1])?.currentLevelId, 'op01_l2');

  // Put stale rev 2 in localStorage and fresher rev 4 in window.name
  backend.ls.set(CAMPAIGN_SAVE_KEY, serializeCampaignState(cleared1));
  backend.winName = `${CAMPAIGN_WINDOW_NAME_PREFIX}${serializeCampaignState(cleared2)}`;

  const resolved = readCampaignFromSyncLayers(
    deserializeCampaignState,
    serializeCampaignState,
    backend,
  );
  assert.ok(resolved);
  assert.equal(resolved.saveRevision, 4);
  assert.deepEqual(resolved.completedLevelIds, ['op01_l1', 'op01_l2']);

  // Verify localStorage was self-healed to rev 4
  const healedLs = deserializeCampaignState(backend.ls.get(CAMPAIGN_SAVE_KEY) ?? null);
  assert.equal(healedLs?.saveRevision, 4);
  assert.equal(healedLs?.currentLevelId, 'op01_l3');

  // Clearing only removes our key and never touches unrelated keys
  backend.ls.set('unrelated_user_key', 'keep_me');
  clearCampaignFromAllLayers(backend, false);
  assert.equal(backend.ls.get(CAMPAIGN_SAVE_KEY), undefined);
  assert.equal(backend.ls.get('unrelated_user_key'), 'keep_me');
  assert.equal(backend.winName, '');
});
