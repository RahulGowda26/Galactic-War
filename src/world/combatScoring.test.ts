import test from 'node:test';
import assert from 'node:assert/strict';
import { getLevelById } from './campaignLevels';
import {
  PILOT_RANKS,
  computeGradeImprovementBonus,
  computePilotRankProgress,
  createCombatScoreState,
  evaluateLevelPerformance,
  recordCombatHit,
  recordCombatKill,
  recordCombatMiss,
  recordMissileEvadedBonus,
  recordNearMissBonus,
  recordPlayerHullDamagePenalty,
  recordSubsystemBreakScore,
  tickCombatScoreState,
} from './combatScoring';

test('combat score and combo system rewards skill streaks, decays on idle, and penalizes missed sprays or hull damage', () => {
  const s = createCombatScoreState();

  // 5 consecutive hits award precision milestone bonus
  for (let i = 0; i < 5; i++) {
    recordCombatHit(s, { distanceMeters: 310 });
  }
  assert.equal(s.consecutiveHits, 5);
  assert.ok(s.score > 150);
  assert.equal(s.activeCallout?.label, 'PRECISION x5');

  // Fast double kill at close range builds combo multiplier and emits multi-kill callout
  recordCombatKill(s, { shipClass: 'fighter', distanceMeters: 280 });
  recordCombatKill(s, { shipClass: 'fighter', distanceMeters: 260 });
  assert.equal(s.comboCount, 2);
  assert.equal(s.comboMultiplier, 1.25);
  assert.equal(s.closeRangeKills, 2);
  assert.equal(s.multiKillsCount, 1);
  assert.equal(s.activeCallout?.label, 'DOUBLE KILL');

  // Near miss & missile evasion + subsystem break award distinct tactical bonuses
  recordNearMissBonus(s);
  recordMissileEvadedBonus(s);
  recordSubsystemBreakScore(s);
  assert.equal(s.nearMissCount, 1);
  assert.equal(s.missilesEvaded, 1);
  assert.equal(s.subsystemsDestroyed, 1);
  assert.equal(s.comboCount, 3);

  // Spraying misses breaks consecutive hits and reduces combo multiplier
  for (let i = 0; i < 5; i++) recordCombatMiss(s);
  assert.equal(s.consecutiveHits, 0);
  assert.equal(s.comboCount, 2);

  // Heavy hull damage resets active combo momentum
  recordPlayerHullDamagePenalty(s, 14);
  assert.equal(s.comboCount, 0);
  assert.equal(s.comboMultiplier, 1.0);

  // Idle timer decays combo back to 0 cleanly
  recordCombatKill(s, { shipClass: 'fighter', distanceMeters: 500 });
  assert.equal(s.comboCount, 1);
  tickCombatScoreState(s, 8.0);
  assert.equal(s.comboCount, 0);
  assert.equal(s.activeCallout, null);
});

test('level grading (C/B/A/S), medals, and grade-improvement bonuses are balanced and non-exploitable', () => {
  const lvl1 = getLevelById('op01_l1')!;

  const cRun = evaluateLevelPerformance({
    level: lvl1,
    combatScore: 600,
    shotsFired: 80,
    shotsHit: 16, // 20% acc
    kills: 5,
    elapsedSec: 260,
    hullRemainingPct: 35,
    maxCombo: 1,
    subsystemsDestroyed: 0,
  });
  assert.equal(cRun.grade, 'C');
  assert.equal(cRun.optionalCompleted, false);

  const sRun = evaluateLevelPerformance({
    level: lvl1,
    combatScore: 1950,
    shotsFired: 40,
    shotsHit: 26, // 65% acc >= 45% optional target
    kills: 5,
    elapsedSec: 95, // under 120s par
    hullRemainingPct: 92,
    maxCombo: 6,
    subsystemsDestroyed: 0,
    missilesEvaded: 2,
  });
  assert.equal(sRun.grade, 'S');
  assert.equal(sRun.optionalCompleted, true);
  assert.ok(sRun.medalsEarned.includes('Deadeye Marksman'));
  assert.ok(sRun.medalsEarned.includes('Untouchable'));
  assert.ok(sRun.medalsEarned.includes('Tactical Master'));
  assert.ok(sRun.xpEarned > cRun.xpEarned);

  // Replaying with equal or lower grade grants zero duplicate bonus; strictly higher grade grants one-time delta
  assert.deepEqual(computeGradeImprovementBonus(lvl1, 'S', 'S'), { xpDelta: 0, creditsDelta: 0 });
  assert.deepEqual(computeGradeImprovementBonus(lvl1, 'A', 'B'), { xpDelta: 0, creditsDelta: 0 });
  const upgrade = computeGradeImprovementBonus(lvl1, 'B', 'S');
  assert.ok(upgrade.xpDelta > 0 && upgrade.creditsDelta > 0);
});

test('pilot XP rank progression advances smoothly through all 7 ranks and unlocks hull liveries', () => {
  assert.equal(PILOT_RANKS.length, 7);
  const recruit = computePilotRankProgress(0);
  assert.equal(recruit.currentRank.title, 'Recruit');
  assert.equal(recruit.nextRank?.title, 'Flight Cadet');
  assert.equal(recruit.unlockedCosmetics.length, 1);

  const ace = computePilotRankProgress(3400);
  assert.equal(ace.currentRank.title, 'Squadron Ace');
  assert.equal(ace.unlockedCosmetics.length, 4);

  const legend = computePilotRankProgress(15000);
  assert.equal(legend.currentRank.title, 'Legend');
  assert.equal(legend.nextRank, null);
  assert.equal(legend.progressRatio, 1);
  assert.equal(legend.unlockedCosmetics.length, 7);
});
