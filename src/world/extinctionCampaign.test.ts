import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTINCTION_CAMPAIGN_OPERATION,
  EXTINCTION_LEVELS,
  EXTINCTION_ONLY_ROLES,
  computeUnlockedExtinctionLevelIds,
  createInitialExtinctionState,
  evaluateExtinctionEnding,
  getAnyEnemyRoleConfig,
  getExtinctionLevelById,
  getNextExtinctionLevel,
  isExtinctionLevelUnlocked,
  normalizeExtinctionState,
  validateExtinctionCatalog,
} from './extinctionCampaign';
import {
  applyLevelCompletionWithSummary,
  createInitialCampaignState,
  deserializeCampaignState,
  serializeCampaignState,
  setActiveCampaignTrack,
} from './strategicCampaign';
import { computeCampaignProgressScore, hasCampaignProgression } from './campaignSaveService';

test('Extinction Campaign catalog defines 10 unique levels, 3 mini-bosses, 3 major bosses, and bounded stages', () => {
  const validation = validateExtinctionCatalog();
  assert.equal(validation.valid, true, `Catalog errors: ${validation.errors.join(', ')}`);
  assert.equal(EXTINCTION_LEVELS.length, 10);
  assert.equal(EXTINCTION_LEVELS[0].id, 'ext_l01');
  assert.equal(EXTINCTION_LEVELS[0].bossId, null);
  assert.equal(EXTINCTION_LEVELS[2].bossKind, 'mini_boss');
  assert.equal(EXTINCTION_LEVELS[2].bossId, 'executioner');
  assert.equal(EXTINCTION_LEVELS[4].bossId, 'carrier_warden');
  assert.equal(EXTINCTION_LEVELS[5].bossId, 'siege_breaker');
  assert.equal(EXTINCTION_LEVELS[7].bossKind, 'major_boss');
  assert.equal(EXTINCTION_LEVELS[7].bossId, 'iron_revenant');
  assert.equal(EXTINCTION_LEVELS[8].bossId, 'void_harvester');
  assert.equal(EXTINCTION_LEVELS[9].bossId, 'sovereign_extinction');
  assert.equal(EXTINCTION_LEVELS[9].isFinalExtinctionMission, true);
  assert.equal(getNextExtinctionLevel('ext_l10'), null);
  assert.equal(EXTINCTION_CAMPAIGN_OPERATION.theater, 'space');

  // New Extinction enemy configs + fallback lookup
  assert.equal(getAnyEnemyRoleConfig('phantom_interceptor').role, 'phantom_interceptor');
  assert.equal(getAnyEnemyRoleConfig('hunter_drone').role, 'hunter_drone');
  assert.equal(getAnyEnemyRoleConfig('disruptor_ship').role, 'disruptor_ship');
  assert.equal(Object.keys(EXTINCTION_ONLY_ROLES).length, 3);
});

test('Extinction unlock & completion progression stays strictly isolated from Original 31-level campaign', () => {
  let state = createInitialCampaignState('normal');
  assert.equal(state.activeCampaignTrack, 'original');
  assert.equal(state.extinctionState?.currentLevelId, 'ext_l01');
  assert.deepEqual(state.extinctionState?.unlockedLevelIds, ['ext_l01']);
  assert.equal(
    isExtinctionLevelUnlocked({
      levelId: 'ext_l02',
      completedLevelIds: state.extinctionState?.completedLevelIds ?? [],
    }),
    false,
  );

  state = setActiveCampaignTrack(state, 'extinction');
  assert.equal(state.activeCampaignTrack, 'extinction');

  // Complete ext_l01
  const res1 = applyLevelCompletionWithSummary(state, 'ext_l01', {
    spaceKills: 10,
    shotsFired: 45,
    shotsHit: 26,
    elapsedSec: 160,
    hullRemainingPct: 88,
    maxCombo: 6,
    protectedHpPct: 82,
    combatScore: 2800,
  });
  state = res1.state;
  assert.equal(res1.summary?.campaignTrack, 'extinction');
  assert.equal(res1.summary?.firstClear, true);
  assert.equal(res1.summary?.nextLevelId, 'ext_l02');
  // Original campaign untouched!
  assert.deepEqual(state.completedLevelIds, []);
  assert.deepEqual(state.unlockedLevelIds, ['op01_l1']);
  assert.equal(state.currentLevelId, 'op01_l1');
  assert.equal(state.campaignCompleted, false);

  // Extinction progressed cleanly and shared hangar credits/XP grew
  assert.deepEqual(state.extinctionState?.completedLevelIds, ['ext_l01']);
  assert.ok(state.extinctionState?.unlockedLevelIds.includes('ext_l02'));
  assert.equal(state.extinctionState?.currentLevelId, 'ext_l02');
  assert.ok(state.pilotProgress.xp > 0);
  assert.ok(state.pilotProgress.credits > 0);

  // Replay guard: re-running ext_l01 at lower/same score does not double-grant resources or duplicate completion
  const creditsAfterFirst = state.pilotProgress.credits;
  const salvageAfterFirst = state.resources.salvage;
  const replay = applyLevelCompletionWithSummary(state, 'ext_l01', {
    spaceKills: 7,
    shotsFired: 40,
    shotsHit: 10,
    elapsedSec: 360,
    hullRemainingPct: 40,
    combatScore: 900,
  });
  assert.equal(replay.summary?.firstClear, false);
  assert.equal(replay.summary?.xpEarned, 0);
  assert.equal(replay.summary?.creditsEarned, 0);
  assert.equal(replay.state.resources.salvage, salvageAfterFirst);
  assert.equal(replay.state.pilotProgress.credits, creditsAfterFirst);
});

test('Clearing all 10 Extinction levels records bosses, unlocks Apex livery, and preserves save round-trip', () => {
  let state = createInitialCampaignState('hard');
  for (const lvl of EXTINCTION_LEVELS) {
    const res = applyLevelCompletionWithSummary(state, lvl.id, {
      spaceKills: 16,
      subsystemsDestroyed: 5,
      capitalShipsDestroyed: lvl.capitalShipOverride ? 1 : 0,
      shotsFired: 60,
      shotsHit: 46,
      elapsedSec: lvl.parTimeSec - 25,
      hullRemainingPct: 92,
      maxCombo: 9,
      protectedHpPct: 88,
      combatScore: lvl.gradeThresholds.S,
    });
    state = res.state;
  }

  const ext = state.extinctionState!;
  assert.equal(ext.completedLevelIds.length, 10);
  assert.equal(ext.extinctionCompleted, true);
  assert.equal(ext.defeatedBossIds.length, 6);
  assert.ok(state.pilotProgress.unlockedCosmetics.includes('extinction_apex'));
  // Original campaign must STILL remain uncompleted!
  assert.equal(state.campaignCompleted, false);
  assert.deepEqual(state.completedLevelIds, []);

  const ending = evaluateExtinctionEnding(ext);
  assert.equal(ending.tier, 'mythic_apex');
  assert.equal(ending.statsSummary.bossesDefeated, 6);

  // Round-trip serialization + progress score detection
  assert.equal(hasCampaignProgression(state), true);
  assert.ok(computeCampaignProgressScore(state) > 100000);
  const restored = deserializeCampaignState(serializeCampaignState(state));
  assert.ok(restored);
  assert.equal(restored!.extinctionState?.extinctionCompleted, true);
  assert.deepEqual(restored!.extinctionState?.defeatedBossIds, ext.defeatedBossIds);
  assert.equal(restored!.campaignCompleted, false);
});

test('Legacy v2 save without extinctionState migrates safely without losing Original progress', () => {
  const legacy = createInitialCampaignState('normal');
  const afterOp1 = applyLevelCompletionWithSummary(legacy, 'op01_l1', {
    spaceKills: 8,
    shotsFired: 30,
    shotsHit: 20,
    elapsedSec: 90,
    combatScore: 2200,
  }).state;

  const rawJson = JSON.parse(serializeCampaignState(afterOp1)) as Record<string, unknown>;
  delete rawJson.extinctionState;
  delete rawJson.activeCampaignTrack;

  const migrated = deserializeCampaignState(JSON.stringify(rawJson));
  assert.ok(migrated);
  assert.deepEqual(migrated!.completedLevelIds, ['op01_l1']);
  assert.equal(migrated!.currentLevelId, 'op01_l2');
  assert.equal(migrated!.activeCampaignTrack, 'original');
  assert.deepEqual(migrated!.extinctionState?.unlockedLevelIds, ['ext_l01']);
  assert.equal(migrated!.extinctionState?.completedLevelIds.length, 0);

  // normalizeExtinctionState filters invalid IDs cleanly
  const normalized = normalizeExtinctionState({
    completedLevelIds: ['ext_l01', 'fake_level'],
    defeatedBossIds: ['executioner', 'not_a_boss' as never],
  });
  assert.deepEqual(normalized.completedLevelIds, ['ext_l01']);
  assert.deepEqual(
    computeUnlockedExtinctionLevelIds({ completedLevelIds: normalized.completedLevelIds }),
    ['ext_l01', 'ext_l02'],
  );
  assert.ok(getExtinctionLevelById('ext_l09')?.bossId === 'void_harvester');
  assert.equal(createInitialExtinctionState().currentLevelId, 'ext_l01');
});
