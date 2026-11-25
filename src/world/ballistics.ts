import type { SpaceWeaponId } from './spacePhysics';

export type AimAssistMode = 'off' | 'subtle' | 'standard';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface WeaponBallisticProfile {
  weapon: SpaceWeaponId;
  /** Physical projectile muzzle velocity in meters per second. */
  projectileSpeed: number;
  /** Full-damage optimal engagement distance in meters. */
  effectiveRangeMeters: number;
  /** Absolute travel range limit in meters; projectile dissipates beyond this distance. */
  maxRangeMeters: number;
  /** Minimum damage multiplier at maxRangeMeters (strictly 0 beyond maxRangeMeters). */
  minFalloffMultiplier: number;
  /** Maximum lifetime in seconds (always consistent with maxRangeMeters / projectileSpeed + small margin). */
  maxLifeSec: number;
  /** Bonus multiplier per consecutive hit (rewards sustained aim discipline, resets on miss). */
  consecutiveHitBonusStep: number;
  /** Maximum consecutive hit precision bonus (e.g. 0.30 = +30%). */
  consecutiveHitBonusCap: number;
  /** Critical multiplier on direct capital subsystem / bridge weak-point strikes. */
  weakPointMultiplier: number;
  /** Maximum angular convergence in degrees for each aim assist setting (strictly tiny boresight cone). */
  maxAssistDeg: Record<AimAssistMode, number>;
  /** Blend factor toward target vector inside the micro-cone (never snaps 100%). */
  assistBlend: Record<AimAssistMode, number>;
  /** Whether weapon requires a confirmed target lock prior to firing. */
  requiresTargetLock: boolean;
  /** Missile guidance parameters (only applicable to homing ordnance). */
  missileMinLockProgress?: number;
  missileSeekerConeCos?: number;
  missileMaxGuidanceSec?: number;
  missileMaxTurnRadPerSec?: number;
  missileMaxLaunchRangeMeters?: number;
  /** Concise HUD range tag (e.g. "520M", "LOCK REQ"). */
  hudRangeTag: string;
}

/**
 * Authoritative physical ballistics table for all five starfighter weapon systems.
 * Enforces finite speeds, clear engagement envelopes, distance damage falloff,
 * hard max-range dissipation, and skill-based aiming with zero 30-degree auto-snap.
 */
export const WEAPON_BALLISTICS: Record<SpaceWeaponId, WeaponBallisticProfile> = {
  pulse: {
    weapon: 'pulse',
    projectileSpeed: 780,
    effectiveRangeMeters: 520,
    maxRangeMeters: 920,
    minFalloffMultiplier: 0.42,
    maxLifeSec: 1.25,
    consecutiveHitBonusStep: 0.06,
    consecutiveHitBonusCap: 0.3,
    weakPointMultiplier: 1.05,
    maxAssistDeg: { off: 0, subtle: 1.35, standard: 2.4 },
    assistBlend: { off: 0, subtle: 0.32, standard: 0.48 },
    requiresTargetLock: false,
    hudRangeTag: '520M',
  },
  heavy_plasma: {
    weapon: 'heavy_plasma',
    projectileSpeed: 440,
    effectiveRangeMeters: 460,
    maxRangeMeters: 780,
    minFalloffMultiplier: 0.45,
    maxLifeSec: 1.85,
    consecutiveHitBonusStep: 0.04,
    consecutiveHitBonusCap: 0.16,
    weakPointMultiplier: 1.15,
    maxAssistDeg: { off: 0, subtle: 1.1, standard: 2.0 },
    assistBlend: { off: 0, subtle: 0.28, standard: 0.42 },
    requiresTargetLock: false,
    hudRangeTag: '460M',
  },
  missile: {
    weapon: 'missile',
    projectileSpeed: 420,
    effectiveRangeMeters: 960,
    maxRangeMeters: 1380,
    minFalloffMultiplier: 0.85,
    maxLifeSec: 4.5,
    consecutiveHitBonusStep: 0,
    consecutiveHitBonusCap: 0,
    weakPointMultiplier: 1.25,
    maxAssistDeg: { off: 0, subtle: 0, standard: 0 },
    assistBlend: { off: 0, subtle: 0, standard: 0 },
    requiresTargetLock: true,
    missileMinLockProgress: 0.92,
    missileSeekerConeCos: 0.78,
    missileMaxGuidanceSec: 3.6,
    missileMaxTurnRadPerSec: 2.35,
    missileMaxLaunchRangeMeters: 1180,
    hudRangeTag: 'LOCK REQ',
  },
  emp: {
    weapon: 'emp',
    projectileSpeed: 580,
    effectiveRangeMeters: 440,
    maxRangeMeters: 680,
    minFalloffMultiplier: 0.5,
    maxLifeSec: 1.25,
    consecutiveHitBonusStep: 0.03,
    consecutiveHitBonusCap: 0.12,
    weakPointMultiplier: 1.2,
    maxAssistDeg: { off: 0, subtle: 1.15, standard: 2.1 },
    assistBlend: { off: 0, subtle: 0.28, standard: 0.42 },
    requiresTargetLock: false,
    hudRangeTag: '440M',
  },
  rail_cannon: {
    weapon: 'rail_cannon',
    projectileSpeed: 1750,
    effectiveRangeMeters: 1050,
    maxRangeMeters: 1550,
    minFalloffMultiplier: 0.55,
    maxLifeSec: 0.95,
    consecutiveHitBonusStep: 0.05,
    consecutiveHitBonusCap: 0.2,
    weakPointMultiplier: 1.55,
    // Rail Cannon demands genuine precision — zero assist on off/subtle, hairline 0.45° max on standard
    maxAssistDeg: { off: 0, subtle: 0, standard: 0.45 },
    assistBlend: { off: 0, subtle: 0, standard: 0.25 },
    requiresTargetLock: false,
    hudRangeTag: '1050M',
  },
};

/**
 * Calibrated physical hull hit-sphere radii (meters) aligned to spacecraft silhouettes.
 * Prevents phantom hits far outside visual wings and fuselage.
 */
export const CALIBRATED_HIT_RADII = {
  fighterStandard: 12.2,
  fighterHeavyOrAce: 14.2,
  mediumWarship: 23.5,
  capitalSubsystem: 58,
  capitalBridge: 46,
  capitalHull: 235,
  playerHull: 12.8,
  wingmanHull: 11.2,
  nearMissOuterRadius: 27.5,
} as const;

export function getAimAssistLabel(mode: AimAssistMode): string {
  if (mode === 'off') return 'OFF';
  if (mode === 'subtle') return 'SUBTLE';
  return 'STANDARD';
}

export function normalizeVec3(v: Vec3Like): Vec3Like {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len <= 1e-8) return { x: 0, y: 0, z: -1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dotVec3(a: Vec3Like, b: Vec3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Computes physical distance damage falloff.
 * - Within effectiveRangeMeters: 1.0 (100% damage)
 * - Between effectiveRangeMeters and maxRangeMeters: smooth decay down to minFalloffMultiplier
 * - Strictly beyond maxRangeMeters: 0 (projectile dissipates before impact)
 */
export function computeDistanceDamageFalloff(
  weapon: SpaceWeaponId,
  distanceMeters: number,
): number {
  const profile = WEAPON_BALLISTICS[weapon];
  const dist = Math.max(0, distanceMeters);
  if (dist > profile.maxRangeMeters) return 0;
  if (dist <= profile.effectiveRangeMeters) return 1.0;

  const span = Math.max(1, profile.maxRangeMeters - profile.effectiveRangeMeters);
  const t = Math.min(1, Math.max(0, (dist - profile.effectiveRangeMeters) / span));
  // Smooth ease-out curve so long-range grazing still feels predictable without sharp cliffs
  const eased = t * t * (3 - 2 * t);
  return Number(
    (1 - eased * (1 - profile.minFalloffMultiplier)).toFixed(4),
  );
}

/**
 * Consecutive accurate hit precision multiplier.
 * Rewards players who track and lead targets cleanly; resets to 1.0 on any missed shot.
 */
export function computeConsecutiveHitMultiplier(
  weapon: SpaceWeaponId,
  consecutiveHits: number,
): number {
  const profile = WEAPON_BALLISTICS[weapon];
  if (consecutiveHits <= 1 || profile.consecutiveHitBonusStep <= 0) return 1.0;
  const bonus = Math.min(
    profile.consecutiveHitBonusCap,
    (consecutiveHits - 1) * profile.consecutiveHitBonusStep,
  );
  return Number((1 + bonus).toFixed(3));
}

export interface AimAssistInput {
  /** Normalized spacecraft boresight forward vector. */
  forward: Vec3Like;
  /** Optional normalized direction from muzzle toward candidate/locked target's lead or hull position. */
  targetDir: Vec3Like | null;
  /** Active weapon system. */
  weapon: SpaceWeaponId;
  /** Active aim assist setting. */
  mode: AimAssistMode;
  /** Distance to target in meters. */
  distanceMeters: number;
}

export interface AimAssistResult {
  dir: Vec3Like;
  assisted: boolean;
  angularOffsetDeg: number;
}

/**
 * Transparent micro-boresight convergence.
 * NEVER snaps 20–30 degrees onto targets, NEVER operates outside weapon maxRangeMeters,
 * and NEVER turns ballistic weapons into homing rounds.
 */
export function computeAimDirectionWithAssist(input: AimAssistInput): AimAssistResult {
  const fwd = normalizeVec3(input.forward);
  const profile = WEAPON_BALLISTICS[input.weapon];
  const maxDeg = profile.maxAssistDeg[input.mode] ?? 0;
  const blend = profile.assistBlend[input.mode] ?? 0;

  if (
    !input.targetDir ||
    maxDeg <= 0 ||
    blend <= 0 ||
    input.distanceMeters <= 0 ||
    input.distanceMeters > profile.maxRangeMeters
  ) {
    return { dir: fwd, assisted: false, angularOffsetDeg: 0 };
  }

  const tgt = normalizeVec3(input.targetDir);
  const cosAngle = Math.max(-1, Math.min(1, dotVec3(fwd, tgt)));
  const angleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

  if (angleDeg > maxDeg || angleDeg < 0.01) {
    return { dir: fwd, assisted: false, angularOffsetDeg: angleDeg };
  }

  // Taper assistance near the edge of the micro-cone so aiming feels organic rather than magnetic
  const coneProximity = 1 - angleDeg / maxDeg;
  const effectiveBlend = blend * (0.45 + 0.55 * coneProximity);

  const blended = normalizeVec3({
    x: fwd.x + (tgt.x - fwd.x) * effectiveBlend,
    y: fwd.y + (tgt.y - fwd.y) * effectiveBlend,
    z: fwd.z + (tgt.z - fwd.z) * effectiveBlend,
  });

  return {
    dir: blended,
    assisted: true,
    angularOffsetDeg: Number(angleDeg.toFixed(2)),
  };
}

export interface MissileLaunchValidationInput {
  hasValidTarget: boolean;
  lockProgress: number;
  distanceMeters: number;
  /** Cosine of angle between player forward vector and direction to target. */
  targetForwardCos: number;
  ammoRemaining: number;
  cooldownSec: number;
  playerHull: number;
}

export interface MissileLaunchValidationResult {
  allowed: boolean;
  reason:
    | 'ok'
    | 'destroyed'
    | 'cooldown'
    | 'no_ammo'
    | 'no_target'
    | 'lock_incomplete'
    | 'out_of_range'
    | 'outside_seeker_cone';
  toastMessage?: string;
}

/**
 * Enforces genuine missile lock-on before launch.
 * Firing without lock is rejected cleanly without consuming ammunition.
 */
export function canLaunchHomingMissile(
  input: MissileLaunchValidationInput,
): MissileLaunchValidationResult {
  const profile = WEAPON_BALLISTICS.missile;
  const minLock = profile.missileMinLockProgress ?? 0.92;
  const maxLaunchRange = profile.missileMaxLaunchRangeMeters ?? 1180;
  const minConeCos = profile.missileSeekerConeCos ?? 0.78;

  if (input.playerHull <= 0) {
    return { allowed: false, reason: 'destroyed' };
  }
  if (input.cooldownSec > 0) {
    return { allowed: false, reason: 'cooldown' };
  }
  if (input.ammoRemaining <= 0) {
    return {
      allowed: false,
      reason: 'no_ammo',
      toastMessage: 'MISSILE PODS DEPLETED',
    };
  }
  if (!input.hasValidTarget) {
    return {
      allowed: false,
      reason: 'no_target',
      toastMessage: 'MISSILE LOCK REQUIRED — ACQUIRE HOSTILE TARGET FIRST',
    };
  }
  if (input.distanceMeters > maxLaunchRange) {
    return {
      allowed: false,
      reason: 'out_of_range',
      toastMessage: `TARGET BEYOND MISSILE LAUNCH RANGE (${Math.round(maxLaunchRange)}M MAX)`,
    };
  }
  if (input.targetForwardCos < minConeCos) {
    return {
      allowed: false,
      reason: 'outside_seeker_cone',
      toastMessage: 'ALIGN NOSE TOWARD TARGET TO LAUNCH MISSILE',
    };
  }
  if (input.lockProgress < minLock) {
    return {
      allowed: false,
      reason: 'lock_incomplete',
      toastMessage: `ACQUIRING MISSILE LOCK (${Math.round(input.lockProgress * 100)}%) — HOLD TARGET`,
    };
  }
  return { allowed: true, reason: 'ok' };
}

export interface ProjectileStepInput {
  pos: Vec3Like;
  vel: Vec3Like;
  dt: number;
  traveledMeters: number;
  maxRangeMeters: number;
}

export interface ProjectileStepResult {
  prevPos: Vec3Like;
  nextPos: Vec3Like;
  stepDistMeters: number;
  nextTraveledMeters: number;
  expiredByRange: boolean;
}

/**
 * Advances a projectile by `dt` while strictly clipping its swept collision segment
 * to `maxRangeMeters` so fast bolts (like Rail Cannon) can never hit past their physical cutoff.
 */
export function advanceProjectileSegment(
  input: ProjectileStepInput,
): ProjectileStepResult {
  const prevPos = { x: input.pos.x, y: input.pos.y, z: input.pos.z };
  const dx = input.vel.x * input.dt;
  const dy = input.vel.y * input.dt;
  const dz = input.vel.z * input.dt;
  const rawStepDist = Math.hypot(dx, dy, dz);
  const remainingRange = Math.max(0, input.maxRangeMeters - input.traveledMeters);

  if (rawStepDist <= 1e-6) {
    return {
      prevPos,
      nextPos: prevPos,
      stepDistMeters: 0,
      nextTraveledMeters: input.traveledMeters,
      expiredByRange: remainingRange <= 0,
    };
  }

  if (rawStepDist >= remainingRange) {
    const ratio = remainingRange / rawStepDist;
    return {
      prevPos,
      nextPos: {
        x: prevPos.x + dx * ratio,
        y: prevPos.y + dy * ratio,
        z: prevPos.z + dz * ratio,
      },
      stepDistMeters: remainingRange,
      nextTraveledMeters: input.maxRangeMeters,
      expiredByRange: true,
    };
  }

  return {
    prevPos,
    nextPos: {
      x: prevPos.x + dx,
      y: prevPos.y + dy,
      z: prevPos.z + dz,
    },
    stepDistMeters: rawStepDist,
    nextTraveledMeters: input.traveledMeters + rawStepDist,
    expiredByRange: false,
  };
}
