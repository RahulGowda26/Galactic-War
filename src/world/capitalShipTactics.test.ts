import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPITAL_BLAST_DANGER_RADIUS_METERS,
  CAPITAL_CRITICAL_COUNTDOWN_SEC,
  computeCapitalBlastDamage,
  computeEscortTacticalState,
  createCapitalCriticalCountdown,
  createCapitalHelmState,
  createEscortSquadronPlan,
  shouldLaunchEscortReinforcement,
  stepCapitalCriticalCountdown,
  stepCapitalShipMovement,
} from './capitalShipTactics';

describe('capitalShipTactics — movement, escorts & 3s critical escape blast', () => {
  it('moves capital ships continuously along deliberate tactical patrol trajectories without teleporting', () => {
    let helm = createCapitalHelmState('dreadnought', { x: 0, y: 100, z: -2000 });
    const startX = helm.posX;
    const startZ = helm.posZ;
    let totalDistance = 0;

    for (let i = 0; i < 120; i++) {
      const prevX = helm.posX;
      const prevY = helm.posY;
      const prevZ = helm.posZ;
      const out = stepCapitalShipMovement(helm, 0.1, {
        engineSpeedMultiplier: 1.0,
        hullRatio: 0.9,
        underFire: false,
      });
      const stepDist = Math.hypot(
        out.state.posX - prevX,
        out.state.posY - prevY,
        out.state.posZ - prevZ,
      );
      assert.ok(stepDist < 6, 'single 0.1s step must never teleport');
      totalDistance += stepDist;
      helm = out.state;
    }

    const netDisplacement = Math.hypot(helm.posX - startX, helm.posZ - startZ);
    assert.ok(totalDistance > 180, `capital ship must visibly traverse space, moved ${totalDistance.toFixed(1)}m`);
    assert.ok(netDisplacement > 140, `net displacement should be substantial, got ${netDisplacement.toFixed(1)}m`);
  });

  it('slows capital ship cruise speed when engines are damaged', () => {
    let intact = createCapitalHelmState('cruiser', { x: 0, y: 0, z: 0 });
    let crippled = createCapitalHelmState('cruiser', { x: 0, y: 0, z: 0 });

    for (let i = 0; i < 40; i++) {
      intact = stepCapitalShipMovement(intact, 0.1, {
        engineSpeedMultiplier: 1.0,
        hullRatio: 1.0,
        underFire: false,
      }).state;
      crippled = stepCapitalShipMovement(crippled, 0.1, {
        engineSpeedMultiplier: 0.35,
        hullRatio: 0.4,
        underFire: false,
      }).state;
    }

    const speedIntact = Math.hypot(intact.velX, intact.velY, intact.velZ);
    const speedCrippled = Math.hypot(crippled.velX, crippled.velY, crippled.velZ);
    assert.ok(speedIntact > speedCrippled * 1.8, 'crippled engines should noticeably reduce cruise speed');
  });

  it('assigns coordinated escort squadrons that defend subsystems and scatter upon capital destruction', () => {
    const plan = createEscortSquadronPlan('dreadnought');
    assert.ok(plan.slots.length >= 5, 'dreadnought should have interceptors, patrol wing & bomber');
    assert.ok(plan.slots.some((s) => s.escortRole === 'close_guard'));
    assert.ok(plan.slots.some((s) => s.escortRole === 'patrol_wing'));
    assert.ok(plan.slots.some((s) => s.escortRole === 'bomber_strike'));

    const slot0 = plan.slots[0];
    // Distant player -> hold formation around moving warship
    const hold = computeEscortTacticalState({
      escortRole: slot0.escortRole,
      slotIndex: 0,
      localOffset: slot0.localOffset,
      escortPos: { x: -120, y: 40, z: 100 },
      capitalPos: { x: 0, y: 0, z: 0 },
      capitalForward: { x: 0, y: 0, z: 1 },
      capitalRight: { x: 1, y: 0, z: 0 },
      capitalHullRatio: 1.0,
      capitalDestroyedOrCritical: false,
      capitalUnderSubsystemAttack: false,
      playerPos: { x: 0, y: 0, z: 3200 },
      elapsedSec: 5,
    });
    assert.equal(hold.behavior, 'hold_formation');
    assert.equal(hold.shouldScatter, false);

    // Player attacks subsystems -> defend_subsystem
    const defend = computeEscortTacticalState({
      escortRole: slot0.escortRole,
      slotIndex: 0,
      localOffset: slot0.localOffset,
      escortPos: { x: -120, y: 40, z: 100 },
      capitalPos: { x: 0, y: 0, z: 0 },
      capitalForward: { x: 0, y: 0, z: 1 },
      capitalRight: { x: 1, y: 0, z: 0 },
      capitalHullRatio: 0.72,
      capitalDestroyedOrCritical: false,
      capitalUnderSubsystemAttack: true,
      playerPos: { x: 200, y: 50, z: 400 },
      elapsedSec: 12,
    });
    assert.equal(defend.behavior, 'defend_subsystem');
    assert.ok(defend.aggressiveness > 1.1);

    // Capital enters critical meltdown -> retreat_scatter
    const scatter = computeEscortTacticalState({
      escortRole: slot0.escortRole,
      slotIndex: 0,
      localOffset: slot0.localOffset,
      escortPos: { x: -120, y: 40, z: 100 },
      capitalPos: { x: 0, y: 0, z: 0 },
      capitalForward: { x: 0, y: 0, z: 1 },
      capitalRight: { x: 1, y: 0, z: 0 },
      capitalHullRatio: 0,
      capitalDestroyedOrCritical: true,
      capitalUnderSubsystemAttack: false,
      playerPos: { x: 200, y: 50, z: 400 },
      elapsedSec: 20,
    });
    assert.equal(scatter.behavior, 'retreat_scatter');
    assert.equal(scatter.shouldScatter, true);
  });

  it('enforces controlled escort reinforcement budgets (never unlimited)', () => {
    const allowed = shouldLaunchEscortReinforcement({
      aliveEscortCount: 2,
      targetEscortCount: 5,
      wavesLaunched: 0,
      maxWaves: 1,
      cooldownRemainingSec: 0,
      hangarOperational: true,
      capitalDestroyedOrCritical: false,
    });
    assert.equal(allowed.shouldLaunch, true);
    assert.equal(allowed.spawnCount, 2);

    const exhausted = shouldLaunchEscortReinforcement({
      aliveEscortCount: 0,
      targetEscortCount: 5,
      wavesLaunched: 1,
      maxWaves: 1,
      cooldownRemainingSec: 0,
      hangarOperational: true,
      capitalDestroyedOrCritical: false,
    });
    assert.equal(exhausted.shouldLaunch, false);
  });

  it('runs a 3-2-1 critical countdown with secondary blasts and distance-based escape survival', () => {
    let cd = createCapitalCriticalCountdown('XENON DREADNOUGHT', 'dreadnought');
    assert.equal(cd.totalSec, CAPITAL_CRITICAL_COUNTDOWN_SEC);

    const beeps: number[] = [];
    let secondaryBlasts = 0;
    let mainDetonated = false;

    for (let i = 0; i < 65; i++) {
      const step = stepCapitalCriticalCountdown(cd, 0.05);
      cd = step.state;
      if (step.triggeredBeepDigit !== null) beeps.push(step.triggeredBeepDigit);
      if (step.triggeredSecondaryBlast) secondaryBlasts++;
      if (step.triggeredMainDetonation) {
        mainDetonated = true;
        break;
      }
    }

    assert.deepEqual(beeps, [3, 2, 1]);
    assert.ok(secondaryBlasts >= 4, `expected staged secondary blasts, got ${secondaryBlasts}`);
    assert.equal(mainDetonated, true);

    // Boosting outside blast radius guarantees survival with zero blast damage
    const escaped = computeCapitalBlastDamage({
      distanceMeters: CAPITAL_BLAST_DANGER_RADIUS_METERS + 90,
      currentShield: 100,
      currentHull: 120,
      maxHull: 120,
    });
    assert.equal(escaped.escapedSafely, true);
    assert.equal(escaped.totalDamage, 0);

    // Staying close inside blast radius inflicts heavy damage
    const closeHit = computeCapitalBlastDamage({
      distanceMeters: 95,
      currentShield: 40,
      currentHull: 120,
      maxHull: 120,
    });
    assert.equal(closeHit.withinBlastRadius, true);
    assert.equal(closeHit.escapedSafely, false);
    assert.ok(closeHit.totalDamage >= 70, `close blast damage should be substantial, got ${closeHit.totalDamage}`);
    assert.ok(closeHit.knockbackSpeed > 100);
  });
});
