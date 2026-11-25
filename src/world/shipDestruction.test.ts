import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESTRUCTION_POOL_LIMITS,
  classifyDestructionClass,
  computeDebrisHeatFactor,
  computeExplosionCameraShake,
  getShipDestructionProfile,
} from './shipDestruction';

test('classifyDestructionClass distinguishes fighters, heavy fighters/medium warships, and capital ships', () => {
  assert.equal(classifyDestructionClass('fighter', 'interceptor', false), 'fighter');
  assert.equal(classifyDestructionClass('fighter', 'scout', false), 'fighter');
  assert.equal(classifyDestructionClass('fighter', 'heavy_fighter', false), 'heavy');
  assert.equal(classifyDestructionClass('fighter', 'bomber', false), 'heavy');
  assert.equal(classifyDestructionClass('fighter', 'elite_ace', true), 'heavy');
  assert.equal(classifyDestructionClass('medium', 'medium_warship', false), 'heavy');
  assert.equal(classifyDestructionClass('capital', undefined, false), 'capital');
});

test('multi-stage destruction profiles scale cleanly from fighter -> heavy -> capital with bounded pool limits', () => {
  const fighter = getShipDestructionProfile('fighter');
  const heavy = getShipDestructionProfile('heavy');
  const capital = getShipDestructionProfile('capital');

  // Duration & blast scale hierarchy
  assert.ok(fighter.totalDurationSec < heavy.totalDurationSec);
  assert.ok(heavy.totalDurationSec < capital.totalDurationSec);
  assert.ok(fighter.mainBlastScale < heavy.mainBlastScale);
  assert.ok(heavy.mainBlastScale < capital.mainBlastScale);
  assert.ok(fighter.shockwaveMaxRadius < heavy.shockwaveMaxRadius);
  assert.ok(heavy.shockwaveMaxRadius < capital.shockwaveMaxRadius);
  const fighterDebris = fighter.wingPartCount + fighter.enginePartCount + fighter.armorPlateCount;
  const heavyDebris = heavy.wingPartCount + heavy.enginePartCount + heavy.armorPlateCount;
  const capitalDebris = capital.wingPartCount + capital.enginePartCount + capital.armorPlateCount;
  assert.ok(fighterDebris < heavyDebris);
  assert.ok(heavyDebris < capitalDebris);

  // Staggered secondary detonations precede the final main detonation
  assert.ok(heavy.secondaryDetonations.length >= 2);
  assert.ok(capital.secondaryDetonations.length >= 5);
  for (const sec of capital.secondaryDetonations) {
    assert.ok(sec.delaySec >= 0 && sec.delaySec < capital.mainBlastDelaySec);
    assert.ok(sec.scale > 0);
  }
  assert.ok(capital.mainBlastDelaySec >= 3.5 && capital.totalDurationSec >= 6.5);

  // Controlled smoke opacity & bounded global pool ceilings
  assert.ok(fighter.smokeMaxOpacity <= 0.48);
  assert.ok(heavy.smokeMaxOpacity <= 0.48);
  assert.ok(capital.smokeMaxOpacity <= 0.48);
  const totalSlots =
    DESTRUCTION_POOL_LIMITS.fighterSlots +
    DESTRUCTION_POOL_LIMITS.heavySlots +
    DESTRUCTION_POOL_LIMITS.capitalSlots;
  assert.ok(totalSlots >= 12 && totalSlots <= 20);
  assert.ok(DESTRUCTION_POOL_LIMITS.maxDynamicLights <= 4);
});

test('computeExplosionCameraShake respects distance attenuation, ship class, and cameraShakeMode accessibility', () => {
  const nearCapital = computeExplosionCameraShake({
    destructionClass: 'capital',
    distanceMeters: 220,
    shakeMode: 'full',
  });
  const farCapital = computeExplosionCameraShake({
    destructionClass: 'capital',
    distanceMeters: 2100,
    shakeMode: 'full',
  });
  const nearFighter = computeExplosionCameraShake({
    destructionClass: 'fighter',
    distanceMeters: 120,
    shakeMode: 'full',
  });
  const reducedCapital = computeExplosionCameraShake({
    destructionClass: 'capital',
    distanceMeters: 220,
    shakeMode: 'reduced',
  });
  const offCapital = computeExplosionCameraShake({
    destructionClass: 'capital',
    distanceMeters: 220,
    shakeMode: 'off',
  });

  assert.ok(nearCapital > farCapital, 'closer explosions must produce stronger shake');
  assert.ok(nearCapital > nearFighter, 'capital explosions must shake stronger than fighter blasts');
  assert.ok(nearCapital <= 1.0, 'camera shake must remain safely capped');
  assert.ok(reducedCapital > 0 && reducedCapital < nearCapital * 0.65);
  assert.equal(offCapital, 0, 'cameraShakeMode=off must produce zero camera shake');
});

test('computeDebrisHeatFactor cools monotonically from incandescent (1.0) toward dark metal (0.0)', () => {
  const t0 = computeDebrisHeatFactor(0, 4.0);
  const tMid = computeDebrisHeatFactor(1.6, 4.0);
  const tEnd = computeDebrisHeatFactor(4.0, 4.0);
  assert.equal(t0, 1);
  assert.ok(tMid > 0.15 && tMid < 0.8);
  assert.equal(tEnd, 0);
});
