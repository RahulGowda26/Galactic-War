/**
 * Pure swept solid-body collision detection, deflection, damage calibration,
 * predictive enemy asteroid avoidance, and closing-speed proximity warnings.
 *
 * Prevents high-speed / boost ships from tunneling through asteroids, capital hulls,
 * enemy ships, friendly carriers, wreckage, or solid orbital structures.
 */

import type { PlayableShipId } from './spacePhysics';

export interface SolidVec3 {
  x: number;
  y: number;
  z: number;
}

export type SolidObstacleKind =
  | 'asteroid'
  | 'wreckage'
  | 'capital_ship'
  | 'enemy_ship'
  | 'friendly_carrier'
  | 'structure';

export interface SolidSphereCollider {
  id: string;
  kind: SolidObstacleKind;
  x: number;
  y: number;
  z: number;
  radius: number;
  mass: number;
  velX?: number;
  velY?: number;
  velZ?: number;
}

export interface SweptCollisionHit {
  collider: SolidSphereCollider;
  /** Parametric time along segment [0..1] where first contact occurs */
  tHit: number;
  /** World-space contact point on ship center */
  contactPoint: SolidVec3;
  /** Unit surface normal pointing from obstacle center toward ship */
  normal: SolidVec3;
  /** Minimum safe resolved position outside obstacle + clearance margin */
  resolvedPos: SolidVec3;
  /** Deflected velocity vector (prevents getting stuck or re-penetrating) */
  deflectedVel: SolidVec3;
  /** Relative closing speed along surface normal (m/s) */
  closingSpeed: number;
  /** Total relative speed at contact (m/s) */
  relativeSpeed: number;
  /** Dot product of approach direction vs inward normal [0=grazing .. 1=head-on] */
  headOnFactor: number;
}

export const SOLID_COLLISION_COOLDOWN_SEC = 0.55;

/**
 * Exact continuous swept-segment vs inflated-sphere intersection test.
 * Returns parametric t in [0, 1] of earliest contact, or null if clear.
 */
export function testSweptSegmentSphere(
  prevPos: SolidVec3,
  nextPos: SolidVec3,
  center: SolidVec3,
  combinedRadius: number,
): { t: number; distSqAtStart: number } | null {
  const dx = nextPos.x - prevPos.x;
  const dy = nextPos.y - prevPos.y;
  const dz = nextPos.z - prevPos.z;

  const fx = prevPos.x - center.x;
  const fy = prevPos.y - center.y;
  const fz = prevPos.z - center.z;

  const rSq = combinedRadius * combinedRadius;
  const c = fx * fx + fy * fy + fz * fz - rSq;

  // Already overlapping at start of frame
  if (c <= 0) {
    return { t: 0, distSqAtStart: fx * fx + fy * fy + fz * fz };
  }

  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-8) {
    return null;
  }

  const b = 2 * (fx * dx + fy * dy + fz * dz);
  // Moving away from sphere
  if (b >= 0) {
    return null;
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return null;
  }

  const sqrtDisc = Math.sqrt(disc);
  const t = (-b - sqrtDisc) / (2 * a);
  if (t >= 0 && t <= 1) {
    return { t, distSqAtStart: fx * fx + fy * fy + fz * fz };
  }
  return null;
}

/**
 * Checks a ship's swept motion segment [prevPos -> nextPos] against a list of solid
 * spherical colliders and returns the earliest physically resolved impact (if any).
 */
export function resolveSweptSolidCollision(
  prevPos: SolidVec3,
  nextPos: SolidVec3,
  shipVel: SolidVec3,
  shipRadius: number,
  colliders: readonly SolidSphereCollider[],
  clearanceMargin = 2.4,
): SweptCollisionHit | null {
  let bestHit: {
    collider: SolidSphereCollider;
    t: number;
  } | null = null;

  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.radius <= 0) continue;
    const combinedRadius = col.radius + shipRadius;
    const test = testSweptSegmentSphere(prevPos, nextPos, col, combinedRadius);
    if (test && (!bestHit || test.t < bestHit.t)) {
      bestHit = { collider: col, t: test.t };
    }
  }

  if (!bestHit) return null;

  const { collider, t } = bestHit;
  const contactX = prevPos.x + (nextPos.x - prevPos.x) * t;
  const contactY = prevPos.y + (nextPos.y - prevPos.y) * t;
  const contactZ = prevPos.z + (nextPos.z - prevPos.z) * t;

  let nx = contactX - collider.x;
  let ny = contactY - collider.y;
  let nz = contactZ - collider.z;
  let nLen = Math.hypot(nx, ny, nz);

  if (nLen < 1e-4) {
    // Degenerate center overlap: push opposite to velocity or along +Y
    const vLen = Math.hypot(shipVel.x, shipVel.y, shipVel.z);
    if (vLen > 0.1) {
      nx = -shipVel.x / vLen;
      ny = -shipVel.y / vLen;
      nz = -shipVel.z / vLen;
    } else {
      nx = 0;
      ny = 1;
      nz = 0;
    }
  } else {
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
  }

  const pushDist = collider.radius + shipRadius + clearanceMargin;
  const resolvedPos: SolidVec3 = {
    x: collider.x + nx * pushDist,
    y: collider.y + ny * pushDist,
    z: collider.z + nz * pushDist,
  };

  const relVx = shipVel.x - (collider.velX ?? 0);
  const relVy = shipVel.y - (collider.velY ?? 0);
  const relVz = shipVel.z - (collider.velZ ?? 0);
  const relativeSpeed = Math.hypot(relVx, relVy, relVz);

  // Closing speed along inward normal (positive when moving into obstacle)
  const velDotNormal = relVx * nx + relVy * ny + relVz * nz;
  const closingSpeed = Math.max(0, -velDotNormal);
  const headOnFactor = relativeSpeed > 1 ? Math.min(1, closingSpeed / relativeSpeed) : 0.5;

  // Slide along tangent + gentle controlled elastic bounce so ship never gets trapped
  const restitution = headOnFactor > 0.55 ? 0.36 : 0.22;
  const tangentDamp = 0.84;
  const vn = Math.min(0, velDotNormal);
  const tangentX = relVx - vn * nx;
  const tangentY = relVy - vn * ny;
  const tangentZ = relVz - vn * nz;
  const bounceMag = Math.max(18, -vn * restitution);

  const deflectedVel: SolidVec3 = {
    x: (collider.velX ?? 0) + tangentX * tangentDamp + nx * bounceMag,
    y: (collider.velY ?? 0) + tangentY * tangentDamp + ny * bounceMag,
    z: (collider.velZ ?? 0) + tangentZ * tangentDamp + nz * bounceMag,
  };

  return {
    collider,
    tHit: t,
    contactPoint: { x: contactX, y: contactY, z: contactZ },
    normal: { x: nx, y: ny, z: nz },
    resolvedPos,
    deflectedVel,
    closingSpeed,
    relativeSpeed,
    headOnFactor,
  };
}

export type SolidImpactSeverity = 'graze' | 'moderate' | 'heavy';

export interface SolidImpactDamageOutput {
  severity: SolidImpactSeverity;
  rawDamage: number;
  shieldDamage: number;
  hullDamage: number;
  cameraImpulse: number; // Controlled, short-lived impulse (0.14 .. 0.68)
}

const SHIP_CLASS_IMPACT_MITIGATION: Record<PlayableShipId, number> = {
  light_interceptor: 1.04, // Agile frame, slightly higher relative speed risk -> fair mitigation
  heavy_fighter: 0.84, // Reinforced armor plating
  strike_bomber: 0.78, // Heavy armored fuselage
  recon_craft: 1.02, // Light composite hull
  advanced_prototype: 0.95, // Advanced shielding and composite alloys
};

/**
 * Scales physical impact damage fairly across all 5 ship classes based on
 * relative impact speed, angle of incidence (grazing vs head-on), and object mass.
 */
export function computeSolidImpactDamage(input: {
  shipClass: PlayableShipId;
  obstacleKind: SolidObstacleKind;
  relativeSpeed: number;
  closingSpeed: number;
  headOnFactor: number;
  obstacleMass: number;
  currentShield: number;
  currentHull: number;
  maxHull: number;
  difficultyScale?: number;
}): SolidImpactDamageOutput {
  const effectiveSpeed = Math.max(input.closingSpeed, input.relativeSpeed * 0.42);
  const classFactor = SHIP_CLASS_IMPACT_MITIGATION[input.shipClass] ?? 1.0;
  const diffScale = input.difficultyScale ?? 1.0;

  const kindMult =
    input.obstacleKind === 'capital_ship' || input.obstacleKind === 'structure'
      ? 1.12
      : input.obstacleKind === 'asteroid' || input.obstacleKind === 'wreckage'
        ? 1.0
        : input.obstacleKind === 'friendly_carrier'
          ? 0.55 // Forgiving bump on allied carrier
          : 0.78; // Enemy fighter mid-air bump

  const massFactor = Math.min(1.85, 0.55 + Math.sqrt(Math.max(0.25, input.obstacleMass)) * 0.44);
  const angleFactor = 0.35 + input.headOnFactor * 0.85;

  // Grazing low-speed bumps do very light damage; high-speed boost collisions hurt substantially
  const speedCurve =
    effectiveSpeed < 22
      ? effectiveSpeed * 0.14
      : effectiveSpeed < 65
        ? 3.1 + (effectiveSpeed - 22) * 0.3
        : 16.0 + (effectiveSpeed - 65) * 0.36;

  const rawDamage = Math.max(
    2,
    Math.min(
      Math.round(input.maxHull * 0.72),
      Math.round(speedCurve * massFactor * angleFactor * kindMult * classFactor * diffScale),
    ),
  );

  let severity: SolidImpactSeverity = 'graze';
  if (rawDamage >= 36 || (effectiveSpeed >= 105 && input.headOnFactor >= 0.48)) {
    severity = 'heavy';
  } else if (rawDamage >= 15 || effectiveSpeed >= 52) {
    severity = 'moderate';
  }

  // Shields absorb most grazing/moderate impacts; heavy collisions bleed 15% straight to hull
  const hullBleed = severity === 'heavy' ? Math.round(rawDamage * 0.15) : 0;
  const shieldPool = Math.max(0, input.currentShield);
  const shieldTarget = rawDamage - hullBleed;
  const shieldDamage = Math.min(shieldPool, shieldTarget);
  const overflow = Math.max(0, shieldTarget - shieldDamage) + hullBleed;
  const hullDamage = Math.min(Math.max(0, input.currentHull), overflow);

  const cameraImpulse =
    severity === 'heavy' ? 0.62 : severity === 'moderate' ? 0.34 : 0.14;

  return {
    severity,
    rawDamage,
    shieldDamage,
    hullDamage,
    cameraImpulse,
  };
}

/**
 * Predictive look-ahead asteroid avoidance vector for AI ships so enemy fighters
 * bank smoothly around large solid rocks instead of flying straight through them.
 */
export function computePredictiveAsteroidAvoidance(
  shipPos: SolidVec3,
  shipVel: SolidVec3,
  obstacles: readonly { x: number; y: number; z: number; radius: number }[],
  lookAheadSec = 1.65,
  safetyMargin = 48,
): SolidVec3 {
  const speed = Math.hypot(shipVel.x, shipVel.y, shipVel.z);
  const lookDist = Math.max(110, Math.min(420, speed * lookAheadSec));
  const dirX = speed > 1 ? shipVel.x / speed : 0;
  const dirY = speed > 1 ? shipVel.y / speed : 0;
  const dirZ = speed > 1 ? shipVel.z / speed : -1;

  let steerX = 0;
  let steerY = 0;
  let steerZ = 0;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const toX = obs.x - shipPos.x;
    const toY = obs.y - shipPos.y;
    const toZ = obs.z - shipPos.z;
    const dist = Math.hypot(toX, toY, toZ);
    const avoidR = obs.radius + safetyMargin;

    if (dist < avoidR * 1.45) {
      // Immediate proximity repulsion
      const inv = 1 / Math.max(1, dist);
      const strength = Math.pow(1 - dist / (avoidR * 1.45), 1.4) * 1.85;
      steerX -= toX * inv * strength;
      steerY -= toY * inv * strength;
      steerZ -= toZ * inv * strength;
      continue;
    }

    // Check forward projection along velocity ray
    const proj = toX * dirX + toY * dirY + toZ * dirZ;
    if (proj <= 0 || proj > lookDist + obs.radius) continue;

    const closestX = shipPos.x + dirX * proj;
    const closestY = shipPos.y + dirY * proj;
    const closestZ = shipPos.z + dirZ * proj;
    const perpX = closestX - obs.x;
    const perpY = closestY - obs.y;
    const perpZ = closestZ - obs.z;
    const perpDist = Math.hypot(perpX, perpY, perpZ);

    if (perpDist < avoidR) {
      const urgency = (1 - proj / (lookDist + obs.radius)) * (1 - perpDist / avoidR);
      if (perpDist > 0.5) {
        steerX += (perpX / perpDist) * urgency * 2.1;
        steerY += (perpY / perpDist) * urgency * 2.1;
        steerZ += (perpZ / perpDist) * urgency * 2.1;
      } else {
        // Dead-center head-on: veer up-right cleanly
        steerX += 1.4 * urgency;
        steerY += 0.9 * urgency;
      }
    }
  }

  const sLen = Math.hypot(steerX, steerY, steerZ);
  if (sLen > 1.6) {
    steerX = (steerX / sLen) * 1.6;
    steerY = (steerY / sLen) * 1.6;
    steerZ = (steerZ / sLen) * 1.6;
  }

  return { x: steerX, y: steerY, z: steerZ };
}

/**
 * Resolves enemy fighter collision with a solid asteroid so AI never clips through
 * rocks and takes realistic damage when slamming into one.
 */
export function resolveEnemyAsteroidImpact(
  prevPos: SolidVec3,
  nextPos: SolidVec3,
  enemyVel: SolidVec3,
  enemyRadius: number,
  obstacles: readonly SolidSphereCollider[],
): {
  hit: boolean;
  resolvedPos: SolidVec3;
  deflectedVel: SolidVec3;
  impactDamage: number;
  contactPoint: SolidVec3;
} | null {
  const hit = resolveSweptSolidCollision(prevPos, nextPos, enemyVel, enemyRadius, obstacles, 4.0);
  if (!hit) return null;
  const damage = Math.max(8, Math.min(72, Math.round(hit.closingSpeed * 0.42)));
  return {
    hit: true,
    resolvedPos: hit.resolvedPos,
    deflectedVel: hit.deflectedVel,
    impactDamage: damage,
    contactPoint: hit.contactPoint,
  };
}

export interface ProximityWarningResult {
  risk: 'clear' | 'caution' | 'critical';
  nearestDistance: number;
  timeToImpactSec: number | null;
  closingSpeed: number;
}

/**
 * Evaluates subtle asteroid proximity warning only when approaching a large solid
 * obstacle at dangerous closing speed (prevents false alarms when flying parallel or away).
 */
export function evaluateClosingProximityWarning(
  shipPos: SolidVec3,
  shipVel: SolidVec3,
  shipRadius: number,
  obstacles: readonly { x: number; y: number; z: number; radius: number }[],
): ProximityWarningResult {
  const speed = Math.hypot(shipVel.x, shipVel.y, shipVel.z);
  let nearestSurfaceDist = Infinity;
  let bestTti: number | null = null;
  let bestClosing = 0;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    // Only warn on meaningful obstacles (>= 14m radius)
    if (obs.radius < 14) continue;
    const dx = obs.x - shipPos.x;
    const dy = obs.y - shipPos.y;
    const dz = obs.z - shipPos.z;
    const centerDist = Math.hypot(dx, dy, dz);
    const surfaceDist = Math.max(0, centerDist - obs.radius - shipRadius);
    if (surfaceDist > 260) continue;

    if (centerDist > 1e-3) {
      const closing = (shipVel.x * dx + shipVel.y * dy + shipVel.z * dz) / centerDist;
      if (closing > 28) {
        const tti = surfaceDist / closing;
        if (surfaceDist < nearestSurfaceDist) {
          nearestSurfaceDist = surfaceDist;
          bestTti = tti;
          bestClosing = closing;
        }
      }
    }
  }

  if (bestTti !== null && speed > 30) {
    if (bestTti <= 1.25 || nearestSurfaceDist <= 42) {
      return {
        risk: 'critical',
        nearestDistance: nearestSurfaceDist,
        timeToImpactSec: bestTti,
        closingSpeed: bestClosing,
      };
    }
    if (bestTti <= 2.35 || nearestSurfaceDist <= 105) {
      return {
        risk: 'caution',
        nearestDistance: nearestSurfaceDist,
        timeToImpactSec: bestTti,
        closingSpeed: bestClosing,
      };
    }
  }

  return {
    risk: 'clear',
    nearestDistance: Number.isFinite(nearestSurfaceDist) ? nearestSurfaceDist : 999,
    timeToImpactSec: null,
    closingSpeed: 0,
  };
}
