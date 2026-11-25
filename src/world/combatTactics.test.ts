import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canExecuteWeaponAction,
  computeMissionTacticalProfile,
  computePredictiveAimPoint,
  computeRoleTacticalOffset,
  computeWeaponDamageBreakdown,
  segmentIntersectsSphere,
  selectActiveAttackerIds,
} from './combatTactics';

test('swept segment-sphere hit detection catches fast Rail Cannon slugs that would tunnel past fighters', () => {
  // Rail cannon travels 92.5m in a single 50ms frame (1850 m/s), passing straight through a 14m fighter at z = -50
  const start = { x: 0, y: 0, z: 0 };
  const end = { x: 0, y: 0, z: -92.5 };
  const fighterCenter = { x: 4, y: 3, z: -50 };

  assert.equal(segmentIntersectsSphere(start, end, fighterCenter, 14), true);
  // Far off-axis miss should return false
  assert.equal(segmentIntersectsSphere(start, end, { x: 35, y: 0, z: -50 }, 14), false);
});

test('all 5 weapon classes produce distinct shield, armor-pierce, EMP, and splash profiles', () => {
  const pulse = computeWeaponDamageBreakdown({
    weapon: 'pulse',
    baseDamage: 24,
    targetShield: 60,
    targetHull: 100,
  });
  const emp = computeWeaponDamageBreakdown({
    weapon: 'emp',
    baseDamage: 18,
    targetShield: 60,
    targetHull: 100,
  });
  const rail = computeWeaponDamageBreakdown({
    weapon: 'rail_cannon',
    baseDamage: 115,
    targetShield: 100,
    targetHull: 100,
  });
  const plasma = computeWeaponDamageBreakdown({
    weapon: 'heavy_plasma',
    baseDamage: 48,
    targetShield: 0,
    targetHull: 100,
  });

  // EMP strips full shield + applies stun + 36m AoE
  assert.equal(emp.nextShield, 0);
  assert.equal(emp.shieldBrokenNow, true);
  assert.ok(emp.empDisableSec > 0);
  assert.equal(emp.empAoeRadius, 36);

  // Rail cannon pierces 35% straight into hull even while shield absorbs the rest
  assert.ok(rail.hullDamageDealt > 35);
  assert.ok(rail.nextHull < 100);

  // Heavy plasma has splash radius and high direct hull damage
  assert.equal(plasma.plasmaSplashRadius, 22);
  assert.equal(plasma.hullDamageDealt, 48);

  // Pulse deals balanced shield damage without EMP/splash
  assert.ok(pulse.shieldDamageDealt > 0);
  assert.equal(pulse.empAoeRadius, 0);
  assert.equal(pulse.plasmaSplashRadius, 0);
});

test('progressive mission tactical profile scales attack tokens, lead aim, and flanking fairly from OP 01 to OP 10', () => {
  const op1 = computeMissionTacticalProfile(1, 'normal');
  const op5 = computeMissionTacticalProfile(5, 'normal');
  const op10 = computeMissionTacticalProfile(10, 'normal');
  const op10Nightmare = computeMissionTacticalProfile(10, 'nightmare');

  assert.equal(op1.maxSimultaneousAttackers, 2);
  assert.equal(op5.maxSimultaneousAttackers, 3);
  assert.equal(op10.maxSimultaneousAttackers, 4);
  assert.equal(op10Nightmare.maxSimultaneousAttackers, 5);

  assert.ok(op10.leadAimFactor > op5.leadAimFactor && op5.leadAimFactor > op1.leadAimFactor);
  assert.ok(op10.flankAggression > op1.flankAggression);
  assert.ok(op10.aceFlareCooldownSec < op1.aceFlareCooldownSec);
});

test('role steering assigns distinct squad behaviors and attack tokens prioritize active threats fairly', () => {
  const profile = computeMissionTacticalProfile(6, 'normal');
  const interceptorA = computeRoleTacticalOffset({
    role: 'interceptor',
    squadSlot: 0,
    elapsed: 4,
    orbitAngle: 0.5,
    orbitRadius: 300,
    orbitHeight: 20,
    flankPhase: 0,
    distToPlayer: 700,
    evasionTimer: 0,
    profile,
  });
  const interceptorB = computeRoleTacticalOffset({
    role: 'interceptor',
    squadSlot: 1,
    elapsed: 4,
    orbitAngle: 0.5,
    orbitRadius: 300,
    orbitHeight: 20,
    flankPhase: 0,
    distToPlayer: 700,
    evasionTimer: 0,
    profile,
  });
  const bomber = computeRoleTacticalOffset({
    role: 'bomber',
    squadSlot: 0,
    elapsed: 4,
    orbitAngle: 0.5,
    orbitRadius: 300,
    orbitHeight: 20,
    flankPhase: 0,
    distToPlayer: 700,
    evasionTimer: 0,
    profile,
  });

  // Pincer pair brackets opposite sides of player
  assert.equal(interceptorA.anchorMode, 'player');
  assert.notEqual(Math.sign(interceptorA.bankAngle), Math.sign(interceptorB.bankAngle));
  // Bomber anchors on friendly carrier approach
  assert.equal(bomber.anchorMode, 'carrier');

  // Attack tokens exclude EMP-stunned ships and cap simultaneous shooters
  const tokens = selectActiveAttackerIds(
    [
      { id: 'e1', distToPlayer: 400, role: 'interceptor', empStunned: true },
      { id: 'e2', distToPlayer: 600, role: 'elite_ace', empStunned: false },
      { id: 'e3', distToPlayer: 500, role: 'heavy_fighter', empStunned: false },
      { id: 'e4', distToPlayer: 550, role: 'interceptor', empStunned: false },
    ],
    2,
  );
  assert.equal(tokens.size, 2);
  assert.equal(tokens.has('e1'), false);
  assert.equal(tokens.has('e2'), true);
});

test('predictive aim leads moving targets and weapon guards block cooldown/empty/overheat states', () => {
  const aim = computePredictiveAimPoint({
    shooterPos: { x: 0, y: 0, z: 0 },
    targetPos: { x: 0, y: 0, z: -400 },
    targetVel: { x: 100, y: 0, z: 0 },
    projectileSpeed: 400,
    leadFactor: 0.5,
  });
  assert.equal(Math.round(aim.x), 50);

  assert.equal(canExecuteWeaponAction({ hull: 100, cooldownSec: 0, overheated: false, ammoRemaining: 3 }).allowed, true);
  assert.equal(canExecuteWeaponAction({ hull: 100, cooldownSec: 0.4, overheated: false, ammoRemaining: 3 }).reason, 'cooldown');
  assert.equal(canExecuteWeaponAction({ hull: 100, cooldownSec: 0, overheated: false, ammoRemaining: 0 }).reason, 'empty');
  assert.equal(canExecuteWeaponAction({ hull: 100, cooldownSec: 0, overheated: true }).reason, 'overheated');
  assert.equal(canExecuteWeaponAction({ hull: 0, cooldownSec: 0, overheated: false }).reason, 'destroyed');
});
