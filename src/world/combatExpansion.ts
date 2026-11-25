import type { DifficultyId } from './campaignConfig';
import type {
  EnemyFighterRole,
  PlayableShipId,
  SpaceRegionId,
} from './spacePhysics';
import { PLAYABLE_SHIPS } from './spacePhysics';
import type { CampaignResources } from './strategicCampaign';
import type { ExtinctionEnemyRole } from './extinctionCampaign';
import { EXTINCTION_FLIGHT_PROFILES } from './extinctionCombat';

// =========================================================================
// 1. ADVANCED 3D ENEMY DOGFIGHT FLIGHT AI STATE MACHINE
// =========================================================================

export type DogfightManeuverState =
  | 'straight_approach'
  | 'lateral_strafe'
  | 'vertical_climb_dive'
  | 'high_speed_flyby'
  | 'tail_pursuit'
  | 'break_away'
  | 'reposition';

export type CombatScenarioKind =
  | 'fighter_pursuit'
  | 'crossfire'
  | 'high_speed_interception'
  | 'asteroid_pursuit'
  | 'elite_ace_duel';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EnemyDogfightAgent {
  id: string;
  role: ExtinctionEnemyRole;
  isLegendary: boolean;
  squadSlot: number;
  pos: Vec3;
  vel: Vec3;
  maneuverState: DogfightManeuverState;
  stateTimer: number;
  strafeSign: 1 | -1;
  verticalSign: 1 | -1;
  flankPhase: number;
  evasionTimer: number;
  recentlyHit: boolean;
  empStunned: boolean;
  scenarioTag?: CombatScenarioKind;
  difficulty?: DifficultyId;
  boostRemainingSec?: number;
  boostCooldownSec?: number;
  recoveryTimer?: number;
  evasionCooldownSec?: number;
}

export interface PlayerFlightContext {
  pos: Vec3;
  vel: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  speed: number;
}

export interface DogfightStepResult {
  nextState: DogfightManeuverState;
  nextTimer: number;
  nextStrafeSign: 1 | -1;
  nextVerticalSign: 1 | -1;
  desiredVel: Vec3;
  bankAngle: number;
  firingWindowOpen: boolean;
  wantsCountermeasure: boolean;
  nextBoostRemainingSec: number;
  nextBoostCooldownSec: number;
  nextRecoveryTimer: number;
  nextEvasionCooldownSec: number;
  isRecovering: boolean;
  isBoosting: boolean;
  isBeingPursued: boolean;
}

export interface EnemyRoleFlightProfile {
  cruiseSpeed: number;
  boostSpeed: number;
  maxAccel: number;
  maxTurnRadPerSec: number;
  turnResponsiveness: number;
  preferredRangeMin: number;
  preferredRangeMax: number;
  breakAwayDistance: number;
  maxDisengageRange: number;
  strafeAmplitude: number;
  verticalAmplitude: number;
  bankMaxRad: number;
  maxBoostDurationSec: number;
  boostCooldownSec: number;
  evasionCooldownSec: number;
  recoveryDurationSec: number;
}

export interface DifficultyFlightTuning {
  speedMult: number;
  turnMult: number;
  accelMult: number;
  evasionCooldownMult: number;
  recoveryDurationMult: number;
  boostDurationMult: number;
}

export const DIFFICULTY_FLIGHT_TUNING: Record<DifficultyId, DifficultyFlightTuning> = {
  story: {
    speedMult: 0.84,
    turnMult: 0.82,
    accelMult: 0.85,
    evasionCooldownMult: 1.45,
    recoveryDurationMult: 1.35,
    boostDurationMult: 0.78,
  },
  normal: {
    speedMult: 0.96,
    turnMult: 0.96,
    accelMult: 0.96,
    evasionCooldownMult: 1.05,
    recoveryDurationMult: 1.05,
    boostDurationMult: 0.95,
  },
  hard: {
    speedMult: 1.04,
    turnMult: 1.06,
    accelMult: 1.06,
    evasionCooldownMult: 0.92,
    recoveryDurationMult: 0.92,
    boostDurationMult: 1.06,
  },
  nightmare: {
    speedMult: 1.09,
    turnMult: 1.14,
    accelMult: 1.12,
    evasionCooldownMult: 0.82,
    recoveryDurationMult: 0.82,
    boostDurationMult: 1.12,
  },
};

export const ENEMY_FLIGHT_PROFILES: Record<EnemyFighterRole, EnemyRoleFlightProfile> = {
  interceptor: {
    cruiseSpeed: 166,
    boostSpeed: 238,
    maxAccel: 135,
    maxTurnRadPerSec: 1.85,
    turnResponsiveness: 2.35,
    preferredRangeMin: 185,
    preferredRangeMax: 760,
    breakAwayDistance: 125,
    maxDisengageRange: 1120,
    strafeAmplitude: 135,
    verticalAmplitude: 88,
    bankMaxRad: 1.0,
    maxBoostDurationSec: 2.5,
    boostCooldownSec: 4.8,
    evasionCooldownSec: 3.6,
    recoveryDurationSec: 1.35,
  },
  heavy_fighter: {
    cruiseSpeed: 132,
    boostSpeed: 186,
    maxAccel: 96,
    maxTurnRadPerSec: 1.38,
    turnResponsiveness: 1.85,
    preferredRangeMin: 260,
    preferredRangeMax: 900,
    breakAwayDistance: 145,
    maxDisengageRange: 1180,
    strafeAmplitude: 105,
    verticalAmplitude: 64,
    bankMaxRad: 0.66,
    maxBoostDurationSec: 2.8,
    boostCooldownSec: 5.2,
    evasionCooldownSec: 4.2,
    recoveryDurationSec: 1.45,
  },
  bomber: {
    cruiseSpeed: 108,
    boostSpeed: 146,
    maxAccel: 72,
    maxTurnRadPerSec: 1.05,
    turnResponsiveness: 1.4,
    preferredRangeMin: 420,
    preferredRangeMax: 1240,
    breakAwayDistance: 205,
    maxDisengageRange: 1280,
    strafeAmplitude: 82,
    verticalAmplitude: 66,
    bankMaxRad: 0.42,
    maxBoostDurationSec: 2.6,
    boostCooldownSec: 5.8,
    evasionCooldownSec: 4.8,
    recoveryDurationSec: 1.6,
  },
  scout: {
    cruiseSpeed: 182,
    boostSpeed: 256,
    maxAccel: 148,
    maxTurnRadPerSec: 1.95,
    turnResponsiveness: 2.5,
    preferredRangeMin: 250,
    preferredRangeMax: 940,
    breakAwayDistance: 160,
    maxDisengageRange: 1220,
    strafeAmplitude: 155,
    verticalAmplitude: 102,
    bankMaxRad: 1.08,
    maxBoostDurationSec: 2.4,
    boostCooldownSec: 5.0,
    evasionCooldownSec: 3.5,
    recoveryDurationSec: 1.4,
  },
  medium_warship: {
    cruiseSpeed: 72,
    boostSpeed: 98,
    maxAccel: 48,
    maxTurnRadPerSec: 0.62,
    turnResponsiveness: 0.9,
    preferredRangeMin: 440,
    preferredRangeMax: 1060,
    breakAwayDistance: 255,
    maxDisengageRange: 1150,
    strafeAmplitude: 92,
    verticalAmplitude: 38,
    bankMaxRad: 0.2,
    maxBoostDurationSec: 2.4,
    boostCooldownSec: 6.5,
    evasionCooldownSec: 6.0,
    recoveryDurationSec: 1.8,
  },
  elite_ace: {
    cruiseSpeed: 186,
    boostSpeed: 268,
    maxAccel: 158,
    maxTurnRadPerSec: 2.18,
    turnResponsiveness: 2.75,
    preferredRangeMin: 170,
    preferredRangeMax: 820,
    breakAwayDistance: 115,
    maxDisengageRange: 1150,
    strafeAmplitude: 150,
    verticalAmplitude: 112,
    bankMaxRad: 1.18,
    maxBoostDurationSec: 2.7,
    boostCooldownSec: 4.6,
    evasionCooldownSec: 3.1,
    recoveryDurationSec: 1.2,
  },
};

function clampVal(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalize3(x: number, y: number, z: number): Vec3 {
  const len = Math.hypot(x, y, z);
  if (len <= 1e-6) return { x: 0, y: 0, z: -1 };
  return { x: x / len, y: y / len, z: z / len };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Physically-bounded 3D flight velocity steering:
 * Limits angular turn rate (rad/sec) and linear acceleration/deceleration (m/s^2)
 * so enemy spacecraft carve believable flight arcs and NEVER snap 180 degrees or teleport.
 */
export function steerVelocityPhysically(
  currentVel: Vec3,
  desiredDir: Vec3,
  desiredSpeed: number,
  maxAccel: number,
  maxTurnRadPerSec: number,
  dt: number,
): Vec3 {
  const safeDt = clampVal(dt, 0.001, 0.25);
  const curSpeed = Math.hypot(currentVel.x, currentVel.y, currentVel.z);
  const tarDir = normalize3(desiredDir.x, desiredDir.y, desiredDir.z);
  const curDir = curSpeed > 1.0 ? { x: currentVel.x / curSpeed, y: currentVel.y / curSpeed, z: currentVel.z / curSpeed } : tarDir;

  // Angular turn cap via spherical interpolation
  const cosAng = clampVal(dot3(curDir, tarDir), -1, 1);
  const angle = Math.acos(cosAng);
  const maxStep = Math.max(0.05, maxTurnRadPerSec) * safeDt;

  let outDir = tarDir;
  if (angle > maxStep && angle > 1e-4) {
    const t = maxStep / angle;
    const sinA = Math.sin(angle);
    if (sinA > 1e-4) {
      const w0 = Math.sin((1 - t) * angle) / sinA;
      const w1 = Math.sin(t * angle) / sinA;
      outDir = normalize3(
        curDir.x * w0 + tarDir.x * w1,
        curDir.y * w0 + tarDir.y * w1,
        curDir.z * w0 + tarDir.z * w1,
      );
    } else {
      // Near 180-degree opposite: steer sideways smoothly instead of instant flip
      const perp = Math.abs(curDir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
      outDir = normalize3(
        curDir.x + perp.x * maxStep,
        curDir.y + perp.y * maxStep,
        curDir.z + perp.z * maxStep,
      );
    }
  }

  // Acceleration / deceleration cap (allow slightly sharper braking than forward thrust)
  const speedDiff = desiredSpeed - curSpeed;
  const maxDelta = (speedDiff >= 0 ? maxAccel : maxAccel * 1.35) * safeDt;
  const nextSpeed = curSpeed + clampVal(speedDiff, -maxDelta, maxDelta);

  return {
    x: outDir.x * nextSpeed,
    y: outDir.y * nextSpeed,
    z: outDir.z * nextSpeed,
  };
}

/**
 * Picks the next deliberate 3D dogfighting maneuver based on enemy role, distance,
 * player relative geometry, and whether the craft was recently hit.
 */
function pickNextManeuver(
  agent: EnemyDogfightAgent,
  distToPlayer: number,
  inFrontOfPlayer: boolean,
  elapsed: number,
): { state: DogfightManeuverState; duration: number; flipStrafe: boolean; flipVert: boolean } {
  const seed = Math.abs(Math.sin(elapsed * 2.13 + agent.flankPhase * 3.7 + agent.squadSlot * 1.9));

  if (agent.role === 'medium_warship' || agent.role === 'disruptor_ship') {
    if (distToPlayer > 980) {
      return { state: 'straight_approach', duration: 4.4, flipStrafe: false, flipVert: false };
    }
    return { state: 'lateral_strafe', duration: 5.2, flipStrafe: seed > 0.5, flipVert: false };
  }

  if (agent.role === 'bomber') {
    if (distToPlayer > 680) {
      return { state: 'straight_approach', duration: 4.8, flipStrafe: false, flipVert: false };
    }
    if (distToPlayer < 260) {
      return { state: 'break_away', duration: 3.2, flipStrafe: true, flipVert: true };
    }
    return {
      state: seed > 0.45 ? 'vertical_climb_dive' : 'lateral_strafe',
      duration: 3.6,
      flipStrafe: seed > 0.5,
      flipVert: seed < 0.5,
    };
  }

  if (
    agent.role === 'elite_ace' ||
    agent.role === 'phantom_interceptor' ||
    agent.isLegendary
  ) {
    if (distToPlayer > 880) {
      return { state: 'high_speed_flyby', duration: 3.4, flipStrafe: false, flipVert: false };
    }
    if (agent.maneuverState === 'high_speed_flyby' || agent.maneuverState === 'break_away') {
      return { state: 'tail_pursuit', duration: 4.2, flipStrafe: true, flipVert: true };
    }
    if (seed < 0.32) {
      return { state: 'lateral_strafe', duration: 2.8, flipStrafe: true, flipVert: false };
    }
    if (seed < 0.62) {
      return { state: 'vertical_climb_dive', duration: 2.7, flipStrafe: false, flipVert: true };
    }
    if (seed < 0.84) {
      return { state: 'tail_pursuit', duration: 3.8, flipStrafe: false, flipVert: false };
    }
    return { state: 'high_speed_flyby', duration: 3.1, flipStrafe: true, flipVert: false };
  }

  // Interceptors, Heavy Fighters, Scouts
  if (distToPlayer > 960) {
    return {
      state: seed > 0.35 ? 'straight_approach' : 'high_speed_flyby',
      duration: 4.0,
      flipStrafe: false,
      flipVert: false,
    };
  }
  if (agent.maneuverState === 'straight_approach') {
    return {
      state: inFrontOfPlayer && seed < 0.52 ? 'high_speed_flyby' : 'lateral_strafe',
      duration: 3.1,
      flipStrafe: seed > 0.45,
      flipVert: false,
    };
  }
  if (agent.maneuverState === 'high_speed_flyby') {
    return {
      state: 'tail_pursuit',
      duration: 4.4,
      flipStrafe: true,
      flipVert: seed > 0.5,
    };
  }
  if (agent.maneuverState === 'lateral_strafe') {
    return {
      state: seed < 0.48 ? 'vertical_climb_dive' : 'tail_pursuit',
      duration: 3.3,
      flipStrafe: false,
      flipVert: true,
    };
  }
  if (agent.maneuverState === 'vertical_climb_dive') {
    return {
      state: 'straight_approach',
      duration: 3.5,
      flipStrafe: true,
      flipVert: false,
    };
  }
  if (agent.maneuverState === 'break_away') {
    return {
      state: 'reposition',
      duration: 2.8,
      flipStrafe: true,
      flipVert: true,
    };
  }
  return {
    state: seed < 0.45 ? 'straight_approach' : seed < 0.78 ? 'lateral_strafe' : 'tail_pursuit',
    duration: 3.4,
    flipStrafe: seed > 0.5,
    flipVert: seed < 0.4,
  };
}

/**
 * Pure 3D space dogfight flight controller producing natural straight-line passes,
 * wide lateral strafing, vertical climbs/dives, high-speed flybys, tail pursuit,
 * and evasive break-aways with realistic roll banking.
 */
export function stepEnemyDogfightManoeuvre(
  agent: EnemyDogfightAgent,
  player: PlayerFlightContext,
  dt: number,
  elapsed: number,
  aggressionMult = 1.0,
): DogfightStepResult {
  const safeDt = clampVal(dt, 0.001, 0.25);
  const baseProfile =
    EXTINCTION_FLIGHT_PROFILES[agent.role as keyof typeof EXTINCTION_FLIGHT_PROFILES] ??
    ENEMY_FLIGHT_PROFILES[agent.role as EnemyFighterRole] ??
    ENEMY_FLIGHT_PROFILES.interceptor;
  const diffTuning = DIFFICULTY_FLIGHT_TUNING[agent.difficulty ?? 'normal'];
  const legendaryMult = agent.isLegendary ? 1.08 : 1.0;
  // Tightly bounded speed multiplier so enemy boosts NEVER outrun player boost speed
  const clampedAgg = clampVal(aggressionMult, 0.75, 1.25);
  const speedScale =
    (agent.empStunned ? 0.28 : 1.0) *
    legendaryMult *
    diffTuning.speedMult *
    (0.92 + 0.08 * clampedAgg);

  const maxBoostDur = baseProfile.maxBoostDurationSec * diffTuning.boostDurationMult;
  let boostRemainingSec =
    agent.boostRemainingSec !== undefined ? agent.boostRemainingSec : maxBoostDur;
  let boostCooldownSec = Math.max(0, (agent.boostCooldownSec ?? 0) - safeDt);
  let recoveryTimer = Math.max(0, (agent.recoveryTimer ?? 0) - safeDt);
  let evasionCooldownSec = Math.max(0, (agent.evasionCooldownSec ?? 0) - safeDt);

  const toPlayerX = player.pos.x - agent.pos.x;
  const toPlayerY = player.pos.y - agent.pos.y;
  const toPlayerZ = player.pos.z - agent.pos.z;
  const distToPlayer = Math.max(1, Math.hypot(toPlayerX, toPlayerY, toPlayerZ));
  const dirToPlayer = normalize3(toPlayerX, toPlayerY, toPlayerZ);

  // Relative position of enemy in player's reference frame
  const relX = agent.pos.x - player.pos.x;
  const relY = agent.pos.y - player.pos.y;
  const relZ = agent.pos.z - player.pos.z;
  const fwdProj = relX * player.forward.x + relY * player.forward.y + relZ * player.forward.z;
  const inFrontOfPlayer = fwdProj > 0;
  const playerAimCos = fwdProj / distToPlayer;
  const isBeingPursued = inFrontOfPlayer && playerAimCos >= 0.78 && distToPlayer <= 1350;

  const prevState = agent.maneuverState;
  let nextState = agent.maneuverState;
  let nextTimer = agent.stateTimer - safeDt;
  let nextStrafeSign = agent.strafeSign;
  let nextVerticalSign = agent.verticalSign;
  let wantsCountermeasure = false;

  // Hard disengagement cap: enemies must bank back into combat instead of fleeing indefinitely
  if (!agent.empStunned && distToPlayer > baseProfile.maxDisengageRange && nextState === 'break_away') {
    nextState = 'reposition';
    nextTimer = 3.2;
    recoveryTimer = Math.max(recoveryTimer, baseProfile.recoveryDurationSec * diffTuning.recoveryDurationMult);
  } else if (
    !agent.empStunned &&
    nextState !== 'break_away' &&
    nextState !== 'high_speed_flyby' &&
    distToPlayer < baseProfile.breakAwayDistance
  ) {
    nextState = 'break_away';
    nextTimer = 2.1;
    nextStrafeSign = (agent.strafeSign * -1) as 1 | -1;
    nextVerticalSign = (agent.verticalSign * -1) as 1 | -1;
    evasionCooldownSec = baseProfile.evasionCooldownSec * diffTuning.evasionCooldownMult;
  } else if (
    !agent.empStunned &&
    agent.recentlyHit &&
    agent.evasionTimer > 0 &&
    evasionCooldownSec <= 0 &&
    recoveryTimer <= 0 &&
    nextState === 'straight_approach'
  ) {
    // Controlled evasion with cooldown so pursued enemies don't spam erratic flips
    nextState = agent.role === 'elite_ace' || agent.isLegendary ? 'vertical_climb_dive' : 'lateral_strafe';
    nextTimer = 2.3;
    nextStrafeSign = (agent.strafeSign * -1) as 1 | -1;
    evasionCooldownSec = baseProfile.evasionCooldownSec * diffTuning.evasionCooldownMult;
    if (agent.role === 'elite_ace' || agent.isLegendary) {
      wantsCountermeasure = true;
    }
  } else if (nextTimer <= 0) {
    // Entering a post-manoeuvre recovery window after aggressive high-G moves gives pursuers a fair tracking beat
    const wasAggressive =
      prevState === 'break_away' ||
      prevState === 'high_speed_flyby' ||
      prevState === 'vertical_climb_dive';
    if (wasAggressive) {
      recoveryTimer = Math.max(
        recoveryTimer,
        baseProfile.recoveryDurationSec * diffTuning.recoveryDurationMult,
      );
    }

    const picked = pickNextManeuver(agent, distToPlayer, inFrontOfPlayer, elapsed);
    nextState = picked.state;
    // Extend readable straight segments slightly when pursued so player can align shots cleanly
    nextTimer =
      isBeingPursued && (picked.state === 'straight_approach' || picked.state === 'reposition')
        ? picked.duration * 1.15
        : picked.duration;
    if (picked.flipStrafe && (!isBeingPursued || evasionCooldownSec <= 0)) {
      nextStrafeSign = (agent.strafeSign * -1) as 1 | -1;
    }
    if (picked.flipVert && (!isBeingPursued || evasionCooldownSec <= 0)) {
      nextVerticalSign = (agent.verticalSign * -1) as 1 | -1;
    }
  }

  // Finite boost budget for high-speed states (break_away, high_speed_flyby, climb/dive)
  const wantsBoost =
    !agent.empStunned &&
    recoveryTimer <= 0 &&
    (nextState === 'high_speed_flyby' ||
      nextState === 'break_away' ||
      nextState === 'vertical_climb_dive');

  let isBoosting = false;
  if (wantsBoost && boostCooldownSec <= 0 && boostRemainingSec > 0.05) {
    isBoosting = true;
    boostRemainingSec = Math.max(0, boostRemainingSec - safeDt);
    if (boostRemainingSec <= 0.05) {
      boostCooldownSec = baseProfile.boostCooldownSec;
      recoveryTimer = Math.max(
        recoveryTimer,
        baseProfile.recoveryDurationSec * 0.75 * diffTuning.recoveryDurationMult,
      );
    }
  } else if (boostCooldownSec <= 0) {
    boostRemainingSec = Math.min(maxBoostDur, boostRemainingSec + safeDt * 0.65);
  }

  // Compute target velocity vector & visual bank angle for each maneuver
  const sideSlotSpread = (agent.squadSlot % 3 - 1) * 42;
  const cruiseSpd = baseProfile.cruiseSpeed * speedScale;
  const boostSpd = (isBoosting ? baseProfile.boostSpeed : baseProfile.cruiseSpeed * 1.06) * speedScale;
  let targetSpeed = cruiseSpd;
  let aimDir: Vec3 = dirToPlayer;
  let bankAngle = 0;

  if (nextState === 'straight_approach') {
    const leadSec = clampVal(distToPlayer / Math.max(120, baseProfile.cruiseSpeed), 0.35, 2.0);
    const tx =
      player.pos.x +
      player.vel.x * leadSec * 0.42 +
      player.right.x * (nextStrafeSign * 42 + sideSlotSpread) +
      player.up.x * (nextVerticalSign * 22);
    const ty =
      player.pos.y +
      player.vel.y * leadSec * 0.42 +
      player.right.y * (nextStrafeSign * 42 + sideSlotSpread) +
      player.up.y * (nextVerticalSign * 22);
    const tz =
      player.pos.z +
      player.vel.z * leadSec * 0.42 +
      player.right.z * (nextStrafeSign * 42 + sideSlotSpread) +
      player.up.z * (nextVerticalSign * 22);
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    targetSpeed = cruiseSpd * 1.06;
    bankAngle = nextStrafeSign * baseProfile.bankMaxRad * 0.25;
  } else if (nextState === 'lateral_strafe') {
    const desiredStandOff = clampVal(distToPlayer * 0.74, baseProfile.preferredRangeMin, 520);
    const strafeShift = baseProfile.strafeAmplitude * 1.32 * nextStrafeSign;
    const tx =
      player.pos.x +
      player.forward.x * (inFrontOfPlayer ? desiredStandOff * 0.58 : -desiredStandOff * 0.32) +
      player.right.x * strafeShift +
      player.up.x * (Math.sin(elapsed * 1.25 + agent.flankPhase) * 32);
    const ty =
      player.pos.y +
      player.forward.y * (inFrontOfPlayer ? desiredStandOff * 0.58 : -desiredStandOff * 0.32) +
      player.right.y * strafeShift +
      player.up.y * (Math.sin(elapsed * 1.25 + agent.flankPhase) * 32);
    const tz =
      player.pos.z +
      player.forward.z * (inFrontOfPlayer ? desiredStandOff * 0.58 : -desiredStandOff * 0.32) +
      player.right.z * strafeShift +
      player.up.z * (Math.sin(elapsed * 1.25 + agent.flankPhase) * 32);
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    targetSpeed = cruiseSpd * 1.02;
    bankAngle = -nextStrafeSign * baseProfile.bankMaxRad * 0.82;
  } else if (nextState === 'vertical_climb_dive') {
    const vertShift = baseProfile.verticalAmplitude * 1.45 * nextVerticalSign;
    const tx =
      player.pos.x +
      player.forward.x * 185 +
      player.right.x * (nextStrafeSign * 82) +
      player.up.x * vertShift;
    const ty =
      player.pos.y +
      player.forward.y * 185 +
      player.right.y * (nextStrafeSign * 82) +
      player.up.y * vertShift;
    const tz =
      player.pos.z +
      player.forward.z * 185 +
      player.right.z * (nextStrafeSign * 82) +
      player.up.z * vertShift;
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    targetSpeed = boostSpd * 0.94;
    bankAngle = nextStrafeSign * baseProfile.bankMaxRad * 0.62;
  } else if (nextState === 'high_speed_flyby') {
    const flybyOffsetSide = nextStrafeSign * (68 + (agent.squadSlot % 2) * 28);
    const overshootBehind = -340;
    const tx =
      player.pos.x +
      player.forward.x * overshootBehind +
      player.right.x * flybyOffsetSide +
      player.up.x * (nextVerticalSign * 34);
    const ty =
      player.pos.y +
      player.forward.y * overshootBehind +
      player.right.y * flybyOffsetSide +
      player.up.y * (nextVerticalSign * 34);
    const tz =
      player.pos.z +
      player.forward.z * overshootBehind +
      player.right.z * flybyOffsetSide +
      player.up.z * (nextVerticalSign * 34);
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    targetSpeed = boostSpd;
    bankAngle = nextStrafeSign * baseProfile.bankMaxRad * 0.68;
  } else if (nextState === 'tail_pursuit') {
    const slotBack = 195 + (agent.squadSlot % 3) * 48;
    const slotSide = nextStrafeSign * (44 + (agent.squadSlot % 2) * 34);
    const tx =
      player.pos.x -
      player.forward.x * slotBack +
      player.right.x * slotSide +
      player.up.x * (nextVerticalSign * 26);
    const ty =
      player.pos.y -
      player.forward.y * slotBack +
      player.right.y * slotSide +
      player.up.y * (nextVerticalSign * 26);
    const tz =
      player.pos.z -
      player.forward.z * slotBack +
      player.right.z * slotSide +
      player.up.z * (nextVerticalSign * 26);
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    // Never allow tail pursuit to scale above the enemy's own boost cap
    targetSpeed = Math.min(baseProfile.boostSpeed * speedScale, Math.max(cruiseSpd, player.speed * 1.04));
    bankAngle = nextStrafeSign * baseProfile.bankMaxRad * 0.42;
  } else if (nextState === 'break_away') {
    const awayDir = normalize3(
      -dirToPlayer.x * 0.72 + player.right.x * nextStrafeSign * 0.68 + player.up.x * nextVerticalSign * 0.48,
      -dirToPlayer.y * 0.72 + player.right.y * nextStrafeSign * 0.68 + player.up.y * nextVerticalSign * 0.48,
      -dirToPlayer.z * 0.72 + player.right.z * nextStrafeSign * 0.68 + player.up.z * nextVerticalSign * 0.48,
    );
    aimDir = awayDir;
    targetSpeed = boostSpd;
    bankAngle = nextStrafeSign * (baseProfile.bankMaxRad * 0.92 + Math.sin(elapsed * 4.2 + agent.flankPhase) * 0.28);
  } else {
    const repoRange = baseProfile.preferredRangeMax * 0.68;
    const tx =
      player.pos.x +
      player.forward.x * repoRange * 0.58 +
      player.right.x * nextStrafeSign * repoRange * 0.52 +
      player.up.x * nextVerticalSign * 85;
    const ty =
      player.pos.y +
      player.forward.y * repoRange * 0.58 +
      player.right.y * nextStrafeSign * repoRange * 0.52 +
      player.up.y * nextVerticalSign * 85;
    const tz =
      player.pos.z +
      player.forward.z * repoRange * 0.58 +
      player.right.z * nextStrafeSign * repoRange * 0.52 +
      player.up.z * nextVerticalSign * 85;
    aimDir = normalize3(tx - agent.pos.x, ty - agent.pos.y, tz - agent.pos.z);
    targetSpeed = cruiseSpd;
    bankAngle = nextStrafeSign * baseProfile.bankMaxRad * 0.52;
  }

  // Post-manoeuvre recovery window: brief smoother turn & speed dip so pursuing players can close in & line up fire
  // (Never stationary — still cruising at ~80% base cruise speed)
  const isRecovering = recoveryTimer > 0 && !agent.empStunned;
  if (isRecovering) {
    targetSpeed = Math.min(targetSpeed, cruiseSpd * 0.82);
    bankAngle *= 0.6;
  }

  // Apply physical acceleration & turn-radius constraints (eliminates instant velocity reversals/teleport snaps)
  const maxTurnRad =
    baseProfile.maxTurnRadPerSec *
    diffTuning.turnMult *
    (agent.isLegendary ? 1.06 : 1.0) *
    (isRecovering ? 0.62 : 1.0) *
    (agent.empStunned ? 0.45 : 1.0);
  const maxAccel =
    baseProfile.maxAccel *
    diffTuning.accelMult *
    (isRecovering ? 0.72 : 1.0);

  const physicalVel = steerVelocityPhysically(
    agent.vel,
    aimDir,
    targetSpeed,
    maxAccel,
    maxTurnRad,
    safeDt,
  );

  // Firing window: ship must be within weapon range AND have reasonable forward nose alignment (or warship turrets)
  const velDir = normalize3(physicalVel.x || aimDir.x, physicalVel.y || aimDir.y, physicalVel.z || aimDir.z);
  const noseAlignment = dot3(velDir, dirToPlayer);
  const minAlign = agent.role === 'medium_warship' ? -0.25 : nextState === 'lateral_strafe' ? 0.32 : 0.52;
  const maxFireRange = agent.role === 'bomber' ? 1650 : agent.role === 'medium_warship' ? 1700 : 1480;
  const firingWindowOpen =
    !agent.empStunned &&
    nextState !== 'break_away' &&
    distToPlayer <= maxFireRange &&
    distToPlayer >= 90 &&
    noseAlignment >= minAlign;

  return {
    nextState,
    nextTimer,
    nextStrafeSign,
    nextVerticalSign,
    desiredVel: physicalVel,
    bankAngle,
    firingWindowOpen,
    wantsCountermeasure,
    nextBoostRemainingSec: boostRemainingSec,
    nextBoostCooldownSec: boostCooldownSec,
    nextRecoveryTimer: recoveryTimer,
    nextEvasionCooldownSec: evasionCooldownSec,
    isRecovering,
    isBoosting,
    isBeingPursued,
  };
}

// =========================================================================
// 2. DISTRIBUTED 3D ASTEROID ENVIRONMENT & SPATIAL PARTITIONING GRID
// =========================================================================

export interface DistributedAsteroidSpec {
  id: string;
  tier: 'small' | 'medium' | 'large' | 'wreckage';
  formation: 'isolated_monolith' | 'cluster' | 'belt_ribbon' | 'narrow_canyon' | 'vertical_drift' | 'open_scatter';
  x: number;
  y: number;
  z: number;
  radius: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  driftX: number;
  driftY: number;
  driftZ: number;
}

export interface SectorAsteroidDensityProfile {
  regionId: SpaceRegionId;
  densityLabel: 'sparse' | 'moderate' | 'dense' | 'deep_belt' | 'fortified_debris';
  verticalSpanMeters: number;
  clusterCount: number;
  canyonPassages: number;
  monolithCount: number;
  instancedBeltCount: number;
}

export const SECTOR_ASTEROID_PROFILES: Record<SpaceRegionId, SectorAsteroidDensityProfile> = {
  low_orbit: {
    regionId: 'low_orbit',
    densityLabel: 'sparse',
    verticalSpanMeters: 1200,
    clusterCount: 5,
    canyonPassages: 1,
    monolithCount: 7,
    instancedBeltCount: 240,
  },
  shattered_fleet: {
    regionId: 'shattered_fleet',
    densityLabel: 'moderate',
    verticalSpanMeters: 1550,
    clusterCount: 7,
    canyonPassages: 2,
    monolithCount: 11,
    instancedBeltCount: 360,
  },
  debris_belt: {
    regionId: 'debris_belt',
    densityLabel: 'deep_belt',
    verticalSpanMeters: 2100,
    clusterCount: 11,
    canyonPassages: 3,
    monolithCount: 18,
    instancedBeltCount: 540,
  },
  outer_frontier: {
    regionId: 'outer_frontier',
    densityLabel: 'moderate',
    verticalSpanMeters: 1800,
    clusterCount: 6,
    canyonPassages: 1,
    monolithCount: 12,
    instancedBeltCount: 330,
  },
  sovereign_defense_zone: {
    regionId: 'sovereign_defense_zone',
    densityLabel: 'fortified_debris',
    verticalSpanMeters: 1650,
    clusterCount: 8,
    canyonPassages: 2,
    monolithCount: 14,
    instancedBeltCount: 390,
  },
};

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a genuinely 3D distributed asteroid layout across any of the 5 sectors:
 * - Isolated geological monoliths (above, below, and flanking flight corridors)
 * - Dense rocky clusters & narrow canyon passages (for chase & missile lock-break)
 * - Long 3D sweeping asteroid belts & open-space scatter
 * Strictly clears the player spawn corridor & repair beacon safe sphere.
 */
export function generateSectorAsteroidLayout(input: {
  regionId: SpaceRegionId;
  center: Vec3;
  spawnPos: Vec3;
  beaconPos: Vec3;
  fieldRadius: number;
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  wreckageCount: number;
  driftSpeedMult: number;
}): DistributedAsteroidSpec[] {
  const profile = SECTOR_ASTEROID_PROFILES[input.regionId];
  const rand = seededRng(input.regionId.length * 48611 + Math.round(input.fieldRadius) * 13 + 9187);
  const results: DistributedAsteroidSpec[] = [];

  const isSafe = (x: number, y: number, z: number, r: number): boolean => {
    const dSpawn = Math.hypot(x - input.spawnPos.x, y - input.spawnPos.y, z - input.spawnPos.z);
    if (dSpawn < Math.max(195, r + 135)) return false;
    const dBeacon = Math.hypot(x - input.beaconPos.x, y - input.beaconPos.y, z - input.beaconPos.z);
    if (dBeacon < Math.max(145, r + 95)) return false;
    return true;
  };

  // Pre-build 3D cluster centers spanning all 8 octants around the sector (never a flat plane!)
  const clusterCenters: Vec3[] = [];
  for (let c = 0; c < profile.clusterCount; c++) {
    const theta = (c / Math.max(1, profile.clusterCount)) * Math.PI * 2 + rand() * 0.55;
    const radial = input.fieldRadius * (0.22 + rand() * 0.62);
    // Guarantee strong positive & negative vertical layers above and below flight path
    const vertBand = c % 3 === 0 ? 0.55 + rand() * 0.45 : c % 3 === 1 ? -(0.55 + rand() * 0.45) : (rand() - 0.5) * 0.6;
    clusterCenters.push({
      x: input.center.x + Math.cos(theta) * radial,
      y: input.center.y + vertBand * profile.verticalSpanMeters * 0.5,
      z: input.center.z + Math.sin(theta) * radial,
    });
  }

  // Narrow canyon passage anchor ahead of spawn for exciting asteroid chase gameplay
  const canyonStart: Vec3 = {
    x: input.spawnPos.x + (rand() - 0.5) * 420,
    y: input.spawnPos.y + (rand() - 0.5) * 160,
    z: input.spawnPos.z - 680,
  };

  const pushRock = (
    tier: DistributedAsteroidSpec['tier'],
    formation: DistributedAsteroidSpec['formation'],
    idx: number,
    x: number,
    y: number,
    z: number,
    radius: number,
    baseDrift: number,
  ) => {
    const drift = baseDrift * input.driftSpeedMult;
    results.push({
      id: `ast_${input.regionId}_${tier}_${idx}`,
      tier,
      formation,
      x,
      y,
      z,
      radius,
      scaleX: radius * (0.84 + rand() * 0.34),
      scaleY: radius * (0.78 + rand() * 0.36),
      scaleZ: radius * (0.86 + rand() * 0.32),
      rotX: rand() * Math.PI * 2,
      rotY: rand() * Math.PI * 2,
      rotZ: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * 2 * drift,
      driftY: (rand() - 0.5) * 1.1 * drift,
      driftZ: (rand() - 0.5) * 2 * drift,
    });
  };

  // 1. Large Geological Monoliths & Canyon Walls
  for (let i = 0; i < input.largeCount; i++) {
    const radius = 38 + rand() * 38;
    let x = input.center.x;
    let y = input.center.y;
    let z = input.center.z;
    let formation: DistributedAsteroidSpec['formation'] = 'isolated_monolith';

    if (i < 6) {
      // Dramatic 3D narrow passage / vista flanking spawn flight path (above, below, left, right)
      const side = i % 2 === 0 ? -1 : 1;
      const depth = 360 + i * 155;
      const corridorHalfWidth = 115 + (i % 3) * 48;
      const elev = i === 2 ? 128 : i === 3 ? -118 : (i % 2 === 0 ? 44 : -38);
      x = canyonStart.x + side * corridorHalfWidth;
      y = canyonStart.y + elev;
      z = input.spawnPos.z - depth;
      formation = 'narrow_canyon';
    } else {
      for (let tries = 0; tries < 10; tries++) {
        if (i % 3 === 0 && clusterCenters.length > 0) {
          const cc = clusterCenters[i % clusterCenters.length];
          x = cc.x + (rand() - 0.5) * 680;
          y = cc.y + (rand() - 0.5) * 420;
          z = cc.z + (rand() - 0.5) * 680;
          formation = 'cluster';
        } else {
          const ang = rand() * Math.PI * 2;
          const dist = input.fieldRadius * (0.18 + rand() * 0.72);
          x = input.center.x + Math.cos(ang) * dist;
          y = input.center.y + (rand() - 0.5) * profile.verticalSpanMeters;
          z = input.center.z + Math.sin(ang) * dist;
          formation = 'isolated_monolith';
        }
        if (isSafe(x, y, z, radius)) break;
      }
    }
    pushRock('large', formation, i, x, y, z, radius, 3.2);
  }

  // 2. Medium Rocky Formations across clusters, vertical drifts & 3D belt ribbons
  for (let i = 0; i < input.mediumCount; i++) {
    const radius = 16 + rand() * 16;
    let x = input.center.x;
    let y = input.center.y;
    let z = input.center.z;
    let formation: DistributedAsteroidSpec['formation'] = 'cluster';

    for (let tries = 0; tries < 10; tries++) {
      const mode = i % 4;
      if (mode === 0 && clusterCenters.length > 0) {
        const cc = clusterCenters[i % clusterCenters.length];
        x = cc.x + (rand() - 0.5) * 560;
        y = cc.y + (rand() - 0.5) * 380;
        z = cc.z + (rand() - 0.5) * 560;
        formation = 'cluster';
      } else if (mode === 1) {
        // Long sweeping 3D tilted belt ribbon spanning the entire sector
        const t = (rand() - 0.5) * 2;
        const along = t * input.fieldRadius * 0.78;
        const spread = (rand() - 0.5) * 1450;
        x = input.center.x + along * 0.76 + spread * 0.62;
        y = input.center.y + Math.sin(t * 2.4) * (profile.verticalSpanMeters * 0.34) + (rand() - 0.5) * 420;
        z = input.center.z - along * 0.65 + spread * 0.74;
        formation = 'belt_ribbon';
      } else if (mode === 2) {
        // Vertical 3D column / shelf above & below flight plane
        const ang = rand() * Math.PI * 2;
        const dist = 340 + rand() * (input.fieldRadius * 0.55);
        const sign = i % 2 === 0 ? 1 : -1;
        x = input.center.x + Math.cos(ang) * dist;
        y = input.center.y + sign * (180 + rand() * (profile.verticalSpanMeters * 0.42));
        z = input.center.z + Math.sin(ang) * dist;
        formation = 'vertical_drift';
      } else {
        // Open-space isolated medium rock
        const ang = rand() * Math.PI * 2;
        const dist = input.fieldRadius * (0.14 + rand() * 0.78);
        x = input.center.x + Math.cos(ang) * dist;
        y = input.center.y + (rand() - 0.5) * profile.verticalSpanMeters;
        z = input.center.z + Math.sin(ang) * dist;
        formation = 'open_scatter';
      }
      if (isSafe(x, y, z, radius)) break;
    }
    pushRock('medium', formation, i, x, y, z, radius, 7.6);
  }

  // 3. Small Breakable Fragments & Wreckage Shards
  for (let i = 0; i < input.smallCount; i++) {
    const radius = 5.5 + rand() * 6.8;
    let x = input.center.x;
    let y = input.center.y;
    let z = input.center.z;
    for (let tries = 0; tries < 8; tries++) {
      if (i % 2 === 0 && clusterCenters.length > 0) {
        const cc = clusterCenters[i % clusterCenters.length];
        x = cc.x + (rand() - 0.5) * 620;
        y = cc.y + (rand() - 0.5) * 440;
        z = cc.z + (rand() - 0.5) * 620;
      } else {
        const ang = rand() * Math.PI * 2;
        const dist = 260 + rand() * (input.fieldRadius * 0.72);
        x = input.center.x + Math.cos(ang) * dist;
        y = input.center.y + (rand() - 0.5) * profile.verticalSpanMeters * 0.92;
        z = input.center.z + Math.sin(ang) * dist;
      }
      if (isSafe(x, y, z, radius)) break;
    }
    pushRock('small', i % 2 === 0 ? 'cluster' : 'open_scatter', i, x, y, z, radius, 13.5);
  }

  for (let i = 0; i < input.wreckageCount; i++) {
    const radius = 15 + rand() * 14;
    let x = input.center.x;
    let y = input.center.y;
    let z = input.center.z;
    for (let tries = 0; tries < 8; tries++) {
      const ang = rand() * Math.PI * 2;
      const dist = 320 + rand() * (input.fieldRadius * 0.56);
      x = input.center.x + Math.cos(ang) * dist;
      y = input.center.y + (rand() - 0.5) * profile.verticalSpanMeters * 0.65;
      z = input.center.z + Math.sin(ang) * dist;
      if (isSafe(x, y, z, radius)) break;
    }
    pushRock('wreckage', 'cluster', i, x, y, z, radius, 5.2);
  }

  return results;
}

/**
 * Lightweight 3D spatial hash grid for fast asteroid proximity, collision,
 * camera pull-in, and enemy obstacle avoidance across 80 km sectors.
 */
export interface SpatialObstacleRef {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export class SpatialAsteroidGrid<T extends SpatialObstacleRef> {
  private readonly cellSize: number;
  private readonly cells = new Map<string, T[]>();

  constructor(cellSize = 360) {
    this.cellSize = Math.max(80, cellSize);
  }

  private key(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  public rebuild(items: readonly T[]): void {
    this.cells.clear();
    const inv = 1 / this.cellSize;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const cx = Math.floor(it.x * inv);
      const cy = Math.floor(it.y * inv);
      const cz = Math.floor(it.z * inv);
      const k = this.key(cx, cy, cz);
      let bucket = this.cells.get(k);
      if (!bucket) {
        bucket = [];
        this.cells.set(k, bucket);
      }
      bucket.push(it);
    }
  }

  public queryRadius(x: number, y: number, z: number, searchRadius: number, out: T[] = []): T[] {
    out.length = 0;
    const inv = 1 / this.cellSize;
    const minX = Math.floor((x - searchRadius) * inv);
    const maxX = Math.floor((x + searchRadius) * inv);
    const minY = Math.floor((y - searchRadius) * inv);
    const maxY = Math.floor((y + searchRadius) * inv);
    const minZ = Math.floor((z - searchRadius) * inv);
    const maxZ = Math.floor((z + searchRadius) * inv);
    const rSq = searchRadius * searchRadius;

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cz = minZ; cz <= maxZ; cz++) {
          const bucket = this.cells.get(this.key(cx, cy, cz));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const it = bucket[i];
            const dx = it.x - x;
            const dy = it.y - y;
            const dz = it.z - z;
            const limit = searchRadius + it.radius;
            if (dx * dx + dy * dy + dz * dz <= Math.max(rSq, limit * limit)) {
              out.push(it);
            }
          }
        }
      }
    }
    return out;
  }

  public get cellCount(): number {
    return this.cells.size;
  }
}

// =========================================================================
// 3. WINGMAN COMMAND SYSTEM (2–3 NAMED AI WINGMEN)
// =========================================================================

export type WingmanCommandId = 'attack' | 'defend' | 'cover' | 'regroup';

export interface WingmanIdentity {
  id: string;
  callsign: string;
  pilotName: string;
  shipClass: string;
  formationOffset: [number, number, number]; // [right, up, back] relative to player (never blocks forward sightline!)
}

export const VANGUARD_WINGMEN_ROSTER: WingmanIdentity[] = [
  {
    id: 'wg_vanguard_2',
    callsign: 'VANGUARD-2',
    pilotName: 'Lt. Mara Vance',
    shipClass: 'VX-94 Interceptor',
    formationOffset: [-42, 12, 34],
  },
  {
    id: 'wg_vanguard_3',
    callsign: 'VANGUARD-3',
    pilotName: 'Capt. Devon Park',
    shipClass: 'XF-120 Heavy Striker',
    formationOffset: [42, 10, 36],
  },
  {
    id: 'wg_vanguard_4',
    callsign: 'VANGUARD-4',
    pilotName: 'Ens. Priya Nair',
    shipClass: 'SR-4 Escort Scout',
    formationOffset: [-26, 26, 56],
  },
];

export interface WingmanStatusSnapshot {
  id: string;
  callsign: string;
  pilotName: string;
  hullPct: number;
  shieldPct: number;
  command: WingmanCommandId;
  status: 'active' | 'engaging' | 'damaged' | 'disabled';
  kills: number;
}

export function getWingmanCommandAck(command: WingmanCommandId, targetName?: string | null): string {
  switch (command) {
    case 'attack':
      return targetName
        ? `VANGUARD-2: "Copy Lead — engaging ${targetName}!"`
        : 'VANGUARD-2: "Weapons free — sweeping nearest hostiles!"';
    case 'defend':
      return 'VANGUARD-3: "Forming tight defensive screen on your wings."';
    case 'cover':
      return 'VANGUARD-2: "Watching your six — intercepting anyone who locks onto you!"';
    case 'regroup':
      return 'VANGUARD-3: "Breaking off — reforming on Commander Voss."';
  }
}

export interface WingmanTargetCandidate {
  id: string;
  pos: Vec3;
  distToPlayer: number;
  isPlayerLocked: boolean;
  isAttackingPlayer: boolean;
}

export function selectWingmanObjectiveTarget(
  command: WingmanCommandId,
  candidates: readonly WingmanTargetCandidate[],
): string | null {
  if (command === 'regroup' || candidates.length === 0) return null;

  if (command === 'attack') {
    const locked = candidates.find((c) => c.isPlayerLocked);
    if (locked) return locked.id;
  }

  if (command === 'cover') {
    const attackers = candidates
      .filter((c) => c.isAttackingPlayer)
      .sort((a, b) => a.distToPlayer - b.distToPlayer);
    if (attackers.length > 0) return attackers[0].id;
  }

  if (command === 'defend') {
    const closeThreats = candidates
      .filter((c) => c.distToPlayer < 1100)
      .sort((a, b) => a.distToPlayer - b.distToPlayer);
    if (closeThreats.length > 0) return closeThreats[0].id;
    return null;
  }

  const nearest = [...candidates].sort((a, b) => a.distToPlayer - b.distToPlayer);
  return nearest[0]?.id ?? null;
}

// =========================================================================
// 4. DYNAMIC ENEMY REINFORCEMENT DIRECTOR
// =========================================================================

export type ReinforcementStage = 'patrol' | 'engaged' | 'distress_signal' | 'inbound_jump' | 'arrived' | 'suppressed';

export interface ReinforcementDirectorState {
  stage: ReinforcementStage;
  waveIndex: number;
  maxWaves: number;
  countdownSec: number;
  alertBanner: string | null;
  lastDistressReason: string | null;
}

export function createReinforcementDirector(missionNumber: number, reductionPct = 0): ReinforcementDirectorState {
  const baseWaves = missionNumber <= 1 ? 1 : missionNumber <= 5 ? 1 : 2;
  const maxWaves = reductionPct >= 0.25 && baseWaves > 1 ? baseWaves - 1 : baseWaves;
  return {
    stage: 'patrol',
    waveIndex: 0,
    maxWaves,
    countdownSec: 0,
    alertBanner: null,
    lastDistressReason: null,
  };
}

export function stepReinforcementDirector(input: {
  state: ReinforcementDirectorState;
  dt: number;
  hostilesKilled: number;
  hostilesAlive: number;
  initialHostiles: number;
  commsDestroyed: boolean;
  hangarDestroyed: boolean;
}): { state: ReinforcementDirectorState; shouldSpawnWave: boolean; spawnCount: number; bannerEvent: string | null } {
  const s: ReinforcementDirectorState = { ...input.state };
  let shouldSpawnWave = false;
  let spawnCount = 0;
  let bannerEvent: string | null = null;

  if (s.waveIndex >= s.maxWaves || s.stage === 'suppressed') {
    if (s.countdownSec > 0) {
      s.countdownSec = Math.max(0, s.countdownSec - input.dt);
      if (s.countdownSec <= 0) s.alertBanner = null;
    }
    return { state: s, shouldSpawnWave: false, spawnCount: 0, bannerEvent: null };
  }

  if (input.hangarDestroyed && s.stage !== 'arrived') {
    s.stage = 'suppressed';
    s.alertBanner = 'ENEMY HANGAR DESTROYED — REINFORCEMENTS SUPPRESSED';
    s.countdownSec = 4.0;
    return { state: s, shouldSpawnWave: false, spawnCount: 0, bannerEvent: s.alertBanner };
  }

  if (s.stage === 'patrol' && input.hostilesKilled >= 1) {
    s.stage = 'engaged';
  }

  // Trigger distress signal once ~40% of initial patrol is downed (while battle is still active)
  const triggerKills = Math.max(2, Math.floor(input.initialHostiles * (s.waveIndex === 0 ? 0.35 : 0.65)));
  if (s.stage === 'engaged' && input.hostilesKilled >= triggerKills && input.hostilesAlive >= 1) {
    s.stage = 'distress_signal';
    s.countdownSec = input.commsDestroyed ? 9.5 : 5.5;
    s.lastDistressReason = input.commsDestroyed
      ? 'DEGRADED ENEMY DISTRESS SIGNAL — DELAYED REINFORCEMENTS'
      : 'ENEMY DISTRESS TRANSMISSION DETECTED — REINFORCEMENTS INBOUND';
    s.alertBanner = s.lastDistressReason;
    bannerEvent = s.alertBanner;
  } else if (s.stage === 'distress_signal') {
    s.countdownSec = Math.max(0, s.countdownSec - input.dt);
    if (s.countdownSec <= 1.2) {
      s.stage = 'inbound_jump';
      s.alertBanner = 'HYPERSPACE SIGNATURES DETECTED — HOSTILE WING DROPPING IN';
      bannerEvent = s.alertBanner;
    }
  } else if (s.stage === 'inbound_jump') {
    s.countdownSec = Math.max(0, s.countdownSec - input.dt);
    if (s.countdownSec <= 0) {
      shouldSpawnWave = true;
      spawnCount = input.commsDestroyed ? 2 : 3;
      s.waveIndex += 1;
      s.stage = s.waveIndex >= s.maxWaves ? 'arrived' : 'engaged';
      s.alertBanner = `ENEMY REINFORCEMENT WING ARRIVED (+${spawnCount} HOSTILES)`;
      s.countdownSec = 3.5;
      bannerEvent = s.alertBanner;
    }
  } else if (s.stage === 'arrived' && s.countdownSec > 0) {
    s.countdownSec = Math.max(0, s.countdownSec - input.dt);
    if (s.countdownSec <= 0) s.alertBanner = null;
  }

  return { state: s, shouldSpawnWave, spawnCount, bannerEvent };
}

// =========================================================================
// 5. LEGENDARY ENEMY PILOTS (NAMED CAMPAIGN ACES)
// =========================================================================

export interface LegendaryPilotDef {
  id: string;
  missionNumber: number;
  name: string;
  callsign: string;
  title: string;
  craftName: string;
  accentHex: number;
  trimHex: number;
  hpMultiplier: number;
  shieldMultiplier: number;
  introTransmission: string;
  phase2Transmission: string;
  defeatTransmission: string;
  preferredTactic: CombatScenarioKind;
  bonusSalvage: number;
}

export const LEGENDARY_PILOTS: LegendaryPilotDef[] = [
  {
    id: 'ace_korrath',
    missionNumber: 4,
    name: 'Commander Korrath',
    callsign: 'IRON FANG',
    title: 'Belt Ambush Commander',
    craftName: 'Razor-Wing Interceptor',
    accentHex: 0xd97706,
    trimHex: 0xfef08a,
    hpMultiplier: 1.55,
    shieldMultiplier: 1.45,
    introTransmission:
      'CMDR. KORRATH "IRON FANG": "You flew straight into my canyons, Vanguard. Let the rocks decide who lives."',
    phase2Transmission:
      'CMDR. KORRATH "IRON FANG": "Impressive flying! Switching to full burn — try keeping up through the boulders!"',
    defeatTransmission:
      'CMDR. KORRATH "IRON FANG": "Hull breached... you earned these skies, pilot..."',
    preferredTactic: 'asteroid_pursuit',
    bonusSalvage: 75,
  },
  {
    id: 'ace_valkyr',
    missionNumber: 6,
    name: 'Valkyr-Null',
    callsign: 'PHANTOM SIGNAL',
    title: 'Outer Frontier Stealth Hunter',
    craftName: 'Void-Delta Specter',
    accentHex: 0x06b6d4,
    trimHex: 0xe0f2fe,
    hpMultiplier: 1.65,
    shieldMultiplier: 1.65,
    introTransmission:
      'VALKYR-NULL "PHANTOM SIGNAL": "Telemetry locked. You will not carry our relay coordinates back to Aether Prime."',
    phase2Transmission:
      'VALKYR-NULL "PHANTOM SIGNAL": "Deploying thermal decoys — initiating high-velocity cross-pass!"',
    defeatTransmission:
      'VALKYR-NULL "PHANTOM SIGNAL": "Signal... lost... relay grid exposed..."',
    preferredTactic: 'high_speed_interception',
    bonusSalvage: 95,
  },
  {
    id: 'ace_drex',
    missionNumber: 8,
    name: 'Archon Drex',
    callsign: 'CRIMSON LANCE',
    title: 'Dreadnought Vanguard Duelist',
    craftName: 'Crimson-Spine Striker',
    accentHex: 0xe11d48,
    trimHex: 0xfda4af,
    hpMultiplier: 1.8,
    shieldMultiplier: 1.7,
    introTransmission:
      'ARCHON DREX "CRIMSON LANCE": "Before you touch Oblivion’s hull, Commander Voss, you answer to my cannons!"',
    phase2Transmission:
      'ARCHON DREX "CRIMSON LANCE": "Shields critical — full vertical climb, engaging lethal dive vectors!"',
    defeatTransmission:
      'ARCHON DREX "CRIMSON LANCE": "Impossible... the Sovereign must be warned..."',
    preferredTactic: 'elite_ace_duel',
    bonusSalvage: 115,
  },
  {
    id: 'ace_veyron',
    missionNumber: 10,
    name: 'High Lord Veyron',
    callsign: 'ECLIPSE VANGUARD',
    title: 'Royal Flagship Champion',
    craftName: 'Sovereign Crown-Blade',
    accentHex: 0xf43f5e,
    trimHex: 0xfde047,
    hpMultiplier: 1.95,
    shieldMultiplier: 1.85,
    introTransmission:
      'HIGH LORD VEYRON "ECLIPSE VANGUARD": "Eternal Eclipse shall not fall! All royal wings, converge on Commander Voss!"',
    phase2Transmission:
      'HIGH LORD VEYRON "ECLIPSE VANGUARD": "Overclocking reactors — you will not reach the Sovereign’s command bridge!"',
    defeatTransmission:
      'HIGH LORD VEYRON "ECLIPSE VANGUARD": "My Sovereign... forgive me... the Eclipse is exposed!"',
    preferredTactic: 'elite_ace_duel',
    bonusSalvage: 150,
  },
];

export function getLegendaryPilotForMission(missionNumber: number): LegendaryPilotDef | null {
  return LEGENDARY_PILOTS.find((p) => p.missionNumber === missionNumber) ?? null;
}

// =========================================================================
// 6. MEANINGFUL SPACECRAFT UPGRADE TRADE-OFF MODULES
// =========================================================================

export type TradeOffModuleId =
  | 'overclocked_thrusters'
  | 'ablative_bulkheads'
  | 'phase_targeting_matrix'
  | 'capacitor_shield_siphon'
  | 'vector_stabilizers'
  | 'heavy_ordnance_rack';

export interface TradeOffModuleDef {
  id: TradeOffModuleId;
  name: string;
  category: 'Engines' | 'Armour' | 'Targeting' | 'Shields' | 'Manoeuvrability' | 'Ordnance';
  summary: string;
  bonusText: string;
  tradeOffText: string;
  cost: Partial<CampaignResources>;
  // Multipliers / deltas applied on top of ship & level specs
  speedMult: number;
  agilityMult: number;
  hullMult: number;
  shieldMult: number;
  shieldRegenMult: number;
  boostRechargeMult: number;
  weaponDamageMult: number;
  weaponHeatMult: number;
  lockSpeedMult: number;
  capitalDamageMult: number;
  extraMissiles: number;
}

export const UPGRADE_TRADE_OFF_MODULES: TradeOffModuleDef[] = [
  {
    id: 'overclocked_thrusters',
    name: 'Overclocked Ion Core',
    category: 'Engines',
    summary: 'Strips secondary fuselage plating to feed high-pressure plasma directly into main nozzles.',
    bonusText: '+22% Top Speed & Acceleration',
    tradeOffText: '-14% Hull Armour Integrity',
    cost: { salvage: 130, supplies: 35 },
    speedMult: 1.22,
    agilityMult: 1.06,
    hullMult: 0.86,
    shieldMult: 1.0,
    shieldRegenMult: 1.0,
    boostRechargeMult: 1.12,
    weaponDamageMult: 1.0,
    weaponHeatMult: 1.0,
    lockSpeedMult: 1.0,
    capitalDamageMult: 1.0,
    extraMissiles: 0,
  },
  {
    id: 'ablative_bulkheads',
    name: 'Ablative Titanium Bulkheads',
    category: 'Armour',
    summary: 'Bolts layered reactive ceramic-titanium armor plates across core fuselage ribs.',
    bonusText: '+28% Max Hull Durability',
    tradeOffText: '-12% Turn Agility & Pitch Rate',
    cost: { salvage: 140, supplies: 45 },
    speedMult: 0.96,
    agilityMult: 0.88,
    hullMult: 1.28,
    shieldMult: 1.0,
    shieldRegenMult: 1.0,
    boostRechargeMult: 0.95,
    weaponDamageMult: 1.0,
    weaponHeatMult: 1.0,
    lockSpeedMult: 1.0,
    capitalDamageMult: 1.0,
    extraMissiles: 0,
  },
  {
    id: 'phase_targeting_matrix',
    name: 'Phase-Locked Targeting Matrix',
    category: 'Targeting',
    summary: 'Overdrives fire-control telemetry and cannon capacitor discharge for lethal precision.',
    bonusText: '+35% Lock Speed & +18% Weapon Damage',
    tradeOffText: '+18% Weapon Heat Build-Up',
    cost: { salvage: 150, intel: 35 },
    speedMult: 1.0,
    agilityMult: 1.0,
    hullMult: 1.0,
    shieldMult: 1.0,
    shieldRegenMult: 1.0,
    boostRechargeMult: 1.0,
    weaponDamageMult: 1.18,
    weaponHeatMult: 1.18,
    lockSpeedMult: 1.35,
    capitalDamageMult: 1.1,
    extraMissiles: 0,
  },
  {
    id: 'capacitor_shield_siphon',
    name: 'Capacitor Shield Siphon',
    category: 'Shields',
    summary: 'Reroutes afterburner capacitors into continuous deflector regeneration coils.',
    bonusText: '+40% Shield Regen & +15% Shield Capacity',
    tradeOffText: '-20% Boost Recharge Rate',
    cost: { salvage: 145, supplies: 40, intel: 20 },
    speedMult: 1.0,
    agilityMult: 1.0,
    hullMult: 1.0,
    shieldMult: 1.15,
    shieldRegenMult: 1.4,
    boostRechargeMult: 0.8,
    weaponDamageMult: 1.0,
    weaponHeatMult: 1.0,
    lockSpeedMult: 1.0,
    capitalDamageMult: 1.0,
    extraMissiles: 0,
  },
  {
    id: 'vector_stabilizers',
    name: 'Vector RCS Stabilizers',
    category: 'Manoeuvrability',
    summary: 'Adds high-impulse lateral vernier thrusters for rapid dogfight reversals and evasion.',
    bonusText: '+24% Agility & +22% Boost Recharge',
    tradeOffText: '-12% Max Shield Capacity',
    cost: { salvage: 135, intel: 25 },
    speedMult: 1.05,
    agilityMult: 1.24,
    hullMult: 1.0,
    shieldMult: 0.88,
    shieldRegenMult: 1.0,
    boostRechargeMult: 1.22,
    weaponDamageMult: 1.0,
    weaponHeatMult: 1.0,
    lockSpeedMult: 1.08,
    capitalDamageMult: 1.0,
    extraMissiles: 0,
  },
  {
    id: 'heavy_ordnance_rack',
    name: 'Heavy Ordnance Underwing Rack',
    category: 'Ordnance',
    summary: 'Equips external reinforced torpedo pylons for capital ship assault runs.',
    bonusText: '+6 Homing Missiles & +18% Capital Damage',
    tradeOffText: '-10% Combat Top Speed',
    cost: { salvage: 160, supplies: 55 },
    speedMult: 0.9,
    agilityMult: 0.95,
    hullMult: 1.05,
    shieldMult: 1.0,
    shieldRegenMult: 1.0,
    boostRechargeMult: 0.94,
    weaponDamageMult: 1.04,
    weaponHeatMult: 1.0,
    lockSpeedMult: 1.0,
    capitalDamageMult: 1.18,
    extraMissiles: 6,
  },
];

export interface ComputedModuleModifiers {
  speedMult: number;
  agilityMult: number;
  hullMult: number;
  shieldMult: number;
  shieldRegenMult: number;
  boostRechargeMult: number;
  weaponDamageMult: number;
  weaponHeatMult: number;
  lockSpeedMult: number;
  capitalDamageMult: number;
  extraMissiles: number;
}

export function computeEquippedUpgradeModifiers(
  equippedIds: readonly TradeOffModuleId[] = [],
): ComputedModuleModifiers {
  const mods: ComputedModuleModifiers = {
    speedMult: 1,
    agilityMult: 1,
    hullMult: 1,
    shieldMult: 1,
    shieldRegenMult: 1,
    boostRechargeMult: 1,
    weaponDamageMult: 1,
    weaponHeatMult: 1,
    lockSpeedMult: 1,
    capitalDamageMult: 1,
    extraMissiles: 0,
  };
  for (const id of equippedIds) {
    const def = UPGRADE_TRADE_OFF_MODULES.find((m) => m.id === id);
    if (!def) continue;
    mods.speedMult *= def.speedMult;
    mods.agilityMult *= def.agilityMult;
    mods.hullMult *= def.hullMult;
    mods.shieldMult *= def.shieldMult;
    mods.shieldRegenMult *= def.shieldRegenMult;
    mods.boostRechargeMult *= def.boostRechargeMult;
    mods.weaponDamageMult *= def.weaponDamageMult;
    mods.weaponHeatMult *= def.weaponHeatMult;
    mods.lockSpeedMult *= def.lockSpeedMult;
    mods.capitalDamageMult *= def.capitalDamageMult;
    mods.extraMissiles += def.extraMissiles;
  }
  return {
    speedMult: Number(clampVal(mods.speedMult, 0.72, 1.48).toFixed(3)),
    agilityMult: Number(clampVal(mods.agilityMult, 0.7, 1.5).toFixed(3)),
    hullMult: Number(clampVal(mods.hullMult, 0.72, 1.55).toFixed(3)),
    shieldMult: Number(clampVal(mods.shieldMult, 0.72, 1.5).toFixed(3)),
    shieldRegenMult: Number(clampVal(mods.shieldRegenMult, 0.7, 1.8).toFixed(3)),
    boostRechargeMult: Number(clampVal(mods.boostRechargeMult, 0.65, 1.6).toFixed(3)),
    weaponDamageMult: Number(clampVal(mods.weaponDamageMult, 0.85, 1.45).toFixed(3)),
    weaponHeatMult: Number(clampVal(mods.weaponHeatMult, 0.75, 1.45).toFixed(3)),
    lockSpeedMult: Number(clampVal(mods.lockSpeedMult, 0.8, 1.65).toFixed(3)),
    capitalDamageMult: Number(clampVal(mods.capitalDamageMult, 0.85, 1.55).toFixed(3)),
    extraMissiles: mods.extraMissiles,
  };
}

export interface ShipComparisonStats {
  maxSpeed: number;
  maxHull: number;
  maxShield: number;
  agilityPct: number;
  firepowerPct: number;
  missiles: number;
}

export function computeShipComparisonStats(
  shipId: PlayableShipId,
  levels: { engineLevel: number; shieldLevel: number; pulseLevel: number; missileCapacity: number },
  equippedModules: readonly TradeOffModuleId[],
): ShipComparisonStats {
  const spec = PLAYABLE_SHIPS[shipId];
  const m = computeEquippedUpgradeModifiers(equippedModules);
  return {
    maxSpeed: Math.round(spec.topSpeed * (1 + (levels.engineLevel - 1) * 0.12) * m.speedMult),
    maxHull: Math.round(spec.maxHull * m.hullMult),
    maxShield: Math.round(spec.maxShield * (1 + (levels.shieldLevel - 1) * 0.2) * m.shieldMult),
    agilityPct: Math.round(spec.turnRateMultiplier * 100 * m.agilityMult),
    firepowerPct: Math.round(
      spec.capitalDamageMultiplier * (1 + (levels.pulseLevel - 1) * 0.16) * m.weaponDamageMult * 100,
    ),
    missiles: Math.min(36, levels.missileCapacity + spec.missileCapacityBonus + m.extraMissiles),
  };
}

// =========================================================================
// 7. HYPERSPACE TRAVEL & SECTOR TRANSITION STATE MACHINE
// =========================================================================

export type HyperspacePhase = 'idle' | 'charging' | 'tunnel' | 'arrival';

export interface HyperspaceTransitionState {
  active: boolean;
  phase: HyperspacePhase;
  elapsedSec: number;
  totalDurationSec: number;
  progress: number; // 0..1
  streakIntensity: number; // 0..1 starfield stretch factor
  originLabel: string;
  destinationLabel: string;
  destinationRegionId: SpaceRegionId | null;
  destinationMissionId: string | null;
  arrivalCommitted: boolean;
}

export function createIdleHyperspaceState(): HyperspaceTransitionState {
  return {
    active: false,
    phase: 'idle',
    elapsedSec: 0,
    totalDurationSec: 2.6,
    progress: 0,
    streakIntensity: 0,
    originLabel: '',
    destinationLabel: '',
    destinationRegionId: null,
    destinationMissionId: null,
    arrivalCommitted: false,
  };
}

export function startHyperspaceTransition(input: {
  originLabel: string;
  destinationLabel: string;
  destinationRegionId: SpaceRegionId;
  destinationMissionId?: string | null;
}): HyperspaceTransitionState {
  return {
    active: true,
    phase: 'charging',
    elapsedSec: 0,
    totalDurationSec: 2.6,
    progress: 0,
    streakIntensity: 0.12,
    originLabel: input.originLabel,
    destinationLabel: input.destinationLabel,
    destinationRegionId: input.destinationRegionId,
    destinationMissionId: input.destinationMissionId ?? null,
    arrivalCommitted: false,
  };
}

export function stepHyperspaceTransition(
  state: HyperspaceTransitionState,
  dt: number,
): { state: HyperspaceTransitionState; shouldCommitArrivalNow: boolean; completedNow: boolean } {
  if (!state.active) {
    return { state, shouldCommitArrivalNow: false, completedNow: false };
  }
  const nextElapsed = state.elapsedSec + clampVal(dt, 0.001, 0.12);
  const progress = clampVal(nextElapsed / state.totalDurationSec, 0, 1);

  let phase: HyperspacePhase = 'charging';
  let streakIntensity = 0;
  if (progress < 0.32) {
    phase = 'charging';
    streakIntensity = 0.1 + (progress / 0.32) * 0.45;
  } else if (progress < 0.82) {
    phase = 'tunnel';
    streakIntensity = 1.0;
  } else {
    phase = 'arrival';
    streakIntensity = Math.max(0, 1 - (progress - 0.82) / 0.18);
  }

  const shouldCommitArrivalNow = !state.arrivalCommitted && progress >= 0.72;
  const completedNow = progress >= 1.0;

  if (completedNow) {
    return {
      state: createIdleHyperspaceState(),
      shouldCommitArrivalNow,
      completedNow: true,
    };
  }

  return {
    state: {
      ...state,
      phase,
      elapsedSec: nextElapsed,
      progress,
      streakIntensity,
      arrivalCommitted: state.arrivalCommitted || shouldCommitArrivalNow,
    },
    shouldCommitArrivalNow,
    completedNow: false,
  };
}

// =========================================================================
// 8. CINEMATIC MISSION MOMENTS & DYNAMIC BATTLEFIELD EVENTS
// =========================================================================

export interface MissionMomentDef {
  id: string;
  missionNumber: number;
  triggerType: 'elapsed' | 'kills' | 'capital_hull_pct';
  triggerThreshold: number;
  headline: string;
  commsMessage: string;
  effectKind:
    | 'capital_emergence'
    | 'asteroid_fracture'
    | 'allied_cruiser_distress'
    | 'installation_collapse'
    | 'flagship_overload';
}

export const MISSION_SCRIPTED_EVENTS: MissionMomentDef[] = [
  {
    id: 'ev_op02_frigate_emerge',
    missionNumber: 2,
    triggerType: 'elapsed',
    triggerThreshold: 6,
    headline: 'ORBITAL EMERGENCE — SIEGE FRIGATE VOR-02',
    commsMessage:
      'PLATFORM ALPHA: "Massive contact emerging over the planetary limb! Siege Frigate Vor-02 is locking onto our shields!"',
    effectKind: 'capital_emergence',
  },
  {
    id: 'ev_op04_asteroid_fracture',
    missionNumber: 4,
    triggerType: 'kills',
    triggerThreshold: 2,
    headline: 'SEISMIC FRACTURE — ASTEROID FIELD BREAKING APART',
    commsMessage:
      'VANGUARD-2: "Incoming plasma shockwave shattered that silicate monolith! Watch for tumbling debris fragments!"',
    effectKind: 'asteroid_fracture',
  },
  {
    id: 'ev_op05_aegis_distress',
    missionNumber: 5,
    triggerType: 'kills',
    triggerThreshold: 3,
    headline: 'ALLIED CARRIER UNDER HEAVY BROADSIDE',
    commsMessage:
      'CSV AEGIS: "Taking heavy plasma fire from Vex-04! Commander Voss, cripple their weapon batteries and command bridge!"',
    effectKind: 'allied_cruiser_distress',
  },
  {
    id: 'ev_op07_relay_collapse',
    missionNumber: 7,
    triggerType: 'capital_hull_pct',
    triggerThreshold: 55,
    headline: 'ORBITAL BASTION CORE DESTABILIZING',
    commsMessage:
      'VANGUARD INTEL: "Secondary reactors on Kael-7 are rupturing — expect shockwaves and defensive fighters!"',
    effectKind: 'installation_collapse',
  },
  {
    id: 'ev_op10_eclipse_overload',
    missionNumber: 10,
    triggerType: 'capital_hull_pct',
    triggerThreshold: 40,
    headline: 'ETERNAL ECLIPSE CORE OVERLOAD — FINAL PHASE',
    commsMessage:
      'CSV AEGIS: "Eternal Eclipse’s primary armor has fractured! Strike the exposed core and clear the blast envelope!"',
    effectKind: 'flagship_overload',
  },
];

export function evaluateMissionMoment(input: {
  missionNumber: number;
  elapsedSec: number;
  kills: number;
  capitalHullPct: number | null;
  triggeredIds: ReadonlySet<string>;
}): MissionMomentDef | null {
  for (const ev of MISSION_SCRIPTED_EVENTS) {
    if (ev.missionNumber !== input.missionNumber) continue;
    if (input.triggeredIds.has(ev.id)) continue;
    if (ev.triggerType === 'elapsed' && input.elapsedSec >= ev.triggerThreshold) return ev;
    if (ev.triggerType === 'kills' && input.kills >= ev.triggerThreshold) return ev;
    if (
      ev.triggerType === 'capital_hull_pct' &&
      input.capitalHullPct !== null &&
      input.capitalHullPct <= ev.triggerThreshold
    ) {
      return ev;
    }
  }
  return null;
}
