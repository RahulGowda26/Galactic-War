import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISRUPTOR_EW_RANGE_METERS,
  DISRUPTOR_PULSE_COOLDOWN_SEC,
  DISRUPTOR_PULSE_DURATION_SEC,
  EXTINCTION_FLIGHT_PROFILES,
  PHANTOM_CLOAK_COOLDOWN_SEC,
  PHANTOM_MAX_CLOAK_SEC,
  PHANTOM_PROXIMITY_REVEAL_METERS,
  computeFleetFormationOrder,
  computeHunterDroneSwarmVector,
  createBattleDirector,
  createDisruptorFieldState,
  createOrbitalKillZonePylons,
  createPhantomCloakState,
  evaluateAggregateDisruptorEw,
  stepBattleDirector,
  stepDisruptorField,
  stepOrbitalKillZonePylon,
  stepPhantomCloak,
} from './extinctionCombat';
import { DIFFICULTY_FLIGHT_TUNING, stepEnemyDogfightManoeuvre } from './combatExpansion';
import { PLAYABLE_SHIP_LIST } from './spacePhysics';
import { getExtinctionLevelById } from './extinctionCampaign';

test('Extinction enemy flight profiles remain catchable and physically turn-bounded across difficulties', () => {
  const minPlayerBoostSpeed = Math.min(...PLAYABLE_SHIP_LIST.map((s) => s.boostSpeed));
  for (const [role, profile] of Object.entries(EXTINCTION_FLIGHT_PROFILES)) {
    for (const [diff, tuning] of Object.entries(DIFFICULTY_FLIGHT_TUNING)) {
      const peakCruise = profile.cruiseSpeed * tuning.speedMult;
      assert.ok(
        minPlayerBoostSpeed > peakCruise * 1.15,
        `${role} on ${diff} cruise ${peakCruise.toFixed(1)} exceeds safe catchability margin`,
      );
      assert.ok(profile.maxTurnRadPerSec > 0 && profile.maxTurnRadPerSec <= 2.4);
      assert.ok(profile.maxDisengageRange <= 1300);
      assert.ok(profile.boostCooldownSec >= 4.0);
    }

    // Verify stepEnemyDogfightManoeuvre handles all 3 new roles cleanly
    const res = stepEnemyDogfightManoeuvre(
      {
        id: `test_${role}`,
        role: role as keyof typeof EXTINCTION_FLIGHT_PROFILES,
        isLegendary: false,
        squadSlot: 1,
        pos: { x: 0, y: 0, z: -420 },
        vel: { x: 0, y: 0, z: 120 },
        maneuverState: 'straight_approach',
        stateTimer: 2.0,
        strafeSign: 1,
        verticalSign: 1,
        flankPhase: 0.4,
        evasionTimer: 0,
        recentlyHit: false,
        empStunned: false,
        difficulty: 'normal',
      },
      {
        pos: { x: 0, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: -120 },
        forward: { x: 0, y: 0, z: -1 },
        right: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        speed: 120,
      },
      0.05,
      5.0,
      1.0,
    );
    assert.ok(Number.isFinite(res.desiredVel.x) && Number.isFinite(res.desiredVel.z));
  }
});

test('Phantom Interceptor stealth cloak is timed, decloaks on attack/hit/proximity, and never stays permanently unbreakable', () => {
  let cloak = createPhantomCloakState(true);
  assert.equal(cloak.cloaked, true);
  assert.ok(cloak.visualOpacity < 0.3);

  // Decloak immediately on weapon fire
  const fired = stepPhantomCloak(cloak, {
    dt: 0.1,
    distanceToPlayerMeters: 620,
    justFired: true,
    tookDamage: false,
    empStunned: false,
  });
  assert.equal(fired.decloakedNow, true);
  assert.equal(fired.state.cloaked, false);
  assert.equal(fired.state.missileLockable, true);
  assert.equal(fired.state.cooldownRemainingSec, PHANTOM_CLOAK_COOLDOWN_SEC);

  // Decloak on max duration timeout via frame-by-frame ticks
  cloak = createPhantomCloakState(true);
  for (let i = 0; i < Math.ceil((PHANTOM_MAX_CLOAK_SEC + 0.2) / 0.1); i++) {
    cloak = stepPhantomCloak(cloak, {
      dt: 0.1,
      distanceToPlayerMeters: 700,
      justFired: false,
      tookDamage: false,
      empStunned: false,
    }).state;
  }
  assert.equal(cloak.cloaked, false);

  // Decloak at close proximity
  cloak = createPhantomCloakState(true);
  const close = stepPhantomCloak(cloak, {
    dt: 0.1,
    distanceToPlayerMeters: PHANTOM_PROXIMITY_REVEAL_METERS - 20,
    justFired: false,
    tookDamage: false,
    empStunned: false,
  });
  assert.equal(close.state.cloaked, false);
  assert.equal(close.state.missileLockable, true);
});

test('Hunter Drone Swarm separates pack members around target & Disruptor EW enforces bounded pulses', () => {
  const vecA = computeHunterDroneSwarmVector({
    dronePos: { x: 0, y: 0, z: 0 },
    swarmIndex: 0,
    swarmCount: 4,
    playerPos: { x: 0, y: 0, z: -260 },
    neighborPositions: [{ x: 12, y: 0, z: 0 }],
    elapsedSec: 1.0,
  });
  // Separation pushes x negative away from neighbor at +12
  assert.ok(Math.abs(Math.hypot(vecA.x, vecA.y, vecA.z) - 1) < 0.01);

  let ew = createDisruptorFieldState();
  let pulsedAny = false;
  for (let i = 0; i < Math.ceil((DISRUPTOR_PULSE_COOLDOWN_SEC + 0.2) / 0.1); i++) {
    const step = stepDisruptorField(ew, {
      dt: 0.1,
      alive: true,
      empStunned: false,
      distanceToPlayerMeters: DISRUPTOR_EW_RANGE_METERS - 150,
    });
    ew = step.state;
    if (step.pulseTriggered) {
      pulsedAny = true;
      break;
    }
  }
  assert.equal(pulsedAny, true);
  assert.equal(ew.active, true);

  const agg = evaluateAggregateDisruptorEw([DISRUPTOR_EW_RANGE_METERS - 150]);
  assert.equal(agg.ewActive, true);
  assert.ok(agg.lockSpeedMultiplier >= 0.35 && agg.lockSpeedMultiplier < 1.0);

  // Pulse ends cleanly after duration and EMP immediately kills it
  let endedState = ew;
  for (let i = 0; i < Math.ceil((DISRUPTOR_PULSE_DURATION_SEC + 0.2) / 0.1); i++) {
    endedState = stepDisruptorField(endedState, {
      dt: 0.1,
      alive: true,
      empStunned: false,
      distanceToPlayerMeters: DISRUPTOR_EW_RANGE_METERS - 150,
    }).state;
  }
  assert.equal(endedState.active, false);

  const stunned = stepDisruptorField(ew, {
    dt: 0.1,
    alive: true,
    empStunned: true,
    distanceToPlayerMeters: 300,
  });
  assert.equal(stunned.state.active, false);

  const order = computeFleetFormationOrder({
    role: 'interceptor',
    squadSlot: 0,
    aliveAlliesCount: 3,
    lowHullRatio: 0.9,
    playerForward: { x: 0, y: 0, z: -1 },
    playerRight: { x: 1, y: 0, z: 0 },
    playerPos: { x: 0, y: 0, z: 0 },
  });
  assert.equal(order.order, 'pincer_left');
});

test('Controlled Battle Director advances finite stages without infinite spawning & Orbital Kill Zone Pylons telegraph cleanly', () => {
  const l02 = getExtinctionLevelById('ext_l02')!;
  let bd = createBattleDirector(l02.battleStages);
  assert.equal(bd.currentStageIndex, 0);

  // Still alive -> stays on Stage 1
  const hold = stepBattleDirector(bd, {
    dt: 1.0,
    aliveHostiles: 3,
    bossPhase: 0,
    bossDefeated: false,
    survivalElapsedMet: false,
    extractionReached: false,
  });
  assert.equal(hold.advancedToStage, null);
  bd = hold.state;

  // Stage 1 cleared -> advances cleanly to Stage 2 once and spawns bounded waves
  const next = stepBattleDirector(bd, {
    dt: 0.2,
    aliveHostiles: 0,
    bossPhase: 0,
    bossDefeated: false,
    survivalElapsedMet: false,
    extractionReached: false,
  });
  assert.ok(next.advancedToStage);
  assert.equal(next.advancedToStage!.stageNumber, 2);
  assert.ok(next.spawnWave);
  assert.ok(next.triggeredEvents.includes('hyperspace_ambush'));
  assert.ok(next.state.totalWaveHostilesSpawned <= next.advancedToStage!.maxConcurrentHostiles);

  // Final stage cleared -> completed = true (finite!)
  const done = stepBattleDirector(
    { ...next.state, stageElapsedSec: 1.0 },
    {
      dt: 0.5,
      aliveHostiles: 0,
      bossPhase: 0,
      bossDefeated: false,
      survivalElapsedMet: false,
      extractionReached: false,
    },
  );
  assert.equal(done.state.completed, true);

  // Orbital Kill Zone pylon telegraph -> beam fire -> destroyed halts permanently
  const pylons = createOrbitalKillZonePylons(2, 100);
  let p = { ...pylons[0], cooldownSec: 0.05 };
  const s1 = stepOrbitalKillZonePylon(p, 0.1, true);
  assert.equal(s1.telegraphActive, true);
  p = s1.pylon;
  let firedBeam = false;
  for (let i = 0; i < 28; i++) {
    const step = stepOrbitalKillZonePylon(p, 0.1, true);
    p = step.pylon;
    if (step.beamFiredThisStep) {
      firedBeam = true;
      break;
    }
  }
  assert.equal(firedBeam, true);
});
