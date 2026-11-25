import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPITAL_SUBSYSTEM_KEYS,
  ENEMY_FIGHTER_ROLES,
  EXPANDED_SPACE_THEATER_KM,
  LEGACY_SPACE_THEATER_KM,
  PLAYABLE_SHIPS,
  PLAYABLE_SHIP_LIST,
  SPACE_ENCOUNTER_LIST,
  SPACE_REGION_LIST,
  SPACE_WEAPON_LIST,
  applyCapitalSubsystemDamage,
  applyShipDamage,
  applyShipRepair,
  computeAsteroidCollision,
  computeCapitalShipPerformance,
  computeExpandedSpaceDimensionsKm,
  computeSpaceRegionDistanceKm,
  createCapitalShipStatus,
  evaluateAsteroidProximity,
  isAsteroidBreakable,
  selectVisibleEnemyHealthBars,
  stepFlightStability,
  stepSpacecraftSpeed,
  stepTargetLock,
} from './spacePhysics';

test('stepSpacecraftSpeed accelerates, boosts, engages supercruise, and brakes cleanly', () => {
  const accel = stepSpacecraftSpeed({
    currentSpeed: 0,
    boostEnergy: 100,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: false, brake: false },
    flightAssist: true,
    dt: 0.5,
  });
  assert.ok(accel.speed > 45 && accel.speed <= 225);
  assert.equal(accel.isBoosting, false);
  assert.equal(accel.isSupercruise, false);

  const boosted = stepSpacecraftSpeed({
    currentSpeed: 120,
    boostEnergy: 100,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: true, brake: false },
    flightAssist: true,
    dt: 0.5,
  });
  assert.ok(boosted.speed > 180);
  assert.ok(boosted.boostEnergy < 100);
  assert.equal(boosted.isBoosting, true);

  // Supercruise reaches high interstellar cruise velocity for 80km travel
  const cruise = stepSpacecraftSpeed({
    currentSpeed: 220,
    boostEnergy: 100,
    engineIntegrity: 100,
    input: {
      throttleForward: false,
      throttleReverse: false,
      boost: false,
      brake: false,
      supercruise: true,
    },
    flightAssist: true,
    dt: 2.5,
    shipSpec: PLAYABLE_SHIPS.recon_craft,
  });
  assert.equal(cruise.isSupercruise, true);
  assert.ok(cruise.speed > 1000, `Expected supercruise >1000 m/s, got ${cruise.speed}`);

  const braked = stepSpacecraftSpeed({
    currentSpeed: 100,
    boostEnergy: 50,
    engineIntegrity: 100,
    input: { throttleForward: false, throttleReverse: false, boost: false, brake: true },
    flightAssist: true,
    dt: 0.2,
  });
  assert.ok(braked.speed < 25);
});

test('engine damage caps top spacecraft speed proportionally', () => {
  const healthy = stepSpacecraftSpeed({
    currentSpeed: 190,
    boostEnergy: 0,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: false, brake: false },
    flightAssist: true,
    dt: 0.8,
  });
  const damaged = stepSpacecraftSpeed({
    currentSpeed: 190,
    boostEnergy: 0,
    engineIntegrity: 30,
    input: { throttleForward: true, throttleReverse: false, boost: false, brake: false },
    flightAssist: true,
    dt: 0.8,
  });
  assert.ok(damaged.speed < healthy.speed);
});

test('stepTargetLock acquires lock inside cone and decays outside cone', () => {
  let lock = stepTargetLock({
    currentTargetId: null,
    currentProgress: 0,
    bestCandidateId: 'raider_1',
    bestCandidateDot: 0.97,
    bestCandidateDist: 1200,
    dt: 0.5,
  });
  assert.equal(lock.lockedTargetId, 'raider_1');
  assert.equal(lock.isLocked, false);

  lock = stepTargetLock({
    currentTargetId: lock.lockedTargetId,
    currentProgress: lock.lockProgress,
    bestCandidateId: 'raider_1',
    bestCandidateDot: 0.98,
    bestCandidateDist: 1180,
    dt: 1.0,
  });
  assert.equal(lock.isLocked, true);

  const lost = stepTargetLock({
    currentTargetId: 'raider_1',
    currentProgress: 1.0,
    bestCandidateId: null,
    bestCandidateDot: 0.4,
    bestCandidateDist: 900,
    dt: 1.0,
  });
  assert.equal(lost.isLocked, false);
  assert.equal(lost.lockedTargetId, null);
});

test('applyShipDamage depletes shields before hull and degrades engines below 65% hull', () => {
  const hit1 = applyShipDamage({ shield: 40, hull: 100, engineIntegrity: 100 }, 30);
  assert.equal(hit1.shield, 10);
  assert.equal(hit1.hull, 100);
  assert.equal(hit1.engineIntegrity, 100);
  assert.equal(hit1.destroyed, false);

  const hit2 = applyShipDamage(hit1, 60);
  assert.equal(hit2.shield, 0);
  assert.equal(hit2.hull, 50);
  assert.ok(hit2.engineIntegrity < 100);
  assert.equal(hit2.destroyed, false);

  const fatal = applyShipDamage(hit2, 60);
  assert.equal(fatal.destroyed, true);
  assert.equal(fatal.hull, 0);
});

test('computeAsteroidCollision classifies small, medium, and severe collisions with zone damage', () => {
  const baseVitals = {
    shield: 100,
    hull: 100,
    engineIntegrity: 100,
    controlIntegrity: 100,
    weaponIntegrity: 100,
  };

  const smallHit = computeAsteroidCollision({
    asteroidMass: 0.6,
    asteroidRadius: 5,
    relativeSpeed: 32,
    impactCosine: 0.35,
    hitZone: 'wing',
    vitals: baseVitals,
  });
  assert.equal(smallHit.severity, 'small');
  assert.ok(smallHit.shield < 100);
  assert.equal(smallHit.hull, 100);
  assert.equal(smallHit.destroyed, false);

  const mediumWing = computeAsteroidCollision({
    asteroidMass: 2.8,
    asteroidRadius: 12,
    relativeSpeed: 76,
    impactCosine: 0.72,
    hitZone: 'wing',
    vitals: { ...baseVitals, shield: 10 },
  });
  assert.equal(mediumWing.severity, 'medium');
  assert.ok(mediumWing.hull < 100);
  assert.ok(mediumWing.controlIntegrity < 100);
  assert.ok(mediumWing.weaponIntegrity < 100);

  const severeEngine = computeAsteroidCollision({
    asteroidMass: 9.0,
    asteroidRadius: 24,
    relativeSpeed: 155,
    impactCosine: 0.96,
    hitZone: 'engine',
    vitals: { ...baseVitals, shield: 15 },
  });
  assert.equal(severeEngine.severity, 'severe');
  assert.ok(severeEngine.engineIntegrity < 75);
  assert.ok(severeEngine.knockbackSpeed > smallHit.knockbackSpeed);
  assert.equal(severeEngine.cameraShake, 1.0);
});

test('stepFlightStability recovers faster with flight assist and applyShipRepair restores subsystems', () => {
  const initial = {
    pitchShock: 0.9,
    yawShock: 0.85,
    rollShock: 1.1,
    knockbackSpeed: 65,
    alarmTimer: 2.5,
  };
  const assisted = stepFlightStability(initial, true, 0.5);
  const manual = stepFlightStability(initial, false, 0.5);
  assert.ok(assisted.rollShock < manual.rollShock);
  assert.ok(assisted.knockbackSpeed < initial.knockbackSpeed);

  const repaired = applyShipRepair(
    {
      hull: 40,
      maxHull: 100,
      shield: 10,
      maxShield: 100,
      engineIntegrity: 52,
      controlIntegrity: 48,
      weaponIntegrity: 60,
    },
    35,
    30,
  );
  assert.equal(repaired.hull, 75);
  assert.equal(repaired.engineIntegrity, 82);
  assert.equal(repaired.controlIntegrity, 78);
});

test('evaluateAsteroidProximity raises caution/critical alerts and encounters span 5x expanded space', () => {
  assert.equal(SPACE_ENCOUNTER_LIST.length, 3);
  assert.ok(SPACE_ENCOUNTER_LIST[0].fieldRadius >= 7800);

  const safe = evaluateAsteroidProximity({ clearanceDist: 310, closingSpeed: 20, bearingRad: 0.4 });
  assert.equal(safe.risk, 'none');

  const caution = evaluateAsteroidProximity({ clearanceDist: 52, closingSpeed: 15, bearingRad: -0.2 });
  assert.equal(caution.risk, 'caution');

  const critical = evaluateAsteroidProximity({ clearanceDist: 45, closingSpeed: 90, bearingRad: 0.05 });
  assert.equal(critical.risk, 'critical');
  assert.ok(critical.timeToImpactSec !== null && critical.timeToImpactSec < 1);
});

test('Vast Space Expansion scales playable space by ~5x (~80km theater), with 5 regions, 5 ships, 5 weapons, and 3 enemy classes', () => {
  assert.equal(SPACE_REGION_LIST.length, 5);
  assert.equal(PLAYABLE_SHIP_LIST.length, 5);
  assert.equal(SPACE_WEAPON_LIST.length, 5);
  assert.equal(Object.keys(ENEMY_FIGHTER_ROLES).length, 6);
  assert.equal(CAPITAL_SUBSYSTEM_KEYS.length, 5);

  // Verify strict 3-class durability hierarchy: Capital > Medium Warship > Standard Fighters
  const frigate = createCapitalShipStatus('cap_f', 'Frigate', 'frigate');
  const medium = ENEMY_FIGHTER_ROLES.medium_warship;
  assert.equal(medium.shipClass, 'medium');
  const fighterSpecs = Object.values(ENEMY_FIGHTER_ROLES).filter((r) => r.shipClass === 'fighter');
  assert.equal(fighterSpecs.length, 5);
  const maxFighterHp = Math.max(...fighterSpecs.map((f) => f.baseHp));
  assert.ok(medium.baseHp > maxFighterHp * 2, 'Medium warship hull must substantially exceed fighters');
  assert.ok(frigate.maxHull > medium.baseHp, 'Capital warship hull must exceed medium warship');

  const dims = computeExpandedSpaceDimensionsKm();
  assert.ok(
    dims.fullNavigableDiagonalKm >= LEGACY_SPACE_THEATER_KM * 4,
    `Expected >= 4x expansion over ${LEGACY_SPACE_THEATER_KM}km, got ${dims.fullNavigableDiagonalKm}km`,
  );
  assert.ok(
    dims.fullNavigableDiagonalKm >= 70 && dims.fullNavigableDiagonalKm <= EXPANDED_SPACE_THEATER_KM + 15,
    `Expected ~80km theater diagonal, got ${dims.fullNavigableDiagonalKm}km`,
  );
  assert.ok(dims.averageRegionDiameterKm >= 15, `Expected region diameter >= 15km, got ${dims.averageRegionDiameterKm}km`);

  // Every region has 3 spatially separated encounter zones
  for (const r of SPACE_REGION_LIST) {
    assert.equal(r.encounterZones.length, 3);
    const z0 = r.encounterZones[0].offsetFromRegionCenter;
    const z2 = r.encounterZones[2].offsetFromRegionCenter;
    const zoneSeparation = Math.hypot(z0[0] - z2[0], z0[1] - z2[1], z0[2] - z2[2]);
    assert.ok(zoneSeparation > 2400, `Expected wide encounter zone spacing in ${r.id}, got ${zoneSeparation}m`);
  }

  const distKm = computeSpaceRegionDistanceKm(
    SPACE_REGION_LIST[0].worldCenter,
    SPACE_REGION_LIST[4].id,
  );
  assert.ok(distKm > 35, `Expected vast >35km travel distance between Low Orbit and Defence Zone, got ${distKm}km`);
});

test('capital ships expose 5 destructible subsystems including Comms & Hangar and Sovereign Flagship tracks 3 phases', () => {
  let cap = createCapitalShipStatus('cap_boss', 'Eternal Eclipse', 'sovereign_flagship');
  assert.equal(cap.bossPhase, 1);

  const initPerf = computeCapitalShipPerformance(cap);
  assert.equal(initPerf.speedMultiplier, 1.0);
  assert.equal(initPerf.fireRateMultiplier, 1.0);
  assert.equal(initPerf.enemyCoordinationMultiplier, 1.0);
  assert.equal(initPerf.canLaunchReinforcements, true);

  // Strip shields with EMP
  for (let i = 0; i < 12; i++) {
    cap = applyCapitalSubsystemDamage(cap, 'shields', 'emp', 2).ship;
  }
  assert.equal(cap.shield, 0);

  // Destroy Hangar & Comms using Precision Rail Cannon
  for (let i = 0; i < 4; i++) {
    cap = applyCapitalSubsystemDamage(cap, 'hangar', 'rail_cannon', 2, 1.32).ship;
  }
  assert.equal(cap.subsystems.hangar.destroyed, true);

  for (let i = 0; i < 4; i++) {
    cap = applyCapitalSubsystemDamage(cap, 'comms', 'rail_cannon', 2, 1.32).ship;
  }
  assert.equal(cap.subsystems.comms.destroyed, true);

  const crippled = computeCapitalShipPerformance(cap);
  assert.equal(crippled.canLaunchReinforcements, false);
  assert.ok(crippled.enemyCoordinationMultiplier < 0.7);
  assert.ok((cap.bossPhase ?? 1) >= 2, `Expected Flagship to enter Phase 2+, got ${cap.bossPhase}`);
});

test('selectVisibleEnemyHealthBars prioritizes targets, capitals, mediums, and caps screen clutter', () => {
  const markers = selectVisibleEnemyHealthBars(
    [
      {
        id: 'far_fighter',
        name: 'Void Interceptor',
        roleBadge: 'FLANKER',
        shipClass: 'fighter',
        screenX: 0.4,
        screenY: 0.4,
        inFront: true,
        distanceMeters: 3500,
        shieldPct: 100,
        hullPct: 100,
        isTargeted: false,
        wasRecentlyHit: false,
        justDestroyed: false,
      },
      {
        id: 'behind_enemy',
        name: 'Scout',
        roleBadge: 'SIGNALER',
        shipClass: 'fighter',
        screenX: 0.5,
        screenY: 0.5,
        inFront: false,
        distanceMeters: 400,
        shieldPct: 50,
        hullPct: 50,
        isTargeted: false,
        wasRecentlyHit: true,
        justDestroyed: false,
      },
      {
        id: 'target_fighter',
        name: 'Armored Striker',
        roleBadge: 'HEAVY',
        shipClass: 'fighter',
        screenX: 0.52,
        screenY: 0.48,
        inFront: true,
        distanceMeters: 920,
        shieldPct: 10,
        hullPct: 24,
        isTargeted: true,
        wasRecentlyHit: true,
        justDestroyed: false,
      },
      {
        id: 'medium_corvette',
        name: 'Void Assault Corvette',
        roleBadge: 'CORVETTE',
        shipClass: 'medium',
        screenX: 0.65,
        screenY: 0.44,
        inFront: true,
        distanceMeters: 1450,
        shieldPct: 80,
        hullPct: 90,
        isTargeted: false,
        wasRecentlyHit: false,
        justDestroyed: false,
      },
      {
        id: 'capital_cruiser',
        name: 'Assault Cruiser Vex-04',
        roleBadge: 'CAPITAL',
        shipClass: 'capital',
        screenX: 0.35,
        screenY: 0.36,
        inFront: true,
        distanceMeters: 2600,
        shieldPct: 60,
        hullPct: 85,
        isTargeted: false,
        wasRecentlyHit: false,
        justDestroyed: false,
        activeSubsystems: 4,
        totalSubsystems: 5,
      },
    ],
    { maxVisible: 3 },
  );

  assert.equal(markers.length, 3);
  assert.equal(markers[0].id, 'target_fighter');
  assert.equal(markers[0].isCritical, true);
  assert.equal(markers[1].id, 'capital_cruiser');
  assert.equal(markers[2].id, 'medium_corvette');
  assert.equal(isAsteroidBreakable('small', 0.9), true);
  assert.equal(isAsteroidBreakable('large', 9.0), false);
});

test('stepSpacecraftSpeed reports clear boostState and stepTargetLock preserves lock across brief off-center grace', async () => {
  const ready = stepSpacecraftSpeed({
    currentSpeed: 120,
    boostEnergy: 95,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: false, brake: false },
    flightAssist: true,
    dt: 0.1,
  });
  assert.equal(ready.boostState, 'ready');

  const boosting = stepSpacecraftSpeed({
    currentSpeed: 150,
    boostEnergy: 80,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: true, brake: false },
    flightAssist: true,
    dt: 0.25,
  });
  assert.equal(boosting.boostState, 'boosting');

  const low = stepSpacecraftSpeed({
    currentSpeed: 150,
    boostEnergy: 4,
    engineIntegrity: 100,
    input: { throttleForward: true, throttleReverse: false, boost: true, brake: false },
    flightAssist: true,
    dt: 0.1,
  });
  assert.equal(low.boostState, 'low');

  // Target lock holds cleanly across a brief 0.2s slip outside acquisition cone thanks to grace buffer
  const held = stepTargetLock({
    currentTargetId: 'interceptor_7',
    currentProgress: 1.0,
    currentGraceSec: 0,
    currentTargetDot: 0.78, // wider maintain cone (> 0.75)
    currentTargetDist: 900,
    bestCandidateId: null,
    bestCandidateDot: 0,
    bestCandidateDist: Infinity,
    dt: 0.2,
    coneDotThreshold: 0.86,
  });
  assert.equal(held.lockedTargetId, 'interceptor_7');
  assert.equal(held.isLocked, true);

  // Predictive missile guidance turns physically within maxTurnRadPerSec and drops seeker if target is far behind
  const { stepMissileGuidance } = await import('./combatTactics');
  const guided = stepMissileGuidance({
    missilePos: { x: 0, y: 0, z: 0 },
    missileVel: { x: 0, y: 0, z: -400 },
    targetPos: { x: 80, y: 0, z: -400 },
    targetVel: { x: 90, y: 0, z: 0 },
    speed: 400,
    dt: 0.1,
    maxTurnRadPerSec: 3.0,
    seekerConeCos: 0.1,
    leadFactor: 0.85,
  });
  assert.equal(guided.lostSeeker, false);
  assert.ok(guided.vel.x > 40, 'missile should lead moving target laterally');
  assert.ok(Math.abs(Math.hypot(guided.vel.x, guided.vel.y, guided.vel.z) - 400) < 1);

  const behindSeeker = stepMissileGuidance({
    missilePos: { x: 0, y: 0, z: 0 },
    missileVel: { x: 0, y: 0, z: -400 },
    targetPos: { x: 0, y: 0, z: 300 },
    targetVel: { x: 0, y: 0, z: 0 },
    speed: 400,
    dt: 0.1,
    maxTurnRadPerSec: 3.0,
    seekerConeCos: 0.15,
  });
  assert.equal(behindSeeker.lostSeeker, true, 'missile must drop seeker lock when target passes behind seeker cone');
});

