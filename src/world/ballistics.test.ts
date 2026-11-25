import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_BALLISTICS,
  advanceProjectileSegment,
  canLaunchHomingMissile,
  computeAimDirectionWithAssist,
  computeConsecutiveHitMultiplier,
  computeDistanceDamageFalloff,
  type Vec3Like,
} from './ballistics';
import { segmentIntersectsSphere, stepMissileGuidance } from './combatTactics';

function simulateBallisticShot(params: {
  weapon: keyof typeof WEAPON_BALLISTICS;
  aimDir: Vec3Like;
  targetStartPos: Vec3Like;
  targetVel: Vec3Like;
  hitRadius?: number;
  dt?: number;
}) {
  const profile = WEAPON_BALLISTICS[params.weapon];
  const dt = params.dt ?? 0.016;
  const hitRadius = params.hitRadius ?? 12.2;
  let pos: Vec3Like = { x: 0, y: 0, z: 0 };
  const vel: Vec3Like = {
    x: params.aimDir.x * profile.projectileSpeed,
    y: params.aimDir.y * profile.projectileSpeed,
    z: params.aimDir.z * profile.projectileSpeed,
  };
  let targetPos = { ...params.targetStartPos };
  let traveled = 0;
  let elapsed = 0;

  while (elapsed < profile.maxLifeSec && traveled < profile.maxRangeMeters) {
    const step = advanceProjectileSegment({
      pos,
      vel,
      dt,
      traveledMeters: traveled,
      maxRangeMeters: profile.maxRangeMeters,
    });
    targetPos = {
      x: targetPos.x + params.targetVel.x * dt,
      y: targetPos.y + params.targetVel.y * dt,
      z: targetPos.z + params.targetVel.z * dt,
    };
    const hit = segmentIntersectsSphere(step.prevPos, step.nextPos, targetPos, hitRadius);
    traveled = step.nextTraveledMeters;
    pos = step.nextPos;
    elapsed += dt;
    if (hit) {
      return {
        hit: true,
        elapsedSec: Number(elapsed.toFixed(3)),
        traveledMeters: Number(traveled.toFixed(1)),
        falloff: computeDistanceDamageFalloff(params.weapon, traveled),
      };
    }
    if (step.expiredByRange) break;
  }

  return {
    hit: false,
    elapsedSec: Number(elapsed.toFixed(3)),
    traveledMeters: Number(traveled.toFixed(1)),
    falloff: 0,
  };
}

test('Pulse, Heavy Plasma, EMP, and Rail Cannon enforce physical distance falloff and hard max-range dissipation', () => {
  // Pulse: effective 520m, max 920m
  assert.equal(computeDistanceDamageFalloff('pulse', 250), 1.0);
  assert.equal(computeDistanceDamageFalloff('pulse', 520), 1.0);
  const pulseMid = computeDistanceDamageFalloff('pulse', 720);
  assert.ok(pulseMid < 1.0 && pulseMid > 0.42, `Expected partial falloff at 720m, got ${pulseMid}`);
  assert.equal(computeDistanceDamageFalloff('pulse', 921), 0);

  // Heavy Plasma: slower bolt, shorter effective 460m, max 780m
  assert.ok(
    WEAPON_BALLISTICS.heavy_plasma.projectileSpeed < WEAPON_BALLISTICS.pulse.projectileSpeed,
    'Heavy Plasma must travel noticeably slower than Pulse Cannon',
  );
  assert.equal(computeDistanceDamageFalloff('heavy_plasma', 400), 1.0);
  assert.ok(computeDistanceDamageFalloff('heavy_plasma', 650) < 0.85);
  assert.equal(computeDistanceDamageFalloff('heavy_plasma', 800), 0);

  // EMP: tactical 440m effective, 680m max
  assert.equal(computeDistanceDamageFalloff('emp', 420), 1.0);
  assert.equal(computeDistanceDamageFalloff('emp', 700), 0);

  // Rail Cannon: high velocity long-range 1050m effective, 1550m max, never infinite 3km sniper
  assert.ok(WEAPON_BALLISTICS.rail_cannon.projectileSpeed > 1500);
  assert.equal(computeDistanceDamageFalloff('rail_cannon', 1000), 1.0);
  assert.ok(computeDistanceDamageFalloff('rail_cannon', 1350) < 0.9);
  assert.equal(computeDistanceDamageFalloff('rail_cannon', 1600), 0);
});

test('ballistic projectiles require genuine leading on lateral targets and cannot hit beyond maxRangeMeters', () => {
  // Stationary target inside Pulse effective range -> clean hit with finite travel time
  const pulseShort = simulateBallisticShot({
    weapon: 'pulse',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -380 },
    targetVel: { x: 0, y: 0, z: 0 },
  });
  assert.equal(pulseShort.hit, true);
  assert.ok(pulseShort.elapsedSec > 0.4 && pulseShort.elapsedSec < 0.65);
  assert.equal(pulseShort.falloff, 1.0);

  // Stationary target BEYOND Pulse maxRangeMeters (1250m) -> MUST MISS (dissipates at 920m)
  const pulseTooFar = simulateBallisticShot({
    weapon: 'pulse',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -1250 },
    targetVel: { x: 0, y: 0, z: 0 },
  });
  assert.equal(pulseTooFar.hit, false);
  assert.ok(pulseTooFar.traveledMeters <= WEAPON_BALLISTICS.pulse.maxRangeMeters + 0.1);

  // Fast lateral-moving target with Heavy Plasma aimed straight at current pos (NO lead) -> MUST MISS!
  const plasmaNoLead = simulateBallisticShot({
    weapon: 'heavy_plasma',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -420 },
    targetVel: { x: 110, y: 0, z: 0 },
  });
  assert.equal(plasmaNoLead.hit, false, 'Un-led slow Heavy Plasma shot must miss laterally crossing fighter');

  // Properly led Heavy Plasma shot hits the crossing fighter!
  const leadTime = 420 / WEAPON_BALLISTICS.heavy_plasma.projectileSpeed;
  const leadX = 110 * leadTime;
  const len = Math.hypot(leadX, 420);
  const plasmaLed = simulateBallisticShot({
    weapon: 'heavy_plasma',
    aimDir: { x: leadX / len, y: 0, z: -420 / len },
    targetStartPos: { x: 0, y: 0, z: -420 },
    targetVel: { x: 110, y: 0, z: 0 },
  });
  assert.equal(plasmaLed.hit, true, 'Properly led Heavy Plasma shot must connect on moving target');

  // Approaching target is intercepted earlier; receding target takes longer (and can outrun maxRange!)
  const approaching = simulateBallisticShot({
    weapon: 'pulse',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -680 },
    targetVel: { x: 0, y: 0, z: 160 },
  });
  const recedingOutOfRange = simulateBallisticShot({
    weapon: 'pulse',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -850 },
    targetVel: { x: 0, y: 0, z: -160 },
  });
  assert.equal(approaching.hit, true);
  assert.equal(recedingOutOfRange.hit, false, 'Receding enemy escaping past 920m must not be hit by Pulse');

  // Rail Cannon at 1300m hits stationary target when aligned, misses when 1500m+ out of range
  const railLong = simulateBallisticShot({
    weapon: 'rail_cannon',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -1300 },
    targetVel: { x: 0, y: 0, z: 0 },
  });
  assert.equal(railLong.hit, true);
  assert.ok(railLong.falloff > 0.55 && railLong.falloff < 1.0);

  const railPastMax = simulateBallisticShot({
    weapon: 'rail_cannon',
    aimDir: { x: 0, y: 0, z: -1 },
    targetStartPos: { x: 0, y: 0, z: -1850 },
    targetVel: { x: 0, y: 0, z: 0 },
  });
  assert.equal(railPastMax.hit, false);
});

test('aim assist is transparent, strictly micro-cone capped, disabled in OFF mode, and never snaps 10-30 degrees', () => {
  const fwd = { x: 0, y: 0, z: -1 };
  // Target 12 degrees off boresight (previously auto-snapped by old 30-deg bug!)
  const rad12 = (12 * Math.PI) / 180;
  const tgt12 = { x: Math.sin(rad12), y: 0, z: -Math.cos(rad12) };

  for (const mode of ['off', 'subtle', 'standard'] as const) {
    const res = computeAimDirectionWithAssist({
      forward: fwd,
      targetDir: tgt12,
      weapon: 'pulse',
      mode,
      distanceMeters: 420,
    });
    assert.equal(res.assisted, false, `Must NEVER auto-aim 12 degrees off-axis in ${mode} mode`);
    assert.equal(res.dir.x, 0);
  }

  // Target 1.0 degree off boresight: OFF -> zero assist; SUBTLE -> tiny partial blend; RAIL -> zero assist on subtle
  const rad1 = (1.0 * Math.PI) / 180;
  const tgt1 = { x: Math.sin(rad1), y: 0, z: -Math.cos(rad1) };

  const pulseOff = computeAimDirectionWithAssist({
    forward: fwd,
    targetDir: tgt1,
    weapon: 'pulse',
    mode: 'off',
    distanceMeters: 400,
  });
  assert.equal(pulseOff.assisted, false);

  const pulseSubtle = computeAimDirectionWithAssist({
    forward: fwd,
    targetDir: tgt1,
    weapon: 'pulse',
    mode: 'subtle',
    distanceMeters: 400,
  });
  assert.equal(pulseSubtle.assisted, true);
  assert.ok(pulseSubtle.dir.x > 0 && pulseSubtle.dir.x < tgt1.x, 'Micro-assist must blend gently, never 100% snap');

  const railSubtle = computeAimDirectionWithAssist({
    forward: fwd,
    targetDir: tgt1,
    weapon: 'rail_cannon',
    mode: 'subtle',
    distanceMeters: 800,
  });
  assert.equal(railSubtle.assisted, false, 'Rail Cannon must not receive auto-aim in subtle mode');

  // Even 0.5 deg off-axis beyond weapon maxRangeMeters receives ZERO assist
  const beyondRange = computeAimDirectionWithAssist({
    forward: fwd,
    targetDir: tgt1,
    weapon: 'pulse',
    mode: 'standard',
    distanceMeters: 1200,
  });
  assert.equal(beyondRange.assisted, false);
});

test('Homing Missiles enforce strict target lock before launch and obey finite evadable guidance', () => {
  // No target -> rejected cleanly
  const noTarget = canLaunchHomingMissile({
    hasValidTarget: false,
    lockProgress: 0,
    distanceMeters: 500,
    targetForwardCos: 1,
    ammoRemaining: 10,
    cooldownSec: 0,
    playerHull: 100,
  });
  assert.equal(noTarget.allowed, false);
  assert.equal(noTarget.reason, 'no_target');

  // Partial lock (60%) -> rejected cleanly
  const partialLock = canLaunchHomingMissile({
    hasValidTarget: true,
    lockProgress: 0.6,
    distanceMeters: 500,
    targetForwardCos: 0.96,
    ammoRemaining: 10,
    cooldownSec: 0,
    playerHull: 100,
  });
  assert.equal(partialLock.allowed, false);
  assert.equal(partialLock.reason, 'lock_incomplete');

  // Out of launch range (1500m) -> rejected cleanly
  const tooFar = canLaunchHomingMissile({
    hasValidTarget: true,
    lockProgress: 1.0,
    distanceMeters: 1500,
    targetForwardCos: 0.99,
    ammoRemaining: 10,
    cooldownSec: 0,
    playerHull: 100,
  });
  assert.equal(tooFar.allowed, false);
  assert.equal(tooFar.reason, 'out_of_range');

  // Full lock within cone & range -> allowed
  const ready = canLaunchHomingMissile({
    hasValidTarget: true,
    lockProgress: 0.96,
    distanceMeters: 740,
    targetForwardCos: 0.95,
    ammoRemaining: 10,
    cooldownSec: 0,
    playerHull: 100,
  });
  assert.equal(ready.allowed, true);

  // Evadable missile turn rate: target passing behind missile breaks seeker lock
  const evaded = stepMissileGuidance({
    missilePos: { x: 0, y: 0, z: 0 },
    missileVel: { x: 0, y: 0, z: -420 },
    targetPos: { x: 180, y: 0, z: 90 },
    targetVel: { x: 140, y: 0, z: 120 },
    speed: 420,
    dt: 0.1,
    maxTurnRadPerSec: WEAPON_BALLISTICS.missile.missileMaxTurnRadPerSec!,
    seekerConeCos: 0.25,
  });
  assert.equal(evaded.lostSeeker, true);
});

test('Pulse Cannon consecutive hit multiplier rewards disciplined accuracy and caps cleanly', () => {
  assert.equal(computeConsecutiveHitMultiplier('pulse', 0), 1.0);
  assert.equal(computeConsecutiveHitMultiplier('pulse', 1), 1.0);
  assert.ok(computeConsecutiveHitMultiplier('pulse', 4) > 1.15);
  assert.equal(computeConsecutiveHitMultiplier('pulse', 20), 1.3);
});
