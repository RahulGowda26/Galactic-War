import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStandaloneBossDamage,
  createBossStateMachine,
  damageHarvesterCore,
  stepBossStateMachine,
} from './bossStateMachines';

test('Mini-Boss 1 Executioner transitions cleanly Hunter -> Predator -> Execution -> Defeated without skipping or looping', () => {
  let boss = createBossStateMachine('executioner', 1.0);
  assert.equal(boss.phase, 1);
  assert.equal(boss.phaseKey, 'hunter');

  // Drop below 66% -> Predator (Phase 2)
  boss = { ...boss, shield: 0, hp: Math.round(boss.maxHp * 0.62) };
  const p2 = stepBossStateMachine(boss, { dt: 0.1 });
  assert.equal(p2.state.phase, 2);
  assert.equal(p2.state.phaseKey, 'predator');
  assert.equal(p2.transition?.toPhase, 2);
  boss = p2.state;

  // Next tick does NOT re-emit transition
  const repeat = stepBossStateMachine(boss, { dt: 0.1 });
  assert.equal(repeat.transition, null);
  boss = repeat.state;

  // Drop below 32% -> Execution (Phase 3)
  boss = { ...boss, hp: Math.round(boss.maxHp * 0.25) };
  const p3 = stepBossStateMachine(boss, { dt: 0.1 });
  assert.equal(p3.state.phase, 3);
  assert.equal(p3.state.phaseKey, 'execution');
  assert.equal(p3.transition?.toPhase, 3);
  boss = p3.state;

  // Standalone damage defeats Executioner cleanly
  const killRes = applyStandaloneBossDamage(boss, 5000);
  assert.equal(killRes.killed, true);
  const fin = stepBossStateMachine(killRes.state, { dt: 0.1 });
  assert.equal(fin.state.defeated, true);
  assert.equal(fin.state.phase, 4);
});

test('Mini-Boss 2 Carrier Warden halts finite wing launches immediately when Hangar is destroyed', () => {
  let boss = createBossStateMachine('carrier_warden', 1.0);
  let totalLaunches = 0;

  for (let i = 0; i < 120; i++) {
    const step = stepBossStateMachine(boss, {
      dt: 0.1,
      hangarDestroyed: false,
      activeEscortCount: 0,
      playerInRange: true,
    });
    boss = step.state;
    totalLaunches += step.spawnCarrierLaunchCount;
    if (totalLaunches > 0) break;
  }
  assert.equal(totalLaunches, 2);
  assert.equal(boss.hangarLaunchWavesUsed, 1);

  // Once hangarDestroyed is true, NO additional launches can trigger even over long duration
  boss = { ...boss, hangarLaunchCooldownSec: 0 };
  for (let i = 0; i < 60; i++) {
    const blocked = stepBossStateMachine(boss, {
      dt: 0.1,
      hangarDestroyed: true,
      activeEscortCount: 0,
      playerInRange: true,
    });
    boss = blocked.state;
    assert.equal(blocked.spawnCarrierLaunchCount, 0);
  }
  assert.equal(boss.phase, 3, 'Hangar destruction escalates Carrier Warden to overdrive');
});

test('Mini-Boss 3 Siege Breaker & Major Boss 1 Iron Revenant transition phases and telegraph attacks', () => {
  let sb = createBossStateMachine('siege_breaker', 1.0);
  assert.ok(sb.damageResistanceMult < 1.0);
  let fired = false;
  for (let i = 0; i < 120; i++) {
    const step = stepBossStateMachine(sb, { dt: 0.1, playerInRange: true });
    sb = step.state;
    if (step.telegraphAttackFired) {
      fired = true;
      break;
    }
  }
  assert.equal(fired, true);

  const breakRes = stepBossStateMachine(
    { ...sb, hp: Math.round(sb.maxHp * 0.25) },
    { dt: 0.1, destroyedSubsystemsCount: 3, armorPlatesRemaining: 0 },
  );
  // 1-step progression guarantees clean phase transition without jumping states
  assert.equal(breakRes.state.phase, 2);
  const breakRes3 = stepBossStateMachine(breakRes.state, {
    dt: 0.1,
    destroyedSubsystemsCount: 3,
    armorPlatesRemaining: 0,
  });
  assert.equal(breakRes3.state.phase, 3);
  assert.ok(breakRes3.state.damageResistanceMult > 1.2);

  // Iron Revenant
  const rev = createBossStateMachine('iron_revenant', 1.0);
  const rev2 = stepBossStateMachine(
    { ...rev, hp: Math.round(rev.maxHp * 0.6) },
    { dt: 0.1, armorPlatesRemaining: 2 },
  );
  assert.equal(rev2.state.phaseKey, 'break_the_armour');
  const rev3 = stepBossStateMachine(
    { ...rev2.state, hp: Math.round(rev2.state.maxHp * 0.2) },
    { dt: 0.1, destroyedSubsystemsCount: 3 },
  );
  assert.equal(rev3.state.phaseKey, 'reactor_failure');
});

test('Major Boss 2 Void Harvester locks central hull ONLY while 3 Energy Cores remain, then enters Collapse with zero stuck invulnerability', () => {
  let vh = createBossStateMachine('void_harvester', 1.0);
  assert.equal(vh.harvesterCores.length, 3);
  assert.equal(vh.mainHullInvulnerable, false);

  // Strip shield -> Core Hunt Phase 2
  vh = { ...vh, shield: 0 };
  const huntStep = stepBossStateMachine(vh, { dt: 0.1 });
  vh = huntStep.state;
  assert.equal(vh.phase, 2);
  assert.equal(vh.phaseKey, 'core_hunt');
  assert.equal(vh.mainHullInvulnerable, true);

  // Destroy all 3 energy cores independently
  for (const cid of ['core_alpha', 'core_beta', 'core_gamma'] as const) {
    const coreHit = damageHarvesterCore(vh, cid, 9999);
    vh = coreHit.state;
    assert.equal(coreHit.coreDestroyedNow, true);
  }
  assert.equal(vh.mainHullInvulnerable, false);

  // Step transitions to Phase 3 Collapse and NEVER re-locks central nexus
  const collapseStep = stepBossStateMachine(vh, { dt: 0.1 });
  assert.equal(collapseStep.state.phase, 3);
  assert.equal(collapseStep.state.phaseKey, 'collapse');
  assert.equal(collapseStep.state.mainHullInvulnerable, false);
  assert.ok(collapseStep.state.damageResistanceMult > 1.5);
});

test('Major Boss 3 The Sovereign executes 3 combat phases plus a complete 10-step collapse sequence on defeat', () => {
  let sov = createBossStateMachine('sovereign_extinction', 1.0);
  sov = stepBossStateMachine({ ...sov, hp: Math.round(sov.maxHp * 0.6) }, { dt: 0.1 }).state;
  assert.equal(sov.phaseKey, 'sovereign_awakens');

  sov = stepBossStateMachine({ ...sov, hp: Math.round(sov.maxHp * 0.3) }, { dt: 0.1 }).state;
  assert.equal(sov.phaseKey, 'exposed_core');
  assert.ok(sov.damageResistanceMult > 1.3);

  // Defeat Sovereign -> enters 10-step meltdown sequence cleanly
  const dead = stepBossStateMachine({ ...sov, hp: 0 }, { dt: 0.1 });
  assert.equal(dead.state.defeated, true);
  assert.equal(dead.state.meltdownActive, true);
  sov = dead.state;

  const triggeredSteps: number[] = [];
  let finished = false;
  for (let i = 0; i < 80; i++) {
    const step = stepBossStateMachine(sov, { dt: 0.1 });
    sov = step.state;
    if (step.meltdownStepTriggered !== null) {
      triggeredSteps.push(step.meltdownStepTriggered);
    }
    if (step.meltdownFinishedNow) {
      finished = true;
      break;
    }
  }
  assert.deepEqual(triggeredSteps, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(finished, true);
  assert.equal(sov.meltdownCompleted, true);
});
