import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRailImpactWeight,
  createInitialRailShakeState,
  createRailDistortionPulse,
  evaluateRailDistortionPulse,
  stepRailDistortionPulses,
  stepRailImpactShake,
  triggerRailImpactShake,
} from './railImpactFx';

test('rail impact weight scales by target armor class, distance attenuation, and direct hull hit', () => {
  const capClose = computeRailImpactWeight({
    distanceMeters: 420,
    targetClass: 'capital',
    directHull: true,
  });
  const fighterClose = computeRailImpactWeight({
    distanceMeters: 420,
    targetClass: 'fighter',
    directHull: true,
  });
  const capFar = computeRailImpactWeight({
    distanceMeters: 2600,
    targetClass: 'capital',
    directHull: true,
  });
  const shielded = computeRailImpactWeight({
    distanceMeters: 420,
    targetClass: 'capital',
    directHull: false,
  });

  assert.ok(capClose > fighterClose, 'Capital hull impact should outweigh fighter impact');
  assert.ok(capClose > capFar, 'Closer rail impact should produce stronger impulse than distant hit');
  assert.ok(capClose > shielded, 'Direct unshielded hull plate hit should exceed shielded pierce');
  assert.ok(capFar >= 0.3, 'Long-range rail hits should retain tactile weight');
});

test('procedural rail camera shake produces immediate multi-axis impulse and decays smoothly to zero', () => {
  const initial = createInitialRailShakeState();
  const triggered = triggerRailImpactShake(initial, {
    distanceMeters: 520,
    targetClass: 'medium',
    directHull: true,
    seed: 2.5,
  });

  const early = stepRailImpactShake(triggered, 0.03, false);
  assert.equal(early.sample.active, true);
  assert.ok(
    Math.abs(early.sample.offsetX) + Math.abs(early.sample.offsetY) + Math.abs(early.sample.offsetZ) > 0.05,
    'Early rail impact shake should produce clear translational recoil',
  );
  assert.ok(
    Math.abs(early.sample.pitchRad) + Math.abs(early.sample.yawRad) + Math.abs(early.sample.rollRad) > 0.002,
    'Early rail impact shake should produce angular kick',
  );
  assert.ok(early.sample.fovPunchDeg !== 0, 'Rail impact should apply brief kinetic FOV punch');

  const mid = stepRailImpactShake(early.state, 0.2, false);
  assert.ok(mid.sample.intensity < early.sample.intensity, 'Shake intensity should decay over time');

  const settled = stepRailImpactShake(mid.state, 0.5, false);
  assert.equal(settled.sample.active, false);
  assert.equal(settled.sample.offsetX, 0);
  assert.equal(settled.sample.pitchRad, 0);
  assert.equal(settled.sample.fovPunchDeg, 0);
});

test('localized rail distortion pulse expands radially, peaks early, and expires cleanly', () => {
  const pulse = createRailDistortionPulse(
    { x: 120, y: 3650, z: -800 },
    { distanceMeters: 600, targetClass: 'capital', directHull: true },
  );

  const pEarly = stepRailDistortionPulses([pulse], 0.04);
  assert.equal(pEarly.length, 1);
  const evalEarly = evaluateRailDistortionPulse(pEarly[0]);
  assert.equal(evalEarly.active, true);
  assert.ok(evalEarly.intensity > 0.015, 'Early shockwave should have visible refraction intensity');

  const pMid = stepRailDistortionPulses(pEarly, 0.16);
  const evalMid = evaluateRailDistortionPulse(pMid[0]);
  assert.ok(evalMid.radius > evalEarly.radius, 'Localized distortion ring must expand outward');
  assert.ok(evalMid.intensity < evalEarly.intensity, 'Distortion intensity must decay smoothly');

  const pExpired = stepRailDistortionPulses(pMid, 0.6);
  assert.equal(pExpired.length, 0, 'Expired distortion pulses must be pruned cleanly');
});
