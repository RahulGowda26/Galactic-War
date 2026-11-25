import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePredictiveAsteroidAvoidance,
  computeSolidImpactDamage,
  evaluateClosingProximityWarning,
  resolveEnemyAsteroidImpact,
  resolveSweptSolidCollision,
  testSweptSegmentSphere,
  type SolidSphereCollider,
} from './solidCollisions';

describe('solidCollisions — swept solid asteroid & obstacle physics', () => {
  it('catches high-speed boost traversal through solid asteroids without tunneling', () => {
    const rock: SolidSphereCollider = {
      id: 'ast_1',
      kind: 'asteroid',
      x: 0,
      y: 0,
      z: -200,
      radius: 36,
      mass: 6.5,
    };

    // Ship boosts 220m in a single tick straight through the asteroid
    const hit = resolveSweptSolidCollision(
      { x: 0, y: 0, z: -90 },
      { x: 0, y: 0, z: -310 },
      { x: 0, y: 0, z: -260 },
      10,
      [rock],
      2.5,
    );

    assert.ok(hit !== null, 'swept collision must prevent high-speed tunneling');
    assert.ok(hit.tHit > 0 && hit.tHit < 1);
    const resolvedDist = Math.hypot(
      hit.resolvedPos.x - rock.x,
      hit.resolvedPos.y - rock.y,
      hit.resolvedPos.z - rock.z,
    );
    assert.ok(
      resolvedDist >= rock.radius + 10 + 2.4,
      `resolved ship must sit cleanly outside solid asteroid (${resolvedDist.toFixed(1)}m)`,
    );
    assert.ok(hit.deflectedVel.z > 0, 'head-on collision should bounce/deflect velocity outward');
  });

  it('ignores non-intersecting flight paths', () => {
    const miss = testSweptSegmentSphere(
      { x: 120, y: 0, z: 0 },
      { x: 120, y: 0, z: -300 },
      { x: 0, y: 0, z: -150 },
      50,
    );
    assert.equal(miss, null);
  });

  it('scales collision damage cleanly by relative speed, angle, and ship class', () => {
    const graze = computeSolidImpactDamage({
      shipClass: 'light_interceptor',
      obstacleKind: 'asteroid',
      relativeSpeed: 32,
      closingSpeed: 12,
      headOnFactor: 0.25,
      obstacleMass: 3.0,
      currentShield: 100,
      currentHull: 120,
      maxHull: 120,
    });

    const heavy = computeSolidImpactDamage({
      shipClass: 'light_interceptor',
      obstacleKind: 'asteroid',
      relativeSpeed: 185,
      closingSpeed: 175,
      headOnFactor: 0.94,
      obstacleMass: 6.8,
      currentShield: 100,
      currentHull: 120,
      maxHull: 120,
    });

    const heavyBomber = computeSolidImpactDamage({
      shipClass: 'strike_bomber',
      obstacleKind: 'asteroid',
      relativeSpeed: 185,
      closingSpeed: 175,
      headOnFactor: 0.94,
      obstacleMass: 6.8,
      currentShield: 100,
      currentHull: 195,
      maxHull: 195,
    });

    assert.equal(graze.severity, 'graze');
    assert.ok(graze.rawDamage <= 12, `grazing impact should deal limited damage, got ${graze.rawDamage}`);
    assert.equal(heavy.severity, 'heavy');
    assert.ok(heavy.rawDamage >= 45, `high-speed head-on impact should deal substantial damage, got ${heavy.rawDamage}`);
    assert.ok(heavyBomber.rawDamage <= heavy.rawDamage * 1.1, 'heavier bomber armor mitigates impact fairly');
  });

  it('steers AI fighters predictively away from asteroids and resolves physical impacts if they collide', () => {
    const rock: SolidSphereCollider = {
      id: 'ast_block',
      kind: 'asteroid',
      x: 5,
      y: 0,
      z: -160,
      radius: 42,
      mass: 6.0,
    };

    const steer = computePredictiveAsteroidAvoidance(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -150 },
      [rock],
    );
    assert.ok(Math.hypot(steer.x, steer.y, steer.z) > 0.3, 'predictive avoidance should veer away from ahead asteroid');

    const enemyHit = resolveEnemyAsteroidImpact(
      { x: 0, y: 0, z: -100 },
      { x: 0, y: 0, z: -160 },
      { x: 0, y: 0, z: -140 },
      11,
      [rock],
    );
    assert.ok(enemyHit !== null && enemyHit.hit);
    assert.ok(enemyHit.impactDamage >= 25);
  });

  it('triggers subtle proximity warning only when closing on a large solid asteroid at speed', () => {
    const bigRock = { x: 0, y: 0, z: -120, radius: 44 };

    const approaching = evaluateClosingProximityWarning(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -130 },
      10,
      [bigRock],
    );
    assert.equal(approaching.risk, 'critical');

    const flyingAway = evaluateClosingProximityWarning(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 130 },
      10,
      [bigRock],
    );
    assert.equal(flyingAway.risk, 'clear');
  });
});
