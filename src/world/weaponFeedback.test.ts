import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCameraShakeAccessibility,
  computeAsteroidAvoidanceVector,
  computeSpatialAudioParams,
  getCameraShakeMultiplier,
  getDistortionAccessibilityMultiplier,
  getWeaponImpactDebrisProfile,
  isCameraShakeMode,
} from './weaponFeedback';
import { deserializeMobileSettings, DEFAULT_MOBILE_CONTROL_SETTINGS } from './mobileControls';
import { computeMissionTacticalProfile } from './combatTactics';
import { applyCapitalSubsystemDamage, createCapitalShipStatus, type SpaceWeaponId } from './spacePhysics';

test('computeSpatialAudioParams pans left/right, attenuates with distance, and dims rear hemisphere', () => {
  const origin = { x: 0, y: 0, z: 0 };
  const right = { x: 1, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };

  const rightHit = computeSpatialAudioParams(origin, right, forward, { x: 250, y: 0, z: -20 });
  const leftHit = computeSpatialAudioParams(origin, right, forward, { x: -250, y: 0, z: -20 });
  assert.ok(rightHit.pan > 0.75, `expected strong right pan, got ${rightHit.pan}`);
  assert.ok(leftHit.pan < -0.75, `expected strong left pan, got ${leftHit.pan}`);
  assert.ok(Math.abs(rightHit.pan + leftHit.pan) < 0.02, 'left and right pans should be symmetric');

  const nearHit = computeSpatialAudioParams(origin, right, forward, { x: 0, y: 0, z: -120 });
  const farHit = computeSpatialAudioParams(origin, right, forward, { x: 0, y: 0, z: -2400 });
  assert.ok(nearHit.gain > farHit.gain, 'distant sources must attenuate');
  assert.ok(farHit.gain >= 0.1, 'gain floor keeps distant capital hits faintly audible');

  const frontHit = computeSpatialAudioParams(origin, right, forward, { x: 0, y: 0, z: -300 });
  const rearHit = computeSpatialAudioParams(origin, right, forward, { x: 0, y: 0, z: 300 });
  assert.ok(
    rearHit.lowpassHz < frontHit.lowpassHz - 5000,
    `rear lowpass (${rearHit.lowpassHz}) should be substantially lower than front (${frontHit.lowpassHz})`,
  );

  const zeroDist = computeSpatialAudioParams(origin, right, forward, origin);
  assert.equal(zeroDist.pan, 0);
  assert.equal(zeroDist.gain, 1);
  assert.equal(zeroDist.distanceMeters, 0);
});

test('getWeaponImpactDebrisProfile returns distinct visual signatures for all 5 weapons', () => {
  const weapons: SpaceWeaponId[] = ['pulse', 'heavy_plasma', 'missile', 'emp', 'rail_cannon'];
  const profiles = weapons.map((w) => getWeaponImpactDebrisProfile(w, false, 'fighter'));

  // All 5 flash colors and streak colors should be distinct
  const flashColors = new Set(profiles.map((p) => p.flashColorHex));
  const streakColors = new Set(profiles.map((p) => p.streakColorHex));
  assert.equal(flashColors.size, 5, 'each weapon must have a unique flash color');
  assert.equal(streakColors.size, 5, 'each weapon must have a unique streak color');

  const pulse = getWeaponImpactDebrisProfile('pulse', false, 'fighter');
  const plasma = getWeaponImpactDebrisProfile('heavy_plasma', false, 'fighter');
  const missile = getWeaponImpactDebrisProfile('missile', false, 'fighter');
  const emp = getWeaponImpactDebrisProfile('emp', false, 'fighter');
  const rail = getWeaponImpactDebrisProfile('rail_cannon', false, 'fighter');

  assert.equal(pulse.hasShockRing, false);
  assert.equal(plasma.hasShockRing, true);
  assert.equal(plasma.hasSmokePlume, true);
  assert.equal(missile.hasSmokePlume, true);
  assert.ok(missile.shardCount >= 6, 'missile must produce heavy metallic shrapnel');
  assert.equal(emp.hasShockRing, true);
  assert.ok(emp.ringMaxScale > plasma.ringMaxScale, 'EMP ring should have widest expansion');
  assert.equal(rail.directionalCone, true, 'Rail Cannon must spawn directional spall cone');
  assert.ok(rail.streakSpeedMax > missile.streakSpeedMax, 'Rail spall must have highest ejection velocity');

  // Capital hits scale larger than fighter hits
  const railCap = getWeaponImpactDebrisProfile('rail_cannon', false, 'capital');
  assert.ok(railCap.flashScale > rail.flashScale * 1.5);
  assert.ok(railCap.shardScale > rail.shardScale * 1.5);
});

test('camera shake accessibility scales or zeroes shake and distortion cleanly and persists', () => {
  assert.equal(isCameraShakeMode('full'), true);
  assert.equal(isCameraShakeMode('reduced'), true);
  assert.equal(isCameraShakeMode('off'), true);
  assert.equal(isCameraShakeMode('invalid'), false);

  assert.equal(getCameraShakeMultiplier('full'), 1.0);
  assert.ok(getCameraShakeMultiplier('reduced') > 0 && getCameraShakeMultiplier('reduced') < 0.5);
  assert.equal(getCameraShakeMultiplier('off'), 0);

  assert.equal(getDistortionAccessibilityMultiplier('full'), 1.0);
  assert.ok(
    getDistortionAccessibilityMultiplier('reduced') > 0 &&
      getDistortionAccessibilityMultiplier('reduced') < 0.6,
  );
  assert.equal(getDistortionAccessibilityMultiplier('off'), 0);

  const sample = {
    active: true,
    intensity: 0.9,
    offsetX: 0.4,
    offsetY: -0.3,
    offsetZ: 0.2,
    pitchRad: 0.02,
    yawRad: -0.01,
    rollRad: 0.03,
    fovPunchDeg: 2.5,
  };

  const full = applyCameraShakeAccessibility(sample, 'full');
  assert.equal(full.active, true);
  assert.equal(full.fovPunchDeg, 2.5);

  const reduced = applyCameraShakeAccessibility(sample, 'reduced');
  assert.equal(reduced.active, true);
  assert.ok(Math.abs(reduced.offsetX) < Math.abs(sample.offsetX));
  assert.ok(reduced.fovPunchDeg < sample.fovPunchDeg);

  const off = applyCameraShakeAccessibility(sample, 'off');
  assert.equal(off.active, false);
  assert.equal(off.intensity, 0);
  assert.equal(off.offsetX, 0);
  assert.equal(off.offsetY, 0);
  assert.equal(off.rollRad, 0);
  assert.equal(off.fovPunchDeg, 0);

  const persisted = deserializeMobileSettings(JSON.stringify({ cameraShakeMode: 'reduced' }));
  assert.equal(persisted.cameraShakeMode, 'reduced');

  const fallback = deserializeMobileSettings(JSON.stringify({ cameraShakeMode: 'bogus' }));
  assert.equal(fallback.cameraShakeMode, DEFAULT_MOBILE_CONTROL_SETTINGS.cameraShakeMode);
});

test('computeAsteroidAvoidanceVector yields zero outside margin and repels smoothly inside clearance', () => {
  const obstacles = [{ x: 100, y: 0, z: 0, radius: 50 }];
  const clear = computeAsteroidAvoidanceVector({ x: 250, y: 0, z: 0 }, obstacles, 40);
  assert.equal(clear.x, 0);
  assert.equal(clear.y, 0);
  assert.equal(clear.z, 0);

  const grazing = computeAsteroidAvoidanceVector({ x: 170, y: 0, z: 0 }, obstacles, 40);
  const close = computeAsteroidAvoidanceVector({ x: 155, y: 0, z: 0 }, obstacles, 40);
  assert.ok(grazing.x > 0, 'repulsion should push away from asteroid center (+X)');
  assert.ok(close.x > grazing.x, 'closer proximity should generate stronger repulsion');
});

test('difficulty tactical scaling separates story < normal < hard < nightmare', () => {
  const story = computeMissionTacticalProfile(5, 'story');
  const normal = computeMissionTacticalProfile(5, 'normal');
  const hard = computeMissionTacticalProfile(5, 'hard');
  const nightmare = computeMissionTacticalProfile(5, 'nightmare');

  assert.ok(story.fireCadenceMultiplier < normal.fireCadenceMultiplier);
  assert.ok(normal.fireCadenceMultiplier < hard.fireCadenceMultiplier);
  assert.ok(hard.fireCadenceMultiplier < nightmare.fireCadenceMultiplier);
  assert.ok(story.leadAimFactor < hard.leadAimFactor);
  assert.ok(hard.leadAimFactor < nightmare.leadAimFactor);
});

test('EMP disrupts targeted capital subsystem even while capital shields are active', () => {
  const cruiser = createCapitalShipStatus('cap-1', 'Siege Cruiser', 'assault_cruiser', 0);
  assert.ok(cruiser.shield > 0);
  const res = applyCapitalSubsystemDamage(cruiser, 'weapons', 'emp', 1, 1.0);
  assert.ok(res.ship.shield < cruiser.shield, 'EMP should heavily strip capital shields');
  assert.ok(
    res.ship.subsystems.weapons.empDisabledTimer >= 3.5,
    `expected EMP to disable capital weapons subsystem even through shields, got ${res.ship.subsystems.weapons.empDisabledTimer}`,
  );
});
