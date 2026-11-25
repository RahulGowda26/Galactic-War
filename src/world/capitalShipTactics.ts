/**
 * Pure, decoupled tactics & kinematics for Enemy Capital Ships:
 *  1. Continuous, deliberate capital-ship helm movement & patrol routing.
 *  2. Coordinated escort squadron formation, subsystem defense, and destruction retreat.
 *  3. 3-second critical meltdown countdown, secondary explosions, and distance-based blast damage.
 */

import type { CapitalShipClass as BaseCapitalShipClass, EnemyFighterRole } from './spacePhysics';

export type CapitalShipClass = BaseCapitalShipClass | 'carrier' | 'dreadnought' | 'cruiser';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const CAPITAL_CRITICAL_COUNTDOWN_SEC = 3.0;
export const CAPITAL_BLAST_DANGER_RADIUS_METERS = 620;

export interface CapitalHelmState {
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  posX: number;
  posY: number;
  posZ: number;
  velX: number;
  velY: number;
  velZ: number;
  yawRad: number;
  pitchRad: number;
  rollRad: number;
  patrolPhase: number;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  verticalAmp: number;
  cruiseSpeed: number;
  turnRateRadPerSec: number;
  evadeOffsetX: number;
  evadeOffsetZ: number;
}

export interface CapitalHelmStepOutput {
  state: CapitalHelmState;
  speedMetersPerSec: number;
  forward: Vec3;
  right: Vec3;
}

export function createCapitalHelmState(
  shipClass: CapitalShipClass,
  initialPos: Vec3,
): CapitalHelmState {
  const isFlagship = shipClass === 'sovereign_flagship';
  const isDreadnought = shipClass === 'dreadnought' || shipClass === 'carrier';
  return {
    anchorX: initialPos.x,
    anchorY: initialPos.y,
    anchorZ: initialPos.z,
    posX: initialPos.x,
    posY: initialPos.y,
    posZ: initialPos.z,
    velX: 0,
    velY: 0,
    velZ: 20,
    yawRad: 0,
    pitchRad: 0,
    rollRad: 0,
    patrolPhase: 0,
    orbitRadiusX: isFlagship ? 640 : isDreadnought ? 540 : 460,
    orbitRadiusZ: isFlagship ? 480 : isDreadnought ? 420 : 360,
    verticalAmp: isFlagship ? 44 : 58,
    cruiseSpeed: isFlagship ? 20 : isDreadnought ? 23 : 27,
    turnRateRadPerSec: isFlagship ? 0.14 : isDreadnought ? 0.18 : 0.24,
    evadeOffsetX: 0,
    evadeOffsetZ: 0,
  };
}

function wrapAngleRad(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Advances a capital ship along a continuous, deliberate 3D tactical patrol route
 * with slow forward cruise, smooth course adjustments, lateral repositioning,
 * and gentle pitch/yaw/roll banking (never teleports or snaps).
 */
export function stepCapitalShipMovement(
  prev: CapitalHelmState,
  dt: number,
  options: {
    engineSpeedMultiplier: number; // 1.0 intact, ~0.35 when engines crippled
    hullRatio: number; // 0..1
    underFire: boolean;
    playerPos?: Vec3;
    obstacleAvoidance?: Vec3;
    criticalMeltdown?: boolean;
  },
): CapitalHelmStepOutput {
  const safeDt = Math.max(0, Math.min(0.15, dt));
  const engineScale = Math.max(0.22, Math.min(1.15, options.engineSpeedMultiplier));
  const meltdownSlowdown = options.criticalMeltdown ? 0.32 : 1.0;
  const targetSpeed = prev.cruiseSpeed * engineScale * meltdownSlowdown;

  // Continuous figure-eight / broadside elliptical patrol so the warship clearly translates across space
  const angularAdvance = (targetSpeed / Math.max(220, prev.orbitRadiusX)) * safeDt;
  const nextPhase = prev.patrolPhase + angularAdvance;

  // Subtle lateral repositioning when taking fire or damaged
  let evadeX = prev.evadeOffsetX;
  let evadeZ = prev.evadeOffsetZ;
  if (options.underFire && options.playerPos && !options.criticalMeltdown) {
    const dx = prev.posX - options.playerPos.x;
    const dz = prev.posZ - options.playerPos.z;
    const dLen = Math.hypot(dx, dz) || 1;
    // Slowly angle broadside / drift laterally to keep turrets bearing on attacker
    const targetEvadeX = (-dz / dLen) * 140;
    const targetEvadeZ = (dx / dLen) * 140;
    const blend = Math.min(1, safeDt * 0.28);
    evadeX += (targetEvadeX - evadeX) * blend;
    evadeZ += (targetEvadeZ - evadeZ) * blend;
  } else {
    const decay = Math.exp(-0.22 * safeDt);
    evadeX *= decay;
    evadeZ *= decay;
  }

  // Look-ahead waypoint along the patrol curve
  const lookPhase = nextPhase + 0.42;
  let wpX = prev.anchorX + Math.sin(lookPhase) * prev.orbitRadiusX + evadeX;
  let wpY =
    prev.anchorY +
    Math.sin(lookPhase * 0.72) * prev.verticalAmp +
    Math.cos(lookPhase * 0.35) * (prev.verticalAmp * 0.35);
  let wpZ = prev.anchorZ + Math.sin(lookPhase * 2.0) * (prev.orbitRadiusZ * 0.55) + Math.cos(lookPhase) * (prev.orbitRadiusZ * 0.65) + evadeZ;

  if (options.obstacleAvoidance) {
    wpX += options.obstacleAvoidance.x * 260;
    wpY += options.obstacleAvoidance.y * 140;
    wpZ += options.obstacleAvoidance.z * 260;
  }

  const toX = wpX - prev.posX;
  const toY = wpY - prev.posY;
  const toZ = wpZ - prev.posZ;
  const horizDist = Math.hypot(toX, toZ) || 1;

  // Yaw faces direction of travel (+Z is capital ship forward nose)
  const desiredYaw = Math.atan2(toX, toZ);
  const desiredPitch = Math.max(-0.14, Math.min(0.14, -Math.atan2(toY, horizDist)));

  const maxTurn = prev.turnRateRadPerSec * engineScale * safeDt;
  const yawDiff = wrapAngleRad(desiredYaw - prev.yawRad);
  const clampedYawStep = Math.max(-maxTurn, Math.min(maxTurn, yawDiff));
  const nextYaw = wrapAngleRad(prev.yawRad + clampedYawStep);

  const maxPitchStep = maxTurn * 0.55;
  const pitchDiff = desiredPitch - prev.pitchRad;
  const nextPitch = prev.pitchRad + Math.max(-maxPitchStep, Math.min(maxPitchStep, pitchDiff));

  // Subtle capital bank into turns (or listing during critical meltdown)
  const desiredRoll = options.criticalMeltdown
    ? Math.max(-0.34, Math.min(0.34, prev.rollRad + safeDt * 0.14))
    : Math.max(-0.11, Math.min(0.11, -yawDiff * 0.22));
  const nextRoll = prev.rollRad + (desiredRoll - prev.rollRad) * Math.min(1, safeDt * 1.4);

  const cosPitch = Math.cos(nextPitch);
  const fwdX = Math.sin(nextYaw) * cosPitch;
  const fwdY = -Math.sin(nextPitch);
  const fwdZ = Math.cos(nextYaw) * cosPitch;

  const rightX = Math.cos(nextYaw);
  const rightY = 0;
  const rightZ = -Math.sin(nextYaw);

  const desiredVelX = fwdX * targetSpeed;
  const desiredVelY = fwdY * targetSpeed;
  const desiredVelZ = fwdZ * targetSpeed;

  // Heavy inertial velocity blending
  const velBlend = Math.min(1, safeDt * 0.9);
  const velX = prev.velX + (desiredVelX - prev.velX) * velBlend;
  const velY = prev.velY + (desiredVelY - prev.velY) * velBlend;
  const velZ = prev.velZ + (desiredVelZ - prev.velZ) * velBlend;

  const posX = prev.posX + velX * safeDt;
  const posY = prev.posY + velY * safeDt;
  const posZ = prev.posZ + velZ * safeDt;

  const speedMetersPerSec = Math.hypot(velX, velY, velZ);

  return {
    state: {
      ...prev,
      posX,
      posY,
      posZ,
      velX,
      velY,
      velZ,
      yawRad: nextYaw,
      pitchRad: nextPitch,
      rollRad: nextRoll,
      patrolPhase: nextPhase,
      evadeOffsetX: evadeX,
      evadeOffsetZ: evadeZ,
    },
    speedMetersPerSec,
    forward: { x: fwdX, y: fwdY, z: fwdZ },
    right: { x: rightX, y: rightY, z: rightZ },
  };
}

// ============================================================================
// COORDINATED CAPITAL ESCORT SQUADRON FORMATION & REACTIVE AI
// ============================================================================

export type EscortWingRole = 'close_guard' | 'patrol_wing' | 'bomber_strike';

export type EscortTacticalBehavior =
  | 'hold_formation'
  | 'intercept_player'
  | 'defend_subsystem'
  | 'attack_run'
  | 'retreat_scatter';

export interface EscortSlotSpec {
  slotIndex: number;
  escortRole: EscortWingRole;
  fighterRole: EnemyFighterRole;
  callsign: string;
  // Offset in capital-ship local coordinates (right, up, forward)
  localOffset: Vec3;
}

export interface EscortSquadronPlan {
  slots: EscortSlotSpec[];
  maxReinforcementWaves: number;
  reinforcementCooldownSec: number;
}

/**
 * Generates a balanced, controlled escort squadron around a capital ship
 * (close defensive interceptors, wider patrol fighters, and strike bombers for heavy classes).
 */
export function createEscortSquadronPlan(shipClass: CapitalShipClass): EscortSquadronPlan {
  const baseSlots: EscortSlotSpec[] = [
    {
      slotIndex: 0,
      escortRole: 'close_guard',
      fighterRole: 'interceptor',
      callsign: 'Aegis Guard 1',
      localOffset: { x: -135, y: 42, z: 120 },
    },
    {
      slotIndex: 1,
      escortRole: 'close_guard',
      fighterRole: 'interceptor',
      callsign: 'Aegis Guard 2',
      localOffset: { x: 135, y: 42, z: 120 },
    },
    {
      slotIndex: 2,
      escortRole: 'patrol_wing',
      fighterRole: 'heavy_fighter',
      callsign: 'Outrider Patrol 1',
      localOffset: { x: -245, y: -36, z: -40 },
    },
    {
      slotIndex: 3,
      escortRole: 'patrol_wing',
      fighterRole: 'heavy_fighter',
      callsign: 'Outrider Patrol 2',
      localOffset: { x: 245, y: -36, z: -40 },
    },
  ];

  if (
    shipClass === 'carrier' ||
    shipClass === 'dreadnought' ||
    shipClass === 'sovereign_flagship'
  ) {
    baseSlots.push({
      slotIndex: 4,
      escortRole: 'bomber_strike',
      fighterRole: 'bomber',
      callsign: 'Siege Striker 1',
      localOffset: { x: 0, y: 98, z: -155 },
    });
  }

  if (shipClass === 'sovereign_flagship') {
    baseSlots.push({
      slotIndex: 5,
      escortRole: 'close_guard',
      fighterRole: 'elite_ace',
      callsign: 'Sovereign Vanguard',
      localOffset: { x: 0, y: 74, z: 185 },
    });
  }

  return {
    slots: baseSlots,
    maxReinforcementWaves: shipClass === 'sovereign_flagship' ? 2 : 1,
    reinforcementCooldownSec: 36,
  };
}

export interface EscortBehaviorInput {
  escortRole: EscortWingRole;
  slotIndex: number;
  localOffset: Vec3;
  escortPos: Vec3;
  capitalPos: Vec3;
  capitalForward: Vec3;
  capitalRight: Vec3;
  capitalHullRatio: number; // 0..1
  capitalDestroyedOrCritical: boolean;
  capitalUnderSubsystemAttack: boolean;
  playerPos: Vec3;
  elapsedSec: number;
}

export interface EscortBehaviorOutput {
  behavior: EscortTacticalBehavior;
  anchorPoint: Vec3;
  aggressiveness: number; // 0..1.5
  shouldScatter: boolean;
}

/**
 * Evaluates an escort fighter's live tactical state and desired anchor point
 * relative to the moving capital ship and the player's actions.
 */
export function computeEscortTacticalState(input: EscortBehaviorInput): EscortBehaviorOutput {
  const {
    escortRole,
    slotIndex,
    localOffset,
    escortPos,
    capitalPos,
    capitalForward,
    capitalRight,
    capitalHullRatio,
    capitalDestroyedOrCritical,
    capitalUnderSubsystemAttack,
    playerPos,
    elapsedSec,
  } = input;

  // 1. Capital ship critical meltdown or destroyed -> escort squadron breaks formation & scatters!
  if (capitalDestroyedOrCritical) {
    const awayX = escortPos.x - capitalPos.x;
    const awayY = escortPos.y - capitalPos.y;
    const awayZ = escortPos.z - capitalPos.z;
    const len = Math.hypot(awayX, awayY, awayZ) || 1;
    const angleBias = (slotIndex % 2 === 0 ? 1 : -1) * 0.45;
    const dirX = awayX / len + capitalRight.x * angleBias;
    const dirY = awayY / len + 0.25 * (slotIndex % 2 === 0 ? 1 : -1);
    const dirZ = awayZ / len + capitalRight.z * angleBias;
    const dLen = Math.hypot(dirX, dirY, dirZ) || 1;
    return {
      behavior: 'retreat_scatter',
      anchorPoint: {
        x: escortPos.x + (dirX / dLen) * 1400,
        y: escortPos.y + (dirY / dLen) * 700,
        z: escortPos.z + (dirZ / dLen) * 1400,
      },
      aggressiveness: 0.2,
      shouldScatter: true,
    };
  }

  // World-space formation anchor attached to the moving capital ship
  const orbitDrift = escortRole === 'patrol_wing' ? Math.sin(elapsedSec * 0.55 + slotIndex * 1.9) * 85 : 0;
  const formationWorld: Vec3 = {
    x:
      capitalPos.x +
      capitalRight.x * (localOffset.x + orbitDrift) +
      capitalForward.x * localOffset.z,
    y: capitalPos.y + localOffset.y + Math.cos(elapsedSec * 0.7 + slotIndex) * 24,
    z:
      capitalPos.z +
      capitalRight.z * (localOffset.x + orbitDrift) +
      capitalForward.z * localOffset.z,
  };

  const playerDistToCapital = Math.hypot(
    playerPos.x - capitalPos.x,
    playerPos.y - capitalPos.y,
    playerPos.z - capitalPos.z,
  );
  const escortDistToCapital = Math.hypot(
    escortPos.x - capitalPos.x,
    escortPos.y - capitalPos.y,
    escortPos.z - capitalPos.z,
  );

  const criticalHullDefense = capitalHullRatio < 0.55;
  const leashRadius = escortRole === 'close_guard' ? 1150 : escortRole === 'bomber_strike' ? 1550 : 1380;

  // If escort drifted too far from the moving warship, reposition back into formation
  if (escortDistToCapital > leashRadius && !criticalHullDefense) {
    return {
      behavior: 'hold_formation',
      anchorPoint: formationWorld,
      aggressiveness: 0.7,
      shouldScatter: false,
    };
  }

  // Player attacking vulnerable subsystems or capital heavily damaged -> scramble to defend!
  if ((capitalUnderSubsystemAttack || criticalHullDefense) && playerDistToCapital < 1650) {
    return {
      behavior: 'defend_subsystem',
      anchorPoint: {
        x: playerPos.x * 0.72 + capitalPos.x * 0.28,
        y: playerPos.y * 0.72 + capitalPos.y * 0.28,
        z: playerPos.z * 0.72 + capitalPos.z * 0.28,
      },
      aggressiveness: criticalHullDefense ? 1.35 : 1.18,
      shouldScatter: false,
    };
  }

  // Player approaching capital perimeter -> intercept or bomber attack run
  const engageRange = escortRole === 'patrol_wing' ? 1600 : escortRole === 'bomber_strike' ? 1500 : 1150;
  if (playerDistToCapital < engageRange) {
    return {
      behavior: escortRole === 'bomber_strike' ? 'attack_run' : 'intercept_player',
      anchorPoint: {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z,
      },
      aggressiveness: escortRole === 'bomber_strike' ? 1.05 : 1.0,
      shouldScatter: false,
    };
  }

  // Default: hold disciplined escort formation moving alongside the capital ship
  return {
    behavior: 'hold_formation',
    anchorPoint: formationWorld,
    aggressiveness: 0.65,
    shouldScatter: false,
  };
}

export function shouldLaunchEscortReinforcement(input: {
  aliveEscortCount: number;
  targetEscortCount: number;
  wavesLaunched: number;
  maxWaves: number;
  cooldownRemainingSec: number;
  hangarOperational: boolean;
  capitalDestroyedOrCritical: boolean;
}): { shouldLaunch: boolean; spawnCount: number } {
  if (
    input.capitalDestroyedOrCritical ||
    !input.hangarOperational ||
    input.wavesLaunched >= input.maxWaves ||
    input.cooldownRemainingSec > 0
  ) {
    return { shouldLaunch: false, spawnCount: 0 };
  }
  const missing = Math.max(0, input.targetEscortCount - input.aliveEscortCount);
  if (missing >= 2) {
    return { shouldLaunch: true, spawnCount: Math.min(2, missing) };
  }
  return { shouldLaunch: false, spawnCount: 0 };
}

// ============================================================================
// 3-SECOND CRITICAL MELTDOWN COUNTDOWN & ESCAPE BLAST DAMAGE
// ============================================================================

export interface CapitalCriticalCountdownState {
  active: boolean;
  shipName: string;
  shipClass: CapitalShipClass;
  remainingSec: number;
  totalSec: number;
  blastRadiusMeters: number;
  detonated: boolean;
  secondaryBlastCount: number;
  nextSecondaryBlastAtSec: number;
  lastBeepDigit: number;
}

export interface CapitalCriticalStepResult {
  state: CapitalCriticalCountdownState;
  displayDigit: 3 | 2 | 1 | 0;
  triggeredBeepDigit: number | null;
  triggeredSecondaryBlast: boolean;
  triggeredMainDetonation: boolean;
}

export function createCapitalCriticalCountdown(
  shipName: string,
  shipClass: CapitalShipClass,
  durationSec = CAPITAL_CRITICAL_COUNTDOWN_SEC,
  blastRadiusMeters = CAPITAL_BLAST_DANGER_RADIUS_METERS,
): CapitalCriticalCountdownState {
  const safeDuration = Math.max(2.5, durationSec);
  return {
    active: true,
    shipName,
    shipClass,
    remainingSec: safeDuration,
    totalSec: safeDuration,
    blastRadiusMeters,
    detonated: false,
    secondaryBlastCount: 0,
    nextSecondaryBlastAtSec: safeDuration - 0.35,
    lastBeepDigit: Math.ceil(safeDuration) + 1,
  };
}

export function stepCapitalCriticalCountdown(
  prev: CapitalCriticalCountdownState,
  dt: number,
): CapitalCriticalStepResult {
  if (!prev.active || prev.detonated) {
    return {
      state: prev,
      displayDigit: 0,
      triggeredBeepDigit: null,
      triggeredSecondaryBlast: false,
      triggeredMainDetonation: false,
    };
  }

  const safeDt = Math.max(0, Math.min(0.2, dt));
  const nextRemaining = Math.max(0, prev.remainingSec - safeDt);
  const rawDigit = nextRemaining > 0 ? Math.min(3, Math.ceil(nextRemaining)) : 0;
  const displayDigit = rawDigit as 3 | 2 | 1 | 0;

  let triggeredBeepDigit: number | null = null;
  let lastBeepDigit = prev.lastBeepDigit;
  if (displayDigit > 0 && displayDigit < prev.lastBeepDigit) {
    triggeredBeepDigit = displayDigit;
    lastBeepDigit = displayDigit;
  }

  let triggeredSecondaryBlast = false;
  let secondaryBlastCount = prev.secondaryBlastCount;
  let nextSecondaryBlastAtSec = prev.nextSecondaryBlastAtSec;
  if (nextRemaining > 0.15 && nextRemaining <= nextSecondaryBlastAtSec) {
    triggeredSecondaryBlast = true;
    secondaryBlastCount += 1;
    // Secondary explosions accelerate from every 0.45s down to every 0.24s near core breach
    const progress = 1 - nextRemaining / Math.max(0.1, prev.totalSec);
    nextSecondaryBlastAtSec = nextRemaining - (0.46 - progress * 0.22);
  }

  const triggeredMainDetonation = nextRemaining <= 0;
  return {
    state: {
      ...prev,
      active: !triggeredMainDetonation,
      remainingSec: nextRemaining,
      detonated: triggeredMainDetonation,
      secondaryBlastCount,
      nextSecondaryBlastAtSec,
      lastBeepDigit,
    },
    displayDigit,
    triggeredBeepDigit,
    triggeredSecondaryBlast,
    triggeredMainDetonation,
  };
}

export interface CapitalBlastDamageResult {
  withinBlastRadius: boolean;
  escapedSafely: boolean;
  proximityRatio: number; // 0 (safe) .. 1 (ground zero)
  shieldDamage: number;
  hullDamage: number;
  totalDamage: number;
  knockbackSpeed: number;
  cameraImpulse: number; // 0.18 (distant rumble) .. 0.85 (close shockwave)
}

/**
 * Computes fair distance-based damage when a capital ship's main reactor detonates
 * after the 3-second escape window:
 *  - Players who boost outside `blastRadiusMeters` take ZERO damage (`escapedSafely: true`).
 *  - Players caught close inside the blast take heavy shield + hull damage & knockback,
 *    scaled smoothly by distance and ship toughness (never unavoidable from afar).
 */
export function computeCapitalBlastDamage(input: {
  distanceMeters: number;
  blastRadiusMeters?: number;
  currentShield: number;
  currentHull: number;
  maxHull: number;
}): CapitalBlastDamageResult {
  const radius = Math.max(150, input.blastRadiusMeters ?? CAPITAL_BLAST_DANGER_RADIUS_METERS);
  const dist = Math.max(0, input.distanceMeters);

  if (dist >= radius) {
    // Distant shockwave rumble felt safely outside blast zone
    const farAtten = Math.max(0.12, Math.min(0.32, (radius * 2.2 - dist) / (radius * 1.4)));
    return {
      withinBlastRadius: false,
      escapedSafely: true,
      proximityRatio: 0,
      shieldDamage: 0,
      hullDamage: 0,
      totalDamage: 0,
      knockbackSpeed: 0,
      cameraImpulse: Math.max(0.12, farAtten),
    };
  }

  // Smooth falloff from edge (0) to core (1)
  const proximityRatio = Math.max(0, Math.min(1, 1 - dist / radius));
  const intensity = Math.pow(proximityRatio, 1.25);

  // Substantial damage close in (up to ~82% of maxHull + shields at point blank), forgiving near rim
  const rawTotal = Math.round((26 + input.maxHull * 0.78) * intensity);
  const shieldDamage = Math.min(Math.max(0, input.currentShield), rawTotal);
  const overflow = Math.max(0, rawTotal - shieldDamage);
  const hullDamage = Math.min(Math.max(0, input.currentHull), overflow);

  return {
    withinBlastRadius: true,
    escapedSafely: false,
    proximityRatio,
    shieldDamage,
    hullDamage,
    totalDamage: shieldDamage + hullDamage,
    knockbackSpeed: Math.round(35 + 145 * intensity),
    cameraImpulse: Math.min(0.88, 0.34 + 0.54 * intensity),
  };
}
