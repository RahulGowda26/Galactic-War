import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_LEVELS,
  getFinalLevelForOperation,
  getFirstLevelForOperation,
  getLevelById,
  getLevelsForOperation,
  getNextLevel,
  getOperationCompletionCounts,
  getScaledLevelTimeLimitSec,
  isFinalLevelOfOperation,
  isLevelUnlockedByProgress,
} from './campaignLevels';
import { MAIN_CAMPAIGN_MISSIONS } from './strategicCampaign';

test('all 10 operations OP 01–OP 10 are subdivided into 31 curated levels with diverse objectives', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 31);
  assert.equal(MAIN_CAMPAIGN_MISSIONS.length, 10);

  const uniqueIds = new Set(CAMPAIGN_LEVELS.map((l) => l.id));
  assert.equal(uniqueIds.size, CAMPAIGN_LEVELS.length, 'Every level must have a unique ID');

  for (let op = 1; op <= 10; op++) {
    const levels = getLevelsForOperation(op);
    assert.ok(levels.length >= 3, `OP ${op} must have at least 3 playable levels`);
    assert.equal(levels[0].levelIndexInOp, 1);
    assert.equal(isFinalLevelOfOperation(levels[levels.length - 1].id), true);
  }

  // Verify broad objective variety across the campaign
  const objectiveTypes = new Set(CAMPAIGN_LEVELS.map((l) => l.objectiveType));
  for (const required of [
    'interception',
    'survival',
    'escort',
    'pursuit',
    'assault',
    'ambush',
    'time_attack',
    'boss_encounter',
    'defence',
  ] as const) {
    assert.ok(objectiveTypes.has(required), `Missing required objective type: ${required}`);
  }

  // OP 10 final level preserves Sovereign Flagship Eternal Eclipse finale
  const finale = getFinalLevelForOperation(10);
  assert.equal(finale.id, 'op10_l3');
  assert.equal(finale.capitalShipOverride?.shipClass, 'sovereign_flagship');
  assert.equal(getNextLevel(finale.id), null);
});

test('level unlock progression advances linearly and migrates pre-existing completed operations cleanly', () => {
  // Fresh player: only op01_l1 unlocked
  assert.equal(
    isLevelUnlockedByProgress({
      levelId: 'op01_l1',
      completedLevelIds: [],
      completedMainMissions: [],
      currentMissionNumber: 1,
    }),
    true,
  );
  assert.equal(
    isLevelUnlockedByProgress({
      levelId: 'op01_l2',
      completedLevelIds: [],
      completedMainMissions: [],
      currentMissionNumber: 1,
    }),
    false,
  );

  // Completing op01_l1 unlocks op01_l2
  assert.equal(
    isLevelUnlockedByProgress({
      levelId: 'op01_l2',
      completedLevelIds: ['op01_l1'],
      completedMainMissions: [],
      currentMissionNumber: 1,
    }),
    true,
  );

  // Pre-existing v2 save that completed OP 01 & OP 02 automatically unlocks all OP 01, OP 02, and OP 03 Level 1!
  assert.equal(
    isLevelUnlockedByProgress({
      levelId: 'op02_l3',
      completedLevelIds: [],
      completedMainMissions: [1, 2],
      currentMissionNumber: 3,
    }),
    true,
  );
  assert.equal(
    isLevelUnlockedByProgress({
      levelId: getFirstLevelForOperation(3).id,
      completedLevelIds: [],
      completedMainMissions: [1, 2],
      currentMissionNumber: 3,
    }),
    true,
  );
  // Every level operationId maps to a real existing MAIN_CAMPAIGN_MISSIONS entry
  const validOpIds = new Set(MAIN_CAMPAIGN_MISSIONS.map((m) => m.id));
  for (const lvl of CAMPAIGN_LEVELS) {
    assert.ok(validOpIds.has(lvl.operationId), `Unknown operationId on ${lvl.id}: ${lvl.operationId}`);
  }
});

test('time-attack level timers scale fairly across story, normal, hard, and nightmare difficulties', () => {
  const timeAttackLvl = getLevelById('op04_l1')!;
  const storySec = getScaledLevelTimeLimitSec(timeAttackLvl, 'story')!;
  const normalSec = getScaledLevelTimeLimitSec(timeAttackLvl, 'normal')!;
  const hardSec = getScaledLevelTimeLimitSec(timeAttackLvl, 'hard')!;
  const nightmareSec = getScaledLevelTimeLimitSec(timeAttackLvl, 'nightmare')!;
  assert.ok(storySec > normalSec && normalSec > hardSec && hardSec > nightmareSec);
});
