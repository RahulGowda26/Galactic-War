import type { DifficultyId } from './campaignConfig';
import { SPACE_WEAPONS, type EnemyFighterRole, type SpaceWeaponId } from './spacePhysics';
import type { ExtinctionEnemyRole } from './extinctionCampaign';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Exact squared distance from point C to line segment AB.
 * Used for swept projectile-to-target collision so supersonic Rail Cannon slugs (1,850 m/s)
 * and fast Pulse bolts never tunnel through fighters, subsystems, or asteroids on low-FPS frames.
 */
export function pointToSegmentDistanceSq(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  if (abLenSq <= 1e-8) {
    return acx * acx + acy * acy + acz * acz;
  }
  const t = Math.max(0, Math.min(1, (acx * abx + acy * aby + acz * abz) / abLenSq));
  const px = ax + abx * t - cx;
  const py = ay + aby * t - cy;
  const pz = az + abz * t - cz;
  return px * px + py * py + pz * pz;
}

export function segmentIntersectsSphere(
  start: Vec3Like,
  end: Vec3Like,
  center: Vec3Like,
  radius: number,
): boolean {
  return (
    pointToSegmentDistanceSq(
      start.x,
      start.y,
      start.z,
      end.x,
      end.y,
      end.z,
      center.x,
      center.y,
      center.z,
    ) <=
    radius * radius
  );
}

export interface WeaponDamageInput {
  weapon: SpaceWeaponId;
  baseDamage: number;
  targetShield: number;
  targetHull: number;
}

export interface WeaponDamageResult {
  nextShield: number;
  nextHull: number;
  shieldDamageDealt: number;
  hullDamageDealt: number;
  empDisableSec: number;
  empAoeRadius: number;
  plasmaSplashRadius: number;
  shieldBrokenNow: boolean;
  destroyed: boolean;
}

/**
 * Distinct combat damage profiles for every weapon class:
 * - Pulse: reliable balanced rapid fire
 * - Heavy Plasma: strong armor burn + 22m concussive splash
 * - Missile: heavy homing burst
 * - EMP: massive 3.8x shield strip + 36m AoE disruption pulse + disable timer
 * - Rail Cannon: 35% direct armor-piercing bleed through shields + high precision burst
 */
export function computeWeaponDamageBreakdown(input: WeaponDamageInput): WeaponDamageResult {
  const spec = SPACE_WEAPONS[input.weapon];
  const shieldMult = input.weapon === 'emp' ? Math.max(3.8, spec.shieldDamageMultiplier) : spec.shieldDamageMultiplier;
  const armorPierceRatio = input.weapon === 'rail_cannon' ? 0.35 : 0;

  let shield = Math.max(0, input.targetShield);
  let hull = Math.max(0, input.targetHull);
  const hadShield = shield > 0;

  const pierceHullDmg = Math.round(input.baseDamage * armorPierceRatio);
  let remainingDmg = Math.max(0, input.baseDamage - pierceHullDmg);
  let shieldDamageDealt = 0;
  let hullDamageDealt = 0;

  if (shield > 0 && remainingDmg > 0) {
    const potentialShieldDmg = Math.round(remainingDmg * shieldMult);
    const absorbed = Math.min(shield, potentialShieldDmg);
    shield -= absorbed;
    shieldDamageDealt = absorbed;
    const leftoverEnergy = Math.max(0, remainingDmg - Math.round(absorbed / shieldMult));
    remainingDmg = leftoverEnergy;
  }

  const totalHullHit = remainingDmg + pierceHullDmg;
  if (totalHullHit > 0) {
    const appliedHull = Math.min(hull, totalHullHit);
    hull -= appliedHull;
    hullDamageDealt = appliedHull;
  }

  return {
    nextShield: shield,
    nextHull: hull,
    shieldDamageDealt,
    hullDamageDealt,
    empDisableSec: spec.empDisableSec,
    empAoeRadius: input.weapon === 'emp' ? 36 : 0,
    plasmaSplashRadius: input.weapon === 'heavy_plasma' ? 22 : 0,
    shieldBrokenNow: hadShield && shield <= 0,
    destroyed: hull <= 0,
  };
}

export interface MissionTacticalProfile {
  missionTier: number; // 1..10
  maxSimultaneousAttackers: number;
  fireCadenceMultiplier: number; // higher = faster fire
  leadAimFactor: number; // 0..0.75 predictive aim lead
  scatterMeters: number; // lower = tighter aim
  flankAggression: number; // 0.45..1.05
  evasiveBreakChance: number; // 0.15..0.68
  aceFlareCooldownSec: number; // Elite Ace defensive decoy flare interval
  missileCooldownMultiplier: number;
  squadFormationTightness: number;
}

/**
 * Progressive, fair difficulty scaling across OP 01–OP 10 (and optional missions).
 * Elevates enemy coordination, flanking geometry, lead aiming, and attack token caps
 * instead of inflating health bars into tedious bullet sponges.
 */
export function computeMissionTacticalProfile(
  missionNumber: number,
  difficulty: DifficultyId = 'normal',
): MissionTacticalProfile {
  const effectiveNum = missionNumber > 100 ? Math.min(8, (missionNumber - 100) * 2 + 2) : missionNumber;
  const tier = Math.max(1, Math.min(10, Math.round(effectiveNum)));
  const progress = (tier - 1) / 9; // 0.0 at OP 01 -> 1.0 at OP 10

  const diffTokenMod =
    difficulty === 'nightmare' ? 1 : difficulty === 'hard' ? 1 : difficulty === 'story' ? -1 : 0;
  const diffCadenceMod =
    difficulty === 'nightmare'
      ? 1.18
      : difficulty === 'hard'
        ? 1.08
        : difficulty === 'story'
          ? 0.84
          : 1.0;
  const diffLeadMod =
    difficulty === 'nightmare'
      ? 1.16
      : difficulty === 'hard'
        ? 1.08
        : difficulty === 'story'
          ? 0.72
          : 1.0;

  const baseTokens = tier <= 2 ? 2 : tier <= 6 ? 3 : 4;
  const maxSimultaneousAttackers = Math.max(
    1,
    Math.min(difficulty === 'nightmare' ? 5 : 4, baseTokens + diffTokenMod),
  );

  return {
    missionTier: tier,
    maxSimultaneousAttackers,
    fireCadenceMultiplier: Number(((0.88 + progress * 0.36) * diffCadenceMod).toFixed(2)),
    leadAimFactor: Number(Math.min(0.76, (0.2 + progress * 0.5) * diffLeadMod).toFixed(2)),
    scatterMeters: Math.round(Math.max(7, (22 - progress * 11) / diffCadenceMod)),
    flankAggression: Number((0.48 + progress * 0.54).toFixed(2)),
    evasiveBreakChance: Number(Math.min(0.7, 0.18 + progress * 0.44).toFixed(2)),
    aceFlareCooldownSec: Number((11.5 - progress * 4.2).toFixed(1)),
    missileCooldownMultiplier: Number((1.18 - progress * 0.28).toFixed(2)),
    squadFormationTightness: Number((0.55 + progress * 0.45).toFixed(2)),
  };
}

export interface TacticalSteeringInput {
  role: EnemyFighterRole;
  squadSlot: number;
  elapsed: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitHeight: number;
  flankPhase: number;
  distToPlayer: number;
  evasionTimer: number;
  profile: MissionTacticalProfile;
}

export interface TacticalSteeringOffset {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  anchorMode: 'zone' | 'player' | 'carrier';
  bankAngle: number;
}

/**
 * Role-specific squad formation and tactical maneuvering offsets.
 * Replaces identical circular orbits with recognizable space-combat roles:
 * - Interceptor: Pincer flank pairs that bracket the player on opposing sides
 * - Heavy Fighter: Disciplined forward assault wedge maintaining medium firing range
 * - Bomber: Wide standoff torpedo arc aimed at friendly carrier or player flank
 * - Scout: Fast outer perimeter recon weave that breaks away when approached
 * - Medium Warship: Steady broadside gunship standoff posture
 * - Elite Ace: Adaptive high-G hunter with barrel rolls & reactive break turns
 */
export function computeRoleTacticalOffset(input: TacticalSteeringInput): TacticalSteeringOffset {
  const { role, squadSlot, elapsed, orbitAngle, orbitRadius, orbitHeight, flankPhase, distToPlayer, evasionTimer, profile } =
    input;
  const sideSign = squadSlot % 2 === 0 ? 1 : -1;
  const evadeBoost = evasionTimer > 0 ? 1.55 : 1.0;

  if (role === 'interceptor') {
    if (distToPlayer < 1450) {
      // Coordinated pincer bracket around player
      const pincerAngle = orbitAngle + sideSign * 0.72;
      const radial = (210 + (squadSlot % 3) * 58) * evadeBoost;
      const weave = Math.sin(elapsed * 1.9 + flankPhase) * 95 * profile.flankAggression;
      return {
        offsetX: Math.cos(pincerAngle) * radial + sideSign * weave * 0.6,
        offsetY: Math.sin(elapsed * 1.65 + flankPhase) * 68 + sideSign * 34,
        offsetZ: Math.sin(pincerAngle) * radial,
        anchorMode: 'player',
        bankAngle: sideSign * (0.58 + Math.sin(elapsed * 2.8 + flankPhase) * 0.25),
      };
    }
    return {
      offsetX: Math.cos(orbitAngle) * orbitRadius,
      offsetY: orbitHeight + Math.sin(elapsed * 1.3 + flankPhase) * 42,
      offsetZ: Math.sin(orbitAngle) * orbitRadius,
      anchorMode: 'zone',
      bankAngle: sideSign * 0.42,
    };
  }

  if (role === 'heavy_fighter') {
    if (distToPlayer < 1600) {
      // Escort wedge holding optimal gunship standoff (340–480m)
      const wedgeAngle = orbitAngle * 0.75 + sideSign * 0.45;
      const standoff = 350 + (squadSlot % 2) * 85;
      return {
        offsetX: Math.cos(wedgeAngle) * standoff,
        offsetY: Math.sin(elapsed * 0.95 + flankPhase) * 48 + (squadSlot % 3 - 1) * 32,
        offsetZ: Math.sin(wedgeAngle) * standoff,
        anchorMode: 'player',
        bankAngle: sideSign * 0.34,
      };
    }
    return {
      offsetX: Math.cos(orbitAngle) * orbitRadius,
      offsetY: orbitHeight + Math.sin(elapsed * 0.8 + flankPhase) * 26,
      offsetZ: Math.sin(orbitAngle) * orbitRadius,
      anchorMode: 'zone',
      bankAngle: sideSign * 0.28,
    };
  }

  if (role === 'bomber') {
    const arcRadius = Math.max(460, orbitRadius * 1.15);
    return {
      offsetX: Math.cos(orbitAngle) * arcRadius,
      offsetY: orbitHeight + 55 + Math.sin(elapsed * 0.55 + flankPhase) * 30,
      offsetZ: Math.sin(orbitAngle) * arcRadius,
      anchorMode: 'carrier',
      bankAngle: sideSign * 0.2,
    };
  }

  if (role === 'scout') {
    const outerRad = Math.max(540, orbitRadius * 1.35) * evadeBoost;
    return {
      offsetX: Math.cos(orbitAngle * 1.25) * outerRad,
      offsetY: orbitHeight + Math.sin(elapsed * 2.1 + flankPhase) * 85,
      offsetZ: Math.sin(orbitAngle * 1.25) * outerRad,
      anchorMode: distToPlayer < 950 ? 'player' : 'zone',
      bankAngle: Math.sin(elapsed * 3.2 + flankPhase) * 0.78,
    };
  }

  if (role === 'medium_warship') {
    const broadsideRad = Math.max(480, Math.min(680, orbitRadius * 0.85));
    return {
      offsetX: Math.cos(orbitAngle) * broadsideRad,
      offsetY: orbitHeight + Math.sin(elapsed * 0.42 + flankPhase) * 18,
      offsetZ: Math.sin(orbitAngle) * broadsideRad,
      anchorMode: distToPlayer < 1750 ? 'player' : 'zone',
      bankAngle: sideSign * 0.12,
    };
  }

  // Elite Ace: tight aggressive pursuit with corkscrew evasion
  const aceRad = (230 + Math.sin(elapsed * 1.5 + flankPhase) * 75) * evadeBoost;
  return {
    offsetX: Math.cos(orbitAngle * 1.15) * aceRad,
    offsetY: Math.sin(elapsed * 2.4 + flankPhase) * 95 + (evasionTimer > 0 ? 70 * sideSign : 0),
    offsetZ: Math.sin(orbitAngle * 1.15) * aceRad,
    anchorMode: distToPlayer < 2100 ? 'player' : 'zone',
    bankAngle: Math.sin(elapsed * 4.4 + flankPhase) * 1.08,
  };
}

/**
 * Selects which hostile craft currently hold active attack tokens so large engagements
 * stay tactically intense yet readable and fair instead of unavoidable instant crossfire.
 */
export function selectActiveAttackerIds(
  candidates: Array<{ id: string; distToPlayer: number; role: ExtinctionEnemyRole; empStunned: boolean }>,
  maxTokens: number,
): Set<string> {
  const eligible = candidates
    .filter((c) => !c.empStunned && c.distToPlayer < 1550)
    .sort((a, b) => {
      const aPriority =
        a.role === 'elite_ace' || a.role === 'phantom_interceptor'
          ? -180
          : a.role === 'medium_warship' || a.role === 'disruptor_ship'
            ? -120
            : a.role === 'interceptor' || a.role === 'hunter_drone'
              ? -60
              : 0;
      const bPriority =
        b.role === 'elite_ace' || b.role === 'phantom_interceptor'
          ? -180
          : b.role === 'medium_warship' || b.role === 'disruptor_ship'
            ? -120
            : b.role === 'interceptor' || b.role === 'hunter_drone'
              ? -60
              : 0;
      return a.distToPlayer + aPriority - (b.distToPlayer + bPriority);
    });

  const result = new Set<string>();
  const cap = Math.max(1, Math.round(maxTokens));
  for (let i = 0; i < Math.min(cap, eligible.length); i++) {
    result.add(eligible[i].id);
  }
  return result;
}

export interface PredictiveLeadInput {
  shooterPos: Vec3Like;
  targetPos: Vec3Like;
  targetVel: Vec3Like;
  projectileSpeed: number;
  leadFactor: number; // 0..1
}

/**
 * Computes a fair predictive aim point ahead of a moving player spacecraft.
 */
export function computePredictiveAimPoint(input: PredictiveLeadInput): Vec3Like {
  const dx = input.targetPos.x - input.shooterPos.x;
  const dy = input.targetPos.y - input.shooterPos.y;
  const dz = input.targetPos.z - input.shooterPos.z;
  const dist = Math.hypot(dx, dy, dz);
  const tof = Math.min(1.8, dist / Math.max(120, input.projectileSpeed));
  const clampedLead = Math.max(0, Math.min(0.85, input.leadFactor));
  return {
    x: input.targetPos.x + input.targetVel.x * tof * clampedLead,
    y: input.targetPos.y + input.targetVel.y * tof * clampedLead,
    z: input.targetPos.z + input.targetVel.z * tof * clampedLead,
  };
}

export interface WeaponActionCheckInput {
  hull: number;
  cooldownSec: number;
  overheated: boolean;
  ammoRemaining?: number;
}

export function canExecuteWeaponAction(input: WeaponActionCheckInput): {
  allowed: boolean;
  reason?: 'destroyed' | 'cooldown' | 'overheated' | 'empty';
} {
  if (input.hull <= 0) return { allowed: false, reason: 'destroyed' };
  if (input.cooldownSec > 0.001) return { allowed: false, reason: 'cooldown' };
  if (input.overheated) return { allowed: false, reason: 'overheated' };
  if (input.ammoRemaining !== undefined && input.ammoRemaining <= 0) {
    return { allowed: false, reason: 'empty' };
  }
  return { allowed: true };
}

export interface MissileGuidanceInput {
  missilePos: Vec3Like;
  missileVel: Vec3Like;
  targetPos: Vec3Like;
  targetVel: Vec3Like;
  speed: number;
  dt: number;
  maxTurnRadPerSec?: number;
  seekerConeCos?: number; // cosine of max half-angle (e.g., cos(68 deg) = 0.375); outside breaks seeker lock
  leadFactor?: number; // 0..1 predictive intercept lead
}

export interface MissileGuidanceResult {
  vel: Vec3Like;
  tracking: boolean;
  lostSeeker: boolean;
  leadPoint: Vec3Like;
}

/**
 * Physically-bounded predictive proportional-navigation missile guidance.
 * - Leads moving spacecraft based on time-to-intercept so missiles track fast fighters reliably.
 * - Enforces finite turn rate (rad/sec) and seeker FOV cone so missiles feel authentic
 *   and never execute impossible 180-degree instant U-turns.
 */
export function stepMissileGuidance(input: MissileGuidanceInput): MissileGuidanceResult {
  const safeDt = Math.max(0.001, Math.min(0.15, input.dt));
  const speed = Math.max(80, input.speed);
  const maxTurnRadPerSec = input.maxTurnRadPerSec ?? 2.85; // ~163 deg/sec agile seeker turn cap
  const seekerConeCos = input.seekerConeCos ?? 0.28; // ~74 deg half-angle seeker gimbal
  const leadFactor = Math.max(0, Math.min(1, input.leadFactor ?? 0.85));

  const vx = input.missileVel.x;
  const vy = input.missileVel.y;
  const vz = input.missileVel.z;
  const vLen = Math.hypot(vx, vy, vz) || 1;
  const curDirX = vx / vLen;
  const curDirY = vy / vLen;
  const curDirZ = vz / vLen;

  const relX = input.targetPos.x - input.missilePos.x;
  const relY = input.targetPos.y - input.missilePos.y;
  const relZ = input.targetPos.z - input.missilePos.z;
  const dist = Math.hypot(relX, relY, relZ);

  // Check if target is still inside forward seeker gimbal cone (skip check at point-blank < 45m)
  if (dist > 45) {
    const losCos = (curDirX * relX + curDirY * relY + curDirZ * relZ) / dist;
    if (losCos < seekerConeCos) {
      return {
        vel: { x: curDirX * speed, y: curDirY * speed, z: curDirZ * speed },
        tracking: false,
        lostSeeker: true,
        leadPoint: { ...input.targetPos },
      };
    }
  }

  // Predictive intercept lead point
  const tof = Math.min(2.2, dist / speed);
  const leadPoint: Vec3Like = {
    x: input.targetPos.x + input.targetVel.x * tof * leadFactor,
    y: input.targetPos.y + input.targetVel.y * tof * leadFactor,
    z: input.targetPos.z + input.targetVel.z * tof * leadFactor,
  };

  const desX = leadPoint.x - input.missilePos.x;
  const desY = leadPoint.y - input.missilePos.y;
  const desZ = leadPoint.z - input.missilePos.z;
  const desLen = Math.hypot(desX, desY, desZ) || 1;
  const tarDirX = desX / desLen;
  const tarDirY = desY / desLen;
  const tarDirZ = desZ / desLen;

  // Rotate current direction toward target direction clamped by maxTurnRadPerSec * dt
  const dot = Math.max(-1, Math.min(1, curDirX * tarDirX + curDirY * tarDirY + curDirZ * tarDirZ));
  const angle = Math.acos(dot);
  const maxStep = maxTurnRadPerSec * safeDt;

  let outX = tarDirX;
  let outY = tarDirY;
  let outZ = tarDirZ;

  if (angle > maxStep && angle > 1e-4) {
    const t = maxStep / angle;
    // Spherical linear interpolation (slerp) on unit sphere
    const sinA = Math.sin(angle);
    const w0 = Math.sin((1 - t) * angle) / sinA;
    const w1 = Math.sin(t * angle) / sinA;
    outX = curDirX * w0 + tarDirX * w1;
    outY = curDirY * w0 + tarDirY * w1;
    outZ = curDirZ * w0 + tarDirZ * w1;
    const outLen = Math.hypot(outX, outY, outZ) || 1;
    outX /= outLen;
    outY /= outLen;
    outZ /= outLen;
  }

  return {
    vel: { x: outX * speed, y: outY * speed, z: outZ * speed },
    tracking: true,
    lostSeeker: false,
    leadPoint,
  };
}

