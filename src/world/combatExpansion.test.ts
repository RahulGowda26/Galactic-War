import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGENDARY_PILOTS,
  SECTOR_ASTEROID_PROFILES,
  SpatialAsteroidGrid,
  UPGRADE_TRADE_OFF_MODULES,
  VANGUARD_WINGMEN_ROSTER,
  computeEquippedUpgradeModifiers,
  computeShipComparisonStats,
  createReinforcementDirector,
  evaluateMissionMoment,
  generateSectorAsteroidLayout,
  getLegendaryPilotForMission,
  selectWingmanObjectiveTarget,
  startHyperspaceTransition,
  stepEnemyDogfightManoeuvre,
  stepHyperspaceTransition,
  stepReinforcementDirector,
  type EnemyDogfightAgent,
  type PlayerFlightContext,
} from './combatExpansion';
import { SPACE_REGION_LIST } from './spacePhysics';

const basePlayer: PlayerFlightContext = {
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 0, y: 0, z: -140 },
  forward: { x: 0, y: 0, z: -1 },
  right: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  speed: 140,
};

test('advanced enemy dogfight AI performs straight approach, lateral strafing, vertical climbs, flybys, pursuit, and break-away', () => {
  const agent: EnemyDogfightAgent = {
    id: 'enemy_1',
    role: 'interceptor',
    isLegendary: false,
    squadSlot: 0,
    pos: { x: 0, y: 0, z: -900 },
    vel: { x: 0, y: 0, z: 180 },
    maneuverState: 'straight_approach',
    stateTimer: 1.5,
    strafeSign: 1,
    verticalSign: 1,
    flankPhase: 0.4,
    evasionTimer: 0,
    recentlyHit: false,
    empStunned: false,
  };

  // 1. Straight approach closes quickly toward player with firing window open
  const approach = stepEnemyDogfightManoeuvre(agent, basePlayer, 0.1, 1.0);
  assert.ok(approach.desiredVel.z > 120, 'straight approach should fly decisively toward player');
  assert.equal(approach.firingWindowOpen, true);

  // 2. Lateral strafe produces strong sideways velocity & clear banking roll over 0.5s of physical turning
  let strafeAgent: EnemyDogfightAgent = {
    ...agent,
    pos: { x: -40, y: 10, z: -320 },
    maneuverState: 'lateral_strafe',
    stateTimer: 2.0,
  };
  let strafing = stepEnemyDogfightManoeuvre(strafeAgent, basePlayer, 0.1, 2.5);
  for (let s = 0; s < 4; s++) {
    strafeAgent = { ...strafeAgent, vel: strafing.desiredVel, stateTimer: strafing.nextTimer };
    strafing = stepEnemyDogfightManoeuvre(strafeAgent, basePlayer, 0.1, 2.6 + s * 0.1);
  }
  assert.ok(Math.abs(strafing.desiredVel.x) > 75, 'lateral strafe must create visible sideways velocity');
  assert.ok(Math.abs(strafing.bankAngle) > 0.5, 'lateral strafe must visibly bank the spacecraft');

  // 3. Vertical climb/dive produces strong Y component over 0.5s of physical turning
  let climbAgent: EnemyDogfightAgent = {
    ...agent,
    pos: { x: 30, y: 0, z: -320 },
    maneuverState: 'vertical_climb_dive',
    stateTimer: 2.0,
  };
  let climbing = stepEnemyDogfightManoeuvre(climbAgent, basePlayer, 0.1, 3.5);
  for (let s = 0; s < 4; s++) {
    climbAgent = { ...climbAgent, vel: climbing.desiredVel, stateTimer: climbing.nextTimer };
    climbing = stepEnemyDogfightManoeuvre(climbAgent, basePlayer, 0.1, 3.6 + s * 0.1);
  }
  assert.ok(Math.abs(climbing.desiredVel.y) > 45, 'vertical climb/dive must change altitude decisively');

  // 4. Tail pursuit actively chases behind player at >= player speed
  const chasing = stepEnemyDogfightManoeuvre(
    {
      ...agent,
      pos: { x: 20, y: 15, z: 420 },
      vel: { x: 0, y: 0, z: -130 },
      maneuverState: 'tail_pursuit',
      stateTimer: 2.5,
    },
    basePlayer,
    0.1,
    4.5,
  );
  assert.ok(chasing.desiredVel.z < -120, 'tail pursuit must pursue forward along player heading');

  // 5. Close range triggers automatic break-away
  const closeBreak = stepEnemyDogfightManoeuvre(
    { ...agent, pos: { x: 10, y: 0, z: -85 }, maneuverState: 'straight_approach', stateTimer: 2.0 },
    basePlayer,
    0.1,
    5.5,
  );
  assert.equal(closeBreak.nextState, 'break_away');
  assert.equal(closeBreak.firingWindowOpen, false);
});

test('3D asteroid layout distributes rocks across all 5 sectors in 3 dimensions with spatial hash partitioning', () => {
  for (const region of SPACE_REGION_LIST) {
    const profile = SECTOR_ASTEROID_PROFILES[region.id];
    assert.ok(profile.instancedBeltCount >= 240, `${region.id} must have substantial distributed belt`);
    const center = { x: region.worldCenter[0], y: region.worldCenter[1], z: region.worldCenter[2] };
    const spawnPos = {
      x: center.x + region.spawnOffset[0],
      y: center.y + region.spawnOffset[1],
      z: center.z + region.spawnOffset[2],
    };
    const beaconPos = { x: spawnPos.x + 280, y: spawnPos.y + 40, z: spawnPos.z - 520 };
    const rocks = generateSectorAsteroidLayout({
      regionId: region.id,
      center,
      spawnPos,
      beaconPos,
      fieldRadius: region.fieldRadius,
      largeCount: region.largeAsteroids,
      mediumCount: region.mediumAsteroids,
      smallCount: region.smallAsteroids,
      wreckageCount: region.wreckageFragments,
      driftSpeedMult: region.driftSpeedMultiplier,
    });
    assert.ok(rocks.length >= 40, `${region.id} should spawn >=40 interactive asteroids`);
    const ys = rocks.map((r) => r.y - center.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    assert.ok(maxY - minY > 500, `${region.id} asteroids must span 3D vertical volume, not a flat plane`);

    // Verify spawn corridor clearance
    for (const r of rocks) {
      const dSpawn = Math.hypot(r.x - spawnPos.x, r.y - spawnPos.y, r.z - spawnPos.z);
      assert.ok(dSpawn >= 140, `rock ${r.id} should not spawn on top of player`);
    }

    // Verify spatial grid finds nearby asteroids cleanly
    const grid = new SpatialAsteroidGrid(360);
    grid.rebuild(rocks);
    assert.ok(grid.cellCount >= 6);
    const sample = rocks[0];
    const nearby = grid.queryRadius(sample.x, sample.y, sample.z, 120);
    assert.ok(nearby.some((n) => n.id === sample.id));
  }
});

test('wingman commands route Attack, Defend, Cover, and Regroup cleanly without ambiguity', () => {
  assert.equal(VANGUARD_WINGMEN_ROSTER.length, 3);
  const candidates = [
    { id: 'far_locked', pos: { x: 0, y: 0, z: -1200 }, distToPlayer: 1200, isPlayerLocked: true, isAttackingPlayer: false },
    { id: 'close_attacker', pos: { x: 80, y: 0, z: -420 }, distToPlayer: 430, isPlayerLocked: false, isAttackingPlayer: true },
    { id: 'near_neutral', pos: { x: -200, y: 0, z: -310 }, distToPlayer: 370, isPlayerLocked: false, isAttackingPlayer: false },
  ];

  assert.equal(selectWingmanObjectiveTarget('attack', candidates), 'far_locked');
  assert.equal(selectWingmanObjectiveTarget('cover', candidates), 'close_attacker');
  assert.equal(selectWingmanObjectiveTarget('defend', candidates), 'near_neutral');
  assert.equal(selectWingmanObjectiveTarget('regroup', candidates), null);
});

test('dynamic enemy reinforcement director escalates patrol -> engaged -> distress -> inbound jump -> arrived and respects hangar suppression', () => {
  let dir = createReinforcementDirector(5, 0);
  assert.equal(dir.stage, 'patrol');

  let r = stepReinforcementDirector({
    state: dir,
    dt: 0.5,
    hostilesKilled: 1,
    hostilesAlive: 8,
    initialHostiles: 9,
    commsDestroyed: false,
    hangarDestroyed: false,
  });
  dir = r.state;
  assert.equal(dir.stage, 'engaged');

  // Reach distress threshold
  r = stepReinforcementDirector({
    state: dir,
    dt: 0.5,
    hostilesKilled: 4,
    hostilesAlive: 5,
    initialHostiles: 9,
    commsDestroyed: false,
    hangarDestroyed: false,
  });
  dir = r.state;
  assert.equal(dir.stage, 'distress_signal');
  assert.ok(r.bannerEvent?.includes('DISTRESS'));

  // Advance until inbound jump & arrival
  let spawned = false;
  for (let i = 0; i < 20; i++) {
    r = stepReinforcementDirector({
      state: dir,
      dt: 0.5,
      hostilesKilled: 4,
      hostilesAlive: 5,
      initialHostiles: 9,
      commsDestroyed: false,
      hangarDestroyed: false,
    });
    dir = r.state;
    if (r.shouldSpawnWave) {
      spawned = true;
      assert.equal(r.spawnCount, 3);
      break;
    }
  }
  assert.equal(spawned, true);

  // Hangar destruction suppresses pending waves
  const suppressed = stepReinforcementDirector({
    state: createReinforcementDirector(5, 0),
    dt: 0.5,
    hostilesKilled: 2,
    hostilesAlive: 6,
    initialHostiles: 8,
    commsDestroyed: false,
    hangarDestroyed: true,
  });
  assert.equal(suppressed.state.stage, 'suppressed');
  assert.equal(suppressed.shouldSpawnWave, false);
});

test('meaningful upgrade trade-off modules apply genuine pros and cons to ship statistics', () => {
  assert.equal(UPGRADE_TRADE_OFF_MODULES.length, 6);
  const baseStats = computeShipComparisonStats(
    'light_interceptor',
    { engineLevel: 1, shieldLevel: 1, pulseLevel: 1, missileCapacity: 14 },
    [],
  );
  const thrusterStats = computeShipComparisonStats(
    'light_interceptor',
    { engineLevel: 1, shieldLevel: 1, pulseLevel: 1, missileCapacity: 14 },
    ['overclocked_thrusters'],
  );
  assert.ok(thrusterStats.maxSpeed > baseStats.maxSpeed, 'overclocked thrusters must raise speed');
  assert.ok(thrusterStats.maxHull < baseStats.maxHull, 'overclocked thrusters must trade off hull armor');

  const bulkStats = computeShipComparisonStats(
    'light_interceptor',
    { engineLevel: 1, shieldLevel: 1, pulseLevel: 1, missileCapacity: 14 },
    ['ablative_bulkheads'],
  );
  assert.ok(bulkStats.maxHull > baseStats.maxHull, 'ablative bulkheads must increase hull');
  assert.ok(bulkStats.agilityPct < baseStats.agilityPct, 'ablative bulkheads must reduce agility');

  const targetMods = computeEquippedUpgradeModifiers(['phase_targeting_matrix']);
  assert.ok(targetMods.lockSpeedMult > 1.3 && targetMods.weaponHeatMult > 1.15);
});

test('hyperspace transition progresses charging -> tunnel -> arrival and commits sector swap cleanly', () => {
  let hs = startHyperspaceTransition({
    originLabel: 'Aether Prime Orbit',
    destinationLabel: 'The Deep Asteroid Belt',
    destinationRegionId: 'debris_belt',
  });
  assert.equal(hs.active, true);
  assert.equal(hs.phase, 'charging');

  let committed = false;
  let sawTunnel = false;
  let completed = false;
  for (let i = 0; i < 40; i++) {
    const step = stepHyperspaceTransition(hs, 0.1);
    hs = step.state;
    if (hs.phase === 'tunnel') sawTunnel = true;
    if (step.shouldCommitArrivalNow) committed = true;
    if (step.completedNow) {
      completed = true;
      break;
    }
  }
  assert.equal(sawTunnel, true);
  assert.equal(committed, true);
  assert.equal(completed, true);
  assert.equal(hs.active, false);
});

test('legendary enemy pilots and scripted mission moments map cleanly to OP 01–OP 10 campaign milestones', () => {
  assert.equal(LEGENDARY_PILOTS.length, 4);
  assert.equal(getLegendaryPilotForMission(4)?.callsign, 'IRON FANG');
  assert.equal(getLegendaryPilotForMission(6)?.callsign, 'PHANTOM SIGNAL');
  assert.equal(getLegendaryPilotForMission(8)?.callsign, 'CRIMSON LANCE');
  assert.equal(getLegendaryPilotForMission(10)?.callsign, 'ECLIPSE VANGUARD');

  const triggered = new Set<string>();
  const ev2 = evaluateMissionMoment({
    missionNumber: 2,
    elapsedSec: 7,
    kills: 0,
    capitalHullPct: 100,
    triggeredIds: triggered,
  });
  assert.equal(ev2?.effectKind, 'capital_emergence');
  triggered.add(ev2!.id);
  assert.equal(
    evaluateMissionMoment({
      missionNumber: 2,
      elapsedSec: 12,
      kills: 0,
      capitalHullPct: 100,
      triggeredIds: triggered,
    }),
    null,
  );

  const ev10 = evaluateMissionMoment({
    missionNumber: 10,
    elapsedSec: 45,
    kills: 8,
    capitalHullPct: 36,
    triggeredIds: new Set(),
  });
  assert.equal(ev10?.effectKind, 'flagship_overload');
});

test('all enemy roles stay catchable by boosting player ships, obey finite physical turn rates, and enter recovery windows', async () => {
  const { PLAYABLE_SHIP_LIST } = await import('./spacePhysics');
  const { ENEMY_FLIGHT_PROFILES, DIFFICULTY_FLIGHT_TUNING } = await import('./combatExpansion');
  const minPlayerBoostSpeed = Math.min(...PLAYABLE_SHIP_LIST.map((s) => s.boostSpeed));

  for (const [role, profile] of Object.entries(ENEMY_FLIGHT_PROFILES)) {
    for (const [diff, tuning] of Object.entries(DIFFICULTY_FLIGHT_TUNING)) {
      const enemyPeakCruise = profile.cruiseSpeed * tuning.speedMult;
      assert.ok(
        minPlayerBoostSpeed > enemyPeakCruise * 1.15,
        `Even slowest player ship boost (${minPlayerBoostSpeed}) must decisively catch ${role} on ${diff} (cruise ${enemyPeakCruise.toFixed(1)})`,
      );
      assert.ok(profile.maxTurnRadPerSec > 0 && profile.maxTurnRadPerSec <= 2.4);
      assert.ok(profile.maxDisengageRange <= 1300);
      assert.ok(profile.boostCooldownSec >= 4.0);
    }
  }

  // Physical turn check: enemy cannot reverse 180 degrees instantaneously in a single 0.1s step
  const agent: EnemyDogfightAgent = {
    id: 'pursuit_check',
    role: 'interceptor',
    isLegendary: false,
    squadSlot: 0,
    pos: { x: 0, y: 0, z: -280 },
    vel: { x: 0, y: 0, z: -180 },
    maneuverState: 'straight_approach',
    stateTimer: 2.0,
    strafeSign: 1,
    verticalSign: 1,
    flankPhase: 0,
    evasionTimer: 0,
    recentlyHit: false,
    empStunned: false,
    difficulty: 'normal',
  };
  const step = stepEnemyDogfightManoeuvre(agent, basePlayer, 0.1, 1.0, 1.0);
  const v0Len = Math.hypot(agent.vel.x, agent.vel.y, agent.vel.z);
  const v1Len = Math.hypot(step.desiredVel.x, step.desiredVel.y, step.desiredVel.z);
  const dot =
    (agent.vel.x * step.desiredVel.x +
      agent.vel.y * step.desiredVel.y +
      agent.vel.z * step.desiredVel.z) /
    (v0Len * v1Len);
  const turnAngleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
  assert.ok(
    turnAngleRad <= 0.35,
    `Enemy turn in 0.1s must obey physical turn limit (got ${turnAngleRad.toFixed(3)} rad)`,
  );

  // Extended chase: enemy boost depletes during in-range break-away and far enemy re-engages
  let simAgent: EnemyDogfightAgent = {
    ...agent,
    pos: { x: 0, y: 0, z: -480 },
    vel: { x: 0, y: 0, z: -200 },
    maneuverState: 'break_away',
    stateTimer: 3.5,
    difficulty: 'hard',
  };
  let sawBoostDrain = false;
  let sawReengage = false;
  for (let i = 0; i < 45; i++) {
    const res = stepEnemyDogfightManoeuvre(simAgent, basePlayer, 0.15, i * 0.15, 1.0);
    if (res.nextBoostRemainingSec < 2.5 || res.nextBoostCooldownSec > 0) sawBoostDrain = true;
    if (res.nextState === 'straight_approach' || res.nextState === 'lateral_strafe' || res.nextState === 'reposition') {
      sawReengage = true;
    }
    simAgent = {
      ...simAgent,
      pos: {
        x: simAgent.pos.x + res.desiredVel.x * 0.15,
        y: simAgent.pos.y + res.desiredVel.y * 0.15,
        z: simAgent.pos.z + res.desiredVel.z * 0.15,
      },
      vel: res.desiredVel,
      maneuverState: res.nextState,
      stateTimer: res.nextTimer,
      strafeSign: res.nextStrafeSign,
      verticalSign: res.nextVerticalSign,
      boostRemainingSec: res.nextBoostRemainingSec,
      boostCooldownSec: res.nextBoostCooldownSec,
      recoveryTimer: res.nextRecoveryTimer,
      evasionCooldownSec: res.nextEvasionCooldownSec,
    };
  }
  assert.equal(sawBoostDrain, true, 'Enemy boost must be finite and drain during break-away');
  assert.equal(sawReengage, true, 'Enemy must re-engage instead of fleeing endlessly');
});

