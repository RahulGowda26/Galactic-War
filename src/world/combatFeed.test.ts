import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TacticalCombatFeed,
  formatMissionClock,
  type CombatThresholdSnapshot,
} from './combatFeed';

function makeSnapshot(
  overrides: Partial<CombatThresholdSnapshot> = {},
): CombatThresholdSnapshot {
  return {
    elapsedSec: 12,
    kills: 0,
    totalEnemies: 12,
    headshots: 0,
    health: 100,
    shield: 100,
    ammoInMag: 30,
    magSize: 30,
    isDead: false,
    engagedEnemies: 0,
    resupplyCount: 0,
    regionId: 'crown_city',
    distanceToSovereign: 2300,
    ...overrides,
  };
}

test('formatMissionClock formats seconds into MM:SS', () => {
  assert.equal(formatMissionClock(0), '00:00');
  assert.equal(formatMissionClock(65.8), '01:05');
  assert.equal(formatMissionClock(602), '10:02');
});

test('emits Target Neutralized and streak thresholds on kills without duplicating', () => {
  const feed = new TacticalCombatFeed();
  feed.evaluate(makeSnapshot({ elapsedSec: 1 }));

  const firstKill = feed.evaluate(
    makeSnapshot({ elapsedSec: 8, kills: 1, headshots: 1 }),
  );
  assert.ok(
    firstKill.some((e) => e.message.includes('Target Neutralized') && e.message.includes('Precision Kill')),
  );

  // Re-evaluating same state emits nothing
  assert.equal(
    feed.evaluate(makeSnapshot({ elapsedSec: 9, kills: 1, headshots: 1 })).length,
    0,
  );

  // Reaching 3 kills triggers combat threshold streak
  const thirdKill = feed.evaluate(makeSnapshot({ elapsedSec: 18, kills: 3, headshots: 1 }));
  assert.ok(thirdKill.some((e) => e.message.includes('Target Neutralized')));
  assert.ok(thirdKill.some((e) => e.tag === 'STREAK'));
});

test('emits Sovereign Presence Detected when entering Arrival Zone or close proximity', () => {
  const feed = new TacticalCombatFeed();
  feed.evaluate(makeSnapshot({ elapsedSec: 2, distanceToSovereign: 2200 }));

  const detected = feed.evaluate(
    makeSnapshot({
      elapsedSec: 25,
      regionId: 'arrival_zone',
      distanceToSovereign: 420,
    }),
  );
  assert.ok(
    detected.some(
      (e) =>
        e.message.includes('Sovereign Presence Detected') &&
        e.severity === 'critical',
    ),
  );

  // Moving very close triggers Dais proximity threat
  const close = feed.evaluate(
    makeSnapshot({
      elapsedSec: 32,
      regionId: 'arrival_zone',
      distanceToSovereign: 90,
    }),
  );
  assert.ok(close.some((e) => e.tag === 'THREAT'));
});

test('emits shield depletion, critical armor, low ammo, and bounds rolling buffer', () => {
  const feed = new TacticalCombatFeed(5);
  feed.evaluate(makeSnapshot({ elapsedSec: 1 }));

  const events = feed.evaluate(
    makeSnapshot({
      elapsedSec: 15,
      shield: 0,
      health: 28,
      ammoInMag: 5,
      engagedEnemies: 2,
    }),
  );
  assert.ok(events.some((e) => e.tag === 'CONTACT'));
  assert.ok(events.some((e) => e.tag === 'SHIELD'));
  assert.ok(events.some((e) => e.tag === 'VITALS'));
  assert.ok(events.some((e) => e.tag === 'AMMO'));

  // Buffer stays strictly bounded at maxEntries = 5
  assert.equal(feed.getEntries().length, 5);
});
