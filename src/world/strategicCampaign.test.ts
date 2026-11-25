import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CAMPAIGN_MISSIONS,
  MAIN_CAMPAIGN_MISSIONS,
  OPTIONAL_CAMPAIGN_MISSIONS,
  applyCampaignUpgrade,
  applyMissionCompletion,
  applyMissionCompletionWithSummary,
  applyStrategicDecision,
  computeDecisionEffects,
  createInitialCampaignState,
  deserializeCampaignState,
  evaluateCampaignEnding,
  serializeCampaignState,
} from './strategicCampaign';

test('space-only campaign has 10 finite main missions and 3 optional space ops with zero ground missions', () => {
  assert.equal(MAIN_CAMPAIGN_MISSIONS.length, 10);
  assert.equal(OPTIONAL_CAMPAIGN_MISSIONS.length, 3);
  assert.equal(MAIN_CAMPAIGN_MISSIONS[0].missionNumber, 1);
  assert.equal(MAIN_CAMPAIGN_MISSIONS[9].missionNumber, 10);
  assert.equal(MAIN_CAMPAIGN_MISSIONS[9].isFinalMission, true);
  assert.equal(MAIN_CAMPAIGN_MISSIONS[9].capitalShipOverride?.shipClass, 'sovereign_flagship');

  for (const m of ALL_CAMPAIGN_MISSIONS) {
    assert.equal(m.theater, 'space', `Mission ${m.id} must be space-only`);
  }
});

test('mission completion grants resources, unlocks spacecraft, triggers strategic decisions, and finishes on OP 10', () => {
  let state = createInitialCampaignState('normal');
  assert.equal(state.currentMissionNumber, 1);
  assert.equal(state.campaignCompleted, false);
  assert.deepEqual(state.spaceLoadout.unlockedShips, ['light_interceptor', 'heavy_fighter']);

  // Complete OP 01 -> unlocks OP 02
  state = applyMissionCompletion(state, 'm1_fall_of_aether_prime_orbit', {
    spaceKills: 7,
    distanceTraveledKm: 6.4,
  });
  assert.equal(state.currentMissionNumber, 2);
  assert.equal(state.stats.totalSpaceKills, 7);
  assert.equal(state.stats.distanceTraveledKm, 6.4);
  assert.ok(state.resources.salvage > 200);

  // Complete OP 02 -> unlocks B-7 Hammerhead Strike Bomber
  state = applyMissionCompletion(state, 'm2_broken_orbit', {
    spaceKills: 8,
    subsystemsDestroyed: 2,
    capitalShipsDestroyed: 1,
  });
  assert.ok(state.spaceLoadout.unlockedShips.includes('strike_bomber'));
  assert.equal(state.stats.capitalShipsDestroyed, 1);

  // Complete OP 03 -> unlocks SR-4 Specter & triggers strategic decision I
  state = applyMissionCompletion(state, 'm3_the_lost_fleet', { spaceKills: 9 });
  assert.ok(state.spaceLoadout.unlockedShips.includes('recon_craft'));
  assert.equal(state.pendingDecisionId, 'dec_fleet_vs_platform');

  // Make strategic decision
  state = applyStrategicDecision(state, 'dec_fleet_vs_platform', 'save_allied_fleet');
  assert.equal(state.pendingDecisionId, null);
  assert.equal(state.decisions.dec_fleet_vs_platform, 'save_allied_fleet');
  const effects = computeDecisionEffects(state);
  assert.ok(effects.extraAlliedFighters >= 2);

  // Complete OP 06 -> unlocks X-01 Sovereign Bane Prototype
  state = applyMissionCompletion(state, 'm6_the_hidden_installation', { spaceKills: 10 });
  assert.ok(state.spaceLoadout.unlockedShips.includes('advanced_prototype'));

  // Complete OP 10 -> marks definitive campaign completion
  state = applyMissionCompletion(state, 'm10_the_last_stand', {
    spaceKills: 14,
    subsystemsDestroyed: 5,
    capitalShipsDestroyed: 1,
  });
  assert.equal(state.campaignCompleted, true);
});

test('Fleet Hangar ship unlocks and weapon/countermeasure upgrades deduct resources and enforce caps', () => {
  let state = createInitialCampaignState('normal');
  state.resources = { salvage: 800, supplies: 300, intel: 150, fleetReadiness: 65 };

  const railRes = applyCampaignUpgrade(state, 'space_rail');
  assert.equal(railRes.applied, true);
  assert.equal(railRes.state.spaceLoadout.railLevel, 2);
  assert.ok(railRes.state.resources.salvage < 800);

  const cmRes = applyCampaignUpgrade(railRes.state, 'space_countermeasures');
  assert.equal(cmRes.applied, true);
  assert.equal(cmRes.state.spaceLoadout.countermeasureLevel, 2);

  const unlockProto = applyCampaignUpgrade(cmRes.state, 'unlock_prototype');
  assert.equal(unlockProto.applied, true);
  assert.equal(unlockProto.state.spaceLoadout.selectedShipId, 'advanced_prototype');
  assert.ok(unlockProto.state.spaceLoadout.unlockedShips.includes('advanced_prototype'));

  // Insufficient resources rejected cleanly
  const broke = {
    ...unlockProto.state,
    resources: { salvage: 0, supplies: 0, intel: 0, fleetReadiness: 50 },
  };
  const rejected = applyCampaignUpgrade(broke, 'space_shields');
  assert.equal(rejected.applied, false);
});

test('campaign serialization round-trips cleanly and ending evaluator reflects space decisions', () => {
  let state = createInitialCampaignState('hard');
  state = applyMissionCompletion(state, 'm3_the_lost_fleet', { spaceKills: 8 });
  state = applyStrategicDecision(state, 'dec_fleet_vs_platform', 'destroy_weapons_platform');
  state = applyMissionCompletion(state, 'opt_salvage_run', { spaceKills: 5 });
  state.resources.fleetReadiness = 82;

  const raw = serializeCampaignState(state);
  const loaded = deserializeCampaignState(raw);
  assert.ok(loaded);
  assert.equal(loaded.difficulty, 'hard');
  assert.equal(loaded.decisions.dec_fleet_vs_platform, 'destroy_weapons_platform');
  assert.ok(loaded.completedOptionalIds.includes('opt_salvage_run'));

  const ending = evaluateCampaignEnding(loaded);
  assert.equal(ending.variant, 'triumphant_liberation');
  assert.ok(ending.consequences.some((c) => c.includes('Orbital Siege Platform')));
});

test('replaying a completed mission grants zero duplicate rewards and preserves campaign progression across reload', () => {
  const initial = createInitialCampaignState('normal');
  const firstRun = applyMissionCompletionWithSummary(initial, 'm1_fall_of_aether_prime_orbit', {
    spaceKills: 7,
    shotsFired: 40,
    shotsHit: 28,
    elapsedSec: 94,
    hullRemainingPct: 86,
    distanceTraveledKm: 5.2,
  });
  assert.ok(firstRun.summary);
  assert.equal(firstRun.summary.firstClear, true);
  assert.equal(firstRun.summary.rewardsGranted.salvage, 130);
  assert.equal(firstRun.summary.accuracyPct, 70);
  assert.equal(firstRun.summary.nextMissionId, 'm2_broken_orbit');
  assert.equal(firstRun.state.currentMissionNumber, 2);

  // Replay OP 01 -> zero duplicate resources, no accidental mission skip
  const replayRun = applyMissionCompletionWithSummary(firstRun.state, 'm1_fall_of_aether_prime_orbit', {
    spaceKills: 6,
    shotsFired: 30,
    shotsHit: 21,
    elapsedSec: 72,
    hullRemainingPct: 92,
  });
  assert.ok(replayRun.summary);
  assert.equal(replayRun.summary.firstClear, false);
  assert.equal(replayRun.summary.rewardsGranted.salvage, 0);
  assert.equal(replayRun.summary.rewardsGranted.supplies, 0);
  assert.equal(replayRun.summary.rewardsGranted.intel, 0);
  assert.equal(replayRun.summary.rewardsGranted.fleetReadiness, 0);
  assert.equal(replayRun.state.resources.salvage, firstRun.state.resources.salvage);
  assert.equal(replayRun.state.currentMissionNumber, 2);
  assert.equal(replayRun.state.stats.missionsCompletedCount, 1);

  // Reload persistence preserves claimedRewardMissionIds
  const reloaded = deserializeCampaignState(serializeCampaignState(replayRun.state));
  assert.ok(reloaded);
  assert.ok(reloaded.claimedRewardMissionIds.includes('m1_fall_of_aether_prime_orbit'));
});

test('level-based progression tracks grades/XP/medals, blocks duplicate farming on replay, and migrates legacy v2 saves non-destructively', async () => {
  const { applyLevelCompletionWithSummary, selectPilotCosmeticLivery } = await import('./strategicCampaign');
  const initial = createInitialCampaignState('normal');
  assert.equal(initial.currentLevelId, 'op01_l1');

  // Clear OP 01 Level 1 with B grade
  const run1 = applyLevelCompletionWithSummary(initial, 'op01_l1', {
    spaceKills: 5,
    shotsFired: 45,
    shotsHit: 18,
    elapsedSec: 165,
    hullRemainingPct: 68,
    combatScore: 1050,
    maxCombo: 2,
  });
  assert.ok(run1.summary);
  assert.equal(run1.summary.firstClear, true);
  assert.equal(run1.summary.levelId, 'op01_l1');
  assert.equal(run1.summary.grade, 'B');
  assert.equal(run1.state.currentLevelId, 'op01_l2');
  assert.ok(run1.state.pilotProgress.xp > 0);
  assert.ok(run1.state.pilotProgress.credits > 0);
  const salvageAfterFirst = run1.state.resources.salvage;

  // Replay OP 01 Level 1 with same or worse grade -> 0 duplicate resources, 0 duplicate XP/credits
  const replaySame = applyLevelCompletionWithSummary(run1.state, 'op01_l1', {
    spaceKills: 5,
    shotsFired: 60,
    shotsHit: 15,
    elapsedSec: 210,
    hullRemainingPct: 50,
    combatScore: 700,
    maxCombo: 1,
  });
  assert.equal(replaySame.summary?.firstClear, false);
  assert.equal(replaySame.summary?.rewardsGranted.salvage, 0);
  assert.equal(replaySame.summary?.xpEarned, 0);
  assert.equal(replaySame.summary?.creditsEarned, 0);
  assert.equal(replaySame.state.resources.salvage, salvageAfterFirst);

  // Replay OP 01 Level 1 with S grade -> still 0 duplicate base salvage, but awards one-time grade-upgrade XP/credits & updates bestGrade to S!
  const replayS = applyLevelCompletionWithSummary(replaySame.state, 'op01_l1', {
    spaceKills: 5,
    shotsFired: 36,
    shotsHit: 25,
    elapsedSec: 88,
    hullRemainingPct: 94,
    combatScore: 2200,
    maxCombo: 5,
  });
  assert.equal(replayS.summary?.grade, 'S');
  assert.equal(replayS.summary?.rewardsGranted.salvage, 0);
  assert.ok((replayS.summary?.xpEarned ?? 0) > 0);
  assert.equal(replayS.state.levelRecords.op01_l1.bestGrade, 'S');
  assert.equal(replayS.state.levelRecords.op01_l1.completions, 3);

  // Completing final level of OP 01 (op01_l4) completes Operation 1 and advances to OP 02
  const finishOp1 = applyLevelCompletionWithSummary(replayS.state, 'op01_l4', {
    spaceKills: 7,
    shotsFired: 50,
    shotsHit: 32,
    elapsedSec: 155,
    hullRemainingPct: 82,
    combatScore: 2800,
    maxCombo: 4,
  });
  assert.ok(finishOp1.state.completedMainMissions.includes(1));
  assert.equal(finishOp1.state.currentMissionNumber, 2);
  assert.equal(finishOp1.state.currentLevelId, 'op02_l1');

  // If player ranked up to Flight Cadet (>= 600 XP), Cobalt Interceptor livery is selectable
  assert.ok(finishOp1.state.pilotProgress.xp >= 600);
  const liveryRes = selectPilotCosmeticLivery(finishOp1.state, 'vanguard_cobalt');
  assert.equal(liveryRes.applied, true);
  assert.equal(liveryRes.state.pilotProgress.activeCosmeticId, 'vanguard_cobalt');

  // Non-destructive migration of an older v2 save lacking levelRecords / pilotProgress / currentLevelId
  const legacyV2Json = JSON.stringify({
    version: 2,
    difficulty: 'hard',
    currentMissionNumber: 3,
    completedMainMissions: [1, 2],
    completedOptionalIds: ['opt_salvage_run'],
    claimedRewardMissionIds: ['m1_fall_of_aether_prime_orbit', 'm2_broken_orbit', 'opt_salvage_run'],
    discoveredRegions: ['low_orbit', 'shattered_fleet'],
    resources: { salvage: 510, supplies: 180, intel: 95, fleetReadiness: 76 },
    spaceLoadout: {
      selectedShipId: 'strike_bomber',
      unlockedShips: ['light_interceptor', 'heavy_fighter', 'strike_bomber'],
      chassisConfig: 'striker',
      pulseLevel: 2,
      plasmaLevel: 2,
      empLevel: 1,
      railLevel: 2,
      missileCapacity: 18,
      countermeasureLevel: 2,
      shieldLevel: 2,
      engineLevel: 2,
      alliedSupportLevel: 1,
      shipHullCondition: 100,
      ownedModules: [],
      equippedModules: [],
    },
    decisions: {},
    pendingDecisionId: null,
    stats: {
      totalSpaceKills: 42,
      capitalSubsystemsDestroyed: 5,
      capitalShipsDestroyed: 1,
      distanceTraveledKm: 28.5,
      missionsCompletedCount: 2,
      optionalOpsCompletedCount: 1,
      decisionsMadeCount: 0,
      playTimeSec: 640,
    },
    campaignCompleted: false,
    savedAtIso: '2026-01-01T00:00:00.000Z',
  });
  const migrated = deserializeCampaignState(legacyV2Json);
  assert.ok(migrated);
  assert.equal(migrated.resources.salvage, 510);
  assert.equal(migrated.spaceLoadout.selectedShipId, 'strike_bomber');
  assert.equal(migrated.currentMissionNumber, 3);
  assert.equal(migrated.currentLevelId, 'op03_l1');
  assert.deepEqual(migrated.completedMainMissions, [1, 2]);
  assert.equal(migrated.pilotProgress.activeCosmeticId, 'vanguard_standard');
});


