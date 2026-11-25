import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_LEVELS,
  DIFFICULTY_LIST,
  computeScaledEnemyStats,
  evaluateLevelProgress,
  getDifficultyProfile,
  getLevelConfig,
  getTotalRosterCount,
} from './campaignConfig';

test('campaign defines 6 progressive ground theaters with fair tactical squad counts and Sovereign boss on Level 6', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 6);
  const l1 = getLevelConfig(1);
  const l3 = getLevelConfig(3);
  const l5 = getLevelConfig(5);
  const l6 = getLevelConfig(6);

  assert.equal(l1.title, 'The Fall of Aether Prime');
  assert.equal(l1.hasSovereignBoss, false);
  assert.equal(l3.objectiveStructureCount, 2);
  assert.equal(l6.title, 'The Last Stand');
  assert.equal(l6.hasSovereignBoss, true);

  // Phase 5 fair squad counts: Easy 3-5, Standard 5-8, Major 12-18
  const r1 = getTotalRosterCount(l1.roster);
  const r3 = getTotalRosterCount(l3.roster);
  const r5 = getTotalRosterCount(l5.roster);
  assert.ok(r1 >= 3 && r1 <= 5, `Expected easy roster 3-5, got ${r1}`);
  assert.ok(r3 >= 5 && r3 <= 8, `Expected standard roster 5-8, got ${r3}`);
  assert.ok(r5 >= 12 && r5 <= 18, `Expected major roster 12-18, got ${r5}`);
  assert.ok(l6.roster.elite_guard > l1.roster.elite_guard);
});

test('all 4 difficulty modes scale lethality, aggression, accuracy, and coordination monotonically', () => {
  assert.equal(DIFFICULTY_LIST.length, 4);
  const story = getDifficultyProfile('story');
  const normal = getDifficultyProfile('normal');
  const hard = getDifficultyProfile('hard');
  const nightmare = getDifficultyProfile('nightmare');

  assert.ok(story.incomingDamage < normal.incomingDamage);
  assert.ok(normal.incomingDamage < hard.incomingDamage);
  assert.ok(hard.incomingDamage < nightmare.incomingDamage);

  assert.ok(story.reactionTimeSec > nightmare.reactionTimeSec);
  assert.ok(story.resourceMultiplier > nightmare.resourceMultiplier);
  assert.ok(story.maxSimultaneousShooters <= nightmare.maxSimultaneousShooters);

  const statsStory = computeScaledEnemyStats({
    baseHp: 100,
    baseDamage: 12,
    baseCooldown: 1.5,
    baseSpeed: 6,
    levelIndex: 1,
    difficulty: 'story',
  });
  const statsNightmare = computeScaledEnemyStats({
    baseHp: 100,
    baseDamage: 12,
    baseCooldown: 1.5,
    baseSpeed: 6,
    levelIndex: 5,
    difficulty: 'nightmare',
  });

  assert.ok(statsNightmare.damage > statsStory.damage * 2.5);
  assert.ok(statsNightmare.fireCooldown < statsStory.fireCooldown);
  assert.ok(statsNightmare.flankChance > statsStory.flankChance);
  assert.ok(statsNightmare.accuracySpread < statsStory.accuracySpread);
});

test('evaluateLevelProgress tracks kill targets, structure objectives, and Sovereign boss completion', () => {
  const l1 = getLevelConfig(1);
  const p1Mid = evaluateLevelProgress({
    level: l1,
    killsInLevel: 2,
    structuresDestroyed: 0,
    sovereignDefeated: false,
  });
  assert.equal(p1Mid.completed, false);
  assert.equal(p1Mid.progressPercent, 40);

  const p1Done = evaluateLevelProgress({
    level: l1,
    killsInLevel: l1.targetKills,
    structuresDestroyed: 0,
    sovereignDefeated: false,
  });
  assert.equal(p1Done.completed, true);
  assert.equal(p1Done.progressPercent, 100);

  const l3 = getLevelConfig(3);
  const p3MissingStruct = evaluateLevelProgress({
    level: l3,
    killsInLevel: l3.targetKills,
    structuresDestroyed: 1,
    sovereignDefeated: false,
  });
  assert.equal(p3MissingStruct.completed, false);

  const p3Complete = evaluateLevelProgress({
    level: l3,
    killsInLevel: l3.targetKills,
    structuresDestroyed: 2,
    sovereignDefeated: false,
  });
  assert.equal(p3Complete.completed, true);

  const l6 = getLevelConfig(6);
  const p6BossAlive = evaluateLevelProgress({
    level: l6,
    killsInLevel: 30,
    structuresDestroyed: 0,
    sovereignDefeated: false,
  });
  assert.equal(p6BossAlive.completed, false);

  const p6Victory = evaluateLevelProgress({
    level: l6,
    killsInLevel: 8,
    structuresDestroyed: 0,
    sovereignDefeated: true,
  });
  assert.equal(p6Victory.completed, true);
  assert.equal(p6Victory.progressPercent, 100);
});
